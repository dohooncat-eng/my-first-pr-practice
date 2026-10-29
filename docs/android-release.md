# 구글 플레이 출시: 광고·결제 붙이기

게임 코드는 그대로 두고, `android-app/`의 Capacitor 앱이 게임을 감싼다.
결제·광고는 `android-app/native-bridge.js`가 게임이 찾는 `window.HollowlightNative`를 채워서 연결한다.

| 게임이 부르는 것 (`src/systems/billing.js`) | 앱에서 하는 일 |
|---|---|
| `purchase(id)` | 구글 플레이 결제 (`@capgo/native-purchases`). 결정 묶음·축복은 소비형, 초보자·광고 제거·2배속은 영구 |
| `showRewarded(placement)` | AdMob 보상형 광고. 끝까지 봐야 보상 |
| `showInterstitial()` | AdMob 전면 광고 (판 3번에 1번) |
| 안드로이드 뒤로가기 | 게임의 Esc와 같음(뒤로·일시정지), 타이틀에서는 앱 종료 |
| 다시 설치 | 광고 제거·2배속 구매를 되살림 |

## 직접 해야 하는 것 (계정·결제가 필요해서 대신 못 함)

1. **Android Studio 설치** (Android SDK 포함). 이 PC에는 아직 SDK가 없다.
2. **Google Play Console 개발자 계정** (등록비 25달러, 본인 인증).
3. **AdMob 계정** → 앱 추가(Android) → 광고 단위 2개 만들기: 보상형 1, 전면 1.
   - 앱 id(`ca-app-pub-…~…`)를 `android-app/android/app/src/main/res/values/strings.xml`의 `admob_app_id`에 넣는다.
   - 광고 단위 id(`ca-app-pub-…/…`)를 `android-app/native-bridge.js`의 `AD_UNITS`에 넣는다. 비워 두면 구글 시험 광고가 나온다.
4. **Play Console에서 인앱 상품 만들기** — id는 반드시 아래와 같게 (`src/data/store.js`와 같아야 함):

   | 상품 id | 이름 | 가격 | 종류 |
   |---|---|---|---|
   | `crystal_100` | 별빛 결정 500 | ₩1,000 | 소비형 |
   | `crystal_330` | 별빛 결정 1,650 | ₩3,000 | 소비형 |
   | `crystal_1150` | 별빛 결정 5,750 | ₩10,000 | 소비형 |
   | `blessing_30` | 등불 축복 (30일) | ₩4,000 | 소비형 |
   | `starter_pack` | 초보자 패키지 | ₩2,000 | 영구 |
   | `remove_ads` | 광고 제거 | ₩3,000 | 영구 |
   | `speed_mode` | 2배속 | ₩3,000 | 영구 |

   (결정 상품 id의 숫자는 예전 양이다. 구글 플레이 id는 한 번 만들면 못 바꾸므로 그대로 둔다.)
5. **개인정보처리방침 페이지** (광고 SDK가 광고 id를 쓰므로 필요) 주소를 Play Console에 넣고, 데이터 보안 양식에 AdMob(광고 id·기기 정보)을 적는다.

## 빌드 순서

```
cd android-app
npm install
npm run sync      # 게임 파일을 www/로 복사 + 안드로이드 프로젝트에 반영
npm run open      # Android Studio가 열린다 → Build > Generate Signed App Bundle (.aab)
```

- 게임을 고친 뒤에는 `npm run sync`만 다시 하면 된다.
- 서명 키(.jks)는 잃어버리면 업데이트를 못 올린다. 저장소에 넣지 말고 따로 보관. (Play 앱 서명을 켜면 구글이 배포 키를 보관한다)
- 앱 id는 `com.dohooncat.hollowlight` (`capacitor.config.json`). 바꾸려면 첫 업로드 전에.

## 결제 시험

- 결제는 Play Console **내부 테스트** 트랙에 올린 앱을, **라이선스 테스터**로 등록한 계정이 Play 스토어에서 받아야 시험할 수 있다(직접 설치한 APK로는 안 됨). 테스터는 실제로 돈이 나가지 않는다.
- 광고는 `AD_UNITS`를 비워 두면 시험 광고라 아무 기기에서나 확인할 수 있다. 실제 광고 id로 내 광고를 누르면 AdMob 계정이 정지될 수 있으니 주의.

## 출시 전에 꼭 (docs/worklog.md의 "출시 전 할 일"과 같음)

- 개발용 쿠폰 `G.COUPONS`와 쿠폰 입력 제거, `?debug` 끄기.
- 아이콘: `android-app/android/app/src/main/res/mipmap-*`의 기본 아이콘을 HOLLOWLIGHT 아이콘으로 (Android Studio > New > Image Asset).

## 알고 있는 한계

- shortcut: 결제 영수증을 서버에서 확인하지 않는다(기기에서 받은 결과를 그대로 믿음). 조작된 기기에서 공짜 결정을 받을 수 있다. 매출이 커지면 서버 검증(Google Play Developer API)을 붙인다.
- 진행 저장은 기기 안(`localStorage`)에만 있다. 앱을 지우면 결정·뽑기 진행이 사라지고, 영구 상품(광고 제거·2배속)만 되살아난다.
