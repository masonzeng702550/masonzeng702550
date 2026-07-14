(function () {
  var ROOT = window.SITE_ROOT || '/';
  function go(path) { location.href = ROOT.replace(/\/$/, '') + '/' + path.replace(/^\//, ''); }

  /* ---------- click ripple ---------- */
  document.addEventListener('click', function (e) {
    if (e.target.closest('input, textarea, .game-modal')) return;
    var r = document.createElement('span');
    r.className = 'click-ripple';
    r.style.left = e.clientX + 'px';
    r.style.top = e.clientY + 'px';
    document.body.appendChild(r);
    setTimeout(function () { r.remove(); }, 650);
  });

  /* ---------- Konami easter egg ---------- */
  var seq = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65], pos = 0;
  document.addEventListener('keydown', function (e) {
    pos = (e.keyCode === seq[pos]) ? pos + 1 : (e.keyCode === seq[0] ? 1 : 0);
    if (pos === seq.length) { pos = 0; (window.launchGame ? window.launchGame() : matrixRain()); }
  });
  function matrixRain() {
    if (document.getElementById('matrixfx')) return;
    var c = document.createElement('canvas'); c.id = 'matrixfx';
    c.style.cssText = 'position:fixed;inset:0;z-index:9998;pointer-events:none';
    document.body.appendChild(c);
    var ctx = c.getContext('2d'), W, H, cols, y;
    function resize() { W = c.width = innerWidth; H = c.height = innerHeight; cols = Math.floor(W / 14); y = Array(cols).fill(0); }
    resize();
    var chars = 'AIS3{}01アカサタabcdef#$%'.split(''), n = 0;
    var iv = setInterval(function () {
      ctx.fillStyle = 'rgba(5,7,13,.08)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#22d3ee'; ctx.font = '14px monospace';
      for (var i = 0; i < cols; i++) {
        ctx.fillText(chars[(Math.floor(i * 7 + n) % chars.length)], i * 14, y[i] * 14);
        y[i] = (y[i] * 14 > H && (i + n) % 7 === 0) ? 0 : y[i] + 1;
      }
      n++;
    }, 45);
    setTimeout(function () { clearInterval(iv); c.style.transition = 'opacity .8s'; c.style.opacity = 0; setTimeout(function () { c.remove(); }, 800); }, 3500);
  }

  /* ---------- Breakout mini-game ---------- */
  window.launchGame = function () {
    if (document.querySelector('.game-modal')) return;
    var m = document.createElement('div'); m.className = 'game-modal';
    m.innerHTML = '<div class="game-box"><div class="game-head"><span>BREAKOUT</span><span class="game-score">分數 0</span><button class="game-close" aria-label="close">✕</button></div><canvas class="game-canvas" width="600" height="420"></canvas><div class="game-hint">滑鼠 / 方向鍵移動擋板 · 空白鍵發球 · Esc 離開</div></div>';
    document.body.appendChild(m);
    var cv = m.querySelector('.game-canvas'), ctx = cv.getContext('2d');
    var scoreEl = m.querySelector('.game-score');
    var W = cv.width, H = cv.height;
    var paddle = { w: 92, h: 12, x: W / 2 - 46 };
    var ball = { x: W / 2, y: H - 60, r: 7, dx: 0, dy: 0, live: false };
    var bricks = [], score = 0, over = false, raf;
    var cols = 9, rows = 5, bw = 56, bh = 18, gap = 6, offx = (W - (cols * (bw + gap) - gap)) / 2, offy = 40;
    var pal = ['#22d3ee', '#a78bfa', '#34d399', '#fbbf24', '#f87171'];
    for (var r0 = 0; r0 < rows; r0++) for (var c0 = 0; c0 < cols; c0++)
      bricks.push({ x: offx + c0 * (bw + gap), y: offy + r0 * (bh + gap), on: true, c: pal[r0] });
    function reset() { ball.x = paddle.x + paddle.w / 2; ball.y = H - 60; ball.dx = 0; ball.dy = 0; ball.live = false; }
    reset();
    function serve() { if (!ball.live && !over) { ball.live = true; ball.dx = 3.2; ball.dy = -3.6; } }
    function move(cx) { var rect = cv.getBoundingClientRect(); paddle.x = Math.max(0, Math.min(W - paddle.w, (cx - rect.left) * (W / rect.width) - paddle.w / 2)); if (!ball.live) ball.x = paddle.x + paddle.w / 2; }
    cv.addEventListener('mousemove', function (e) { move(e.clientX); });
    cv.addEventListener('touchmove', function (e) { move(e.touches[0].clientX); e.preventDefault(); }, { passive: false });
    var keys = {};
    function kd(e) { keys[e.key] = true; if (e.key === ' ') { serve(); e.preventDefault(); } if (e.key === 'Escape') close(); }
    function ku(e) { keys[e.key] = false; }
    document.addEventListener('keydown', kd); document.addEventListener('keyup', ku);
    cv.addEventListener('click', serve);
    function loop() {
      if (keys['ArrowLeft']) { paddle.x = Math.max(0, paddle.x - 6); if (!ball.live) ball.x = paddle.x + paddle.w / 2; }
      if (keys['ArrowRight']) { paddle.x = Math.min(W - paddle.w, paddle.x + 6); if (!ball.live) ball.x = paddle.x + paddle.w / 2; }
      if (ball.live) {
        ball.x += ball.dx; ball.y += ball.dy;
        if (ball.x < ball.r || ball.x > W - ball.r) ball.dx *= -1;
        if (ball.y < ball.r) ball.dy *= -1;
        if (ball.y > H - 26 && ball.y < H - 14 && ball.x > paddle.x && ball.x < paddle.x + paddle.w) {
          ball.dy = -Math.abs(ball.dy); ball.dx += ((ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)) * 1.5;
        }
        if (ball.y > H) { over = true; }
        bricks.forEach(function (b) {
          if (b.on && ball.x > b.x && ball.x < b.x + bw && ball.y > b.y && ball.y < b.y + bh) {
            b.on = false; ball.dy *= -1; score += 10; scoreEl.textContent = '分數 ' + score;
          }
        });
        if (bricks.every(function (b) { return !b.on; })) over = 'win';
      }
      draw();
      if (over) { drawEnd(); return; }
      raf = requestAnimationFrame(loop);
    }
    function draw() {
      ctx.fillStyle = '#0a0e1a'; ctx.fillRect(0, 0, W, H);
      bricks.forEach(function (b) { if (b.on) { ctx.fillStyle = b.c; ctx.globalAlpha = .85; ctx.fillRect(b.x, b.y, bw, bh); ctx.globalAlpha = 1; } });
      ctx.fillStyle = '#22d3ee'; ctx.fillRect(paddle.x, H - 22, paddle.w, paddle.h);
      ctx.beginPath(); ctx.arc(ball.x, ball.y, ball.r, 0, 7); ctx.fillStyle = '#fff'; ctx.shadowColor = '#22d3ee'; ctx.shadowBlur = 12; ctx.fill(); ctx.shadowBlur = 0;
      if (!ball.live && !over) { ctx.fillStyle = '#64748b'; ctx.font = '13px monospace'; ctx.textAlign = 'center'; ctx.fillText('按空白鍵 / 點擊發球', W / 2, H - 44); ctx.textAlign = 'left'; }
    }
    function drawEnd() {
      ctx.fillStyle = 'rgba(5,7,13,.82)'; ctx.fillRect(0, 0, W, H);
      ctx.textAlign = 'center'; ctx.fillStyle = over === 'win' ? '#34d399' : '#f87171';
      ctx.font = 'bold 30px monospace'; ctx.fillText(over === 'win' ? 'CLEARED!' : 'GAME OVER', W / 2, H / 2 - 10);
      ctx.fillStyle = '#cbd5e1'; ctx.font = '15px monospace'; ctx.fillText('分數 ' + score + ' · 點擊重玩', W / 2, H / 2 + 24);
      ctx.textAlign = 'left';
      cv.onclick = function () { cv.onclick = null; bricks.forEach(function (b) { b.on = true; }); score = 0; over = false; scoreEl.textContent = '分數 0'; reset(); cv.addEventListener('click', serve); loop(); };
    }
    function close() { cancelAnimationFrame(raf); document.removeEventListener('keydown', kd); document.removeEventListener('keyup', ku); m.remove(); }
    m.querySelector('.game-close').onclick = close;
    m.addEventListener('click', function (e) { if (e.target === m) close(); });
    loop();
  };

  /* ---------- interactive terminal (home only) ---------- */
  var input = document.getElementById('twInput');
  if (input) {
    var body = document.getElementById('twBody');
    var hist = [], hi = -1;
    function out(html, cls) { var d = document.createElement('div'); d.className = 'tw-line'; d.innerHTML = '<span class="tw-out ' + (cls || '') + '">' + html + '</span>'; body.appendChild(d); body.scrollTop = body.scrollHeight; }
    function echo(cmd) { var d = document.createElement('div'); d.className = 'tw-line'; d.innerHTML = '<span class="tw-prompt">$</span> <span class="tw-cmd">' + cmd.replace(/</g, '&lt;') + '</span>'; body.appendChild(d); }
    var cmds = {
      help: function () { out('可用指令：<b>help whoami about projects posts github flag game matrix neofetch clear</b>'); },
      whoami: function () { out('曾緯淳 (Mason) — 資安研究 · CTF 出題 · 學生飛行員 · 生成式 AI。'); },
      about: function () { out('開啟關於頁…'); setTimeout(function () { go('/about/'); }, 500); },
      projects: function () { out('開啟專案頁…'); setTimeout(function () { go('/projects/'); }, 500); },
      posts: function () { out('開啟文章頁…'); setTimeout(function () { go('/posts/'); }, 500); },
      github: function () { out('開啟 GitHub…'); setTimeout(function () { window.open('https://github.com/masonzeng702550', '_blank'); }, 300); },
      flag: function () { out('AIS3{y0u_f0und_th3_t3rm1n4l_fl4g}', 'ok'); },
      game: function () { out('啟動 Breakout…'); launchGame(); },
      matrix: function () { out('進入 matrix…'); matrixRain(); },
      neofetch: function () { out('<pre class="tw-fetch">mason@blog\n----------\nOS   : MaZon.log (Hexo)\nHost : GitHub Pages\nShell: neon-terminal\nLang : Python · TypeScript · Swift\nWM   : cyan+violet\nCTF  : AIS3 · HITCON · CGGC</pre>'); },
      clear: function () { body.innerHTML = ''; },
      sudo: function () { out('梅森 is not in the sudoers file. This incident will be reported.', 'err'); },
      ls: function () { out('about/  posts/  projects/  search/  secret.flag'); },
      exit: function () { out('bye 👋'); }
    };
    function run(raw) {
      var cmd = raw.trim(); if (!cmd) return; echo(cmd); hist.unshift(cmd); hi = -1;
      var name = cmd.split(' ')[0].toLowerCase();
      if (cmds[name]) cmds[name](); else out('指令找不到：' + name.replace(/</g, '&lt;') + '（試 <b>help</b>）', 'err');
    }
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { run(input.value); input.value = ''; }
      else if (e.key === 'ArrowUp') { if (hi < hist.length - 1) { hi++; input.value = hist[hi]; } e.preventDefault(); }
      else if (e.key === 'ArrowDown') { if (hi > 0) { hi--; input.value = hist[hi]; } else { hi = -1; input.value = ''; } e.preventDefault(); }
    });
    document.querySelector('.term-widget').addEventListener('click', function () { input.focus(); });
  }
})();
