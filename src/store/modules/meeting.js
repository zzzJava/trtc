import Vuex from 'vuex'
import TRTC from 'trtc-js-sdk'

export default {
  namespaced: true,
  state: {
    trtcClient: null,
    loginedUser: {userId: 'zzz'},
    localStream: null
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
    createStream(state) {
      state.localStream = TRTC.createStream({audio: true, video: true})
    }
  },
  actions: {
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
    }

  }
}
