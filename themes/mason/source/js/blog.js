(function () {
  var pb = document.querySelector('.progress');
  var header = document.querySelector('.site-header');
  var totop = document.querySelector('.totop');
  window.addEventListener('scroll', function () {
    var h = document.documentElement;
    if (pb) pb.style.width = (h.scrollTop / (h.scrollHeight - h.clientHeight) * 100) + '%';
    if (header) header.classList.toggle('scrolled', h.scrollTop > 30);
    if (totop) totop.classList.toggle('show', h.scrollTop > 500);
  });
  if (totop) totop.onclick = function () { window.scrollTo({ top: 0, behavior: 'smooth' }); };

  // reveal on scroll — hardened:
  // (1) INLINE styles pin the final state so Google-Translate DOM churn can't hide it
  // (2) scroll-sweep is the primary trigger (independent of IntersectionObserver)
  // (3) viewport height falls back through several sources so odd envs still reveal
  // (4) a final failsafe guarantees content is never left permanently hidden
  var shown = [];
  function vh() {
    return window.innerHeight || document.documentElement.clientHeight ||
      (window.visualViewport && window.visualViewport.height) || screen.height || 800;
  }
  function reveal(el) {
    if (el.__rv) return;
    var r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) return;   // hidden (display:none) — reveal later when shown
    el.__rv = 1; shown.push(el);
    el.classList.add('in'); el.style.opacity = '1'; el.style.transform = 'none';
  }
  function reassert() {
    shown.forEach(function (el) {
      if (!el.classList.contains('in')) el.classList.add('in');
      if (el.style.opacity !== '1') el.style.opacity = '1';
      if (el.style.transform !== 'none') el.style.transform = 'none';
    });
  }
  var all = [].slice.call(document.querySelectorAll('.reveal'));
  function sweep() {
    var H = vh();
    all.forEach(function (e) {
      if (e.__rv) return;
      var r = e.getBoundingClientRect();
      if (r.top < H * 0.92 && r.bottom > -60) reveal(e);
    });
  }
  var queued = false;
  function onScroll() { if (queued) return; queued = true; requestAnimationFrame(function () { queued = false; sweep(); reassert(); }); }
  window.addEventListener('scroll', onScroll, { passive: true });
  // IntersectionObserver as an extra trigger where it works
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { reveal(e.target); io.unobserve(e.target); } });
    }, { threshold: 0.06, rootMargin: '0px 0px -5% 0px' });
    all.forEach(function (e) { io.observe(e); });
  }
  sweep();
  window.addEventListener('load', function () { setTimeout(function () { sweep(); reassert(); }, 60); });
  [250, 700, 1500, 3000].forEach(function (t) { setTimeout(function () { sweep(); reassert(); }, t); });
  // failsafe: reveal anything within/near the fold so content is never stuck hidden,
  // while genuinely below-fold items still wait to animate in on scroll
  setTimeout(function () {
    var H = vh();
    all.forEach(function (e) { if (e.__rv) return; if (e.getBoundingClientRect().top < H * 1.1) reveal(e); });
  }, 4500);

  // posts list "看更多" — show a batch, reveal more on click (each new card fades up)
  var moreBtn = document.getElementById('loadMore');
  var pgrid = document.getElementById('postsGrid');
  if (moreBtn && pgrid) {
    var STEP = 9;
    var cards = [].slice.call(pgrid.querySelectorAll('.acard'));
    var vis = Math.min(STEP, cards.length);
    cards.forEach(function (c, i) { if (i >= STEP) c.classList.add('hidden-more'); });
    function label() {
      var left = cards.length - vis;
      if (left <= 0) { moreBtn.style.display = 'none'; }
      else { moreBtn.textContent = '看更多（還有 ' + left + ' 篇）'; }
    }
    if (cards.length <= STEP) moreBtn.style.display = 'none'; else label();
    moreBtn.addEventListener('click', function () {
      var end = Math.min(vis + STEP, cards.length);
      for (var i = vis; i < end; i++) cards[i].classList.remove('hidden-more');
      vis = end;
      requestAnimationFrame(function () {
        for (var i = 0; i < vis; i++) reveal(cards[i]);
        if (window.__retranslate) window.__retranslate();
      });
      label();
    });
  }

  // TOC active on scroll
  var links = [].slice.call(document.querySelectorAll('.post-aside .toc-link'));
  if (links.length) {
    var map = {};
    links.forEach(function (l) {
      var id = decodeURIComponent((l.getAttribute('href') || '').slice(1));
      if (id) map[id] = l;
    });
    var so = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) {
          links.forEach(function (l) { l.classList.remove('active'); });
          var a = map[e.target.id];
          if (a) a.classList.add('active');
        }
      });
    }, { rootMargin: '-10% 0px -80% 0px' });
    document.querySelectorAll('.post-content h2, .post-content h3').forEach(function (h) {
      if (h.id) so.observe(h);
    });
  }

  // clap (localStorage, per-slug)
  var cb = document.querySelector('.clap-btn');
  if (cb) {
    var K = 'clap-' + (cb.getAttribute('data-slug') || location.pathname);
    var c = +(localStorage.getItem(K) || 0);
    var s = cb.querySelector('.cn');
    var upd = function () { if (s) s.textContent = c; };
    upd();
    cb.onclick = function () {
      c++; localStorage.setItem(K, c); upd(); cb.classList.add('done');
      cb.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.12)' }, { transform: 'scale(1)' }], { duration: 200 });
    };
  }

  // posts page: timeline / category toggle
  var toggle = document.querySelector('.posts-toggle');
  if (toggle) {
    toggle.querySelectorAll('button').forEach(function (b) {
      b.addEventListener('click', function () {
        toggle.querySelectorAll('button').forEach(function (x) { x.classList.remove('active'); });
        b.classList.add('active');
        var v = b.getAttribute('data-v');
        document.getElementById('view-time').hidden = (v !== 'time');
        document.getElementById('view-cat').hidden = (v !== 'cat');
      });
    });
  }

  // close mobile nav after clicking a link
  var navToggle = document.getElementById('navtoggle');
  if (navToggle) {
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      a.addEventListener('click', function () { navToggle.checked = false; });
    });
  }

  // one-click copy button on each code block (bottom-right)
  document.querySelectorAll('.post-content figure.highlight').forEach(function (fig) {
    if (fig.querySelector('.copy-btn')) return;
    var btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'copy-btn'; btn.textContent = '複製';
    btn.setAttribute('aria-label', '複製程式碼');
    fig.appendChild(btn);
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      var pre = fig.querySelector('td.code pre') || fig.querySelector('pre');
      var text = pre ? pre.innerText : '';
      var done = function () {
        btn.textContent = '已複製'; btn.classList.add('done');
        setTimeout(function () { btn.textContent = '複製'; btn.classList.remove('done'); }, 1500);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
      } else { fallback(text, done); }
    });
  });
  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }
})();
