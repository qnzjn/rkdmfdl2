<script setup>
import { onMounted, onUnmounted, ref, reactive, computed, nextTick } from 'vue'
import { state, sendMove, sendChat, sendMount, sendDismount } from '../net.js'
import { charById, drawCharacter, roundRect } from '../characters.js'
import { VEHICLES, drawVehicle } from '../vehicles.js'

const WORLD_W = 2400
const WORLD_H = 1600
const SPEED = 4
const CCX = WORLD_W / 2
const CCY = WORLD_H / 2

const canvasRef = ref()
const inputRef = ref()
const chatInput = ref('')
const typing = ref(false)

const count = computed(() => Object.keys(state.players).length)
const recentChat = computed(() => state.chatLog.slice(-8))
const vehicleHint = ref('')

// --- touch / mobile ---
const isTouch = ref(false)
const mobileChatOpen = ref(false)
// 플로팅 조이스틱: 화면 아무 곳이나 누른 지점에 생김
const joy = reactive({ active: false, x: 0, y: 0, baseX: 0, baseY: 0, tx: 0, ty: 0, r: 56, id: null })

const vehBtnLabel = computed(() => {
  const me = state.players[state.myId]
  return me && me.vehicle ? '⬇ 내리기' : '🛴 타기'
})
const vehReady = computed(() => {
  const me = state.players[state.myId]
  if (!me) return false
  return !!me.vehicle || !!nearestVehicleId(me)
})

function joyStart(e) {
  if (joy.active) return
  const t = e.changedTouches[0]
  joy.id = t.identifier
  joy.active = true
  joy.baseX = t.clientX; joy.baseY = t.clientY
  joy.tx = 0; joy.ty = 0; joy.x = 0; joy.y = 0
}
function joyMove(e) {
  if (!joy.active) return
  let t = null
  for (const ct of e.changedTouches) if (ct.identifier === joy.id) t = ct
  if (!t) return
  let dx = t.clientX - joy.baseX
  let dy = t.clientY - joy.baseY
  const d = Math.hypot(dx, dy)
  if (d > joy.r) { dx = (dx / d) * joy.r; dy = (dy / d) * joy.r }
  joy.tx = dx; joy.ty = dy
  joy.x = dx / joy.r; joy.y = dy / joy.r
}
function joyEnd(e) {
  let mine = false
  for (const ct of e.changedTouches) if (ct.identifier === joy.id) mine = true
  if (!mine) return
  joy.active = false; joy.x = 0; joy.y = 0; joy.id = null
}
function openMobileChat() {
  mobileChatOpen.value = !mobileChatOpen.value
  if (mobileChatOpen.value) nextTick(() => inputRef.value && inputRef.value.focus())
}

const MOUNT_RANGE = 70
function nearestVehicleId(me) {
  let best = null, bestD = MOUNT_RANGE
  for (const v of Object.values(state.vehicles)) {
    const d = Math.hypot(v.x - me.x, v.y - me.y)
    if (d < bestD) { bestD = d; best = v }
  }
  return best
}
function toggleVehicle() {
  const me = state.players[state.myId]
  if (!me) return
  if (me.vehicle) { sendDismount(); return }
  const v = nearestVehicleId(me)
  if (v) sendMount(v.id)
}

const keys = {}
const rpos = {} // id -> { x, y }
let frame = 0
let raf = 0
let lastSend = 0
const cam = { x: 0, y: 0 }

// deterministic decorations
const trees = []
for (let i = 0; i < 26; i++) {
  const a = (i / 26) * Math.PI * 2
  const r = 470 + (i % 3) * 55
  trees.push({ x: CCX + Math.cos(a) * r, y: CCY + Math.sin(a) * r * 0.85 })
}
const flowers = []
for (let i = 0; i < 70; i++) {
  flowers.push({
    x: 80 + Math.random() * (WORLD_W - 160),
    y: 80 + Math.random() * (WORLD_H - 160),
    c: ['#ff6b9d', '#ffd23f', '#ff9f43', '#fff'][i % 4],
  })
}
const benches = [
  { x: CCX - 230, y: CCY }, { x: CCX + 230, y: CCY },
  { x: CCX, y: CCY - 230 }, { x: CCX, y: CCY + 230 },
]

function kd(e) {
  if (e.key === 'Enter' && !typing.value) { focusChat(); return }
  if (typing.value) return
  const k = e.key.toLowerCase()
  if (k === 'f') { toggleVehicle(); e.preventDefault(); return }
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(k)) {
    keys[k] = true
    e.preventDefault()
  }
}
function ku(e) {
  const k = e.key.toLowerCase()
  if (k in keys) keys[k] = false
}
function focusChat() { inputRef.value && inputRef.value.focus() }

function sendChatMsg() {
  const t = chatInput.value.trim()
  if (t) { sendChat(t); chatInput.value = '' }
  if (!isTouch.value) inputRef.value && inputRef.value.blur()
}

function resize() {
  const c = canvasRef.value
  c.width = window.innerWidth
  c.height = window.innerHeight
}

onMounted(() => {
  isTouch.value = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window
  resize()
  window.addEventListener('resize', resize)
  window.addEventListener('keydown', kd)
  window.addEventListener('keyup', ku)
  loop()
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('resize', resize)
  window.removeEventListener('keydown', kd)
  window.removeEventListener('keyup', ku)
})

function loop() {
  frame++
  const me = state.players[state.myId]
  if (me) {
    let dx = 0, dy = 0
    if (keys['arrowleft'] || keys['a']) dx -= 1
    if (keys['arrowright'] || keys['d']) dx += 1
    if (keys['arrowup'] || keys['w']) dy -= 1
    if (keys['arrowdown'] || keys['s']) dy += 1
    if (joy.active) { dx += joy.x; dy += joy.y }
    const speed = me.vehicle ? VEHICLES[me.vehicle].speed : SPEED
    const mag = Math.hypot(dx, dy)
    if (mag > 0.18) {
      const m = Math.min(1, mag) // analog: 살짝 기울이면 천천히
      me.x = Math.max(40, Math.min(WORLD_W - 40, me.x + (dx / mag) * speed * m))
      me.y = Math.max(40, Math.min(WORLD_H - 40, me.y + (dy / mag) * speed * m))
      if (Math.abs(dx) > 0.05) me.dir = dx > 0 ? 1 : -1
      me.walking = true
      const now = performance.now()
      if (now - lastSend > 60) { sendMove(me.x, me.y, me.dir); lastSend = now }
    } else if (me.walking) {
      me.walking = false
      sendMove(me.x, me.y, me.dir)
    }
    // update vehicle proximity hint
    let hint = ''
    if (me.vehicle) hint = `F · ${VEHICLES[me.vehicle].name}에서 내리기`
    else {
      const v = nearestVehicleId(me)
      if (v) hint = `F · ${VEHICLES[v.type].name} 타기`
    }
    if (hint !== vehicleHint.value) vehicleHint.value = hint
  }
  render()
  raf = requestAnimationFrame(loop)
}

function render() {
  const c = canvasRef.value
  if (!c) return
  const ctx = c.getContext('2d')
  const W = c.width, H = c.height

  const me = state.players[state.myId]
  const tx = me ? me.x : CCX
  const ty = me ? me.y : CCY
  cam.x += (tx - W / 2 - cam.x) * 0.15
  cam.y += (ty - H / 2 - cam.y) * 0.15
  cam.x = WORLD_W <= W ? (WORLD_W - W) / 2 : Math.max(0, Math.min(WORLD_W - W, cam.x))
  cam.y = WORLD_H <= H ? (WORLD_H - H) / 2 : Math.max(0, Math.min(WORLD_H - H, cam.y))

  ctx.clearRect(0, 0, W, H)
  ctx.save()
  ctx.translate(-cam.x, -cam.y)

  drawWorld(ctx)

  const list = Object.values(state.players)
  for (const p of list) {
    if (!rpos[p.id]) rpos[p.id] = { x: p.x, y: p.y }
    const r = rpos[p.id]
    if (p.id === state.myId) { r.x = p.x; r.y = p.y }
    else { r.x += (p.x - r.x) * 0.2; r.y += (p.y - r.y) * 0.2 }
  }

  // depth-sorted draw list of parked vehicles + players
  const items = []
  for (const v of Object.values(state.vehicles)) items.push({ y: v.y, kind: 'vehicle', v })
  for (const p of list) items.push({ y: rpos[p.id].y, kind: 'player', p })
  items.sort((a, b) => a.y - b.y)

  for (const it of items) {
    if (it.kind === 'vehicle') {
      drawVehicle(ctx, it.v.type, it.v.x, it.v.y, { dir: 1, frame, moving: false })
      continue
    }
    const p = it.p
    const r = rpos[p.id]
    const walking = p.id === state.myId ? !!p.walking : Math.hypot(p.x - r.x, p.y - r.y) > 0.6
    const seat = p.vehicle ? VEHICLES[p.vehicle].seat : 0
    if (p.vehicle) drawVehicle(ctx, p.vehicle, r.x, r.y, { dir: p.dir || 1, frame, moving: walking })
    drawCharacter(ctx, charById(p.char), r.x, r.y - seat, { dir: p.dir || 1, frame, walking: walking && !p.vehicle })
    drawName(ctx, r.x, r.y, p.nick, p.id === state.myId)
    if (p.msg && Date.now() - p.msgTime < 6000) drawBubble(ctx, r.x, r.y - 63 - seat, p.msg)
  }

  ctx.restore()
}

function drawWorld(ctx) {
  // grass + checker
  ctx.fillStyle = '#9ed36a'
  ctx.fillRect(0, 0, WORLD_W, WORLD_H)
  ctx.fillStyle = '#97cc63'
  for (let x = 0; x < WORLD_W; x += 80)
    for (let y = 0; y < WORLD_H; y += 80)
      if (((x / 80) + (y / 80)) % 2 === 0) ctx.fillRect(x, y, 80, 80)

  // flowers
  for (const f of flowers) {
    ctx.fillStyle = f.c
    ctx.beginPath(); ctx.arc(f.x, f.y, 3, 0, Math.PI * 2); ctx.fill()
  }

  // paths
  ctx.fillStyle = '#e7dcc4'
  ctx.fillRect(CCX - 55, 0, 110, WORLD_H)
  ctx.fillRect(0, CCY - 55, WORLD_W, 110)

  // plaza
  ctx.beginPath(); ctx.arc(CCX, CCY, 370, 0, Math.PI * 2)
  ctx.fillStyle = '#e7dcc4'; ctx.fill()
  ctx.lineWidth = 12; ctx.strokeStyle = '#cdbf9e'; ctx.stroke()
  ctx.beginPath(); ctx.arc(CCX, CCY, 300, 0, Math.PI * 2)
  ctx.lineWidth = 4; ctx.strokeStyle = '#d8cba8'; ctx.stroke()

  // benches
  for (const b of benches) drawBench(ctx, b.x, b.y)

  // fountain
  ctx.beginPath(); ctx.arc(CCX, CCY, 72, 0, Math.PI * 2); ctx.fillStyle = '#cdbf9e'; ctx.fill()
  ctx.beginPath(); ctx.arc(CCX, CCY, 60, 0, Math.PI * 2); ctx.fillStyle = '#6cc6e8'; ctx.fill()
  ctx.beginPath(); ctx.arc(CCX, CCY, 60, 0, Math.PI * 2); ctx.fillStyle = 'rgba(255,255,255,0.25)'
  ctx.beginPath(); ctx.arc(CCX - 14, CCY - 14, 18, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(CCX, CCY, 28, 0, Math.PI * 2); ctx.fillStyle = '#cdbf9e'; ctx.fill()
  ctx.beginPath(); ctx.arc(CCX, CCY, 22, 0, Math.PI * 2); ctx.fillStyle = '#8fd6f0'; ctx.fill()

  // trees on top
  for (const t of trees) drawTree(ctx, t.x, t.y)
}

function drawTree(ctx, x, y) {
  ctx.fillStyle = 'rgba(0,0,0,0.12)'
  ctx.beginPath(); ctx.ellipse(x, y, 24, 8, 0, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#8a5a2b'; ctx.fillRect(x - 5, y - 30, 10, 30)
  ctx.fillStyle = '#4faf5a'
  ctx.beginPath(); ctx.arc(x, y - 46, 25, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x - 19, y - 35, 18, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 19, y - 35, 18, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#5fc36a'
  ctx.beginPath(); ctx.arc(x - 7, y - 53, 16, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(x + 9, y - 48, 14, 0, Math.PI * 2); ctx.fill()
}

function drawBench(ctx, x, y) {
  ctx.fillStyle = '#b07a44'
  roundRect(ctx, x - 22, y - 6, 44, 12, 4); ctx.fill()
  ctx.fillStyle = '#8a5a2b'
  ctx.fillRect(x - 20, y + 4, 4, 8)
  ctx.fillRect(x + 16, y + 4, 4, 8)
}

function drawName(ctx, cx, fy, nick, isMe) {
  ctx.font = 'bold 12px sans-serif'
  ctx.textAlign = 'center'
  const w = ctx.measureText(nick).width + 14
  roundRect(ctx, cx - w / 2, fy + 6, w, 18, 9)
  ctx.fillStyle = isMe ? 'rgba(74,134,255,0.92)' : 'rgba(0,0,0,0.55)'
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.fillText(nick, cx, fy + 19)
}

function drawBubble(ctx, cx, bottomY, text) {
  ctx.font = '13px sans-serif'
  const maxW = 170
  const lines = []
  let cur = ''
  for (const ch of text) {
    if (ctx.measureText(cur + ch).width > maxW) { lines.push(cur); cur = ch }
    else cur += ch
    if (lines.length >= 3) break
  }
  if (lines.length < 3 && cur) lines.push(cur)
  if (lines.length === 3 && cur && ctx.measureText(lines[2] + cur).width > maxW) {
    lines[2] = lines[2].slice(0, -1) + '…'
  }

  const lineH = 17
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 22
  const h = lines.length * lineH + 12
  const x = cx - w / 2
  const y = bottomY - h

  ctx.fillStyle = 'rgba(255,255,255,0.96)'
  roundRect(ctx, x, y, w, h, 10); ctx.fill()
  ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1; ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - 6, y + h); ctx.lineTo(cx + 6, y + h); ctx.lineTo(cx, y + h + 8)
  ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,0.96)'; ctx.fill()

  ctx.fillStyle = '#222'
  ctx.textAlign = 'center'
  lines.forEach((l, i) => ctx.fillText(l, cx, y + 16 + i * lineH))
}
</script>

<template>
  <div class="game">
    <canvas ref="canvasRef" class="world"></canvas>

    <div class="hud-top">
      <img src="/favicon.png" alt="" />
      <span class="brand">소셜랜드 · 광장</span>
      <span class="count">● {{ count }}명 접속</span>
    </div>

    <div class="chatlog" :class="{ touch: isTouch }">
      <div v-for="(m, i) in recentChat" :key="i" class="line">
        <b>{{ m.nick }}</b> {{ m.text }}
      </div>
    </div>

    <div class="chatbar" v-show="!isTouch || mobileChatOpen" :class="{ mobile: isTouch }">
      <input
        ref="inputRef"
        v-model="chatInput"
        maxlength="200"
        :placeholder="isTouch ? '메시지 입력...' : 'Enter 키를 눌러 채팅하기...'"
        @focus="typing = true"
        @blur="typing = false"
        @keydown.enter="sendChatMsg"
      />
      <button @click="sendChatMsg">전송</button>
    </div>

    <!-- 모바일 터치 컨트롤 -->
    <template v-if="isTouch">
      <div
        class="touch-move-zone"
        @touchstart.prevent="joyStart"
        @touchmove.prevent="joyMove"
        @touchend.prevent="joyEnd"
        @touchcancel.prevent="joyEnd"
      ></div>
      <div
        v-if="joy.active"
        class="joy-float"
        :style="{ left: joy.baseX + 'px', top: joy.baseY + 'px' }"
      >
        <div class="joy-ring"></div>
        <div class="joy-stick" :style="{ transform: `translate(${joy.tx}px, ${joy.ty}px)` }"></div>
      </div>
      <div class="tbtns">
        <button class="tbtn chat" @click="openMobileChat">💬</button>
        <button class="tbtn veh" :class="{ ready: vehReady }" @click="toggleVehicle">
          {{ vehBtnLabel }}
        </button>
      </div>
    </template>

    <div v-if="vehicleHint && !isTouch" class="vhint">{{ vehicleHint }}</div>
    <div class="help" v-if="!isTouch">방향키 / WASD 이동 · Enter 채팅 · F 탈것</div>
  </div>
</template>

<style scoped>
.game {
  position: fixed;
  inset: 0;
  overflow: hidden;
  background: #9ed36a;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
  overscroll-behavior: none;
}
.world {
  display: block;
  width: 100%;
  height: 100%;
}
.hud-top {
  position: fixed;
  top: 14px;
  left: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px 6px 6px;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  font-weight: 700;
  color: #3a2fb0;
}
.hud-top img { width: 30px; height: 30px; border-radius: 8px; }
.hud-top .count { color: #1ca35a; font-size: 13px; }
.chatlog {
  position: fixed;
  left: 14px;
  bottom: 64px;
  width: 320px;
  max-width: 60vw;
  display: flex;
  flex-direction: column;
  gap: 3px;
  pointer-events: none;
}
.chatlog .line {
  align-self: flex-start;
  max-width: 100%;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.3;
}
.chatlog .line b { color: #ffd86b; margin-right: 4px; }
.chatbar {
  position: fixed;
  left: 14px;
  bottom: 14px;
  display: flex;
  gap: 6px;
}
.chatbar input {
  width: 320px;
  max-width: 60vw;
  padding: 11px 14px;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  outline: none;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}
.chatbar button {
  padding: 0 18px;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6a5cff, #9a5cff);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}
.vhint {
  position: fixed;
  left: 50%;
  bottom: 64px;
  transform: translateX(-50%);
  padding: 9px 18px;
  background: rgba(106, 92, 255, 0.95);
  color: #fff;
  font-weight: 700;
  font-size: 14px;
  border-radius: 14px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  pointer-events: none;
  white-space: nowrap;
}
.help {
  position: fixed;
  right: 14px;
  bottom: 14px;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.85);
  border-radius: 12px;
  font-size: 12px;
  color: #555;
  font-weight: 600;
}

/* ===== 모바일 터치 컨트롤 ===== */
.touch-move-zone {
  position: fixed;
  inset: 0;
  z-index: 10;
  touch-action: none;
}
.joy-float {
  position: fixed;
  z-index: 15;
  width: 0;
  height: 0;
  pointer-events: none;
}
.joy-ring {
  position: absolute;
  left: -62px;
  top: -62px;
  width: 124px;
  height: 124px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.14);
  border: 2px solid rgba(255, 255, 255, 0.55);
}
.joy-stick {
  position: absolute;
  left: -29px;
  top: -29px;
  width: 58px;
  height: 58px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.82);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
.tbtns {
  position: fixed;
  right: 20px;
  bottom: 34px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  z-index: 20;
}
.tbtn {
  width: 82px;
  height: 82px;
  border-radius: 50%;
  border: none;
  font-size: 15px;
  font-weight: 800;
  color: #fff;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.3);
  touch-action: manipulation;
}
.tbtn.chat {
  background: rgba(0, 0, 0, 0.5);
  font-size: 32px;
}
.tbtn.veh {
  background: linear-gradient(135deg, #6a5cff, #9a5cff);
  opacity: 0.5;
  transition: opacity 0.15s, transform 0.1s;
}
.tbtn.veh.ready {
  opacity: 1;
  transform: scale(1.06);
}
.chatbar.mobile {
  top: 10px;
  left: 10px;
  right: 10px;
  bottom: auto;
  z-index: 30;
}
.chatbar.mobile input {
  width: auto;
  flex: 1;
  font-size: 16px;
}
.chatlog.touch {
  bottom: auto;
  top: 58px;
  left: 10px;
  max-width: 75vw;
}
</style>
