<script setup>
import { ref, onMounted, watch } from 'vue'
import { connect, join, state } from './net.js'
import Lobby from './components/Lobby.vue'
import Game from './components/Game.vue'

const started = ref(false)

onMounted(connect)

function onEnter(payload) {
  join(payload.nick, payload.char)
  started.value = true
}

// if the server rejects the nickname at join time, return to lobby
watch(() => state.joinDenied, (reason) => {
  if (reason) {
    started.value = false
    state.nickStatus = { nick: '', available: null, checking: false }
    alert(reason)
    state.joinDenied = null
  }
})
</script>

<template>
  <Lobby v-if="!started" @enter="onEnter" />
  <Game v-else />
</template>

<style>
* { box-sizing: border-box; }
html, body, #app {
  margin: 0;
  height: 100%;
  font-family: 'Segoe UI', 'Malgun Gothic', system-ui, sans-serif;
}
body { overflow: hidden; }
</style>
