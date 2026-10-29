# HOLLOWLIGHT 코드 구조

빌드 도구 없이 `<script>` 태그로 불러오는 순수 JS. 모든 코드는 전역 `window.G` 하나에 붙는다. `index.html`을 더블클릭해도 돌아가야 한다(ES 모듈 금지).

## 스크립트 순서 (index.html)
```
src/utils.js  src/input.js  src/sprites.js  src/effects.js  src/systems/audio.js
src/data/enemies.js  src/data/weapons.js  src/data/passives.js  src/data/combos.js  src/data/champions.js  src/data/stages.js
src/systems/meta.js  src/player.js  src/enemies.js
src/systems/weapons/core.js  src/systems/weapons/base.js  src/systems/weapons/new.js  src/systems/weapons/combo.js
src/upgrades.js  src/systems/combos.js  src/systems/chest.js  src/systems/boss.js  src/spawner.js  src/pickups.js  src/systems/save.js
src/ui/hud.js  src/ui/celebrate.js  src/ui/screens.js  src/game.js  src/main.js
```

## 파일 담당
| 담당 | 파일 |
|---|---|
| 메인 | `src/data/*`, `src/game.js` `player.js` `enemies.js` `spawner.js` `pickups.js` `effects.js` `sprites.js` `upgrades.js` `main.js`, `src/systems/{meta,combos,chest,boss,save}.js`, `src/systems/weapons/{core,base}.js` |
| 무기 에이전트 | `src/systems/weapons/new.js`(새 무기 5), `src/systems/weapons/combo.js`(진화 9 + 무기 조합 3). `src/data/weapons.js`에서는 자기 무기의 수치만 고칠 수 있음 |
| UI 에이전트 | `index.html`, `style.css`, `src/ui/hud.js`, `src/ui/celebrate.js`(상자·뽑기 입자 연출 `G.celebrate`), `src/ui/screens.js`, `src/systems/audio.js` |

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

---

# 3차 업데이트: 가챠 · 상점 · 광고 · 난이도 해금 · 다시 뽑기 · 상자 연출 · 그래픽 품질

새 파일(스크립트 순서는 `stages.js` 뒤에 `data/gacha.js` `data/store.js`, `meta.js` 뒤에 `systems/gacha.js` `systems/billing.js`):
- `src/data/gacha.js` — `G.GACHA`(가격·확률·천장·환급·첫 클리어 결정), `G.GACHA_ITEMS`(23종), `G.GACHA_ORDER`, `G.GACHA_STAR_LABEL`, `G.gachaKeysByStar(star)`
- `src/data/store.js` — `G.STORE`(상품·정액제·교환), `G.storeProduct(id)`
- `src/systems/gacha.js`(메인), `src/systems/billing.js`(메인: `G.billing` `G.store` `G.ads`)

## 메타 저장에 늘어난 것
`G.meta.crystals`(별빛 결정), `G.meta.gacha = { pulls, pity, items:{키:레벨}, tickets2, freeDay }`, `G.meta.purchases = {상품id: 횟수}`, `G.meta.noAds`, `G.meta.pass = { until, lastClaim }`(날짜 번호), `G.meta.settings.quality = 'auto'|'high'|'medium'|'low'`, `G.meta.runsSinceAd`

## 가챠 (UI가 쓰는 함수)
- `G.GACHA_ITEMS[키] = { star(1~3), max, name, icon(스프라이트 이름: G.spriteUrl(icon)), desc(lv) → 효과 문구, apply(s, lv) }`
- `G.gachaLevel(키)` → 지금 레벨(0 = 없음)
- `G.gachaCost(n, currency)` → 가격. `n` 1 또는 10, `currency` `'gold'|'crystal'`
- `G.gachaCanAfford(n, currency)` → bool
- `G.gachaPull(n, currency)` → `{ ok, reason, results, best, pityLeft }`
  - `currency`: `'gold'` `'crystal'` `'ticket2'`(★★ 확정권, n=1) `'free'`(하루 1회 무료, n=1. 먼저 `await G.ads.rewarded('free_pull')`이 true여야 함)
  - `reason`(ok가 false일 때): `'gold'` `'crystals'` `'ticket'` `'free'`
  - `results`: `[{ key, star, name, icon, from, to, isNew, refund }]` — `refund`는 최대 레벨이라 돌려받은 것 `{ gold }` 또는 `{ crystals }`(3성 다 모은 뒤), 아니면 null. 3성 다 모은 뒤 3성 자리는 `key: null, star: 3, name: '별빛 결정 50'`, `refund: { crystals: 50 }`
  - `best`: 이번 뽑기에서 가장 높은 등급(연출 색: 1 파랑 · 2 보라 · 3 금빛)
- `G.gachaPityLeft()` → 3성 확정까지 남은 횟수(1~100)
- `G.gachaFreeAvailable()` → 오늘 무료 뽑기를 쓸 수 있는지(광고를 볼 수 있거나 광고 제거를 샀을 때만 true)
- `G.gachaOdds()` → `{ groups: [{ star, rate, items: [{ key, name, rate }] }], rules: [문구] }` (확률 정보 창)
- `G.gachaCollection()` → `[{ key, star, name, icon, level, max, desc, next }]` — `desc` 지금 효과(없으면 Lv 1 효과), `next` 다음 레벨 효과(최대면 null)
- 뽑을 때 효과음은 UI가 낸다.

## 상점·결제·광고 (`G.billing` `G.store` `G.ads`)
- `G.STORE.products[] = { id, kind('crystals'|'pack'|'noads'|'pass'), name, art(스프라이트 이름), price(원), limit?, desc?, grant, firstBonus? }`
- `G.store.priceLabel(product)` → `'₩1,000'`
- `G.store.status(id)` → `{ bought, limitLeft(null = 무제한), canBuy, firstBonus(첫 구매 2배가 남았는지), note }`
- `G.billing.available()` → 실제 결제를 할 수 있는지(웹 false, `?debug`는 시험 지급이라 true, 앱에서는 Play Billing)
- `G.billing.purchase(id)` → `Promise<{ ok, reason('unavailable'|'limit'|'cancelled'), granted: { crystals, gold, tickets2, noAds, passDays } }>`. 웹에서는 `{ ok:false, reason:'unavailable' }` — UI는 "구글 플레이 앱에서 구매할 수 있습니다"를 보여 준다.
- `G.store.exchange()` → bool (결정 50 → 금화 1,000)
- `G.store.passStatus()` → `{ active, daysLeft, claimedToday }`, `G.store.claimPassDaily()` → 받은 결정 수(0이면 이미 받음)
- `G.ads.available()` → 광고를 띄울 수 있는지(웹 false). `G.ads.rewardedReady()` → 보상형 버튼을 보여 줄지(광고 가능 또는 광고 제거 구매). `G.ads.rewarded(placement)` → `Promise<bool>`(광고 제거면 광고 없이 바로 true). `placement`: `'double_gold'` `'free_pull'`
- 전면 광고는 게임이 결과 화면을 떠날 때 부른다(UI 할 일 없음).

## 난이도 해금 (스테이지마다)
- `G.isDifficultyUnlocked(stageId, diffId)` → bool, `G.difficultyLockText(stageId, diffId)` → `'보통을 깨면 열립니다'` 같은 문구 또는 null
- 잠긴 난이도로 `game.newRun`을 부르면 보통으로 시작한다(UI가 먼저 막는다).

## 레벨업 카드
- 카드는 3~5장(기본 3, 등불지기 각성 4, 가챠 ★★★ 선택의 등불 +1). 1~5 키로 고른다.
- 다시 뽑기: `game.rerollsLeft`(이번 판 남은 횟수). `game.rerollChoices()` → 새 카드 배열 또는 null(남은 횟수 없음). UI는 카드를 다시 그린다. R 키로도.
- `G.ui.showLevelUp(game, choices, onPick)`는 그대로. 다시 뽑기 버튼은 `game.rerollsLeft > 0`일 때만.

## 상자
- `G.ui.showChest(game, result, onClose)`의 `result`에 더해진 것: `source('elite'|'boss'|'debug')`, `startTier`(바닥에 있던 상자 등급), `tier`(열 때 등급: `'wood'|'silver'|'gold'`, 개수 1~2 나무 · 3~4 은 · 5 금), `count`(1~5)
  - `tier`가 `startTier`보다 높으면 "등급 상승" 연출(번쩍이며 상자가 바뀜). 3개는 보라 빛, 5개는 무지갯빛·황금 연출.
- 연출용 그림(모두 viewBox 0 0 256 256, 같은 자리에 겹치면 맞물림): `chest_{tier}_body` `chest_{tier}_lid` `chest_{tier}_lid_open` `chest_{tier}_lock`, 빛기둥 `chest_beam`. 바닥용: `chest`(나무, 엘리트) `chest_boss`(금, 보스).

## 결과 화면
- `G.ui.showEnd(game, result)`의 `result`에 더해진 것: `difficultyId`, `crystals`(첫 클리어 결정, 0이면 표시 안 함), `canDoubleGold`(true면 "광고 보고 금화 2배" 버튼), `unlockedDifficulty`(새로 열린 난이도 이름 또는 null)
- `game.claimDoubleGold()` → `Promise<number>`(더 받은 금화, 0이면 실패·이미 받음)

## 그래픽 품질
- `G.meta.settings.quality`: `'auto'`(기본, FPS가 낮으면 해상도를 낮춤) `'high'` `'medium'` `'low'`. 바꾼 뒤 `G.saveMeta()`와 `G.applyQuality()`.

## 무기 크기 · 성능 규칙
- 모든 무기 범위·반지름은 `G.area(game, r)`, 크기 배율은 `G.areaMul(game)`(= 플레이어 범위 스탯 × `G.WEAPON_SIZE` 0.8)로 쓴다. 무기 코드에서 `stats.area`를 직접 곱하지 않는다.
- 새 스탯: `goldMul`(정산 금화 배율), `startLevel`(시작 레벨 +n, 그만큼 카드를 먼저 고름), `rerolls`(판마다 다시 뽑기), `chestBonus`(상자 강화 개수 +n)
- 상자 대기열 `game.chestQueue = ['elite' | 'boss', ...]`. 바닥 상자는 `G.dropItem(game, x, y, 'chest', 'elite' | 'boss')`.
- 그림은 화면 배율에 맞춰 1.5~3배로 굽는다(`G.spriteRes`). `G.drawSprite`는 save/restore 없이 그리며 좌우 반전 그림을 따로 구워 둔다.
- 데미지 숫자는 글자판을 미리 구워 `drawImage`로 찍는다(최대 60개). 파티클 최대 300, 결정 빛 번짐 최대 120.
- 적끼리 밀어내기는 화면 근처 적만, 한 마리당 2프레임에 한 번 계산한다.
- `game.render()`는 테스트·성능 측정용으로 열어 둔 그리기 함수다.

# 4차 업데이트: 무기·패시브 5+5, 스테이지 해금, 쿠폰, 재화 한도

- 새 무기(기본, Lv 1~5): `trap` 그림자 덫 · `lance` 빛의 창 · `moth` 달나방 떼 · `tornado` 회오리 · `whip` 불꽃 채찍. 진화: `helltrap`(덫+`wick`) · `judgment`(창+`keeneye`) · `mothswarm`(나방+`lore`) · `tempest`(회오리+`cloak`) · `dragonwhip`(채찍+`rage`). 수치는 `src/data/weapons.js`, 동작은 `src/systems/weapons/new2.js`.
- 새 패시브: `wick`(지속 시간 `stats.duration`) · `keeneye`(치명타 피해) · `lore`(경험치) · `cloak`(피하기 `stats.dodge`, 최대 40%) · `rage`(체력 50% 미만일 때 피해 `stats.rage`).
- 지속 시간은 `G.dur(game, t)`로 반영한다(덫 수명, 웅덩이, 회오리, 불길).
- 스테이지 해금: `stage.unlocks = ['weapon:키' | 'passive:키']`, `G.isItemUnlocked(kind, key)`, `G.stageUnlockNames(stageId)` → 이름 목록. 처음부터 쓸 수 있는 것은 무기 6·패시브 6, 늪 6개·폐허 6개·심연 5개.
- 재화: `G.CURRENCY_MAX = { gold: 9999999, crystals: 99999 }`, 늘릴 때는 항상 `G.addCurrency(kind, n)`.
- 쿠폰: `G.COUPONS`(`src/data/store.js`), `G.redeemCoupon(code)` → `{ ok, reason: 'invalid' | 'used', granted: { gold, crystals }, gold, crystals }`. 저장 데이터마다 코드당 1번(`G.meta.coupons`).
