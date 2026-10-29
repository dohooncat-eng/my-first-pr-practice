# HOLLOWLIGHT 코드 구조

빌드 도구 없이 `<script>` 태그로 불러오는 순수 JS. 모든 코드는 전역 `window.G` 하나에 붙는다. `index.html`을 더블클릭해도 돌아가야 한다(ES 모듈 금지).

## 스크립트 순서 (index.html)
```
src/utils.js  src/input.js  src/sprites.js  src/effects.js  src/systems/audio.js
src/data/enemies.js  src/data/weapons.js  src/data/passives.js  src/data/combos.js  src/data/champions.js  src/data/stages.js
src/systems/meta.js  src/player.js  src/enemies.js
src/systems/weapons/core.js  src/systems/weapons/base.js  src/systems/weapons/new.js  src/systems/weapons/combo.js
src/upgrades.js  src/systems/combos.js  src/systems/chest.js  src/systems/boss.js  src/spawner.js  src/pickups.js  src/systems/save.js
src/ui/hud.js  src/ui/screens.js  src/game.js  src/main.js
```

## 파일 담당
| 담당 | 파일 |
|---|---|
| 메인 | `src/data/*`, `src/game.js` `player.js` `enemies.js` `spawner.js` `pickups.js` `effects.js` `sprites.js` `upgrades.js` `main.js`, `src/systems/{meta,combos,chest,boss,save}.js`, `src/systems/weapons/{core,base}.js` |
| 무기 에이전트 | `src/systems/weapons/new.js`(새 무기 5), `src/systems/weapons/combo.js`(진화 9 + 무기 조합 3). `src/data/weapons.js`에서는 자기 무기의 수치만 고칠 수 있음 |
| UI 에이전트 | `index.html`, `style.css`, `src/ui/hud.js`, `src/ui/screens.js`, `src/systems/audio.js`. 옛 `src/ui.js`는 지운다 |

## 핵심 객체
- `G.game` — 게임 하나. 주요 필드: `state`, `stage`(G.STAGES 항목), `player`, `enemies`, `projectiles`, `gems`, `items`, `particles`, `numbers`, `boss`(지금 살아 있는 보스 적 또는 null), `time`(초), `kills`, `runGold`(이번 판 금화), `banner`, `settings`(= G.meta.settings), `cam`, `w` `h`(화면 CSS px), `safe`(안전 영역 여백), `fps`.
- `game.state`: `loading` `menu`(타이틀·스테이지·챔피언·상점·설정 등 UI 화면) `playing` `levelup` `chest` `paused` `dying` `end`
- `player`: `x y r hp maxHp level xp xpNext champion stats weapons passives fusions`
  - `weapons`: `[{ key, level, timer, state }]` (최대 `G.WEAPON_SLOTS`=6)
  - `passives`: `{ 키: 레벨 }`, `fusions`: `[키]` — 둘을 합쳐 최대 `G.PASSIVE_SLOTS`=6칸
  - `stats`: `maxHp speed damage cooldown magnet area amount armor regen luck crit critMult xpMul revive choices retaliate extraWeapon` (G.recalcStats가 매번 처음부터 계산)

## 무기 동작 (무기 에이전트)
`src/systems/weapons/core.js` 맨 위 주석이 규칙이다. 요약:
- `G.defineWeapon(키, { update(game, w, s, dt), under(ctx, game, w, s), over(...), glow(...) })`
- `s` = 현재 레벨 수치. 쿨다운은 `G.cd(game, s.cd)`, 범위는 `G.area(game, r)`, 개수는 `G.amount(game, n)`로 플레이어 스탯을 반영한다(진화·조합 무기도 마찬가지).
- 도우미: `G.nearestEnemy` `G.randomEnemies` `G.enemiesInCircle` `G.hitCircle(game,x,y,r,dmg,{knock,soft,cdKey,cd,stun,slow})` `G.fireProjectile({... onHit, update})` `G.damageEnemy(game,e,dmg,kx,ky,soft)`(처치하면 true) `G.drawSlash` `G.slashAt` `G.orbitUpdate` `G.drawOrbs` `G.auraUpdate` `G.drawAuraRing` `G.drawGlow` `G.drawSprite` `G.art.get(이름)` `G.burst` `G.addShake` `G.sfx.play(이름)`
- 적 상태: `e.slow`(초, 느려짐), `e.stun`(초, 멈춤), `e.hitUntil[키]`(재타격 간격)
- 경험치 결정 끌어오기: `game.gems`의 항목에 `pull = true`
- 체력 회복: `G.healPlayer(game, n)`
- 무기 그림: `bolt` `orb` `slash` `scythe` `meteor` `poison_pool` `spark` `sun` (docs/art-style.md). 그림이 없을 때도 도형으로 그려져야 한다.

## UI가 쓰는 게임 함수 (UI 에이전트)
- 판 시작·진행: `game.newRun(stageId, championId)`, `game.continueRun()`, `G.savedRunSummary()` → `{ stageName, championName, time, level }` 또는 null, `game.pause()`, `game.resume()`, `game.saveAndQuit()`, `game.giveUp()`, `game.retry()`, `game.toTitle()`
- 메타: `G.meta` = `{ gold, unlocked:{키:true}, champLv:{키:0~5}, cleared:{스테이지id:true}, best:{스테이지id:{time,kills,level,champion}}, settings }`
  `G.isStageUnlocked(id)`, `G.championPrice(키)`, `G.buyChampion(키)` → bool, `G.abilityCost(키)` → 다음 단계 가격 또는 null, `G.upgradeAbility(키)` → bool, `G.saveMeta()`, `G.resetAllData()`
- 설정: `G.meta.settings` = `{ sfx: 0~1, shake: bool, numbers: bool, fps: bool }`. 바꾼 뒤 `G.saveMeta()`. 전체 화면은 UI가 직접 처리(실패해도 무시).
- 데이터: `G.STAGES`, `G.CHAMPIONS`, `G.CHAMPION_ORDER`, `G.WEAPONS`, `G.PASSIVES`, `G.FUSIONS`, `G.COMBOS`, `G.ABILITY_MAX`
- 아이콘 URL: `G.spriteUrl('icon_' + 키)`, 스테이지 그림 `G.spriteUrl(stage.thumb)`, 챔피언 그림 `G.spriteUrl(champion.sprite + '_0')`, 로고 `G.spriteUrl('logo')`
- 조합 도감: `G.comboStatus(player)` → `[{ combo, result:{key,name,desc}, ready, parts:[{ kind:'weapon'|'passive', key, name, level, need, ok }] }]`
- 레벨업 카드: `G.describeChoice(c)` → `{ title, tag, isNew, text, icon, comboHint }`

## 게임이 부르는 UI 함수 (UI 에이전트가 구현)
- `G.ui.init(game)`, `G.ui.setLoading(progress, done)`
- `G.ui.showTitle()` — 타이틀(이어하기는 `G.savedRunSummary()`가 있을 때만)
- `G.ui.hideAll()` — 플레이 중(일시정지 버튼만 보임)
- `G.ui.showLevelUp(game, choices, onPick)` — 카드 `choices.length`장(3 또는 4). 고르면 `onPick(choice)`. 1~4 키로도 선택
- `G.ui.showChest(game, result, onClose)` — `result = { combo: {result 키·name·type} 또는 null, upgrades: [{kind, key, name, from, to}], count }`. 여는 연출 뒤 목록, 확인하면 `onClose()`
- `G.ui.showPause(game)` — 계속하기 / 빌드·조합 도감 / 설정 / 저장하고 나가기 / 포기(확인 단계)
- `G.ui.showEnd(game, result)` — `result = { win, time, level, kills, gold, stageId, championId, newlyUnlocked: [문구] }`
- `G.drawHUD(ctx, game)` — 캔버스 HUD(경험치 막대, 시간/20:00, 처치, 금화, 레벨, 무기 6칸·패시브 6칸, 보스 체력 막대 `game.boss`, 알림 `game.banner`, FPS `game.fps`(설정 켜졌을 때), 터치 조이스틱 `G.input.stick`)
- `G.sfx.play(이름)` — `shoot slash hit kill gem coin levelup chest evolve boss hurt heal select click`. WebAudio로 합성, 볼륨 `G.meta.settings.sfx`, 첫 사용자 입력 전에는 조용히 무시

## 저장
- 영구: `localStorage['hollowlight.meta']`, 진행 중인 판: `localStorage['hollowlight.run']`. 모든 접근은 `G.storage`(try/catch)로. 저장소가 막혀도 게임은 돈다.
