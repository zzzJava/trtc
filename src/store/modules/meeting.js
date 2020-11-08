import Vuex from 'vuex'
import TRTC from 'trtc-js-sdk'
import axios from "axios";

export default {
  namespaced: true,
  state: {
    trtcClient: null,
    loginedUser: {userId: 'zzz'},
    localStream: null,
    sourceStream: MediaStream
  },
  getters: {

  },
  mutations: {
    initClient(state, sigInfo) {
      state.trtcClient = TRTC.createClient({
        mode: sigInfo.mode,
        userId: sigInfo.userId,
        userSig: sigInfo.userSig,
        sdkAppId: sigInfo.sdkAppId
      })
    },

    setUserId(state, userId) {
      state.loginedUser.userId = userId;
    }
  },
  actions: {
    async createStream({state, commit}) {
        console.log("--------start create stream")
      let stream = await navigator.mediaDevices.getUserMedia({audio: true, video: { width: 640, height: 480, frameRate: 15 }})
      state.sourceStream = stream
        console.log("------------get stream from browser", stream)
      const audioTrack = stream.getAudioTracks()[0];
      const videoTrack = stream.getVideoTracks()[0];
        console.log("------------start create local stream")
      state.localStream = TRTC.createStream({userId: state.loginedUser.userId, audioSource: audioTrack, videoSource: videoTrack})
        console.log("------------local stream", state.localStream)
    },
    async initStream({state, commit}) {
      await state.localStream.initialize()
        .catch( err => {
          console.error("流初始化失败")
        })
        .then( () => {
          console.log("流初始化成功")
        })
    },
    // 浏览器是否能够使用trtc
    browserSuitable({state, commit}) {
      return TRTC.checkSystemRequirements();
    },
    async leaveRoom({state, commit}) {
      state.trtcClient
        .leave()
        .then(() => {
          // 退房成功，可再次调用client.join重新进房开启新的通话。
          console.log("退出房间成功")
        })
        .catch(error => {
          console.error('退房失败 ' + error);
          // 错误不可恢复，需要刷新页面。
        });
    }

  }
}
