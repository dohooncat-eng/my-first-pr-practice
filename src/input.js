// 입력: 키보드(WASD/방향키)와 터치 드래그 조이스틱
(function (G) {
  'use strict';

  const keys = new Set();
  const MOVE = {
    left: ['ArrowLeft', 'KeyA'],
    right: ['ArrowRight', 'KeyD'],
    up: ['ArrowUp', 'KeyW'],
    down: ['ArrowDown', 'KeyS'],
  };
  const MOVE_CODES = new Set([].concat(MOVE.left, MOVE.right, MOVE.up, MOVE.down, ['Space']));

  const input = G.input = {
    // 화면을 누른 곳이 조이스틱 중심, 끌고 간 곳이 손잡이
    stick: { active: false, id: null, ox: 0, oy: 0, x: 0, y: 0 },
    onKey: null,
    STICK_RADIUS: 54,
  };

  function down(dir) { return MOVE[dir].some((c) => keys.has(c)); }

  window.addEventListener('keydown', (e) => {
    if (MOVE_CODES.has(e.code) && e.target.tagName !== 'BUTTON') e.preventDefault();
    keys.add(e.code);
    // 버튼에 포커스가 있을 때 Enter는 버튼 클릭이 처리한다
    if ((e.key === 'Enter' || e.key === ' ') && e.target.tagName === 'BUTTON') return;
    if (input.onKey && !e.repeat) input.onKey(e);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => { keys.clear(); input.stick.active = false; });

  // 이동 방향 (길이 0~1)
  input.getMove = function () {
    let x = 0, y = 0;
    if (down('left')) x -= 1;
    if (down('right')) x += 1;
    if (down('up')) y -= 1;
    if (down('down')) y += 1;
    if (x || y) {
      const l = Math.hypot(x, y);
      return { x: x / l, y: y / l };
    }
    const s = input.stick;
    if (s.active) {
      const dx = s.x - s.ox, dy = s.y - s.oy;
      const l = Math.hypot(dx, dy);
      if (l > 6) {
        const m = Math.min(1, l / input.STICK_RADIUS);
        return { x: (dx / l) * m, y: (dy / l) * m };
      }
    }
    return { x: 0, y: 0 };
  };

  input.attachPointer = function (el) {
    const s = input.stick;
    el.addEventListener('pointerdown', (e) => {
      if (s.active) return;
      s.active = true;
      s.id = e.pointerId;
      s.ox = s.x = e.clientX;
      s.oy = s.y = e.clientY;
      try { el.setPointerCapture(e.pointerId); } catch (err) { /* 캡처 실패해도 동작 */ }
    });
    el.addEventListener('pointermove', (e) => {
      if (!s.active || e.pointerId !== s.id) return;
      s.x = e.clientX;
      s.y = e.clientY;
      // 손가락이 너무 멀리 가면 중심을 따라오게 해서 방향 전환이 쉽게
      const dx = s.x - s.ox, dy = s.y - s.oy;
      const l = Math.hypot(dx, dy), max = input.STICK_RADIUS * 1.4;
      if (l > max) {
        s.ox = s.x - (dx / l) * max;
        s.oy = s.y - (dy / l) * max;
      }
    });
    const end = (e) => { if (e.pointerId === s.id) s.active = false; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  };

  input.clear = function () { keys.clear(); input.stick.active = false; };
})(window.G);
