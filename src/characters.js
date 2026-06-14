export const CHARACTERS = [
  { id: 'red',    name: '레디',     color: '#ff5a5a', hair: '#5a2b2b', dark: '#3a2530' },
  { id: 'blue',   name: '블루',     color: '#4a86ff', hair: '#2b3a5a', dark: '#26304a' },
  { id: 'green',  name: '그린',     color: '#3ec17a', hair: '#2b5a3a', dark: '#264a30' },
  { id: 'yellow', name: '써니',     color: '#ffc233', hair: '#9a6a1f', dark: '#5a4520' },
  { id: 'purple', name: '바이올렛', color: '#a96bff', hair: '#4a2b5a', dark: '#3a2640' },
  { id: 'pink',   name: '핑키',     color: '#ff7ac1', hair: '#a02b6b', dark: '#5a2645' },
  { id: 'cyan',   name: '아쿠아',   color: '#33d6d6', hair: '#1f7a7a', dark: '#204a4a' },
  { id: 'orange', name: '망고',     color: '#ff8c42', hair: '#a0501f', dark: '#5a3520' },
]

export function charById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0]
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// Draws a cute chibi character. (cx, footY) is the point between the feet.
export function drawCharacter(ctx, char, cx, footY, opts = {}) {
  const dir = opts.dir ?? 1
  const frame = opts.frame ?? 0
  const walking = opts.walking ?? false
  const swing = walking ? Math.sin(frame * 0.35) * 4 : 0
  const bob = walking ? Math.abs(Math.sin(frame * 0.35)) * 2 : 0
  const fy = footY - bob

  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  ctx.beginPath()
  ctx.ellipse(cx, footY + 1, 14, 5, 0, 0, Math.PI * 2)
  ctx.fill()

  // legs
  ctx.strokeStyle = char.dark
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.beginPath(); ctx.moveTo(cx - 5, fy - 12); ctx.lineTo(cx - 5 + swing, fy - 1); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + 5, fy - 12); ctx.lineTo(cx + 5 - swing, fy - 1); ctx.stroke()

  // arms
  ctx.strokeStyle = char.color
  ctx.lineWidth = 5
  ctx.beginPath(); ctx.moveTo(cx - 10, fy - 28); ctx.lineTo(cx - 15 - swing * 0.5, fy - 17); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(cx + 10, fy - 28); ctx.lineTo(cx + 15 + swing * 0.5, fy - 17); ctx.stroke()

  // body
  ctx.fillStyle = char.color
  roundRect(ctx, cx - 12, fy - 32, 24, 22, 9)
  ctx.fill()

  // head
  const hy = fy - 44
  ctx.fillStyle = '#ffe0bd'
  ctx.beginPath(); ctx.arc(cx, hy, 13, 0, Math.PI * 2); ctx.fill()

  // hair (top half)
  ctx.fillStyle = char.hair
  ctx.beginPath(); ctx.arc(cx, hy, 13, Math.PI, 2 * Math.PI); ctx.closePath(); ctx.fill()
  ctx.beginPath(); ctx.arc(cx, hy, 13, Math.PI * 0.92, Math.PI * 1.08); ctx.lineTo(cx, hy); ctx.fill()

  // eyes (shift slightly toward facing direction)
  const eo = dir * 2
  ctx.fillStyle = '#3a2b2b'
  ctx.beginPath(); ctx.arc(cx - 4 + eo, hy + 1, 1.9, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 5 + eo, hy + 1, 1.9, 0, Math.PI * 2); ctx.fill()

  // cheeks
  ctx.fillStyle = 'rgba(255,120,120,0.35)'
  ctx.beginPath(); ctx.arc(cx - 6 + eo, hy + 5, 2.4, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(cx + 7 + eo, hy + 5, 2.4, 0, Math.PI * 2); ctx.fill()
}
