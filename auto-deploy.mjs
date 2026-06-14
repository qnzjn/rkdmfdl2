// 소셜랜드 자동 배포 감시기
// 파일을 저장하면 자동으로 git commit + push → Vercel·Render 자동 재배포
// 실행: npm run auto   (종료: Ctrl+C)

import { watch } from 'fs'
import { exec } from 'child_process'
import { promisify } from 'util'

const run = promisify(exec)

const IGNORE = /(^|[\\/])(node_modules|dist|\.git|\.vercel)([\\/]|$)/
const DEBOUNCE_MS = 2500

let timer = null
let busy = false
let pending = false

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(deploy, DEBOUNCE_MS)
}

async function deploy() {
  if (busy) { pending = true; return }
  busy = true
  try {
    const { stdout: status } = await run('git status --porcelain')
    if (!status.trim()) { console.log('  변경 없음 — 건너뜀'); return }

    const stamp = new Date().toLocaleString('ko-KR')
    await run('git add -A')
    await run(`git -c user.name="qnzjn123" -c user.email="qnzjn8@gmail.com" commit -m "auto: ${stamp}"`)
    console.log(`  📝 커밋: auto: ${stamp}`)
    process.stdout.write('  ⬆  푸시 중...')
    await run('git push')
    console.log(' 완료!')
    console.log('  ✅ Vercel·Render 자동 재배포가 시작됐어요 (1~3분 뒤 반영)\n')
  } catch (e) {
    console.error('  ❌ 배포 실패:', (e.stderr || e.message || '').toString().trim(), '\n')
  } finally {
    busy = false
    if (pending) { pending = false; schedule() }
  }
}

console.log('🟢 소셜랜드 자동 감시기 시작')
console.log('   파일을 저장할 때마다 자동으로 깃 푸시 → 배포합니다.')
console.log('   (종료하려면 Ctrl+C)\n')

watch('.', { recursive: true }, (_event, filename) => {
  if (!filename) return
  const name = filename.toString()
  if (IGNORE.test(name)) return
  console.log('  👀 변경 감지:', name)
  schedule()
})
