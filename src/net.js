import { reactive } from 'vue'

export const state = reactive({
  connected: false,
  myId: null,
  players: {}, // id -> { id, nick, char, x, y, dir, vehicle, msg, msgTime }
  vehicles: {}, // vid -> { id, type, x, y }
  nickStatus: { nick: '', available: null, checking: false },
  chatLog: [], // { id, nick, text }
  joinDenied: null,
})

let ws = null
let queue = []

// Render 서버 주소(아래 render.yaml 의 service name 과 일치해야 함)
const PROD_WS = 'wss://rkdmfdl2-server.onrender.com'

function wsUrl() {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  if (location.protocol === 'https:') return PROD_WS
  return `ws://${location.hostname}:3001`
}

export function connect() {
  if (ws) return
  ws = new WebSocket(wsUrl())

  ws.onopen = () => {
    state.connected = true
    queue.forEach((o) => ws.send(JSON.stringify(o)))
    queue = []
  }
  ws.onclose = () => {
    state.connected = false
    ws = null
  }
  ws.onmessage = (e) => {
    let msg
    try { msg = JSON.parse(e.data) } catch { return }
    handle(msg)
  }
}

function handle(msg) {
  switch (msg.type) {
    case 'nickResult':
      if (msg.nick === state.nickStatus.nick) {
        state.nickStatus.available = msg.available
        state.nickStatus.checking = false
      }
      break
    case 'init':
      state.myId = msg.id
      state.players = {}
      for (const p of msg.players) state.players[p.id] = p
      state.vehicles = {}
      for (const v of msg.vehicles || []) state.vehicles[v.id] = v
      break
    case 'playerJoined':
      state.players[msg.player.id] = msg.player
      break
    case 'playerMoved': {
      const p = state.players[msg.id]
      if (p) { p.x = msg.x; p.y = msg.y; p.dir = msg.dir }
      break
    }
    case 'playerLeft':
      delete state.players[msg.id]
      break
    case 'mounted': {
      const p = state.players[msg.id]
      if (p) p.vehicle = msg.vehicle
      delete state.vehicles[msg.vid]
      break
    }
    case 'dismounted': {
      const p = state.players[msg.id]
      if (p) p.vehicle = null
      state.vehicles[msg.vehicle.id] = msg.vehicle
      break
    }
    case 'chat': {
      const p = state.players[msg.id]
      if (p) { p.msg = msg.text; p.msgTime = Date.now() }
      state.chatLog.push({ id: msg.id, nick: msg.nick, text: msg.text })
      if (state.chatLog.length > 60) state.chatLog.shift()
      break
    }
    case 'joinDenied':
      state.joinDenied = msg.reason
      break
  }
}

export function send(obj) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(obj))
  else queue.push(obj)
}

export function checkNick(nick) {
  send({ type: 'checkNick', nick })
}

export function join(nick, char) {
  state.joinDenied = null
  send({ type: 'join', nick, char })
}

export function sendMove(x, y, dir) {
  send({ type: 'move', x, y, dir })
}

export function sendChat(text) {
  send({ type: 'chat', text })
}

export function sendMount(vid) {
  send({ type: 'mount', vid })
}

export function sendDismount() {
  send({ type: 'dismount' })
}
