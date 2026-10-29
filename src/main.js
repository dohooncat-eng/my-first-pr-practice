// 시작점: 저장 데이터 불러오기, 캔버스 준비, 입력 연결, 그림 불러오기
(function (G) {
  'use strict';

  const game = G.game;
  G.loadMeta();
  game.settings = G.meta.settings;
  game.canvas = document.getElementById('game');
  game.ctx = game.canvas.getContext('2d');
  game.debug = new URLSearchParams(location.search).has('debug');
  game.xpMul = game.debug ? 5 : 1;
  try {
    game.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { /* 지원하지 않는 브라우저 */ }

  game.resize();
  window.addEventListener('resize', game.resize);

  G.input.attachPointer(game.canvas);
  G.input.onKey = game.onKey;
  G.ui.init(game);
  G.ui.showTitle();
  G.ui.setLoading(0, false);

  // 창을 벗어나면 자동 일시정지(이때 저장), 창을 닫을 때도 저장
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) return;
    if (game.state === 'playing') game.pause();
    else if (game.canSave()) G.saveRun(game);
  });
  window.addEventListener('blur', () => game.pause());
  window.addEventListener('pagehide', () => { if (game.canSave()) G.saveRun(game); });

  G.loadSprites((p) => G.ui.setLoading(p, false)).then(() => {
    game.state = 'menu';
    G.ui.setLoading(1, true);
    G.ui.showTitle();
    if (G.music) G.music.play('title');
  });

  game.run();
})(window.G);
