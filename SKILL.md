---
name: content-pipeline
description: This skill should be used when the user asks to "콘텐츠 만들어줘", "카드뉴스 만들어줘", "카드뉴스 영상 만들어줘", "리서치부터 영상까지", "콘텐츠 파이프라인", "content pipeline", "주제로 콘텐츠 만들어줘". 주제 하나로 리서치→카드뉴스→영상까지 풀 파이프라인을 자동 실행합니다. Make sure to use this skill whenever the user mentions content creation that involves research, card news, or video generation from a topic.
---

# 콘텐츠 파이프라인

> 주제 하나 던지면 리서치 → 카드뉴스 → 영상까지 자동으로 만들어주는 올인원 콘텐츠 제작 스킬.

---

## 출력 경로 규칙

`{output}`은 **현재 작업 디렉토리** 기준으로 생성한다:

```
{현재 작업 디렉토리}/{주제명}-{YYYYMMDD}/
├── 01-리서치-보고서.md
├── 02-카드뉴스-기획서.md
├── images/
├── card-news.html
├── 05-tts-script.md
├── audio/
└── output.mp4
```

`SKILL_DIR`은 이 SKILL.md가 위치한 디렉토리의 절대 경로다. 스크립트/참조 파일 경로에만 사용한다.

---

## 워크플로우

### Step 0: 환경 검사 + 온보딩
**타입**: script

스킬 실행 전, 필요한 도구와 설정을 확인한다.

**1. Python3 확인:**
```bash
python3 --version
```
없으면: "Python3이 필요해요. 설치 후 다시 시도해주세요." → 중단.

**2. .env 파일 확인:**
```bash
ls "${SKILL_DIR}/.env"
```

**.env가 없으면 온보딩 시작** — 아래 안내를 사용자에게 보여준다:

```
이 스킬을 처음 사용하시네요! API 키 설정이 필요해요.

━━━ 설정 가이드 (약 3분) ━━━

1. .env 파일 생성:
   ! cp "${SKILL_DIR}/.env.example" "${SKILL_DIR}/.env"

2. 이미지 생성용 API 키 발급 (Google AI Studio):
   → https://aistudio.google.com/apikey
   → "Create API key" 클릭 → 키 복사

3. TTS 음성용 API 키 (OpenAI):
   → https://platform.openai.com/api-keys
   → "Create new secret key" → 키 복사

4. .env 파일에 키 입력:
   ! nano "${SKILL_DIR}/.env"
   → NANOBANANA_API_KEY=여기에_구글_키_붙여넣기
   → OPENAI_API_KEY=여기에_오픈AI_키_붙여넣기

완료되면 저한테 말씀해주세요!
```

**중요**: 온보딩 완료 후, 사용자가 처음에 요청했던 내용을 이어서 바로 처리한다.

**.env가 있으면** API 키 유효성을 간단히 확인한다:
- `NANOBANANA_API_KEY`가 비어있으면: "이미지 생성 API 키가 없어요. 텍스트 온리로 진행할게요."
- `OPENAI_API_KEY`가 비어있으면: "TTS API 키가 없어요. 음성/영상 단계는 건너뛸게요."

가용 범위를 안내한다:
```
환경 확인 완료!
✅ 리서치 → 카드뉴스 기획 → HTML 카드뉴스
✅/❌ AI 이미지 생성
✅/❌ TTS 음성 생성 (OpenAI)
✅/❌ 영상 렌더링 (Remotion)
```

### Step 1: 리서치
**타입**: prompt (WebSearch 활용)

사용자가 입력한 주제로 웹 리서치를 실행한다.

1. WebSearch로 주제 관련 최신 자료 5~10건 수집
2. 각 소스에서 핵심 정보 추출
3. 종합 분석하여 리서치 보고서 마크다운으로 정리

출력: `{output}/01-리서치-보고서.md`

보고서 구조:
- 주제 개요
- 핵심 포인트 5~10개 (출처 포함)
- 종합 분석
- 카드뉴스에 활용할 핵심 메시지 후보

검색 결과가 3건 미만이면: 대안 키워드 3개 제안.

**체크포인트** — AskUserQuestion:
```
"리서치 결과예요. 핵심 내용이 잘 담겼는지 확인해주세요."
옵션: 진행 (추천) / 수정 요청 / 여기서 종료
```

### Step 2: 카드뉴스 기획
**타입**: prompt + rag

리서치 보고서를 읽고 카드뉴스 기획서를 생성한다. `references/card-news-guide.md`를 참조하여 디자인 규칙과 유형 분류를 적용한다.

기획서 포함 내용:
1. 유형 선택 (나열형/스토리텔링형/집중형 등) + 선택 이유
2. 총 장수 (10~15장)
3. 장별 테이블: 장번호 | 파트(표지/본문/마무리) | 핵심 메시지 | 필요한 이미지 설명
4. 디자인 컬러/무드: **주제에 맞게 자동 결정** (예: 벚꽃→핑크/파스텔, 테크→다크/네온, 음식→따뜻한 톤)

출력: `{output}/02-카드뉴스-기획서.md`

이 기획서가 이후 모든 Step의 기준 문서(single source of truth)가 된다.

**체크포인트** — AskUserQuestion:
```
"기획서예요. 장수나 내용 흐름을 확인해주세요."
옵션: 진행 (추천) / 수정 요청 / 여기서 종료
```

### Step 3: 이미지 생성
**타입**: script

기획서의 "필요한 이미지 설명" 목록을 보고, 내장 스크립트로 카드별 이미지를 생성한다.

**사전 조건**: `.env`의 `NANOBANANA_API_KEY`가 필요하다. 없으면 텍스트 온리로 폴백.

**이미지 생성 순서:**

1. 기획서에서 이미지가 필요한 카드 목록 추출
2. 각 카드별 영문 프롬프트 작성

**프롬프트 작성 규칙 (필수):**
- **텍스트 절대 금지**: 프롬프트 시작에 반드시 `"DO NOT include any text, letters, words, numbers, watermarks, logos, or typography in the image. Pure visual only."` 포함
- **사진은 풀 컬러**: 주제에 맞는 생생한 컬러로 생성한다. 흑백으로 만들지 않는다. (B&W 에디토리얼은 HTML 레이아웃 스타일이지 사진 스타일이 아니다)
- 에디토리얼 매거진 사진 스타일 (구도, 조명, 피사계 심도)
- 200~400단어 영문 프롬프트

3. 내장 스크립트로 이미지 **병렬 생성**:

**병렬 실행 규칙:**
- Bash 도구를 **동시에 3~4개** 호출하여 병렬 생성
- 한 배치(3~4장) 완료 후 다음 배치 → API rate limit 방지
- 배치마다 진행 안내: "이미지 생성 중... (2/4 배치 완료)"

```bash
python3 "${SKILL_DIR}/scripts/generate_image.py" \
  --mode generate \
  --prompt "{영문 프롬프트}" \
  --output "{output}/images/card-{NN}.png" \
  --aspect-ratio "3:4" \
  --image-size "2K" \
  --thinking-level "high" \
  --env-file "${SKILL_DIR}/.env"
```

**파라미터 유효값 (반드시 이 값만 사용):**
- `--aspect-ratio`: `1:1`, `16:9`, `9:16`, `4:3`, `3:4`, `4:1`, `1:4`
- `--image-size`: `512`, `1K`, `2K`, `4K` (숫자 단독 사용 금지 — '2048' 아닌 '2K')
- `--thinking-level`: `minimal`, `high`

이미지 생성 실패 시: 텍스트 온리 폴백 제안.

**체크포인트** — AskUserQuestion:
```
"이미지들이에요. 마음에 안 드는 건 재생성할 수 있어요."
옵션: 진행 (추천) / 일부 재생성 / 텍스트 온리로 진행
```

### Step 4: 카드뉴스 HTML 생성
**타입**: generate

기획서 + 이미지를 합쳐 에디토리얼 매거진 스타일의 HTML 카드뉴스를 생성한다.

**디자인 원칙:**
- **레이아웃/타이포**: 블랙앤화이트 에디토리얼 매거진 (다크 배경 + 흰 텍스트, 세리프 제목, 비대칭 구도)
- **이미지**: 풀 컬러 그대로 사용. 이미지 위에 그라디언트 마스크 + 텍스트 오버레이
- 주제 분위기에 맞는 포인트 컬러 1개 추가 가능 (예: 벚꽃→#FFB7C5, 테크→#2563EB)

| 항목 | 설정 |
|------|------|
| 사이즈 | 1080 x 1350px (4:5 세로형) |
| 배경 | #0A0A0A (딥블랙) / #FAFAFA (오프화이트) 교차 |
| 이미지 | **풀 컬러** 히어로 이미지 (카드 면적 60%+) |
| 폰트 | 제목 세리프 + 본문 산세리프 |
| 레이아웃 | 장마다 다른 구도 (풀블리드/스플릿/오버레이) |
| 페이지 표시 | 하단 중앙 "3/13" 형식 |

HTML 요구사항:
- 단일 HTML 파일 (인라인 CSS, 외부 의존성 없음)
- 각 카드는 `<section>`으로 구분
- 브라우저에서 열면 매거진처럼 보이는 수준

출력: `{output}/card-news.html`

**체크포인트** — AskUserQuestion:
```
"카드뉴스 HTML이에요. 브라우저에서 열어보세요!"
옵션: 진행 (추천) / 수정 요청 / 여기서 종료 (카드뉴스만 완성)
```

### Step 5: TTS 스크립트 작성
**타입**: prompt

카드뉴스 기획서를 기반으로 나레이션 원고를 작성한다.

스크립트 구조:
- 인트로: 주제 소개 (10초)
- 본문: 카드별 설명 (카드당 15~20초)
- 아웃트로: 요약 + CTA (10초)
- 총 길이: 3~5분
- 톤: 친근하지만 전문적

TTS 친화적 텍스트 규칙:
- 영문 브랜드명 한글 발음 병기
- 숫자+단위 자연스러운 읽기 형태
- 줄임말 풀어쓰기

출력: `{output}/05-tts-script.md`

**체크포인트** — AskUserQuestion:
```
"나레이션 원고예요. 톤이나 길이를 확인해주세요."
옵션: 진행 (추천) / 수정 요청 / 여기서 종료
```

### Step 6: 음성 생성 + 영상화
**타입**: script

**6-1. OpenAI TTS 음성 생성:**

`.env`의 `OPENAI_API_KEY`를 사용하여 TTS 음성을 생성한다.

```bash
python3 "${SKILL_DIR}/scripts/tts_openai.py" \
  --input "{output}/05-tts-script.md" \
  --output "{output}/audio/narration.mp3" \
  --voice "nova" \
  --env-file "${SKILL_DIR}/.env"
```

음성 옵션: `alloy`, `echo`, `fable`, `onyx`, `nova`, `shimmer` (기본: nova)

실패 시: "음성 생성에 실패했어요. 나레이션 원고는 완성됐으니 직접 녹음하셔도 돼요."

출력: `{output}/audio/narration.mp3`

**6-2. Remotion 영상 렌더링:**

Remotion 프로젝트를 생성하여 카드뉴스 이미지 + TTS 음성을 합성한 영상을 만든다.

1. `{output}/remotion/` 폴더에 Remotion 프로젝트를 구성한다
2. `{output}/images/` 의 카드 이미지를 `public/` 폴더에 복사
3. `{output}/audio/narration.mp3`를 `public/` 폴더에 복사
4. 카드 수와 음성 길이에 맞게 Root.tsx 설정:
   - FPS: 30
   - 카드당 시간: 음성 길이 ÷ 카드 수 (기본 4초)
   - 해상도: 1080 x 1350 (4:5 세로형)
   - 전환 효과: 페이드 인/아웃
5. 렌더링 실행:
```bash
cd "{output}/remotion" && npx remotion render src/index.ts CardNewsVideo --output "../output.mp4"
```

Remotion 미설치 또는 실패 시: "HTML 카드뉴스와 음성 파일은 완성됐어요. 영상은 별도 편집 도구로 합치셔도 돼요."

출력: `{output}/output.mp4`

**체크포인트** — AskUserQuestion:
```
"영상 완성! 확인해주세요."
옵션: 완료 / 수정 요청
```

---

## 실패 시 부분 완성 안내

어느 단계에서 실패하든, 완료된 단계의 결과물을 명확히 안내한다:

```
완성된 결과물:
✅ Step 1: 리서치 보고서 → {output}/01-리서치-보고서.md
✅ Step 2: 카드뉴스 기획서 → {output}/02-카드뉴스-기획서.md
✅ Step 3: 이미지 → {output}/images/
✅ Step 4: 카드뉴스 HTML → {output}/card-news.html
❌ Step 5~6: (건너뜀)
```

---

## References
- **`references/card-news-guide.md`** — 카드뉴스 디자인 가이드 (유형 분류, 디자인 규칙, 테마 스펙)

## Scripts
- **`scripts/generate_image.py`** — 이미지 생성 (google-genai SDK). generate/edit/chat 3가지 모드.
- **`scripts/tts_openai.py`** — OpenAI TTS 음성 생성 (텍스트 → MP3)
- **`scripts/tts.sh`** — edge-tts 래퍼 (OpenAI 폴백용)
- **`scripts/html_to_video.py`** — 카드뉴스 HTML → 슬라이드쇼 MP4

## Settings

| 설정 | 기본값 | 변경 방법 |
|------|--------|-----------|
| 이미지 API 키 | (필수) | `.env`의 `NANOBANANA_API_KEY` |
| 이미지 모델 | gemini-3-pro-image-preview | `.env`의 `NANOBANANA_MODEL` |
| OpenAI API 키 | (필수, TTS용) | `.env`의 `OPENAI_API_KEY` |
| TTS 음성 | nova | "남자 목소리로" → onyx, "밝은 목소리" → shimmer |
| 카드 장수 | 10~15장 | "5장으로" 등 요청 시 변경 |
| 출력 폴더 | {주제명}-{YYYYMMDD} | 현재 작업 디렉토리에 자동 생성 |
