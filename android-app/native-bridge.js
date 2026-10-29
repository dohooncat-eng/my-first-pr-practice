// 앱 전용 다리: 게임(src/systems/billing.js)이 찾는 window.HollowlightNative를 Capacitor 플러그인으로 채운다.
//   purchase(id) → Promise<{ ok, reason }>, showRewarded(placement) → Promise<bool>, showInterstitial() → Promise
// 웹 버전에는 들어가지 않는다(scripts/copy-web.js가 앱용 www/에만 끼워 넣는다).
(function () {
  'use strict';

  // ---- 설정: AdMob에서 만든 광고 단위 id를 넣는다. 비워 두면 구글 시험 광고가 나온다. ----
  const AD_UNITS = {
    rewarded: '',      // 예: 'ca-app-pub-0000000000000000/0000000000'
    interstitial: '',
  };
  const TEST_UNITS = {
    rewarded: 'ca-app-pub-3940256099942544/5224354917',
    interstitial: 'ca-app-pub-3940256099942544/1033173712',
  };
  // 여러 번 사는 상품(결정 묶음·축복)은 소비형, 나머지는 한 번 사면 영구
  const CONSUMABLE = ['crystal_100', 'crystal_330', 'crystal_1150', 'blessing_30'];
  // 영구 상품: 다시 설치해도 되살린다
  const RESTORE = {
    remove_ads: (m) => { m.noAds = true; },
    speed_mode: (m) => { m.speedMode = true; },
    starter_pack: () => {},
  };

  const Cap = window.Capacitor;
  if (!Cap || !Cap.isNativePlatform || !Cap.isNativePlatform()) return;
  const P = Cap.Plugins;
  const AdMob = P.AdMob;
  const Purchases = P.NativePurchases;
  const App = P.App;

  const unit = (k) => AD_UNITS[k] || TEST_UNITS[k];
  const testing = (k) => !AD_UNITS[k];

  // ---- 광고 ----
  let adsReady = null;
  function startAds() {
    if (!AdMob) return Promise.resolve(false);
    if (adsReady) return adsReady;
    adsReady = (async () => {
      try {
        // 유럽 등 동의가 필요한 지역이면 구글 동의 창을 띄운다
        let c = await AdMob.requestConsentInfo();
        if (c.isConsentFormAvailable && c.status === 'REQUIRED') c = await AdMob.showConsentForm();
        if (c.canRequestAds === false) return false;
        await AdMob.initialize({ initializeForTesting: testing('rewarded') });
        return true;
      } catch (e) {
        console.warn('광고 준비 실패', e);
        adsReady = null;
        return false;
      }
    })();
    return adsReady;
  }

  // 한 번만 듣는 이벤트
  function once(name, fn) {
    let handle = null;
    const p = AdMob.addListener(name, (x) => { if (handle) handle.remove(); fn(x); });
    Promise.resolve(p).then((h) => { handle = h; });
    return () => Promise.resolve(p).then((h) => h.remove());
  }

  async function showRewarded() {
    if (!(await startAds())) return false;
    try {
      await AdMob.prepareRewardVideoAd({ adId: unit('rewarded'), isTesting: testing('rewarded') });
      // 끝까지 봐서 보상 이벤트가 온 때만 true (그냥 닫으면 false)
      return await new Promise((resolve) => {
        let rewarded = false;
        const offReward = once('onRewardedVideoAdReward', () => { rewarded = true; });
        const done = () => { offReward(); offFail(); resolve(rewarded); };
        const offFail = once('onRewardedVideoAdFailedToShow', () => { offDismiss(); offReward(); resolve(false); });
        const offDismiss = once('onRewardedVideoAdDismissed', done);
        AdMob.showRewardVideoAd().catch(() => { offDismiss(); offReward(); offFail(); resolve(false); });
      });
    } catch (e) {
      console.warn('보상형 광고 실패', e);
      return false;
    }
  }

  async function showInterstitial() {
    if (!(await startAds())) return false;
    try {
      await AdMob.prepareInterstitial({ adId: unit('interstitial'), isTesting: testing('interstitial') });
      await AdMob.showInterstitial();
      return true;
    } catch (e) {
      console.warn('전면 광고 실패', e);
      return false;
    }
  }

  // ---- 결제 ----
  async function purchase(id) {
    if (!Purchases) return { ok: false, reason: 'unavailable' };
    try {
      const t = await Purchases.purchaseProduct({
        productIdentifier: id,
        productType: 'inapp',
        isConsumable: CONSUMABLE.indexOf(id) !== -1,
      });
      return t && t.productIdentifier ? { ok: true } : { ok: false, reason: 'cancelled' };
    } catch (e) {
      // 사용자가 닫은 것과 오류를 굳이 나누지 않는다(게임은 cancelled면 아무 말도 안 한다)
      const msg = String((e && (e.code || e.message)) || '');
      return { ok: false, reason: /cancel/i.test(msg) ? 'cancelled' : 'error' };
    }
  }

  // 다시 설치했거나 다른 기기에서 산 영구 상품을 되살린다
  async function restore() {
    if (!Purchases || !window.G || !G.meta) return;
    try {
      const { purchases } = await Purchases.getPurchases({ productType: 'inapp' });
      let changed = false;
      (purchases || []).forEach((p) => {
        const fix = RESTORE[p.productIdentifier];
        if (!fix || ['PURCHASED', '1'].indexOf(String(p.purchaseState)) === -1) return;
        fix(G.meta);
        if (!G.meta.purchases[p.productIdentifier]) G.meta.purchases[p.productIdentifier] = 1;
        changed = true;
      });
      if (changed) G.saveMeta();
    } catch (e) {
      console.warn('구매 복원 실패', e);
    }
  }

  // ---- 안드로이드 뒤로가기: 게임의 Esc 처리(뒤로·일시정지)를 그대로 쓰고, 타이틀에서는 앱을 닫는다 ----
  function onBack() {
    const title = document.getElementById('screen-title');
    const onTitle = title && !title.hidden && window.G && G.game && G.game.state === 'menu' &&
      document.getElementById('dialog').hidden && document.getElementById('pull-fx').hidden;
    if (onTitle) { App.exitApp(); return; }
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }));
  }

  window.HollowlightNative = {
    purchase,
    showRewarded,
    showInterstitial,
  };

  window.addEventListener('load', () => {
    if (App) App.addListener('backButton', onBack);
    restore();
    startAds();
  });
})();
