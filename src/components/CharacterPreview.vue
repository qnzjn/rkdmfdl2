<script setup>
import { onMounted, ref, watch } from 'vue'
import { drawCharacter } from '../characters.js'

const props = defineProps({
  char: { type: Object, required: true },
  size: { type: Number, default: 88 },
})

const canvas = ref()

function render() {
  const ctx = canvas.value.getContext('2d')
  ctx.clearRect(0, 0, props.size, props.size)
  drawCharacter(ctx, props.char, props.size / 2, props.size - 12, { dir: 1, frame: 0 })
}

onMounted(render)
watch(() => props.char, render)
</script>

<template>
  <canvas ref="canvas" :width="size" :height="size"></canvas>
</template>
