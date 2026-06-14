<script setup>
import { ref, watch, computed } from 'vue'
import { state, checkNick } from '../net.js'
import { CHARACTERS } from '../characters.js'
import CharacterPreview from './CharacterPreview.vue'

const emit = defineEmits(['enter'])

const nick = ref('')
const selected = ref(CHARACTERS[0].id)
let timer = null

watch(nick, (v) => {
  const t = v.trim()
  clearTimeout(timer)
  if (t.length === 0) {
    state.nickStatus = { nick: '', available: null, checking: false }
    return
  }
  if (t.length < 2 || t.length > 12) {
    state.nickStatus = { nick: t, available: false, checking: false, tooShort: true }
    return
  }
  state.nickStatus = { nick: t, available: null, checking: true }
  timer = setTimeout(() => checkNick(t), 350)
})

const status = computed(() => state.nickStatus)
const synced = computed(() => status.value.nick === nick.value.trim())
const canEnter = computed(() => synced.value && status.value.available === true)

const statusText = computed(() => {
  const s = status.value
  if (!nick.value.trim()) return ''
  if (s.tooShort) return '닉네임은 2~12글자로 입력해주세요'
  if (s.checking || !synced.value) return '중복 확인 중...'
  if (s.available === true) return '사용할 수 있는 닉네임이에요!'
  if (s.available === false) return '이미 사용 중인 닉네임이에요'
  return ''
})

const statusClass = computed(() => {
  const s = status.value
  if (!nick.value.trim()) return ''
  if (s.checking || !synced.value) return 'checking'
  if (s.available === true) return 'ok'
  return 'bad'
})

function enter() {
  if (canEnter.value) emit('enter', { nick: nick.value.trim(), char: selected.value })
}
</script>

<template>
  <div class="lobby">
    <div class="card">
      <img class="logo" src="/favicon.png" alt="소셜랜드" />
      <h1>소셜랜드</h1>
      <p class="sub">광장에서 친구들과 만나 자유롭게 대화해요</p>

      <label class="field">
        <span>닉네임</span>
        <input
          v-model="nick"
          maxlength="12"
          placeholder="2~12글자"
          autofocus
          @keydown.enter="enter"
        />
      </label>
      <div class="status" :class="statusClass">{{ statusText }}</div>

      <div class="pick-label">캐릭터 선택</div>
      <div class="grid">
        <button
          v-for="c in CHARACTERS"
          :key="c.id"
          class="cell"
          :class="{ active: selected === c.id }"
          @click="selected = c.id"
        >
          <CharacterPreview :char="c" :size="80" />
          <span>{{ c.name }}</span>
        </button>
      </div>

      <button class="enter" :disabled="!canEnter" @click="enter">
        광장 입장하기
      </button>
      <div class="online">현재 접속 {{ Object.keys(state.players).length }}명</div>
    </div>
  </div>
</template>

<style scoped>
.lobby {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: radial-gradient(circle at 30% 20%, #6a5cff 0%, #4a3fd0 40%, #2a2070 100%);
  overflow: auto;
  padding: 24px;
}
.card {
  width: 420px;
  max-width: 100%;
  background: rgba(255, 255, 255, 0.97);
  border-radius: 24px;
  padding: 28px 26px 22px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
  text-align: center;
}
.logo {
  width: 84px;
  height: 84px;
  border-radius: 20px;
  box-shadow: 0 8px 20px rgba(80, 60, 255, 0.35);
}
h1 {
  margin: 10px 0 2px;
  font-size: 28px;
  color: #3a2fb0;
  letter-spacing: 1px;
}
.sub {
  margin: 0 0 18px;
  color: #777;
  font-size: 13px;
}
.field {
  display: block;
  text-align: left;
}
.field span {
  font-size: 13px;
  color: #555;
  font-weight: 600;
}
.field input {
  width: 100%;
  margin-top: 6px;
  padding: 12px 14px;
  border: 2px solid #e2e0f0;
  border-radius: 12px;
  font-size: 16px;
  box-sizing: border-box;
  outline: none;
  transition: border-color 0.15s;
}
.field input:focus {
  border-color: #6a5cff;
}
.status {
  min-height: 18px;
  margin: 8px 2px 4px;
  font-size: 12.5px;
  text-align: left;
  color: #999;
}
.status.ok { color: #1ca35a; }
.status.bad { color: #e0463c; }
.status.checking { color: #9a8bff; }
.pick-label {
  margin: 12px 0 8px;
  text-align: left;
  font-size: 13px;
  font-weight: 600;
  color: #555;
}
.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 6px 2px 4px;
  border: 2px solid transparent;
  border-radius: 14px;
  background: #f3f2fb;
  cursor: pointer;
  transition: transform 0.1s, border-color 0.15s, background 0.15s;
}
.cell:hover { transform: translateY(-2px); }
.cell.active {
  border-color: #6a5cff;
  background: #ecebff;
}
.cell span {
  font-size: 11px;
  color: #555;
  font-weight: 600;
}
.cell canvas {
  width: 100%;
  height: auto;
  max-width: 80px;
}
@media (max-width: 430px) {
  .card { padding: 22px 16px 18px; border-radius: 20px; }
  h1 { font-size: 24px; }
  .grid { gap: 6px; }
  .cell { padding: 5px 1px 3px; }
}
.enter {
  width: 100%;
  margin-top: 18px;
  padding: 14px;
  border: none;
  border-radius: 14px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(135deg, #6a5cff, #9a5cff);
  cursor: pointer;
  transition: opacity 0.15s, transform 0.1s;
}
.enter:hover:not(:disabled) { transform: translateY(-1px); }
.enter:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.online {
  margin-top: 10px;
  font-size: 12px;
  color: #999;
}
</style>
