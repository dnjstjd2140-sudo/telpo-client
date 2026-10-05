# telpo-client

여행 계획 지도 서비스의 프론트엔드 (React + TypeScript + Vite). 백엔드(`telpo-server`)와 함께
`../여행계획_지도서비스_명세서.md` 명세를 따른다.

## 시작하기

```bash
npm install
cp .env.example .env   # 아래에서 VITE_KAKAO_JS_KEY 채우기
npm run dev
```

개발 서버는 `http://localhost:5173`에서 뜨고, `/api/*` 요청은 `vite.config.ts`의 proxy 설정을 통해
`http://localhost:8080`(Spring Boot 내장 톰캣)으로 전달된다. 배포 환경에서는 Nginx가 같은 역할을 한다.

## 카카오 JavaScript 키 발급

1. [카카오 디벨로퍼스](https://developers.kakao.com)에서 앱 생성 후 **카카오맵 사용 설정 ON**
2. [앱 설정] > [플랫폼 키] > JavaScript 키에 **JavaScript SDK 도메인** 등록
   - `http://localhost:5173` (로컬 개발, 포트까지 정확히)
   - 배포 도메인
3. 발급된 **JavaScript 키**를 `.env`의 `VITE_KAKAO_JS_KEY`에 입력

REST API 키는 서버(`telpo-server`)에만 두고 프론트 코드에는 절대 포함하지 않는다.

## 폴더 구조

```
src/
  api/         axios 인스턴스 + 엔드포인트 함수 (trips, places, routes)
  components/  UI 컴포넌트. 카카오 SDK 호출은 components/map/MapView.tsx 내부로 한정
  lib/         카카오 SDK 로더, localStorage 유틸 등 API와 무관한 순수 로직
  pages/       라우트 단위 화면
  store/       zustand 상태 스토어 (여행 편집 상태)
  types/       서버 API와 맞춘 타입 정의
```

- API 호출·타입·상태관리는 UI 컴포넌트와 분리한다 (추후 React Native 전환 시 재사용 목적).
- 경로 별칭 `@/*` → `src/*` (`tsconfig.app.json`, `vite.config.ts`에 설정됨).

## 라우팅

| 경로 | 화면 |
|---|---|
| `/` | 여행 생성 / 내 여행 목록 (localStorage 캐시) |
| `/t/:editToken` | 편집 화면 |
| `/s/:shareToken` | 읽기 전용 공유 화면 |

## 구현된 기능 (편집 화면)

- 장소 검색 후 추가/삭제, 일자(Day)별 탭으로 구분
- 정류지 순서를 ▲▼ 버튼으로 수동 변경 (같은 날 중복 추가는 자동으로 막음)
- 정류지 사이마다 이동수단(자차/도보/대중교통) 선택 → 구간마다 다른 색의 경로선 +
  예상 소요시간/거리 표시 (`/api/routes`가 Tmap 자동차/보행자/대중교통 API를 그대로 매핑)
- 지도 위에 겹쳐 뜨는 플로팅 패널로 "이번 일정" 목록 + 저장 버튼 표시 (일정이 없으면 안 보임)
- 같은 구간(출발→도착 좌표 + 이동수단) 경로를 다시 조회할 때는 클라이언트 메모리 캐시를
  써서 서버에 재요청하지 않음 (서버의 Tmap 캐시와는 별개로, 수단 토글 시 네트워크 왕복 자체를 줄임)
- 편집 토큰으로 불러오기/저장(PUT), 공유 토큰으로 읽기 전용 보기

## 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 타입체크(`tsc -b`) + 프로덕션 빌드
- `npm run lint` — oxlint
- `npm run preview` — 빌드 결과 로컬 프리뷰
