<template>
  <div>
    <el-row>
      <el-input v-model="roomId" id="roomId"></el-input>
      <el-button @click.native="startMeeting" id="btn-join">加入房间</el-button>
      <el-button @click.native="stopMeeting" id="btn-leave" style="display: none;">离开房间</el-button>
    </el-row>
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
          remoteStream: null
        }
      },
      computed: {
        ...mapState('meeting', {
          trtcClient: 'trtcClient',
          loginedUser: 'loginedUser',
        }),
        ...mapGetters('meeting', {
        })
      },
      methods: {
        ...mapMutations('meeting', {
          initClient: 'initClient',
          createStream: 'createStream'
        }),
        ...mapActions('meeting', {
          initStream: 'initStream',
          listenStreamAdded: 'listenStreamAdded',
          browserSuitable: 'browserSuitable'
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
            url: 'http://localhost:8888/video/api/common/sign',
            params: {
              userId: this.loginedUser.userId
            }
          }).then(resp => {
            return resp.data
          })

        },
        async startMeeting() {
          // 等待加入房间成功
          await this.joinRoom(this.roomId)
          // 创建流
          this.createStream();
          // 初始化流
          this.initStream();
          // 发布流， 无需同步
          this.publishStream();
          // 监听远端流的加入
          this.listenStreamAdded();
          // 监听远端流订阅成功事件
          this.subscribedSucceed();
        },
        // 加入会议室，roomId必须是Number
        async joinRoom(roomId) {
          if (roomId < 0 || roomId == null || roomId == '') {
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
        async publishStream() {
          await this.trtcClient.publish(this.localStream)
            .then( () => {
              console.log("本地流发布成功，")
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
