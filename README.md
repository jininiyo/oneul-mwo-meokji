오늘 뭐먹지? v43

- 하단 홈/정산/MY 탭을 뷰포트 하단에 고정, 본문만 스크롤
- 모바일 safe-area와 하단 콘텐츠 겹침 방지
- 룸/예약은 eat.pl 검색 API에 정보가 없어 확인 불가함을 명확히 표시
- v42 기존 정산·추천·OCR·GPS 및 API 유지

GitHub의 index.html만 교체하면 됩니다.

v44 지역 선택 개선
- 위치 질문 옆에 작은 '현재 위치로 찾기' 버튼
- 지역명·역·건물 검색 및 지도 펼치기/핀 이동
- 지도는 OpenStreetMap + Leaflet, 주소 검색은 /api/eatpl/geocode.js 사용
- 기존 TMAP 연동은 도보 경로 계산용으로 유지. TMAP 지도 SDK와는 별도 기능
- eat.pl 식당 검색은 행정구역 기반. 핀 위치가 검색 반경을 강제하지 않음
- 지도 검색을 사용하려면 새 api/eatpl/geocode.js 파일도 함께 배포
