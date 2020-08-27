import Vue from 'vue'
import Router from 'vue-router'
import login from "../components/login";
import Meet from "../components/Meet"
import Video from "../components/Video"

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'login',
      component: login
    },
    {
      path: '/meeting',
      name: 'Meet',
      component: Meet
    },
    {
      path: '/video',
      name: 'Video',
      component: Video
    }
  ]
})
