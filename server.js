import http from 'http'
import { WebSocketServer } from 'ws'

const PORT = process.env.PORT || 3001

// plain HTTP endpoint so hosting health checks pass; WebSocket shares the port
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' })
  res.end('소셜랜드 서버 가동 중')
})
const wss = new WebSocketServer({ server })

const players = new Map() // ws -> { id, nick, char, x, y, dir, vehicle }
const vehicles = new Map() // vid -> { id, type, x, y }
let nextId = 1
let nextVid = 1

const CCX = 1200, CCY = 800
function spawnVehicle(type, x, y) {
  const id = nextVid++
  vehicles.set(id, { id, type, x, y })
}
spawnVehicle('bike', CCX - 430, CCY - 70)
spawnVehicle('bike', CCX + 430, CCY + 70)
spawnVehicle('kickboard', CCX - 70, CCY - 430)
spawnVehicle('kickboard', CCX + 70, CCY + 430)
spawnVehicle('motorcycle', CCX + 430, CCY - 90)
spawnVehicle('motorcycle', CCX - 130, CCY + 440)
spawnVehicle('car', CCX - 440, CCY + 100)
spawnVehicle('car', CCX + 140, CCY + 440)

function broadcast(obj, except) {
  const msg = JSON.stringify(obj)
  for (const client of wss.clients) {
    if (client.readyState === 1 && client !== except) client.send(msg)
  }
}

function nickTaken(nick) {
  const low = nick.toLowerCase()
  for (const p of players.values()) {
    if (p.nick && p.nick.toLowerCase() === low) return true
  }
  return false
}

wss.on('connection', (ws) => {
  let me = null

  ws.on('message', (data) => {
    let msg
    try { msg = JSON.parse(data) } catch { return }

    if (msg.type === 'checkNick') {
      const nick = (msg.nick || '').trim()
      const available = nick.length >= 2 && nick.length <= 12 && !nickTaken(nick)
      ws.send(JSON.stringify({ type: 'nickResult', nick: msg.nick, available }))

    } else if (msg.type === 'join') {
      const nick = (msg.nick || '').trim()
      if (nick.length < 2 || nick.length > 12 || nickTaken(nick)) {
        ws.send(JSON.stringify({ type: 'joinDenied', reason: '이미 사용 중인 닉네임이에요.' }))
        return
      }
      me = {
        id: nextId++,
        nick,
        char: msg.char || 'red',
        x: 1100 + Math.random() * 200,
        y: 720 + Math.random() * 160,
        dir: 1,
        vehicle: null,
      }
      players.set(ws, me)
      ws.send(JSON.stringify({
        type: 'init',
        id: me.id,
        players: [...players.values()],
        vehicles: [...vehicles.values()],
      }))
      broadcast({ type: 'playerJoined', player: me }, ws)
      console.log(`+ ${nick} 입장 (현재 ${players.size}명)`)

    } else if (msg.type === 'move' && me) {
      me.x = msg.x; me.y = msg.y; me.dir = msg.dir
      broadcast({ type: 'playerMoved', id: me.id, x: me.x, y: me.y, dir: me.dir }, ws)

    } else if (msg.type === 'chat' && me) {
      const text = (msg.text || '').toString().slice(0, 200).trim()
      if (text) broadcast({ type: 'chat', id: me.id, nick: me.nick, text })

    } else if (msg.type === 'mount' && me && !me.vehicle) {
      const v = vehicles.get(msg.vid)
      if (v) {
        vehicles.delete(v.id)
        me.vehicle = v.type
        broadcast({ type: 'mounted', id: me.id, vid: v.id, vehicle: v.type })
      }

    } else if (msg.type === 'dismount' && me && me.vehicle) {
      const id = nextVid++
      const parked = { id, type: me.vehicle, x: me.x, y: me.y }
      vehicles.set(id, parked)
      me.vehicle = null
      broadcast({ type: 'dismounted', id: me.id, vehicle: parked })
    }
  })

  ws.on('close', () => {
    if (me) {
      // leave the ridden vehicle parked where they were
      if (me.vehicle) {
        const id = nextVid++
        const parked = { id, type: me.vehicle, x: me.x, y: me.y }
        vehicles.set(id, parked)
        broadcast({ type: 'dismounted', id: me.id, vehicle: parked })
      }
      players.delete(ws)
      broadcast({ type: 'playerLeft', id: me.id })
      console.log(`- ${me.nick} 퇴장 (현재 ${players.size}명)`)
    }
  })
})

server.listen(PORT, () => {
  console.log(`소셜랜드 서버 실행 중 → 포트 ${PORT}`)
})
