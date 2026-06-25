# 배포 체크리스트 (Tomato)

이 문서는 공개 베타 배포 전후로 매번 확인하는 운영 체크리스트다. 앱 코드는 잘못된
Supabase 설정을 **감지해서 막을 수는 있지만 강제로 고칠 수는 없으므로**, 아래 항목은
사람이 직접 확인해야 한다.

## 1. 환경 변수 / Secrets

빌드·테스트·런타임은 모두 아래 두 값을 사용한다 (`.env.example` 참고).

| 위치 | 키 |
|---|---|
| 로컬 `.env` (gitignore됨) | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| GitHub repo Secrets | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

- [ ] GitHub → Settings → Secrets and variables → Actions 에 두 키가 모두 설정됨
- [ ] anon key만 노출됨 (service_role 키는 절대 프론트/Secrets에 넣지 않음)

## 2. Supabase Auth 설정 (Dashboard → Authentication)

앱은 `mailer_autoconfirm`(Confirm email 꺼짐)이 감지되면 인증 사용을 **차단**한다.
즉, 이메일 확인이 꺼져 있으면 로그인 자체가 막히도록 방어되어 있다. 정상 동작을
위해 아래가 필요하다.

- [ ] **Email provider 활성화** (Providers → Email: Enabled)
- [ ] **Confirm email 활성화** (회원가입 시 메일 확인 강제)
- [ ] **Site URL** = `https://deephoon.github.io/Tomato/`
- [ ] **Redirect URLs** 에 `https://deephoon.github.io/Tomato/**` 포함
- [ ] (선택) 개발용 로컬 주소 `http://localhost:5173/**` 도 Redirect URLs 에 추가

### 배포 후 설정 검증

브라우저/터미널에서 아래로 현재 Auth 설정을 직접 확인할 수 있다.

```bash
curl -s "$VITE_SUPABASE_URL/auth/v1/settings" -H "apikey: $VITE_SUPABASE_ANON_KEY" | jq
```

- [ ] 응답의 `mailer_autoconfirm` 이 `false` (이메일 확인이 켜져 있다는 뜻)
- [ ] `external.email` 이 `true`

## 3. 데이터베이스 / RLS

스키마는 `supabase/migrations/001_init_tomato.sql` 한 파일로 정의된다.
7개 테이블(`profiles`, `focus_tasks`, `current_sessions`, `focus_history`,
`session_commands`, `user_preferences`, `device_clients`) **모두 RLS가 켜져 있고
`auth.uid() = user_id` 정책**으로 보호된다.

- [ ] 마이그레이션이 운영 프로젝트에 적용됨
- [ ] 7개 테이블 모두 RLS = enabled (Dashboard → Database → Tables)
- [ ] (선택) 운영용 / 개발용 Supabase 프로젝트 분리

## 4. CI / 배포 파이프라인

`main` push → `.github/workflows/web-deploy.yml` 이 `npm test` → `npm run build`
→ GitHub Pages 배포 순으로 실행된다 (Node 24).

- [ ] 최신 Actions run 이 success
- [ ] live URL(`https://deephoon.github.io/Tomato/`)의 HTML 이 최신 해시 asset 참조

## 5. 스모크 (실 브라우저)

부팅·auth-gate·클라이언트 검증·i18n·390px 반응형은 **Playwright no-auth 티어**
(`npm run test:e2e`, `.github/workflows/e2e.yml`)가 자동으로 검증한다. 아래는 로그인이
필요해 아직 수동(또는 auth 티어 + 테스트 계정)으로 확인하는 항목이다.

- [ ] 신규 회원가입 → 메일 확인 → 로그인
- [ ] 로그인 후 새로고침 시 세션/데이터 복원
- [ ] 작업 생성 → 수정 → 삭제
- [ ] 집중 시작 → 일시정지 → 재개 → 완료 → 휴식 → 대기
- [ ] 아카이브에 기록 생성 확인
- [ ] 모바일 390px 에서 주요 버튼/텍스트 겹침 없음
- [ ] Chrome/Edge 에서 PiP 위젯 버튼 동작
- [ ] Safari/Firefox 에서 PiP 미지원이 깨짐 없이 처리됨

## 6. 알려진 한계 (배포해도 무방, 추적만)

- **다중 기기 동시 수정**: `task.repository.saveTasks()` 는 "현재 로컬 목록이
  진실"이라는 전제로 원격을 동기화한다. 단일 사용자/단일 주 기기에서는 안전하지만,
  서로 다른 기기에서 동시에 작업 목록을 바꾸면 오래된 목록이 다른 기기의 변경을 덮을
  수 있다. 근본 해결은 `updated_at` 비교 / tombstone / 명령형 delete 전환이 필요하다.
- **동기화 상태 표시**: 메타바에 OFFLINE / SYNCING / SAVE FAILED 배지가 뜨고, 실패 시
  클릭하면 재시도한다(`syncStatus.service.js`). 다만 실패한 쓰기를 자동으로 durable하게
  보관했다가 재생하지는 않으므로, 오프라인 중 새로고침하면 미저장 변경이 사라질 수 있다
  (재시도는 현재 in-memory 상태를 다시 쓰는 방식).
- **작업 나누기 = 로컬 휴리스틱**: 실제 LLM 연동 아님. "AI" 라고 광고하지 않는다.
- **PWA 아님**: 일반 웹앱. Service Worker/manifest 없음.
