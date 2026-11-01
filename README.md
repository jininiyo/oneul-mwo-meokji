# 오늘 뭐먹지? v30 — Vercel 배포용

## 배포 (GitHub 사용)

1. GitHub에 **새 공개 또는 비공개 저장소**를 만듭니다.
2. 이 ZIP의 압축을 풀고, **내부 파일 4개(index.html, vercel.json, README.md, api 폴더)를 저장소 루트에 업로드**합니다. ZIP 자체를 저장소에 업로드하지 마세요.
3. Vercel 대시보드 > Add New > Project > Import Git Repository 에서 저장소를 선택합니다.
4. Framework Preset: **Other**. Root Directory: `./`. Build Command는 비워두고 Deploy를 누릅니다.
5. 배포된 `https://...vercel.app` 주소에서 화면을 확인합니다. `https://...vercel.app/api/health`는 `{ "ok": true, "configured": false }`가 정상입니다.
6. 실제 API 권한 확보 후 Vercel Project > Settings > Environment Variables에 `EATPL_INST_NM` 기관코드를 입력하고 **Redeploy**합니다. 필요하면 `EATPL_BASE_URL`도 공식 허용 URL로 설정합니다. **기관코드는 index.html 또는 GitHub에 넣지 마세요.**

## 유의

- 현재 배포 직후에는 앱의 데모 추천/정산 UI만 동작하며, BC카드 실제 데이터는 인증·접근 권한과 IP 승인 없이는 조회되지 않습니다.
- BC카드가 **고정 출발지 IP를 요구하는 경우 Vercel 일반 서버리스 함수는 출발지 IP가 고정되지 않을 수 있습니다.** BC카드 승인 환경이나 고정 IP 프록시/별도 서버가 필요할 수 있습니다.
- Vercel Hobby 무료 플랜은 **비상업적 개인 사용 제한**이 있으므로, 상금·리워드가 있는 공모전 용도가 허용되는지 Vercel 정책을 확인하고 적합한 요금제/호스팅을 사용하세요.
- 공모전 등록 도메인과 실제 사용자 접속 도메인은 일치해야 합니다. 최종 도메인을 정하고 신청하세요.
- `merUrl`은 API 응답을 그대로 열어야 합니다. 별도 추적 파라미터·리다이렉트를 추가하지 마세요.
- 기존 로그인·정산 저장은 브라우저 기반 데모로, 다른 사용자와 실시간 동기화되는 실제 서비스 인증/DB가 아닙니다.
