import { roundRect } from './characters.js'

export const VEHICLES = {
  kickboard:  { name: '킥보드',   speed: 6,  seat: 14 },
  bike:       { name: '자전거',   speed: 7,  seat: 20 },
  car:        { name: '자동차',   speed: 9,  seat: 16 },
  motorcycle: { name: '오토바이', speed: 10, seat: 18 },
}

function wheel(ctx, x, y, r, spin) {
  ctx.fillStyle = '#2b2b2b'
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
  ctx.fillStyle = '#888'
  ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, Math.PI * 2); ctx.fill()
  ctx.strokeStyle = '#cfcfcf'; ctx.lineWidth = 1.5
  for (let i = 0; i < 4; i++) {
    const a = spin + (i * Math.PI) / 2
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8); ctx.stroke()
  }
}

// (cx, footY) = ground point. Vehicle is drawn facing `dir`.
export function drawVehicle(ctx, type, cx, footY, opts = {}) {
  const dir = opts.dir || 1
  const frame = opts.frame || 0
  const moving = opts.moving || false
  const spin = moving ? frame * 0.45 : 0

  ctx.fillStyle = 'rgba(0,0,0,0.15)'
  ctx.beginPath()
  ctx.ellipse(cx, footY + 2, type === 'car' ? 34 : 24, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.save()
  ctx.translate(cx, 0)
  ctx.scale(dir, 1)
  if (type === 'kickboard') drawKick(ctx, footY, spin)
  else if (type === 'bike') drawBike(ctx, footY, spin)
  else if (type === 'car') drawCar(ctx, footY, spin)
  else if (type === 'motorcycle') drawMoto(ctx, footY, spin)
  ctx.restore()
}

function drawKick(ctx, fy, spin) {
  const wy = fy - 6, r = 6
  wheel(ctx, -14, wy, r, spin)
  wheel(ctx, 14, wy, r, spin)
  ctx.fillStyle = '#444'
  roundRect(ctx, -16, fy - 11, 32, 4, 2); ctx.fill()
  ctx.strokeStyle = '#e0463c'; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(14, fy - 9); ctx.lineTo(16, fy - 42); ctx.lineTo(9, fy - 44); ctx.stroke()
}

function drawBike(ctx, fy, spin) {
  const wy = fy - 12, r = 12
  wheel(ctx, -18, wy, r, spin)
  wheel(ctx, 18, wy, r, spin)
  ctx.strokeStyle = '#2b8ad6'; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-18, wy); ctx.lineTo(2, wy); ctx.lineTo(11, fy - 30)
  ctx.moveTo(2, wy); ctx.lineTo(-3, fy - 28); ctx.lineTo(-18, wy)
  ctx.moveTo(18, wy); ctx.lineTo(11, fy - 30)
  ctx.stroke()
  ctx.fillStyle = '#333'; roundRect(ctx, -9, fy - 31, 12, 4, 2); ctx.fill()
  ctx.beginPath(); ctx.moveTo(11, fy - 30); ctx.lineTo(17, fy - 34); ctx.stroke()
}

function drawMoto(ctx, fy, spin) {
  const wy = fy - 13, r = 13
  wheel(ctx, -20, wy, r, spin)
  wheel(ctx, 20, wy, r, spin)
  ctx.fillStyle = '#e0463c'
  roundRect(ctx, -22, fy - 26, 42, 12, 5); ctx.fill()
  ctx.fillStyle = '#333'; roundRect(ctx, -10, fy - 30, 18, 5, 2); ctx.fill()
  ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(17, fy - 26); ctx.lineTo(25, fy - 35); ctx.stroke()
  ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(25, fy - 30, 3, 0, Math.PI * 2); ctx.fill()
}

function drawCar(ctx, fy, spin) {
  const wy = fy - 9, r = 9
  wheel(ctx, -20, wy, r, spin)
  wheel(ctx, 20, wy, r, spin)
  ctx.fillStyle = '#ff8c42'
  roundRect(ctx, -33, fy - 23, 66, 17, 8); ctx.fill()
  ctx.fillStyle = '#d9742f'
  roundRect(ctx, -16, fy - 30, 24, 9, 4); ctx.fill()
  ctx.fillStyle = '#ffd23f'
  ctx.beginPath(); ctx.arc(32, fy - 16, 3.2, 0, Math.PI * 2); ctx.fill()
}
