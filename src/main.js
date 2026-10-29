// 시작점: 캔버스 준비, 입력 연결, 그림 불러오기
(function (G) {
  'use strict';

  const game = G.game;
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
  G.ui.show('title');
  G.ui.setLoading(0, false);

  // 창을 벗어나면 자동 일시정지
  document.addEventListener('visibilitychange', () => { if (document.hidden) game.pause(); });
  window.addEventListener('blur', () => game.pause());

  G.loadSprites((p) => G.ui.setLoading(p, false)).then(() => {
    game.state = 'title';
    G.ui.setLoading(1, true);
  });

  game.run();
})(window.G);
