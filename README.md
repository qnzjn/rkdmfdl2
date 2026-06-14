# 소셜랜드 (SocialLand)

메타버스형 2D 멀티플레이 광장. 캐릭터를 고르고 광장에 입장해 다른 사람들과
이동·채팅하고, 자전거·킥보드·오토바이·자동차 같은 탈것을 타고 다닐 수 있어요.

## 로컬 실행

```bash
npm install
npm start        # 게임 서버(3001) + 웹(5173) 동시 실행
```

브라우저에서 http://localhost:5173 접속.

- 이동: 방향키 / WASD
- 채팅: Enter
- 탈것: 가까이 가서 F (다시 F로 내리기)

## 배포 구조

| 부분 | 호스팅 |
|------|--------|
| 화면(프론트) | **Vercel** — Vite 정적 빌드 |
| 게임 서버(server.js) | **Render** — Node WebSocket 상시 실행 |

### 1) Render — 게임 서버

1. https://render.com 로그인 → New → **Blueprint**
2. 이 깃허브 저장소 선택 → `render.yaml` 자동 인식 → 생성
3. 서비스 이름은 `rkdmfdl2-server` (URL: `https://rkdmfdl2-server.onrender.com`)

> 클라이언트(`src/net.js`)의 `PROD_WS` 가 위 주소(`wss://...`)를 가리킵니다.
> Render 서비스 이름을 바꾸면 `PROD_WS` 도 같이 바꿔야 합니다.

### 2) Vercel — 화면

1. https://vercel.com 로그인 → Add New → **Project**
2. 이 깃허브 저장소 선택 → Vite 자동 인식 → Deploy
3. (선택) 환경변수 `VITE_WS_URL` 에 `wss://<렌더주소>` 를 넣으면 그 값을 우선 사용

배포 후 Vercel 주소로 접속하면 전 세계 누구나 같은 광장에서 멀티플레이됩니다.
(Render 무료 플랜은 15분 미사용 시 잠들어, 첫 접속만 30~50초 느릴 수 있어요.)
