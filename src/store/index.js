import Vue from 'vue'
import Vuex from 'vuex'
import meeting from "./modules/meeting";
Vue.use(Vuex)

new Vuex.Store({
  modules: {
    meeting
  }
})
