<template>
  <div>
    <el-input v-model="userId"></el-input>
    <el-button type="primary" @click.native="login">登录</el-button>
  </div>
</template>

<script>
    export default {
      name: "login",
      data() {
        return {
          userId: -1
        }
      },
      methods: {
        login() {
          this.$store.commit("meeting/setUserId", this.userId)
          this.$router.push("/meeting")
        }
      }
    }
</script>

<style scoped>

</style>
