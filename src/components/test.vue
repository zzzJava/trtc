<template>
    <div>
      <ul>
        <li id="cors-get">cors-get测试</li>
        <li id="cors-post">cors-post测试</li>
      </ul>
    </div>
</template>

<script>
  import axios from 'axios'
  export default {
    name: "test",
    mounted() {
      // -------- jquery事件绑定 -------------
      // -------- cors测试 -------------
      $("#cors-get").click(() => {
        axios({
          method: 'get',
          url: 'http://localhost:8888/video/cors',

        }).then((resp) => {
          alert(resp.data);
        })
      });

      $("#cors-post").click(() => {
        axios({
          method: 'post',
          url: 'http://localhost:8888/video/cors',

        }).then((resp) => {
          alert(resp.data);
        })
      });
    }
  }
</script>

<style scoped>

</style>
