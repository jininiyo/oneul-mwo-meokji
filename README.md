# 오늘 뭐먹지? v31 — BC카드 eat.pl k-skill 연동

## 변경 사항
- `/api/eatpl/search`가 공개된 k-skill 프록시의 GET `/v1/bccard-eatpl/search`를 서버 측에서 호출합니다.
- 앱은 기존 `/api/eatpl/search`를 그대로 사용하므로 GitHub에 이 파일들을 덮어쓰기 업로드하면 Vercel이 자동 재배포합니다.
- API 인증값을 프런트엔드에 노출하지 않습니다. 프록시의 운영 설정은 프록시 운영 주체가 담당합니다.
- 프록시 응답에서 실제 eat.pl 상세 URL이 있는 가맹점만 표시하며 URL을 변경하지 않습니다.

## 업데이트
1. ZIP 압축을 풉니다.
2. 기존 GitHub 저장소 `oneul-mwo-meokji`에서 `api/eatpl/search.js`, `api/health.js`, `index.html`을 같은 경로로 교체합니다.
3. Commit changes 후 Vercel의 자동 재배포를 기다립니다.
4. `https://oneul-mwo-meokji-one.vercel.app/api/health`에서 `mode: kskill-proxy`를 확인합니다.
5. `/api/eatpl/search?location=서울%20중구`에서 실제 `items`가 반환되는지 확인합니다.
6. 앱 추천 결과에서 실제 검색과 eat.pl 상세 링크 클릭을 테스트합니다.

## 주의
- k-skill 프록시가 현재 인증 및 upstream 연결을 완료했는지는 이 빌드 환경에서 검증하지 못했습니다.
- 응답 구조는 공개 instruction.md를 기준으로 다수의 배열 형태를 수용하도록 작성했습니다. 실제 응답이 다르면 추가 수정이 필요합니다.
- 공모전 유입은 실제 사용자가 등록된 도메인에서 외부 브라우저로 상세 URL에 직접 방문해야 집계됩니다.
- 공개 저장소에 기관코드, 비밀키를 업로드하지 마세요.
- 참고: https://github.com/NomaDamas/k-skill/tree/main/bccard-eatpl-search
