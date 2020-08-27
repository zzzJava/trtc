<template>
  <div>视频会议</div>
</template>

<script>
  import {mapState, mapGetters, mapMutations, mapActions} from 'vuex'
    export default {
      name: "Meet",
      computed: {
        ...mapState('meeting', {
          trtcCloud: 'trtcCloud'
        }),
        ...mapGetters('meeting', {

        })
      },
      methods: {
        ...mapMutations('meeting', {

        }),
        ...mapActions('meeting', {

        }),
        // 错误事件处理
        onError(err) {
          console.log(err)
        },
        onEnterRoom(result) {
          console.log(result)
        },
        // 流程控制
        init() {

        }
      },
      mounted() {
        // 监听错误事件
        this.trtcCloud.on('onError', this.onError)

        // 监听进房结果
        this.trtcCloud.on('onEnterRoom', this.onEnterRoom)

        // 初始化
        this.init()

      }
    }
</script>

<style scoped>

</style>
