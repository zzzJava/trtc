<template>
  <div>
    <el-row>
      <el-input v-model="roomId" id="roomId"></el-input>
      <el-button @click.native="startMeeting" id="btn-join">加入房间</el-button>
      <el-button @click.native="stopMeeting" id="btn-leave" style="display: none;">离开房间</el-button>
      <div id="local_stream" style="width: 640px; height: 480px;"></div>
      <a href="http://1500001957.vod2.myqcloud.com/6c98241evodcq1500001957/466ace655285890809543120218/playlist_eof.m3u8" download="test">下载</a>
    </el-row>
    <slot name="remote"></slot>
  </div>
</template>

<script>
  import {mapState, mapGetters, mapMutations, mapActions} from 'vuex'
  import axios from 'axios'
    export default {
      name: "Meet",
      data() {
        return {
          roomId: -1,
          remoteStream: null,
          isFirst: true,
          buffer: [],
          recordPeriod: 500, // 录音周期，即多长时间向后端发送一次数据，时间过短（如200ms），后端经常会误识别出“嗯”“啊”等词语
          speechStatus : 0, // 0:静默， 1:当前帧不是语音帧,但前一帧是  2:当前帧是语音帧
          level : -1,
          frameCount : -1,
          background : 0,
          forgetFactor : 1.05,
          threshold : 5,
          actualSend: 0,
          openSilentCheck: true
        }
      },
      computed: {
        ...mapState('meeting', {
          trtcClient: 'trtcClient',
          loginedUser: 'loginedUser',
          sourceStream: 'sourceStream',
          localStream: 'localStream',
        }),
        ...mapGetters('meeting', {
        })
      },
      methods: {
        ...mapMutations('meeting', {
          initClient: 'initClient',

        }),
        ...mapActions('meeting', {
          initStream: 'initStream',
          listenStreamAdded: 'listenStreamAdded',
          browserSuitable: 'browserSuitable',
          createStream: 'createStream',
          leaveRoom: 'leaveRoom'
        }),

        // 流程控制
        async init() {
          // 1、检查浏览器
          this.browserSuitable().then((result) => {
            if (!result) {
              this.$message("您的浏览器暂时不支持此功能，请下载最新版chrome", 'warning')
            }
          })
          // 2、获取sigInfo
          let sigInfo = await this.getSigInfo();
          console.log("获取到签名", sigInfo)
          // 3、创建客户端
          this.initClient(sigInfo)
        },
        // 根据loginedUser.userId从后端获取签名
        async getSigInfo() {
          return await axios({
            method: 'get',
            url: 'http://localhost:8083/api/signature/api/new_sign',
            params: {
              userId: this.loginedUser.userId
            }
          }).then(resp => {
            return resp.data.data
          })

        },
        async startMeeting() {
          // 等待加入房间成功
          await this.joinRoom(this.roomId)
          // 创建流
          await this.createStream();
          // 实时录音
          this.startRecord();
          // 初始化流，需要同步
          await this.initStream();
          // 发布流， 无需同步
          this.publishStream();
          // 监听远端流的加入
          this.listenStreamAdded();
          // 监听远端流订阅成功事件
          this.subscribedSucceed();
        },
        // 加入会议室，roomId必须是Number
        async joinRoom(roomId) {
          if (roomId < 0 || roomId == null || roomId === '') {
            this.$message("房间号不能为空，且必须为整数", "warning")
            return;
          }
          await this.trtcClient.join({
            roomId: roomId
          }).catch( error => {
            console.log("加入房间失败", error)
          }).then( () => {
            console.log("加入房间成功")
            $("#btn-join").toggle();
            $("#btn-leave").toggle();
            $("#roomId").css({disabled: "true"})
          })
        },
        // 发布流
        publishStream() {
          this.trtcClient.publish(this.localStream)
            .then( () => {
              console.log("本地流发布成功，")
              this.localStream.play("local_stream")
            })
            .catch( (error) => {
              console.log("本地流发布失败", error)
            })
        },
        // 监听远端流的增加，以便订阅
        async listenStreamAdded() {
          this.remoteStream = await this.trtcClient.on('stream-added', e => {
            this.remoteStream = e.stream;
            if (this.remoteStream != null) {
              this.trtcClient.subscribe(this.remoteStream);
            }
            console.log('远端流增加:', this.remoteStream)
          })
        },
        // 订阅流成功，播放
        subscribedSucceed() {
          this.trtcClient.on('stream-subscribed', e => {
            const remoteStream = e.stream;
            console.log("远端流订阅成功", remoteStream)
            // 播放远端流，在id为remote_stream的容器中
            remoteStream.play('remote_stream')
          })
        },
        stopMeeting() {

        },
        startRecord() {
          if (this.sourceStream === null) return;
          let audioCtx = new AudioContext();
          let processor = audioCtx.createScriptProcessor(4096, 1, 1);
          let source = audioCtx.createMediaStreamSource(this.sourceStream);
          let bufferSize = Math.floor(44100 / (1000/ this.recordPeriod))
          processor.onaudioprocess = (e) => {
            let inputBuffer = e.inputBuffer;
            let inputData = inputBuffer.getChannelData(0);

            this.buffer.push(...inputData);
            // console.log(this.buffer)
            if (this.buffer.length > bufferSize) { // 数据个数大于44100（浏览器音频采样频率是44100hz）
              let data = this.buffer.slice(0, bufferSize)
              this.buffer = this.buffer.slice(bufferSize)
              console.log("length", data.length)
              this.sendData(data);

            }
          }
          source.connect(processor)
          processor.connect(audioCtx.destination)
        },
        sendData(buffer) {
          // 转换数据位数为16
          let bit16Data = this.float32ToInt16(buffer)
          let sampleRate = 16000
          // console.log("bit16", bit16Data)
          // 采样为8000hz
          let sample = this.sampleData(bit16Data, 44100, sampleRate)
          // console.log("sample", sample)
          if (this.openSilentCheck) {
            this.classifyAudioFrame(sample)
            console.log("帧状态", {idx: this.frameCount, statue: this.speechStatus})
            if (this.speechStatus < 1) {
              console.log("节约率", (this.frameCount - this.actualSend)/this.frameCount);
              return;
            }
          }
          this.actualSend += 1
          // 转为wav格式
          let wavData = this.encodeToWav(sample, sampleRate, this.isFirst)
          if (this.isFirst) {
            this.isFirst = false
          }
          // console.log("blob", wavData)
          // 保存文件
          // saveAsFile(wavData)
          wavData.arrayBuffer().then(data => {
            // console.log("wav", data)
            this.sendRecordData(new Uint8Array(data));
          })

        },
        saveAsFile(blob) {
          let a = document.createElement("a");
          a.href = window.URL.createObjectURL(blob);
          a.download = "test.wav";
          a.textContent = "Download";

          document.body.appendChild(a);
        },

      /**
       * data: Array, Array-Like
       * oldSampleRate: 数据原有采样率
       * newSampleRate: 目标采样率
       */
      sampleData(data, oldSampleRate, newSampleRate) {
        let step = oldSampleRate/newSampleRate;
        let size = Math.floor(data.length/step); // 新生成的数据长度
        let res = new Int16Array(size);
        let resIdx = 0;
        for (let i=step; resIdx < size; resIdx++) {
          let before = Math.floor(i)
          let after = Math.ceil(i);
          let atPoint = i - before;
          res[resIdx] = data[before] + (data[after] - data[before])*atPoint;
          i += step;
        }
        return res;
      },

      /**
       * 数据类型转换
       * @param data: Float32Array
       * @return: DataView(ArrayBuffer)
       */
      float32ToInt16(data) {
        let res = new Int16Array(data.length)
        for (let i=0; i<data.length; i++) {
          let s = Math.max(-1,Math.min(1,data[i]));
          s=s<0?s*0x8000:s*0x7FFF;
          res[i]=s;
        }
        return res;
      },

      /**
       * 编码为wav格式
       * @param data: Int16Array
       * @param sampleRate
       */
      encodeToWav(data, sampleRate, isFirst) {
        let conf = {
          sampleRate: sampleRate,
          channelCount: 1,
          bitPerSample: 16, // 每个采样数据长度
        }
        let chunks = []
        if (isFirst) {
          let fileHeader = new DataView(new ArrayBuffer(44))
          this.writeChar(fileHeader, 0, "RIFF");
          /* Size = fileSize + 36，按byte计算 */
          fileHeader.setUint32(4, data.length * 2 + 36, true)
          this.writeChar(fileHeader, 8, "WAVE")
          this.writeChar(fileHeader, 12, "fmt ")
          fileHeader.setUint32(16, 16, true)
          /* 音频数据格式: PCM */
          fileHeader.setUint16(20, 1, true)
          /* 通道数： 1 */
          fileHeader.setUint16(22, conf.channelCount, true)
          /* 采样率 */
          fileHeader.setUint32(24, conf.sampleRate, true)
          /* bps = channelCount * 采样率 * bitPerSample / 8 */
          fileHeader.setUint32(28, conf.sampleRate * conf.channelCount * conf.bitPerSample / 8, true)
          /* blockAlign = channelCount * bitPerSample / 8 ，即每个样本占用的字节数 */
          fileHeader.setUint16(32, conf.channelCount * conf.bitPerSample / 8, true)
          /* 位深 */
          fileHeader.setUint16(34, conf.bitPerSample, true)
          this.writeChar(fileHeader, 36, "data")
          /* 数据长度：以字节为单位 */
          fileHeader.setUint32(40, data.length * 2, true)
        }

        let dataView = new DataView(new ArrayBuffer(data.length*2))
        for (let i=0; i<data.length; i++) {
          dataView.setInt16(i*2, data[i], true)
        }
        chunks.push(dataView)
        return new Blob(chunks, {type: "audio/wav"})
      },

      /**
       *
       * @param dataView: DataView
       * @param offset: 起始偏移
       * @param str: 写入串
       */
      writeChar(dataView, offset, str) {
        for (let i=0; i<str.length; i++) {
          dataView.setUint8(offset+i, str.charCodeAt(i));
        }
      },
      sendRecordData(uint8view) {
        let realData = Array.from(uint8view);
        let data = JSON.stringify(realData)
        console.log(realData.length)
        axios({
          headers: {
            'Content-Type': 'application/json'
          },
          url: "http://localhost:8083/api/asr/add?userId=" + this.loginedUser.userId,
          method: "post",
          data: data,
        });
      },
        classifyAudioFrame(frameData){
          console.log('level', this.level);
          console.log('background', this.background);

          let sum = 0;
          frameData.map( x => sum += x*x )
          let energy = 10*Math.log(sum);
          console.log('energy', energy);
          this.frameCount += 1;
          if (this.level === -1) {
            // 第一帧， 初始化level
            this.level = energy;
            this.speechStatus = 2;
            return;
          } else {
            this.level = ((this.level + this.forgetFactor) + energy)/(this.forgetFactor + 1);
          }
          if (this.frameCount < 9) {
            this.background += energy;
            this.speechStatus = 2;
            return;
          } else if (this.background === 9) {
            this.background /= 10; // 取前10帧的平局值
            this.speechStatus = 2;
            return;
          }

          if (energy < this.background) {
            this.background = energy;
          } else {
            this.background += (energy - this.background)*0.05;
          }

          if (this.level < this.background) {
            this.level = this.background;
          }

          console.log('accroding', this.level - this.background)
          if (this.level - this.background > this.threshold) {
            this.speechStatus = 2
          } else if (this.speechStatus == 2) {
            this.speechStatus = 1;
          } else {
            this.speechStatus = 0;
          }
        }


  },
      mounted() {

        // 初始化
        this.init()

      },
      watch: {
        // // 侦听远端流的变化，如果不为空，
        // remoteStream(newVal, oldVal) {
        //
        // }
      }
    }
</script>

<style scoped>

</style>
