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

  // reveal
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } });
  }, { threshold: 0.05 });
  document.querySelectorAll('.reveal').forEach(function (e) { io.observe(e); });
  setTimeout(function () {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (e) {
      if (e.getBoundingClientRect().top < window.innerHeight) e.classList.add('in');
    });
  }, 400);

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
