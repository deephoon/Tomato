# Tomato

Tomato는 Vite 기반의 PWA 포모도로 타이머입니다. 단순 타이머를 넘어서, Three.js로 구현한 3D 유리 토마토 오브젝트, GSAP 기반의 인터랙션, 작업 CRUD, 한국어/영어 전환, Gemini API를 활용한 AI 작업 분해까지 한 화면에서 다루는 "Focus OS" 형태의 싱글 페이지 앱으로 발전해 왔습니다.

이 문서는 현재 저장소 상태를 기준으로 지금까지 진행된 구현 범위와 구조를 정리한 분석형 README입니다.

## 1. 프로젝트 개요

- 프로젝트명: `Tomato`
- 앱 성격: 감성형 PWA 포모도로 타이머
- 핵심 UX 방향:
  - 3D 오브젝트를 중심으로 한 몰입형 타이머 경험
  - 작업별 색상 테마와 세션 상태를 시각적으로 연결
  - 작업 관리, 세션 제어, AI 보조 기능을 단일 SPA 안에 통합
- 현재 브랜치 기준 상태:
  - 기본 브랜치 `main`
  - 최신 기준 커밋: `7655d9a`

## 2. 지금까지의 진행 내역

커밋 로그를 기준으로 보면 프로젝트는 아래 흐름으로 확장되었습니다.

1. `e39e930`
   - 초기 버전인 `Surreal Minimalism PWA Pomodoro Timer` 생성
   - PWA 기반 타이머의 기본 방향 수립
2. `dfd5b9d`
   - 프로젝트명을 `Tomato`로 리네이밍
3. `ac6a937`
   - Three.js 유리 토마토
   - GSAP 애니메이션
   - i18n
   - Interruption Modal
   - Task CRUD 추가
4. `d867c22`
   - 기존 대형 `main.js`를 `6개 모듈`로 분리
   - Layered SPA 구조로 리팩터링
5. `dc5ac42`
   - Gemini 1.5 Flash 기반 AI Task Slicing 연동
6. `7655d9a`
   - 3D Glass Tomato, Layered SPA, AI Task Slicing을 묶어 `Tomato AI OS v1.0` 수준으로 정리

즉, 이 프로젝트는 "감성형 포모도로 타이머"에서 시작해서, 현재는 "시각 몰입형 집중 운영체제"에 가까운 방향까지 구현된 상태입니다.

## 3. 현재 구현된 기능

### 타이머/세션

- 포커스, 브레이크, 아이들 상태 전환
- `Date.now()` 기반 남은 시간 계산으로 드리프트를 줄인 타이머
- 재생, 일시정지, 정지, 세션 종료, 1분 연장
- 타이머 종료 시 전환 모달 표시
- 일시정지 시 interruption modal 표시
- 모바일 진동 API 지원 브라우저에서 종료 진동 호출

### 작업 관리

- 기본 작업 3종 내장
- 작업 추가 / 수정 / 삭제
- 활성 작업 선택
- 작업별 집중 시간, 휴식 시간 설정
- 작업별 테마 색상 2종 + 유리 본체 색상 설정
- 데이터 `localStorage` 영속화

### 시각/인터랙션

- Three.js 기반 유기적 형태의 3D 유리 토마토 렌더링
- 세션 상태에 따라 morph speed / light intensity / shape amplitude 변화
- 남은 시간 비율에 따라 토마토가 수축하는 hourglass 연출
- 오로라 조명, glow sphere, 입자 흩뿌림 효과
- 마우스/터치 움직임에 따른 오브젝트 회전
- GSAP 기반 버튼 스프링 인터랙션, 시트/모달 전환 애니메이션

### 언어 및 PWA

- 한국어 / 영어 전환
- `manifest.json` 및 `sw.js` 기반 기본 PWA 구성
- 서비스 워커 등록
- 최소 캐시 전략 적용

### AI 기능

- Gemini API Key 입력 및 `localStorage` 저장
- 현재 활성 작업 제목을 기반으로 하위 작업 3~4개 생성 요청
- 반환 JSON을 파싱해 하위 작업을 리스트에 추가
- 성공/실패 toast 알림

## 4. 기술 스택

- 런타임/번들러: `Vite`
- UI: 바닐라 JavaScript SPA
- 3D: `Three.js`
- 모션: `GSAP`
- 저장소: `localStorage`
- AI 연동: Google `Gemini 1.5 Flash` REST API
- 배포 형태: 정적 프론트엔드 + PWA

## 5. 디렉터리 구조

```text
.
├── index.html
├── package.json
├── public
│   ├── manifest.json
│   └── sw.js
└── src
    ├── ai-service.js
    ├── main.js
    ├── state.js
    ├── style.css
    ├── three-engine.js
    ├── timer.js
    └── ui-controller.js
```

## 6. 모듈 구조 분석

### `src/main.js`

- 앱 진입점
- 초기 언어 적용
- 첫 활성 작업 지정
- 이벤트 바인딩
- HUD 초기 렌더
- Three.js 렌더 루프 시작

### `src/state.js`

- 전역 상태의 단일 소스 역할
- i18n 사전 정의
- 기본 작업 데이터 정의
- `tasks`, `session`, `prefs` 상태 보관
- 작업/언어/API Key를 `localStorage`에 저장하는 함수 제공

### `src/timer.js`

- 타이머 계산과 세션 모드 전환 담당
- `idle | focus | break` 상태 전환
- `setInterval + Date.now()` 조합으로 시간 계산
- UI와 직접 결합하지 않고 `CustomEvent`(`tomato:statechange`, `tomato:timerend`) 발행

### `src/ui-controller.js`

- DOM 레퍼런스 관리
- HUD 업데이트
- 작업 시트, 작업 폼, 전환 모달, interruption modal 제어
- 작업 CRUD
- 언어 전환
- Gemini API Key 입력 관리
- AI 작업 분해 버튼 처리
- Toast 및 각종 사용자 인터랙션 담당

### `src/three-engine.js`

- 3D 유리 토마토 씬 구성
- 조명, stem, leaf, glow sphere, particle system 관리
- 현재 작업 색상과 세션 상태를 3D 표현에 반영
- 포인터 이동과 남은 시간 기반의 오브젝트 변형 담당

### `src/ai-service.js`

- Gemini REST API 호출 전담
- 프롬프트 생성
- 응답 JSON 파싱
- 하위 작업 배열 형태로 정규화

## 7. 상태 흐름 요약

1. 앱 시작 시 `state.js`에서 로컬 저장값 또는 기본 작업을 불러옵니다.
2. `main.js`가 첫 활성 작업과 기본 남은 시간을 세팅합니다.
3. 사용자가 재생 버튼을 누르면 `timer.js`가 세션 상태를 `focus`로 전환하고 타이머를 시작합니다.
4. 상태 변경은 `CustomEvent`로 전달되고, `ui-controller.js`가 HUD를 갱신합니다.
5. 동시에 `three-engine.js`는 현재 작업 색상과 남은 시간 비율을 반영해 토마토 비주얼을 변경합니다.
6. 타이머 종료 시 UI는 전환 모달을 띄우고 다음 액션을 유도합니다.
7. 사용자는 작업 시트에서 작업을 관리하거나, Gemini를 통해 하위 작업을 생성할 수 있습니다.

## 8. 실행 방법

### 요구 사항

- Node.js
- npm

### 설치 및 실행

```bash
npm install
npm run dev
```

### 프로덕션 빌드

```bash
npm run build
npm run preview
```

## 9. 검증 결과

현재 저장소 상태에서 아래 검증을 수행했습니다.

- `npm run build` 성공

빌드 시 번들 경고도 확인됐습니다.

- `dist/assets/index-*.js` 번들이 약 `605 kB`로 생성되어 Vite chunk size warning 발생
- 즉, 현재 앱은 동작 빌드는 되지만 코드 스플리팅 관점에서는 최적화 여지가 있습니다

## 10. 현재 확인된 제약과 보완 포인트

### 기술적 제약

- 테스트 코드가 없습니다.
- AI 기능은 클라이언트에서 직접 Gemini REST API를 호출하므로 API Key가 브라우저 `localStorage`에 저장됩니다.
- 서비스 워커 캐시는 `/`, `/index.html`, `/manifest.json` 중심의 최소 구성이라 정적 자산 전체 오프라인 지원은 아닙니다.
- 매니페스트에는 `icon-192.png`, `icon-512.png`가 선언되어 있지만 현재 저장소 파일 목록에는 해당 아이콘 파일이 없습니다.

### 개선 후보

- AI 연동을 서버 프록시 또는 서버리스 함수 뒤로 이동해 키 노출 구조 완화
- 3D/AI 기능 기준으로 코드 스플리팅 적용
- 작업 데이터 스키마 검증 추가
- 타이머, 상태, AI 응답 파서에 대한 테스트 작성
- PWA 아이콘 및 오프라인 자산 캐시 보완

## 11. 이 프로젝트가 현재 잘하고 있는 점

- 단일 화면에서 기능과 몰입감을 동시에 달성하려는 방향이 분명합니다.
- 타이머 상태와 3D 시각 피드백이 자연스럽게 연결돼 있습니다.
- 모듈 분리 이후 구조가 명확해져 추가 확장이 쉬운 편입니다.
- CRUD, i18n, AI 보조, PWA까지 사용자 가치가 분산되지 않고 한 UX 안에 정리돼 있습니다.

## 12. 한 줄 정리

Tomato는 현재 기준으로 "3D 시각 몰입형 포모도로 앱 + 작업 관리 + Gemini 기반 작업 분해"까지 구현된 프론트엔드 중심 PWA이며, 제품 콘셉트와 데모 완성도는 높고, 다음 단계는 보안·테스트·번들 최적화·PWA 자산 보강입니다.
