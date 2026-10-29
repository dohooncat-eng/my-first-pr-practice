// 공용 도구: 수학, 랜덤, 충돌 검사를 빠르게 하는 공간 분할 그리드
window.G = window.G || {};
(function (G) {
  'use strict';

  G.rand = function (min, max) { return min + Math.random() * (max - min); };
  G.pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  G.clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };

  G.shuffle = function (arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  };

  // 두 각도의 차이를 -PI ~ PI 범위로
  G.angleDiff = function (a, b) {
    let d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  };

  G.formatTime = function (sec) {
    const s = Math.floor(sec);
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  };

  // 좌표로 0~1 사이 고정된 난수를 만든다 (바닥 장식 배치용)
  G.hash2 = function (x, y) {
    let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };

  // dead 표시된 항목을 배열에서 제자리 제거
  G.compact = function (arr) {
    let j = 0;
    for (let i = 0; i < arr.length; i++) {
      if (!arr[i].dead) arr[j++] = arr[i];
    }
    arr.length = j;
  };

  // 공간 분할 그리드: 맵을 칸으로 나눠 근처에 있는 적만 검사한다.
  G.SpatialGrid = class {
    constructor(cellSize) {
      this.cellSize = cellSize;
      this.cells = new Map();
      this.used = [];
    }
    // 칸 배열은 지우지 않고 길이만 0으로 (매 프레임 새 배열을 만들지 않게). 오래 빈 칸은 가끔 정리한다.
    clear() {
      for (let i = 0; i < this.used.length; i++) this.used[i].length = 0;
      this.used.length = 0;
      if (this.cells.size > 4000) this.cells.clear();
    }
    key(cx, cy) { return cx * 100003 + cy; }
    insert(obj) {
      const k = this.key(Math.floor(obj.x / this.cellSize), Math.floor(obj.y / this.cellSize));
      let cell = this.cells.get(k);
      if (!cell) { cell = []; this.cells.set(k, cell); }
      if (!cell.length) this.used.push(cell);
      cell.push(obj);
    }
    // (x, y) 반경 r 안의 칸에 든 후보를 out에 담는다. 정확한 거리 검사는 호출한 쪽에서 한다.
    query(x, y, r, out) {
      out.length = 0;
      const cs = this.cellSize;
      const x0 = Math.floor((x - r) / cs), x1 = Math.floor((x + r) / cs);
      const y0 = Math.floor((y - r) / cs), y1 = Math.floor((y + r) / cs);
      for (let cx = x0; cx <= x1; cx++) {
        for (let cy = y0; cy <= y1; cy++) {
          const cell = this.cells.get(this.key(cx, cy));
          if (cell) for (let i = 0; i < cell.length; i++) out.push(cell[i]);
        }
      }
      return out;
    }
  };

  // localStorage는 막혀 있을 수 있으므로 항상 감싸서 쓴다
  G.storage = {
    get(key) {
      try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* 저장 못 해도 게임은 계속 */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* 무시 */ }
    },
  };
})(window.G);
