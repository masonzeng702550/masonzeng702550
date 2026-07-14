/* Custom on-site translator (MyMemory engine, no Google widget).
   Translates CJK text nodes on demand, caches results, persists the chosen
   language across pages, and restores the original with a reload. */
(function () {
  var KEY = 'site_lang';
  var EMAIL = 'ohmygodmason@gmail.com';           // raises MyMemory's daily quota
  // hand-picked glossary for UI terms MyMemory renders awkwardly (instant, no request)
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
  var MAXLEN = 480;                                // MyMemory per-request length budget
  var CONC = 5;                                    // concurrent requests

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
  function splitLen(s) {
    if (s.length <= MAXLEN) return [s];
    var parts = [], cur = '';
    s.split(/([。！？!?；;\n])/).forEach(function (p) {
      if ((cur + p).length > MAXLEN) { if (cur) parts.push(cur); cur = p; } else cur += p;
    });
    if (cur) parts.push(cur);
    return parts.length ? parts : [s];
  }
  function fetchTr(l, text) {
    if (GLOSS[l] && GLOSS[l][text]) return Promise.resolve(GLOSS[l][text]);
    var cached = cget(l, text);
    if (cached) return Promise.resolve(cached);
    var chunks = splitLen(text);
    return chunks.reduce(function (acc, ch) {
      return acc.then(function (soFar) {
        var url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(ch) +
          '&langpair=zh-TW|' + l + '&de=' + encodeURIComponent(EMAIL);
        return fetch(url).then(function (r) { return r.json(); }).then(function (j) {
          var t = j && j.responseData && j.responseData.translatedText;
          return soFar + (t && j.responseStatus == 200 ? t : ch);
        }).catch(function () { return soFar + ch; });
      });
    }, Promise.resolve('')).then(function (out) { cset(l, text, out); return out; });
  }

  var indEl;
  function indicator(p) {
    if (!indEl) { indEl = document.createElement('div'); indEl.className = 'tr-indicator notranslate'; indEl.setAttribute('translate', 'no'); document.body.appendChild(indEl); }
    indEl.textContent = '翻譯中… ' + p + '%';
    indEl.style.opacity = '1';
  }
  function indicatorDone() { if (indEl) { indEl.style.opacity = '0'; } }

  var translating = false;
  function translatePage(l) {
    if (translating) return; translating = true;
    document.documentElement.setAttribute('data-lang', l);
    var nodes = collect();
    if (!nodes.length) { translating = false; return; }
    // dedupe identical strings -> translate once, apply to all matching nodes
    var groups = {};
    nodes.forEach(function (n) { var k = n.nodeValue.trim(); (groups[k] = groups[k] || []).push(n); });
    var keys = Object.keys(groups), total = keys.length, done = 0, idx = 0;
    indicator(0);
    function next() {
      if (idx >= keys.length) return Promise.resolve();
      var key = keys[idx++];
      return fetchTr(l, key).then(function (tr) {
        groups[key].forEach(function (n) {
          var raw = n.nodeValue, lead = (raw.match(/^\s*/) || [''])[0], trail = (raw.match(/\s*$/) || [''])[0];
          if (n.__orig == null) n.__orig = raw;
          n.nodeValue = lead + tr + trail;
        });
        done++; indicator(Math.round(done / total * 100));
        return next();
      });
    }
    var pool = [];
    for (var i = 0; i < CONC; i++) pool.push(next());
    Promise.all(pool).then(function () { indicatorDone(); translating = false; });
  }

  function setLang(l) {
    store(l);
    if (l === 'zh') { location.reload(); return; }   // reload restores the original Chinese
    markActive(l);
    translatePage(l);
  }
  function markActive(l) {
    [].slice.call(document.querySelectorAll('.lang-switch button')).forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-lang') === l);
    });
  }

  // re-translate newly injected content (load-more cards, search results) if a language is active
  window.__retranslate = function () {
    var l = stored(); if (l === 'zh') return;
    if (translating) { setTimeout(window.__retranslate, 600); return; }
    translatePage(l);   // collect() only picks up still-Chinese nodes, so this is cheap + cached
  };

  function init() {
    var btns = [].slice.call(document.querySelectorAll('.lang-switch button'));
    btns.forEach(function (b) { b.addEventListener('click', function () { setLang(b.getAttribute('data-lang')); }); });
    var l = stored();
    markActive(l);
    if (l !== 'zh') translatePage(l);               // persist across page navigation
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
