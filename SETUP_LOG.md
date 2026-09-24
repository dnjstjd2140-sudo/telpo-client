# 클라이언트 세팅 기록

작성일: 2026-09-24
기준 문서: `../여행계획_지도서비스_명세서.md`

---

## 완료된 것

### 프로젝트 스캐폴딩
- Vite + React + TypeScript (`npm create vite@latest . -- --template react-ts`)
- 추가 패키지: `react-router-dom`, `axios`, `zustand`
- 개발용: `kakao.maps.d.ts` (카카오맵 SDK 타입 정의)

### 설정 파일
- `vite.config.ts`
  - 경로 별칭 `@/*` → `src/*`
  - dev 서버 `/api` 요청을 `http://localhost:8080`(Spring Boot)로 프록시
- `tsconfig.app.json`
  - `paths`에 `@/*` 별칭 등록
  - `types`에 `kakao.maps.d.ts` 추가
- `.env.example` / `.env`
  - `VITE_KAKAO_JS_KEY` — 카카오 JavaScript 키 (값 비어있음, 발급 필요)
  - `VITE_API_BASE_URL=/api`
  - `.env`는 `.gitignore`에서 제외 (`.env.example`만 커밋 대상)
- `index.html` — 제목/lang을 프로젝트에 맞게 수정

### 폴더 구조 (로직/UI 분리 원칙대로)
```
src/
  api/         client.ts(axios 인스턴스), trips.ts, places.ts, routes.ts
               → 명세 7장 API 표와 1:1 매칭되는 함수만 존재, 실제 응답 처리 로직 없음
  types/       trip.ts, route.ts — 명세 6장 데이터 모델 기반 타입
  lib/
    kakaoMapLoader.ts  카카오맵 SDK를 1회만 로드하는 유틸
    localTrips.ts      비로그인 사용자용 localStorage 캐시 (trip 목록)
  components/map/
    MapView.tsx        카카오 SDK 호출을 이 컴포넌트 안으로만 한정 (마커/경로선 표시)
  store/
    tripStore.ts       zustand — 현재 편집 중인 trip 상태
  pages/
    HomePage.tsx       여행 생성 폼 + 내 여행 목록(localStorage)
    TripEditPage.tsx   /t/:editToken — 편집 화면 (지도 + 사이드바 뼈대만)
    TripSharePage.tsx  /s/:shareToken — 읽기 전용 화면
  App.tsx              라우팅 테이블
```

### 검증
- `npx tsc -b` 통과
- `npm run lint` (oxlint) 통과
- `npm run build` 통과
- `npm run dev` 로 로컬 구동 확인 (http://localhost:5173, 200 응답)

---

## 남은 것 (다음에 할 일)

### 필수 — 바로 막히는 것
- [ ] 카카오 디벨로퍼스에서 앱 생성 → JavaScript 키 발급 → `.env`의 `VITE_KAKAO_JS_KEY`에 입력
      (도메인 등록: `http://localhost:5173` 필수, 명세 12장 체크리스트 참고)
- [ ] `telpo-server` 쪽 API가 아직 없어서 현재는 프론트만 실행 가능, 실제 데이터 연동 불가

### 기능 구현 (뼈대만 있고 내용 없음)
- [ ] `HomePage`: 에러 처리, 로딩 상태 UI
- [ ] `TripEditPage` 사이드바: 일자별 장소 목록, 드래그로 순서 변경(dnd 라이브러리 미설치),
      장소 검색 UI, 메모/체류시간 편집
- [ ] 자동 저장 (수 초 단위 서버 반영) — 현재 `tripStore`에 `isDirty` 플래그만 있고 저장 트리거 로직 없음
- [ ] 경로선 표시 연동 (`/api/routes` 호출 → `MapView`의 `route` prop에 연결)
- [ ] 추천 방문 순서 최적화 UI (`/api/routes/optimize` 연동)
- [ ] "편집 링크 복사" / "나에게 보내기" 버튼
- [ ] 경로 이미지로 내보내기 (클라이언트 캡처 vs 서버 렌더링 — 명세 13장 미결정 사항)
- [ ] `navigator.storage.persist()` 요청 추가

### 설치되지 않은 것 (필요해지면 추가)
- 드래그 정렬 라이브러리 (예: `@dnd-kit/core`)
- 폼/검증 라이브러리 (필요 시)
- UI 컴포넌트 라이브러리 / 스타일링 방식 (현재 인라인 스타일 + 순수 CSS만 사용, 미결정)

### 명세서상 미결정 사항 (13장, 프론트에도 영향)
- [ ] 이동수단 범위 (자동차만? 도보/대중교통 API 제공 여부에 따라 UI 옵션 달라짐)
- [ ] 이미지 내보내기 방식
- [ ] 로그인 도입 시점 — 도입되면 `localTrips.ts` claim 로직, 인증 상태 관리 추가 필요
