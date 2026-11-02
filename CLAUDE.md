# HOLLOWLIGHT

밤의 숲·등불 세계관의 뱀서류 생존 액션 게임. 순수 HTML/JS/Canvas, 구글 플레이 출시 예정.

공용 작업 규칙과 디자인 규칙은 `AGENTS.md`를 따른다. 작업 전 `docs/worklog.md`를 읽는다.

## 파일 구조
- `index.html`, `style.css`: 화면과 스타일, 스크립트 불러오는 순서
- `src/data/`: 수치와 데이터 (무기, 적, 스테이지, 뽑기, 상점)
- `src/systems/`: 게임 동작 (무기, 보스, 맵, 상자, 저장, 소리)
- `src/ui/`: 화면, HUD, 진화 경로
- `src/fx/`: 타격감과 연출
- `src/game.js`, `src/main.js`: 게임 루프와 시작점
- `assets/sprites/`: SVG 그림
- `android-app/`: Capacitor 안드로이드 포장 (출시 절차: `docs/android-release.md`)
- `docs/`: 구조, 그림 규칙, 작업 기록
