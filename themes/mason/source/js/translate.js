/* Custom on-site translator — fast, clean, no widget/banner.
   Batches many strings into single requests, caches, persists across pages,
   restores the original with a reload. */
(function () {
  var KEY = 'site_lang';
  var ENDPOINT = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-TW&dt=t';
  var BATCH_CHARS = 1400, BATCH_N = 40;           // per-request size caps
  // hand-picked glossary for UI terms (instant, no request)
  var GLOSS = {
    en: { '首頁': 'Home', '文章': 'Articles', '專案': 'Projects', '關於': 'About', '搜尋': 'Search',
      '精選文章': 'Featured Posts', '所有文章': 'All Posts', '全部': 'All', '看更多': 'See more',
      '分類與標籤': 'Categories & Tags', '開發足跡': 'Dev Activity', '酷專案': 'Cool Projects',
      '作品預覽': 'Live Previews', '互動終端機': 'Interactive Terminal', '讀文章': 'Read posts',
      '看專案': 'View projects', '關於我': 'About me', '搜尋全站': 'Search the site', '最新': 'Latest', '主題分類': 'By topic' },
    ja: { '首頁': 'ホーム', '文章': '記事', '專案': 'プロジェクト', '關於': '概要', '搜尋': '検索',
      '精選文章': '注目の記事', '所有文章': 'すべての記事', '全部': 'すべて', '看更多': 'もっと見る',
      '分類與標籤': 'カテゴリとタグ', '開發足跡': '開発の足跡', '酷專案': 'プロジェクト',
      '作品預覽': 'ライブプレビュー', '互動終端機': 'ターミナル', '讀文章': '記事を読む',
      '看專案': 'プロジェクトを見る', '關於我': '私について', '搜尋全站': 'サイト内検索', '最新': '最新', '主題分類': 'トピック別' }
  };

  function stored() { try { return localStorage.getItem(KEY) || 'zh'; } catch (e) { return 'zh'; } }
  function store(l) { try { l === 'zh' ? localStorage.removeItem(KEY) : localStorage.setItem(KEY, l); } catch (e) {} }
  function cget(l, t) { try { return localStorage.getItem('tr:' + l + ':' + t); } catch (e) { return null; } }
  function cset(l, t, v) {
    try { localStorage.setItem('tr:' + l + ':' + t, v); }
    catch (e) { try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf('tr:') === 0) localStorage.removeItem(k); }); localStorage.setItem('tr:' + l + ':' + t, v); } catch (e2) {} }
  }

  function skip(el) {
    if (!el) return true;
    return !!el.closest('.notranslate,[translate="no"],code,pre,kbd,samp,script,style,#boot,.term-widget,.lang-switch,.brand,.progress');
  }
  function collect() {
    var nodes = [], w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.__done) return NodeFilter.FILTER_REJECT;
        var t = n.nodeValue;
        if (!t || t.trim().length < 2) return NodeFilter.FILTER_REJECT;
        if (!/[一-鿿]/.test(t)) return NodeFilter.FILTER_REJECT;   // only Chinese text
        if (skip(n.parentElement)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    var n; while ((n = w.nextNode())) nodes.push(n);
    return nodes;
  }

  var indEl, active = 0;
  function indicator() {
    if (!indEl) { indEl = document.createElement('div'); indEl.className = 'tr-indicator notranslate'; indEl.setAttribute('translate', 'no'); document.body.appendChild(indEl); }
    indEl.textContent = '翻譯中…'; indEl.style.opacity = '1';
  }
  function indDone() { if (active <= 0 && indEl) indEl.style.opacity = '0'; }

  function apply(l, groups, key, tr) {
    (groups[key] || []).forEach(function (n) {
      if (n.__done) return;
      var raw = n.nodeValue, lead = (raw.match(/^\s*/) || [''])[0], trail = (raw.match(/\s*$/) || [''])[0];
      if (n.__orig == null) n.__orig = raw;
      n.nodeValue = lead + tr + trail; n.__done = 1;
    });
  }
  function gtx(l, text) {   // translate a single string
    return fetch(ENDPOINT + '&tl=' + l + '&q=' + encodeURIComponent(text))
      .then(function (r) { return r.json(); })
      .then(function (j) { return j[0].map(function (s) { return s[0]; }).join(''); });
  }
  function translateBatch(l, keys, groups) {
    var lines = keys.map(function (k) { return k.replace(/\n/g, ' '); });
    return fetch(ENDPOINT + '&tl=' + l + '&q=' + encodeURIComponent(lines.join('\n')))
      .then(function (r) { return r.json(); })
      .then(function (j) {
        var full = j[0].map(function (s) { return s[0]; }).join('');
        var trs = full.split('\n');
        if (trs.length === keys.length) {
          keys.forEach(function (k, i) { cset(l, k, trs[i]); apply(l, groups, k, trs[i]); });
        } else {                                   // alignment drifted — translate individually
          return Promise.all(keys.map(function (k) { return gtx(l, k).then(function (tr) { cset(l, k, tr); apply(l, groups, k, tr); }); }));
        }
      })
      .catch(function () { return Promise.all(keys.map(function (k) { return gtx(l, k).then(function (tr) { apply(l, groups, k, tr); }).catch(function () {}); })); });
  }

  function translatePage(l) {
    document.documentElement.setAttribute('data-lang', l);
    var nodes = collect();
    if (!nodes.length) return;
    var groups = {}, order = [];
    nodes.forEach(function (n) { var k = n.nodeValue.trim(); if (!k) return; if (!groups[k]) { groups[k] = []; order.push(k); } groups[k].push(n); });
    // resolve glossary + cache instantly; queue the rest
    var need = [];
    order.forEach(function (k) {
      var g = (GLOSS[l] && GLOSS[l][k]) || cget(l, k);
      if (g != null) apply(l, groups, k, g); else need.push(k);
    });
    if (!need.length) return;
    // build size-bounded batches
    var batches = [], cur = [], len = 0;
    need.forEach(function (k) {
      if (cur.length && (len + k.length > BATCH_CHARS || cur.length >= BATCH_N)) { batches.push(cur); cur = []; len = 0; }
      cur.push(k); len += k.length + 1;
    });
    if (cur.length) batches.push(cur);
    active++; indicator();
    Promise.all(batches.map(function (b) { return translateBatch(l, b, groups); }))
      .then(function () { active--; indDone(); });
  }

  window.__retranslate = function () { var l = stored(); if (l !== 'zh') translatePage(l); };

  function markActive(l) {
    [].slice.call(document.querySelectorAll('.lang-switch button')).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === l);
    });
  }
  function setLang(l) {
    store(l);
    if (l === 'zh') { location.reload(); return; }   // reload restores the original Chinese
    markActive(l); translatePage(l);
  }
  function init() {
    [].slice.call(document.querySelectorAll('.lang-switch button')).forEach(function (b) {
      b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); });
    });
    var l = stored(); markActive(l);
    if (l !== 'zh') translatePage(l);                // persist across navigation
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
