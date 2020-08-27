<template>
  <el-menu :default-active="activeIndex"
           class="el-menu-demo"
           mode="horizontal"
           @select="handleSelect"
           background-color="#545c64"
           text-color="#fff"
           active-text-color="#ffd04b">
    <el-menu-item index="1"><router-link to="/meeting">视频会议</router-link></el-menu-item>
    <el-submenu index="2">
      <template slot="title">视频分析</template>
      <el-menu-item index="2-1"><router-link to="/video">视频库</router-link></el-menu-item>
    </el-submenu>
  </el-menu>
</template>

<script>
    export default {
      name: "NavMenu",
      data() {
        return {
          activeIndex: '1'
        }
      },
      methods: {
        handleSelect(index) {
          console.log(index, "被选中了")
        }
      }
    }
</script>

<style scoped>

</style>
