/* app.js: renders the shared header and footer and fills each page from data.js */
(function () {
  'use strict';
  var S = window.SITE;
  if (!S) return;

  // The admin panel drops empty fields, so give every section a safe default.
  ['links', 'hero', 'about', 'cv', 'now'].forEach(function (k) { S[k] = S[k] || {}; });
  ['books', 'certificates', 'education', 'experience', 'skills', 'languages', 'interests', 'path', 'method',
    'labs', 'projects', 'quotes', 'labEnvironment', 'focus', 'howIWork', 'confidential'].forEach(function (k) { S[k] = S[k] || []; });
  var DEF = window.SITE_DEFAULTS || {};
  if (S.services === undefined) S.services = DEF.services || [];
  S.log = S.log || [];
  S.analytics = S.analytics || {};
  S.now.console = S.now.console || [];
  delete S.links.blog; // the blog lives on this site now (blog.html)
  S.initials = S.initials || 'YA';

  var NAV = [
    ['Home', 'index'], ['About', 'about'], ['Work', 'projects'], ['Log', 'log'], ['Services', 'services'],
    ['Library', 'library'], ['Blog', 'blog'], ['Certificates', 'certificates'], ['Contact', 'contact']
  ];

  var ICON = {
    search: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    theme: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  var STATE = { 'done': 'Done', 'in-progress': 'In progress', 'next': 'Next', 'later': 'Later' };
  var BOOK_STATUS = { reading: 'Reading', read: 'Read', next: 'Up next' };
  var COVER_COLORS = ['#7B1E36', '#1F4FD1', '#0B7A75', '#B85C12', '#6B3FB8', '#C2307F', '#1F8A5F', '#222B33', '#8A5A2B', '#0E86B0'];
  var PAGE_COLORS = { index: '#7B1E36', about: '#0B7A75', projects: '#2B55D6', library: '#B85C12', blog: '#6B3FB8', certificates: '#1F8A5F', contact: '#0E86B0', log: '#D1435B', services: '#9A6B00' };

  /* ---------- helpers ---------- */
  function $(sel, root) { return (root || document).querySelector(sel); }

  function add(el, kid) {
    if (Array.isArray(kid)) { kid.forEach(function (k) { add(el, k); }); return; }
    if (kid == null || kid === false) return;
    el.append(kid.nodeType ? kid : document.createTextNode(kid));
  }

  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.indexOf('on') === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    if (!el.children.length && !el.hasAttribute('dir') && AR.test(el.textContent)) el.setAttribute('dir', 'auto');
    return el;
  }
  var AR = /[\u0600-\u06FF]/;

  function ext(href) { return { href: href, target: '_blank', rel: 'noopener' }; }

  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso));
    } catch (e) { return ''; }
  }

  function hash(str) {
    var n = 0;
    for (var i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) >>> 0;
    return n;
  }

  function bookById(id) {
    return (S.books || []).filter(function (b) { return b.id === id; })[0];
  }

  /* ---------- shared pieces ---------- */
  function toggleTheme() {
    var d = document.documentElement;
    var next = d.dataset.theme === 'dark' ? 'light' : 'dark';
    d.dataset.theme = next;
    try { localStorage.setItem('theme', next); } catch (e) { /* storage blocked */ }
  }

  function renderHeader() {
    var host = $('#site-header');
    if (!host) return;
    var cur = (location.pathname.split('/').pop() || 'index').replace(/\.html$/, '');
    if (document.body.dataset.page === 'post') cur = 'blog';
    var brand = h('a', { class: 'brand', href: 'index.html', 'aria-label': S.name + ', home' },
      h('span', { class: 'brand-mark', 'aria-hidden': 'true', text: S.initials }),
      h('span', { class: 'brand-name', text: S.name }));
    var nav = h('nav', { id: 'site-nav', class: 'nav', 'aria-label': 'Main' },
      NAV.map(function (n) {
        return h('a', { href: n[1] === 'index' ? 'index.html' : n[1] + '.html', 'aria-current': n[1] === cur ? 'page' : null, style: '--c:' + PAGE_COLORS[n[1]], text: n[0] });
      }));
    var themeBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Switch between light and dark theme', onclick: toggleTheme });
    themeBtn.innerHTML = ICON.theme;
    var menuBtn = h('button', {
      class: 'icon-btn menu-btn', type: 'button', 'aria-label': 'Menu', 'aria-expanded': 'false', 'aria-controls': 'site-nav',
      onclick: function () {
        var open = host.classList.toggle('open');
        menuBtn.setAttribute('aria-expanded', String(open));
      }
    });
    menuBtn.innerHTML = ICON.menu;
    var searchBtn = h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Search the site (press Ctrl+K)', title: 'Search (Ctrl+K)', onclick: function () { palette(); } });
    searchBtn.innerHTML = ICON.search;
    host.append(h('div', { class: 'wrap bar' }, brand, nav, h('div', { class: 'bar-tools' }, searchBtn, themeBtn, menuBtn)));
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && host.classList.contains('open')) {
        host.classList.remove('open');
        menuBtn.setAttribute('aria-expanded', 'false');
        menuBtn.focus();
      }
    });
  }

  function renderFooter() {
    var host = $('#site-footer');
    if (!host) return;
    var L = S.links;
    var links = [['LinkedIn', L.linkedin], ['GitHub', L.github]];
    var internal = [['Blog', 'blog.html'], ['Résumé', 'cv.html']];
    if (L.youtube) links.push(['YouTube', L.youtube]);
    host.append(h('div', { class: 'wrap foot' },
      h('div', {},
        h('p', { class: 'foot-name', text: S.name }),
        h('p', { class: 'muted', text: S.role + '. ' + S.location + '.' })),
      h('ul', { class: 'foot-links' }, internal.map(function (l) {
        return h('li', {}, h('a', { href: l[1], text: l[0] }));
      }).concat(links.map(function (l) {
        return h('li', {}, h('a', ext(l[1]), l[0]));
      }))),
      h('p', { class: 'muted foot-note' },
        '© ' + new Date().getFullYear() + ' ' + S.name + '. Written by hand and hosted free on GitHub Pages.')));
  }

  function photo() {
    var frame = h('div', { class: 'frame' }, h('span', { class: 'mono', 'aria-hidden': 'true', text: S.initials }));
    var wrap = h('div', { class: 'photo' }, frame);
    if (S.photo) {
      var img = new Image();
      img.alt = 'Portrait of ' + S.name;
      img.onload = function () { wrap.classList.add('has-img'); frame.prepend(img); };
      img.src = S.photo;
    }
    return wrap;
  }

  function cover(b, small) {
    var color = b.cover ? null : COVER_COLORS[hash(b.id || b.title) % COVER_COLORS.length];
    var el = h('div', { class: 'cover' + (small ? ' sm' : ''), role: 'img', 'aria-label': 'Cover of ' + b.title });
    if (b.cover) {
      el.classList.add('img');
      el.append(h('img', { src: b.cover, alt: '', loading: 'lazy' }));
    } else {
      el.style.background = color;
      el.append(h('span', { class: 'cover-title', text: b.title }), h('span', { class: 'cover-band' }), h('span', { class: 'cover-author', text: b.author }));
      findCover(b, function (url) {
        var img = new Image();
        img.alt = '';
        img.onload = function () {
          if (img.naturalWidth < 20) return;
          el.textContent = '';
          el.style.background = '';
          el.classList.add('img');
          el.append(img);
        };
        img.src = url;
      });
    }
    return el;
  }

  /* Books without an uploaded cover look for one on Open Library, then keep the answer in this browser. */
  var coverQueue = [], coverBusy = 0;
  function coverKey(b) { return 'cov2:' + (b.id || b.title); }
  function findCover(b, cb) {
    var key = coverKey(b), cached = null;
    try { cached = localStorage.getItem(key); } catch (e) { /* storage blocked */ }
    if (cached === '-') return;
    if (cached) return cb(cached);
    coverQueue.push({ b: b, cb: cb, key: key });
    pumpCovers();
  }
  function pumpCovers() {
    while (coverBusy < 3 && coverQueue.length) {
      (function (job) {
        coverBusy++;
        var first = String(job.b.author || '').split(/ and |, | & /)[0];
        var u = 'https://openlibrary.org/search.json?limit=1&fields=cover_i&title=' + encodeURIComponent(job.b.title) + '&author=' + encodeURIComponent(first);
        fetch(u).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
          var id = j && j.docs && j.docs[0] && j.docs[0].cover_i;
          var url = id ? 'https://covers.openlibrary.org/b/id/' + id + '-M.jpg?default=false' : '-';
          try { localStorage.setItem(job.key, url); } catch (e) { /* storage blocked */ }
          if (id) job.cb(url);
        }).catch(function () { /* offline or blocked: keep the generated cover */ }).then(function () { coverBusy--; pumpCovers(); });
      })(coverQueue.shift());
    }
  }

  function badge(text, cls) { return h('span', { class: 'badge' + (cls ? ' ' + cls : ''), text: text }); }

  function miniBook(b) {
    return h('a', { class: 'mini', href: 'library.html' },
      cover(b, true),
      h('span', {},
        h('span', { class: 'mini-title', text: b.title }),
        h('span', { class: 'muted mini-by', text: b.author })));
  }

  /* ---------- reusable renderers ---------- */
  function renderCerts(host) {
    if (!host) return;
    S.certificates.forEach(function (c) {
      host.append(h('article', { class: 'cert' },
        h('p', { class: 'cert-date', text: c.date }),
        h('div', {},
          h('h3', { text: c.title }),
          h('p', { class: 'muted', text: c.issuer + (c.detail ? '. ' + c.detail : '') }),
          h('p', { class: 'muted small', text: c.type + (c.id && !c.verify ? '. Credential ID ' + c.id : '') })),
        c.verify ? h('a', Object.assign({ class: 'btn btn-ghost btn-sm' }, ext(c.verify)), 'Verify') : null));
    });
  }

  function renderCredsCompact(host) {
    if (!host) return;
    S.certificates.forEach(function (c) {
      host.append(h('li', {}, h('strong', { text: c.title }), h('span', { class: 'muted', text: c.issuer + ', ' + c.date })));
    });
    S.education.forEach(function (e) {
      host.append(h('li', {}, h('strong', { text: e.degree }), h('span', { class: 'muted', text: e.school + ', ' + e.period })));
    });
  }

  function renderConsole(el) {
    if (!el) return;
    el.append(h('p', { class: 'console-line' }, h('span', { class: 'prompt', text: 'youssef@platform:~$ ' }), 'status'));
    var dl = h('dl');
    S.now.console.forEach(function (r) { dl.append(h('dt', { text: r.k }), h('dd', { text: r.v })); });
    el.append(dl);
  }

  /* ---------- pages ---------- */
  var PAGES = {};

  PAGES.home = function () {
    var p = $('#photo');
    if (p) p.append(photo());
    var r = $('#reading-now');
    if (r) {
      var current = S.books.filter(function (b) { return b.status === 'reading'; }).slice(0, 2);
      current.forEach(function (b) { r.append(miniBook(b)); });
      if (!current.length) r.append(h('p', { class: 'muted small', text: 'No book is marked as reading right now.' }));
    }
    document.title = S.name + ' | ' + (S.role || '');
    var focus = $('#focus');
    if (focus && S.focus.length) {
      focus.textContent = '';
      S.focus.forEach(function (f) {
        focus.append(h('div', { class: 'row' },
          h('h3', { text: f.title }),
          h('div', {},
            h('p', { text: f.text }),
            f.link ? h('p', {}, h('a', { class: 'textlink', href: f.link, text: f.linkLabel || 'Read more' })) : null)));
      });
    }
    renderStats($('#stats'));
    renderSpark($('#spark'));
    var lw = $('#log-home-wrap');
    if (lw && S.log.length) { lw.hidden = false; renderLog($('#log-home'), 3); }
    renderLatest($('#latest-posts'), 3);
    renderConsole($('#console'));
    renderCredsCompact($('#creds'));
  };

  PAGES.about = function () {
    var p = $('#photo');
    if (p) p.append(photo());
    var ap = $('#about-paras');
    if (ap && S.about.paragraphs && S.about.paragraphs.length) {
      ap.textContent = '';
      S.about.paragraphs.forEach(function (t) { ap.append(h('p', { text: t })); });
    }
    var how = $('#how');
    if (how && S.howIWork.length) {
      how.textContent = '';
      S.howIWork.forEach(function (x) { how.append(h('div', {}, h('h3', { text: x.title }), h('p', { text: x.text }))); });
    }
    var sk = $('#skills');
    if (sk) S.skills.forEach(function (g) {
      sk.append(h('div', { class: 'kv' },
        h('h3', { text: g.group }),
        h('ul', { class: 'tags' }, g.items.map(function (i) { return h('li', { text: i }); }))));
    });
    var ex = $('#experience');
    if (ex) S.experience.forEach(function (e) {
      ex.append(h('article', { class: 'kv' },
        h('div', {}, h('h3', { text: e.role + (e.company ? ', ' + e.company : '') }), h('p', { class: 'muted', text: e.period })),
        h('ul', { class: 'plain' }, (e.points || []).map(function (t) { return h('li', { text: t }); }))));
    });
    var ed = $('#education');
    if (ed) S.education.forEach(function (e) {
      ed.append(h('article', { class: 'kv' },
        h('div', {}, h('h3', { text: e.degree }), h('p', { class: 'muted', text: e.period })),
        h('p', { text: e.school })));
    });
    var lg = $('#languages');
    if (lg) S.languages.forEach(function (l) {
      lg.append(h('li', {}, h('strong', { text: l.name }), h('span', { class: 'muted', text: l.level })));
    });
    var it = $('#interests');
    if (it) S.interests.forEach(function (i) { it.append(h('li', { text: i })); });
  };

  PAGES.work = function () {
    renderProgress($('#path-progress'));
    var ol = $('#path');
    if (ol) S.path.forEach(function (ph, i) {
      ol.append(h('li', { class: 'phase ' + ph.status },
        h('span', { class: 'phase-n', 'aria-hidden': 'true', text: String(i + 1) }),
        h('div', { class: 'phase-head' },
          h('h3', { text: ph.name }),
          badge(STATE[ph.status])),
        h('p', { class: 'phase-sum', text: ph.summary }),
        h('ul', { class: 'topics' }, ph.items.map(function (t) {
          return h('li', { class: t.s || '' }, h('span', { text: t.t }), t.s ? h('span', { class: 'tstate', text: STATE[t.s] }) : null);
        }))));
    });
    var env = $('#env');
    if (env) {
      var dl = h('dl');
      S.labEnvironment.forEach(function (r) { dl.append(h('dt', { text: r.k }), h('dd', { text: r.v })); });
      env.append(dl);
    }
    var ct = $('#cert-targets');
    if (ct) ct.textContent = S.certTargets || '';
    var conf = $('#confidential');
    if (conf && S.confidential.length) {
      var holder = conf.parentNode;
      conf.remove();
      S.confidential.forEach(function (c) {
        holder.append(h('div', { class: 'kv' }, h('h3', { text: c.title }), h('div', {}, h('p', { text: c.text }))));
      });
      holder.append(h('p', { class: 'muted small', style: 'margin-top:18px' }, 'To know more about this kind of work, ask me in an interview or by ', h('a', { href: 'contact.html', text: 'email' }), '.'));
    }
    var me = $('#method');
    if (me) S.method.forEach(function (m) { me.append(h('li', { text: m })); });
    renderProjects($('#projects-list'));
  };

  function bookCard(b, list, i) {
    function open() { bookDialog(list || [b], list ? i : 0); }
    var cv = h('button', { class: 'cover-btn', type: 'button', 'aria-label': 'Open details for ' + b.title, onclick: open }, cover(b));
    var el = h('article', { class: 'book' }, cv);
    el.append(h('h3', {}, h('button', { class: 'title-btn', type: 'button', dir: 'auto', onclick: open, text: b.title })));
    el.append(h('p', { class: 'muted by', dir: 'auto', text: b.author }));
    el.append(h('p', { class: 'meta-row' }, badge(BOOK_STATUS[b.status] || b.status, b.status), b.topic ? h('span', { class: 'muted small topic', style: '--tc:' + COVER_COLORS[hash(b.topic) % COVER_COLORS.length], text: b.topic }) : null));
    if (b.rating) el.append(h('p', { class: 'stars', 'aria-label': 'Rated ' + b.rating + ' out of 5', text: '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) }));
    var blurb = b.takeaway || b.note;
    if (blurb) el.append(h('p', { class: 'takeaway', dir: 'auto', text: blurb.length > 130 ? blurb.slice(0, 127).trim() + '…' : blurb }));
    el.append(h('button', { class: 'textlink small more-btn', type: 'button', onclick: open }, 'Details'));
    fetchIndex().then(function (idx) {
      var n = postsOfBook(idx, b).length;
      if (n) el.append(h('a', { class: 'textlink small', href: 'blog.html?book=' + encodeURIComponent(b.id || slugT(b.title)) }, n > 1 ? 'Read the articles' : 'Read the article'));
    });
    return el;
  }

  function bookDialog(list, start) {
    var i = start, last = document.activeElement;
    var body = h('div', { class: 'bk-body' });
    var prev = h('button', { class: 'bk-nav bk-prev', type: 'button', 'aria-label': 'Previous book', onclick: function () { go(-1); } }, '‹');
    var next = h('button', { class: 'bk-nav bk-next', type: 'button', 'aria-label': 'Next book', onclick: function () { go(1); } }, '›');
    var close = h('button', { class: 'bk-close', type: 'button', 'aria-label': 'Close', onclick: shut }, '✕');
    var panel = h('div', { class: 'bk', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Book details' }, close, body);
    var wrap = h('div', { class: 'bk-wrap' }, prev, panel, next);
    wrap.addEventListener('click', function (e) { if (e.target === wrap) shut(); });
    function paras(t) { return String(t || '').split(/\n\s*\n/).filter(Boolean); }
    function show() {
      var b = list[i];
      body.textContent = '';
      var info = h('div', { class: 'bk-info' },
        h('div', { class: 'meta-row' }, badge(BOOK_STATUS[b.status] || b.status, b.status), b.topic ? h('span', { class: 'muted small topic', style: '--tc:' + COVER_COLORS[hash(b.topic) % COVER_COLORS.length], text: b.topic }) : null),
        h('h2', { dir: 'auto', text: b.title }),
        h('p', { class: 'muted', dir: 'auto', text: b.author }));
      if (b.rating) info.append(h('p', { class: 'stars', 'aria-label': 'Rated ' + b.rating + ' out of 5', text: '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) }));
      paras(b.description).forEach(function (t) { info.append(h('p', { dir: 'auto', text: t })); });
      if (b.takeaway) info.append(h('blockquote', { class: 'bk-take', dir: 'auto' }, h('strong', { text: 'What I took from it' }), h('span', { text: b.takeaway })));
      if (b.note) info.append(h('p', { class: 'small muted', dir: 'auto', text: b.note }));
      if (!b.description && !b.takeaway && !b.note) info.append(h('p', { class: 'muted', text: b.status === 'next' ? 'On the list. Notes will appear here once I start it.' : 'No notes written for this book yet.' }));
      body.append(h('div', { class: 'bk-cover' }, cover(b)), info);
      prev.hidden = next.hidden = list.length < 2;
      fetchIndex().then(function (idx) {
        if (list[i] !== b || !body.isConnected) return;
        var ps = postsOfBook(idx, b);
        if (!ps.length) return;
        ps.sort(function (x, y) { return ((x.series && x.series.order) || 0) - ((y.series && y.series.order) || 0) || String(x.date).localeCompare(String(y.date)); });
        var sr = b.series || {};
        var sec = h('div', { class: 'bk-posts' }, h('strong', { dir: 'auto', text: sr.title || 'Articles about this book' }));
        if (sr.parts) {
          var tr = h('div', { class: 'bar-track light' }, h('span', { class: 'bar-fill' }));
          tr.firstChild.style.setProperty('--w', Math.min(100, Math.round(ps.length / sr.parts * 100)) + '%');
          sec.append(h('span', { class: 'muted small', style: 'display:block', text: ps.length + ' of ' + sr.parts + ' articles published' }), tr);
        }
        sec.append(h('ul', {}, ps.map(function (p) { return h('li', {}, h('a', { href: postUrl(p), dir: 'auto', text: p.title })); })));
        info.append(sec);
      });
    }
    function go(d) { i = (i + d + list.length) % list.length; show(); }
    function key(e) {
      if (e.key === 'Escape') shut();
      else if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'Tab') {
        var f = wrap.querySelectorAll('button:not([hidden]), a[href]');
        if (!f.length) return;
        var first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    }
    function shut() {
      document.removeEventListener('keydown', key);
      wrap.remove(); document.body.classList.remove('noscroll');
      if (last && last.focus) last.focus();
    }
    document.addEventListener('keydown', key);
    document.body.append(wrap); document.body.classList.add('noscroll');
    show(); close.focus();
  }

  PAGES.library = function () {
    var grid = $('#shelf'), chips = $('#chips'), q = $('#q'), empty = $('#empty'), count = $('#count');
    var state = { status: 'all', q: (new URLSearchParams(location.search).get('q') || '') };
    q.value = state.q;
    var order = ['all', 'reading', 'read', 'next'];
    var labels = { all: 'All', reading: 'Reading', read: 'Read', next: 'Up next' };
    function n(s) { return s === 'all' ? S.books.length : S.books.filter(function (b) { return b.status === s; }).length; }
    order.forEach(function (s) {
      if (s !== 'all' && n(s) === 0) return;
      var btn = h('button', { class: 'chip', type: 'button', 'data-s': s, 'aria-pressed': String(s === state.status) }, labels[s] + ' ', h('span', { class: 'chip-n', text: String(n(s)) }));
      btn.addEventListener('click', function () {
        state.status = s;
        Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', String(c.dataset.s === s)); });
        draw();
      });
      chips.append(btn);
    });
    function draw() {
      var term = state.q.trim().toLowerCase();
      var list = S.books.filter(function (b) {
        if (state.status !== 'all' && b.status !== state.status) return false;
        if (!term) return true;
        return [b.title, b.author, b.topic, b.description].join(' ').toLowerCase().indexOf(term) !== -1;
      });
      grid.textContent = '';
      list.forEach(function (b, k) { grid.append(bookCard(b, list, k)); });
      empty.hidden = list.length > 0;
      count.textContent = list.length + (list.length === 1 ? ' book' : ' books');
    }
    q.addEventListener('input', function () { state.q = q.value; draw(); });
    $('#clear').addEventListener('click', function () {
      state.q = ''; state.status = 'all'; q.value = '';
      Array.prototype.forEach.call(chips.children, function (c) { c.setAttribute('aria-pressed', String(c.dataset.s === 'all')); });
      draw();
    });
    draw();
  };

  PAGES.certificates = function () {
    renderCerts($('#cert-list'));
    var ed = $('#education');
    if (ed) S.education.forEach(function (e) {
      ed.append(h('article', { class: 'cert' },
        h('p', { class: 'cert-date', text: e.period }),
        h('div', {}, h('h3', { text: e.degree }), h('p', { class: 'muted', text: e.school }))));
    });
  };

  PAGES.contact = function () {
    var mail = $('#mail');
    if (mail) {
      mail.href = 'mailto:' + S.email;
      mail.textContent = S.email;
    }
    var copy = $('#copy');
    if (copy) copy.addEventListener('click', function () {
      var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy address'; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(S.email).then(done, function () { copy.textContent = 'Copy failed. Select it by hand.'; });
      else copy.textContent = 'Select the address by hand';
    });
    var ls = $('#contact-links');
    if (ls) {
      var L = S.links;
      var rows = [['LinkedIn', L.linkedin], ['GitHub', L.github]];
      if (L.youtube) rows.push(['YouTube', L.youtube]);
      rows.forEach(function (r) {
        ls.append(h('li', {}, h('a', ext(r[1]), r[0]), h('span', { class: 'muted small', text: r[1].replace(/^https?:\/\//, '') })));
      });
      ls.append(h('li', {}, h('a', { href: 'blog.html' }, 'Blog'), h('span', { class: 'muted small', text: 'eng-youssefamir.github.io/blog' })));
    }
  };

  PAGES.cv = function () {
    var cv = $('#cv');
    if (!cv) return;
    var L = S.links;
    function sec(title, body) { return h('section', { class: 'cv-sec' }, h('h2', { text: title }), body); }
    cv.append(
      h('header', { class: 'cv-head' },
        h('h1', { text: S.name }),
        h('p', { class: 'cv-role', text: S.cv.headline || S.role }),
        h('p', { class: 'muted' }, S.email, ' | ', L.linkedin.replace(/^https?:\/\//, ''), ' | ', L.github.replace(/^https?:\/\//, ''), ' | ', S.location)),
      sec('Career objective', h('p', { text: S.cv.objective || '' })),
      sec('Education', h('div', {}, S.education.map(function (e) {
        return h('p', {}, h('strong', { text: e.degree }), h('br'), e.school + ', ' + e.period);
      }))),
      sec('Certifications', h('ul', { class: 'plain' }, S.certificates.map(function (c) {
        return h('li', {}, h('strong', { text: c.title }), ', ' + c.issuer + ', ' + c.date + (c.verify ? '. ' + c.verify.replace(/^https?:\/\//, '') : '. Credential ID ' + c.id));
      }))),
      sec('Experience', h('div', {}, S.experience.map(function (e) {
        return h('div', {}, h('p', {}, h('strong', { text: e.role + (e.company ? ', ' + e.company : '') }), ', ' + e.period),
          h('ul', { class: 'plain' }, (e.points || []).map(function (t) { return h('li', { text: t }); })));
      }))),
      sec('Skills', h('ul', { class: 'plain' }, S.skills.map(function (g) {
        return h('li', {}, h('strong', { text: g.group + ': ' }), g.items.join(', '));
      }))),
      sec('Languages', h('p', { text: S.languages.map(function (l) { return l.name + ' (' + l.level + ')'; }).join(', ') })),
      sec('Interests', h('p', { text: S.interests.join(' | ') })));
    if (location.hash === '#pdf') setTimeout(function () { window.print(); }, 700);
    var btn = $('#print-cv');
    if (btn) btn.addEventListener('click', function () { window.print(); });
  };

  /* ---------- stats, progress, projects ---------- */
  function pathProgress() {
    var total = 0, got = 0;
    S.path.forEach(function (ph) {
      (ph.items || []).forEach(function (t) { total++; got += t.s === 'done' ? 1 : t.s === 'in-progress' ? 0.5 : 0; });
    });
    return total ? Math.round(got / total * 100) : 0;
  }

  function renderStats(el) {
    if (!el) return;
    var read = S.books.filter(function (b) { return b.status === 'read'; }).length;
    var items = [
      [read, 'books read', 's1'],
      [S.certificates.length, 'certificates and courses', 's2'],
      [S.path.length, 'phases on the platform roadmap', 's3'],
      [pathProgress(), 'percent of the roadmap done', 's4', '%']
    ];
    items.forEach(function (it) {
      var num = h('span', { class: 'stat-n', 'data-to': String(it[0]), 'data-suffix': it[3] || '', text: '0' + (it[3] || '') });
      el.append(h('div', { class: 'stat ' + it[2] }, num, h('span', { class: 'stat-l', text: it[1] })));
    });
  }

  function renderProgress(el) {
    if (!el) return;
    var pct = pathProgress();
    var bar = h('div', { class: 'bar-track', role: 'img', 'aria-label': pct + ' percent of the roadmap is done' });
    var fill = h('span', { class: 'bar-fill' });
    fill.style.setProperty('--w', pct + '%');
    bar.append(fill);
    el.append(h('div', { class: 'progress-top' }, h('strong', { text: pct + '%' }), h('span', { text: 'of the roadmap is done' })), bar);
  }

  function ytId(u) {
    var m = String(u || '').match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : '';
  }
  function safeUrl(u) { return /^(https?:\/\/|[\w./-]+(\?[\w=.&-]*)?$)/i.test(String(u || '')); }

  var lb = null;
  function lightbox(items, start) {
    if (!items.length) return;
    var i = start || 0, last = document.activeElement;
    var stage = h('div', { class: 'lb-stage' });
    var count = h('span', { class: 'lb-count' });
    var prev = h('button', { class: 'lb-nav lb-prev', type: 'button', 'aria-label': 'Previous', onclick: function () { go(-1); } }, '‹');
    var next = h('button', { class: 'lb-nav lb-next', type: 'button', 'aria-label': 'Next', onclick: function () { go(1); } }, '›');
    var close = h('button', { class: 'lb-close', type: 'button', 'aria-label': 'Close', onclick: shut }, '✕');
    var box = h('div', { class: 'lb', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Project media' }, close, prev, stage, next, count);
    box.addEventListener('click', function (e) { if (e.target === box || e.target === stage) shut(); });
    function show() {
      stage.textContent = '';
      var it = items[i];
      if (it.type === 'yt') stage.append(h('iframe', { src: 'https://www.youtube-nocookie.com/embed/' + it.id + '?rel=0', title: 'Project video', allow: 'accelerometer; encrypted-media; picture-in-picture', allowfullscreen: '' }));
      else if (it.type === 'video') stage.append(h('video', { src: it.src, controls: '', autoplay: '' }));
      else stage.append(h('img', { src: it.src, alt: it.alt || '' }));
      count.textContent = (i + 1) + ' / ' + items.length;
      prev.hidden = next.hidden = items.length < 2;
    }
    function go(d) { i = (i + d + items.length) % items.length; show(); }
    function key(e) {
      if (e.key === 'Escape') shut();
      else if (e.key === 'ArrowRight') go(document.dir === 'rtl' ? -1 : 1);
      else if (e.key === 'ArrowLeft') go(document.dir === 'rtl' ? 1 : -1);
    }
    function shut() {
      document.removeEventListener('keydown', key);
      box.remove(); document.body.classList.remove('noscroll'); lb = null;
      if (last && last.focus) last.focus();
    }
    document.addEventListener('keydown', key);
    document.body.append(box); document.body.classList.add('noscroll');
    lb = box; show(); close.focus();
  }

  function renderProjects(el) {
    if (!el) return;
    if (!S.projects.length) {
      el.append(h('div', { class: 'empty' },
        h('p', { class: 'empty-title', text: 'No public projects yet.' }),
        h('p', { text: 'Each public project gets a short write-up with the problem, what I did, and the result, plus a repository and screenshots.' }),
        h('a', Object.assign({ class: 'btn btn-ghost' }, ext(S.links.github)), 'Follow on GitHub')));
      return;
    }
    var STATUS = { live: 'Live', building: 'In progress', finished: 'Finished' };
    S.projects.forEach(function (p) {
      var imgs = (p.images || []).filter(safeUrl);
      var media = imgs.map(function (src) { return { type: 'img', src: src, alt: p.title }; });
      var vid = '';
      if (p.video && safeUrl(p.video)) {
        var id = ytId(p.video);
        if (id) { media.push({ type: 'yt', id: id }); vid = 'yt'; }
        else if (/\.(mp4|webm)(\?.*)?$/i.test(p.video)) { media.push({ type: 'video', src: p.video }); vid = 'video'; }
      }
      var color = COVER_COLORS[hash(p.id || p.title) % COVER_COLORS.length];
      var cover = h('button', { class: 'p-cover', type: 'button', 'aria-label': 'Open media for ' + p.title, onclick: function () { lightbox(media, 0); } });
      if (imgs.length) cover.append(h('img', { src: imgs[0], alt: '', loading: 'lazy' }));
      else { cover.style.background = color; cover.append(h('span', { class: 'p-cover-t', text: p.title })); }
      if (!media.length) cover.disabled = true;
      if (vid) cover.append(h('span', { class: 'p-play', 'aria-hidden': 'true', text: '▶' }));
      var body = h('div', { class: 'p-body' },
        h('div', { class: 'p-top' }, h('h3', { text: p.title }), p.status ? badge(STATUS[p.status] || p.status, p.status) : null));
      if (p.role) body.append(h('p', { class: 'muted small', text: p.role }));
      if (p.summary) body.append(h('p', { text: p.summary }));
      var dl = h('dl', { class: 'p-dl' });
      [['Problem', p.problem], ['What I did', p.did], ['Result', p.result]].forEach(function (r) {
        if (r[1]) dl.append(h('dt', { text: r[0] }), h('dd', { text: r[1] }));
      });
      if (dl.children.length) body.append(dl);
      if ((p.tags || []).length) body.append(h('ul', { class: 'tags' }, p.tags.map(function (t) { return h('li', { text: t }); })));
      if (imgs.length > 1) {
        body.append(h('div', { class: 'p-thumbs' }, imgs.slice(1).map(function (src, k) {
          return h('button', { type: 'button', 'aria-label': 'Open image ' + (k + 2), onclick: function () { lightbox(media, k + 1); } },
            h('img', { src: src, alt: '', loading: 'lazy' }));
        })));
      }
      var acts = h('div', { class: 'actions' });
      if (p.link && safeUrl(p.link)) acts.append(h('a', Object.assign({ class: 'btn btn-primary btn-sm' }, ext(p.link)), 'Open the project'));
      if (p.repo && safeUrl(p.repo)) acts.append(h('a', Object.assign({ class: 'btn btn-ghost btn-sm' }, ext(p.repo)), 'Repository'));
      if (p.video && safeUrl(p.video) && !vid) acts.append(h('a', Object.assign({ class: 'btn btn-ghost btn-sm' }, ext(p.video)), 'Watch the video'));
      if (vid) acts.append(h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { lightbox(media, media.length - 1); } }, 'Watch the video'));
      if (acts.children.length) body.append(acts);
      el.append(h('article', { class: 'project' }, cover, body));
    });
  }

  /* ---------- motion: reveal on scroll, count-up, tilt, page fade ---------- */
  function motion() {
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var counters = document.querySelectorAll('.stat-n');
    function count(el) {
      var to = Number(el.dataset.to) || 0, suf = el.dataset.suffix || '', t0 = null;
      if (calm || !to) { el.textContent = to + suf; return; }
      function step(t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1100), e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(to * e) + suf;
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    var targets = document.querySelectorAll('main .section, main .page-head, .book, .row, .cert, .phase, .stat, .project, .kv, .lanes, .band, .bar-track');
    if (calm || !('IntersectionObserver' in window)) { counters.forEach(count); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add('in');
        if (en.target.classList.contains('stat')) count(en.target.querySelector('.stat-n'));
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -4% 0px' });
    targets.forEach(function (el, i) {
      el.classList.add('rv');
      el.style.setProperty('--d', ((i % 6) * 70) + 'ms');
      io.observe(el);
    });
    setTimeout(function () { document.querySelectorAll('.rv:not(.in)').forEach(function (el) { el.classList.add('in'); }); counters.forEach(function (c) { if (c.textContent === '0' || c.textContent === '0%') count(c); }); }, 3500);

    if (window.matchMedia('(hover: hover)').matches) {
      document.addEventListener('pointermove', function (e) {
        var c = e.target.closest && e.target.closest('.book .cover');
        if (!c) return;
        var r = c.getBoundingClientRect();
        c.style.setProperty('--ry', ((e.clientX - r.left) / r.width - 0.5) * 14 + 'deg');
        c.style.setProperty('--rx', (0.5 - (e.clientY - r.top) / r.height) * 14 + 'deg');
      });
      document.addEventListener('pointerout', function (e) {
        var c = e.target.closest && e.target.closest('.book .cover');
        if (c) { c.style.removeProperty('--rx'); c.style.removeProperty('--ry'); }
      });
    }
  }

  function pageLinks() {
    window.addEventListener('pageshow', function () { document.body.classList.remove('leaving'); });
  }

  /* ---------- daily reminder, next step, search palette, scroll bar ---------- */
  var QUOTES = [
    'Small steps, kept daily, build the person you haven’t met yet.',
    'You don’t need to feel ready. You need to open the terminal.',
    'Every expert once typed a first command and didn’t understand the output.',
    'Consistency is quiet. It still wins.',
    'Finish the boring part. That is where the skill lives.',
    'One hour today beats ten hours someday.',
    'Read to understand. Build to remember.',
    'Progress you can show beats plans you can describe.',
    'Be patient with the learner and strict with the schedule.',
    'The path is long because it is worth walking.',
    'أنت لم تُخلق بعد بالكامل، وما تفعله اليوم يُكمل صنعك.'
  ];

  function nextStep() {
    var found = null;
    ['in-progress', 'next'].some(function (st) {
      return S.path.some(function (ph) {
        return (ph.items || []).some(function (t) { if (t.s === st) { found = { topic: t.t, phase: ph.name, state: st }; return true; } return false; });
      });
    });
    return found;
  }

  function renderSpark(el) {
    if (!el) return;
    var pool = (S.quotes || []).filter(Boolean);
    if (!pool.length) pool = QUOTES;
    var day = Math.floor(Date.now() / 86400000), k = day % pool.length;
    var text = h('p', { class: 'spark-q', dir: 'auto', text: pool[k] });
    var again = h('button', { class: 'textlink small', type: 'button', onclick: function () {
      k = (k + 1) % pool.length; text.textContent = pool[k];
    } }, 'Another one');
    el.append(h('div', { class: 'spark-card spark-quote' }, h('h3', { text: 'Today’s reminder' }), text, again));
    var n = nextStep();
    if (n) {
      el.append(h('a', { class: 'spark-card spark-next', href: 'projects.html' },
        h('h3', { text: n.state === 'in-progress' ? 'Studying now' : 'Next on the path' }),
        h('p', { class: 'spark-topic', text: n.topic }),
        h('p', { class: 'small', text: n.phase + '. See the full roadmap.' })));
    }
  }

  function palette() {
    if ($('.pal')) return;
    var last = document.activeElement, sel = 0, shown = [];
    var items = NAV.map(function (n) { return { label: n[0], hint: 'Page', href: n[1] === 'index' ? 'index.html' : n[1] + '.html' }; });
    items.push({ label: 'CV', hint: 'Page', href: 'cv.html' });
    S.books.forEach(function (b) { items.push({ label: b.title, hint: 'Book, ' + (b.author || ''), href: 'library.html?q=' + encodeURIComponent(b.title), text: [b.title, b.author, b.topic].join(' ') }); });
    S.projects.forEach(function (p) { items.push({ label: p.title, hint: 'Project', href: 'projects.html' }); });
    S.certificates.forEach(function (c) { items.push({ label: c.title, hint: 'Certificate', href: 'certificates.html' }); });
    var input = h('input', { class: 'pal-in', type: 'search', placeholder: 'Search pages, books, projects', 'aria-label': 'Search the site', autocomplete: 'off', dir: 'auto' });
    var list = h('ul', { class: 'pal-list', role: 'listbox' });
    var box = h('div', { class: 'pal-box', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Search' }, input, list,
      h('p', { class: 'pal-foot muted small', text: 'Enter to open. Esc to close.' }));
    var wrap = h('div', { class: 'pal' }, box);
    function paint() {
      var q = input.value.trim().toLowerCase();
      shown = items.filter(function (it) { return !q || (it.text || it.label).toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
      sel = Math.min(sel, Math.max(0, shown.length - 1));
      list.textContent = '';
      if (!shown.length) list.append(h('li', { class: 'pal-empty muted', text: 'Nothing matches. Try another word.' }));
      shown.forEach(function (it, i) {
        list.append(h('li', { role: 'option', 'aria-selected': String(i === sel), class: i === sel ? 'on' : '', onclick: function () { go(it); }, onmousemove: function () { sel = i; paint(); } },
          h('span', { dir: 'auto', text: it.label }), h('span', { class: 'muted small', text: it.hint })));
      });
    }
    function go(it) { shut(); location.href = it.href; }
    function key(e) {
      if (e.key === 'Escape') { shut(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(shown.length - 1, sel + 1); paint(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(0, sel - 1); paint(); }
      else if (e.key === 'Enter' && shown[sel]) { e.preventDefault(); go(shown[sel]); }
    }
    function shut() { document.removeEventListener('keydown', key); wrap.remove(); document.body.classList.remove('noscroll'); if (last && last.focus) last.focus(); }
    wrap.addEventListener('click', function (e) { if (e.target === wrap) shut(); });
    input.addEventListener('input', function () { sel = 0; paint(); });
    document.addEventListener('keydown', key);
    document.body.append(wrap); document.body.classList.add('noscroll');
    paint(); input.focus();
  }


  /* ---------- living background: a small network that drifts, with packets travelling along the links ---------- */
  function backdrop() {
    if (document.body.classList.contains('admin') || !document.createElement('canvas').getContext) return;
    var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var cv = document.createElement('canvas');
    cv.className = 'bg-net'; cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    var mesh = document.createElement('div');
    mesh.className = 'bg-mesh'; mesh.setAttribute('aria-hidden', 'true');
    mesh.innerHTML = '<i class="b1"></i><i class="b2"></i><i class="b3"></i><i class="b4"></i><i class="grid"></i>';
    document.body.insertBefore(mesh, document.body.firstChild);
    var cx = cv.getContext('2d'), W = 0, H = 0, dpr = 1, nodes = [], packets = [], pulses = [], waves = [], mouse = { x: -999, y: -999, on: false }, scrollY0 = 0;
    var cols = { a: '#7B1E36', b: '#D99A1E', dark: false };
    function readColors() {
      var cs = getComputedStyle(document.body);
      cols.a = cs.getPropertyValue('--accent').trim() || cols.a;
      cols.b = cs.getPropertyValue('--accent-2').trim() || cols.b;
      cols.dark = document.documentElement.dataset.theme === 'dark';
    }
    function rgba(hex, a) {
      var m = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(hex);
      if (!m) return 'rgba(120,120,140,' + a + ')';
      return 'rgba(' + parseInt(m[1], 16) + ',' + parseInt(m[2], 16) + ',' + parseInt(m[3], 16) + ',' + a + ')';
    }
    function size() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth; H = window.innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      cx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.max(22, Math.min(70, Math.round(W * H / 22000)));
      nodes = [];
      for (var i = 0; i < n; i++) nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .28, vy: (Math.random() - .5) * .28, r: 1.4 + Math.random() * 1.8, k: Math.random() < .3 ? 1 : 0, z: .4 + Math.random() * .9, oy: 0 });
    }
    var LINK = 150;
    function frame() {
      cx.clearRect(0, 0, W, H);
      var i, j, a, b, d, links = [], sy = window.pageYOffset || 0;
      var ds = sy - scrollY0; scrollY0 = sy;
      if (ds && !calm) for (i = 0; i < nodes.length; i++) { nodes[i].y -= ds * nodes[i].z * .18; }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i];
        if (!calm) { a.x += a.vx; a.y += a.vy; }
        if (a.x < -20) a.x = W + 20; else if (a.x > W + 20) a.x = -20;
        if (a.y < -20) a.y = H + 20; else if (a.y > H + 20) a.y = -20;
        if (mouse.on) {
          var dx = a.x - mouse.x, dy = a.y - mouse.y, dd = dx * dx + dy * dy;
          if (dd < 14000 && dd > 1) { var f = (1 - dd / 14000) * .9; a.x += dx / Math.sqrt(dd) * f; a.y += dy / Math.sqrt(dd) * f; }
        }
      }
      var base = cols.dark ? .38 : .36;
      for (i = 0; i < nodes.length; i++) for (j = i + 1; j < nodes.length; j++) {
        a = nodes[i]; b = nodes[j]; d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < LINK) {
          var al = (1 - d / LINK) * base;
          cx.strokeStyle = rgba(a.k || b.k ? cols.b : cols.a, al); cx.lineWidth = 1;
          cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(b.x, b.y); cx.stroke();
          links.push([a, b]);
        }
      }
      if (mouse.on) for (i = 0; i < nodes.length; i++) {
        a = nodes[i]; d = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (d < 170) { cx.strokeStyle = rgba(cols.a, (1 - d / 170) * .5); cx.beginPath(); cx.moveTo(a.x, a.y); cx.lineTo(mouse.x, mouse.y); cx.stroke(); }
      }
      for (i = 0; i < nodes.length; i++) {
        a = nodes[i]; cx.fillStyle = rgba(a.k ? cols.b : cols.a, cols.dark ? .8 : .7);
        cx.beginPath(); cx.arc(a.x, a.y, a.r, 0, 6.2832); cx.fill();
      }
      if (!calm) {
        if (links.length && packets.length < 12 && Math.random() < .07) { var l = links[(Math.random() * links.length) | 0]; packets.push({ a: l[0], b: l[1], t: 0, s: .012 + Math.random() * .014 }); }
        for (i = packets.length - 1; i >= 0; i--) {
          var p = packets[i]; p.t += p.s;
          if (p.t >= 1) { packets.splice(i, 1); continue; }
          var px = p.a.x + (p.b.x - p.a.x) * p.t, py = p.a.y + (p.b.y - p.a.y) * p.t;
          var tx = p.a.x + (p.b.x - p.a.x) * Math.max(0, p.t - .18), ty = p.a.y + (p.b.y - p.a.y) * Math.max(0, p.t - .18);
          var lg = cx.createLinearGradient(tx, ty, px, py);
          lg.addColorStop(0, rgba(cols.b, 0)); lg.addColorStop(1, rgba(cols.b, .9));
          cx.strokeStyle = lg; cx.lineWidth = 2; cx.beginPath(); cx.moveTo(tx, ty); cx.lineTo(px, py); cx.stroke();
          var g = cx.createRadialGradient(px, py, 0, px, py, 11);
          g.addColorStop(0, rgba(cols.b, 1)); g.addColorStop(1, rgba(cols.b, 0));
          cx.fillStyle = g; cx.beginPath(); cx.arc(px, py, 11, 0, 6.2832); cx.fill();
          if (p.t > .97 && Math.random() < .6) pulses.push({ x: p.b.x, y: p.b.y, r: 2, k: p.b.k });
        }
      }
      for (i = pulses.length - 1; i >= 0; i--) {
        var pu = pulses[i]; pu.r += .9;
        if (pu.r > 34) { pulses.splice(i, 1); continue; }
        cx.strokeStyle = rgba(pu.k ? cols.b : cols.a, (1 - pu.r / 34) * .7); cx.lineWidth = 1.2;
        cx.beginPath(); cx.arc(pu.x, pu.y, pu.r, 0, 6.2832); cx.stroke();
      }
      for (i = waves.length - 1; i >= 0; i--) {
        var w = waves[i]; w.r += 7;
        if (w.r > 520) { waves.splice(i, 1); continue; }
        cx.strokeStyle = rgba(cols.a, (1 - w.r / 520) * .55); cx.lineWidth = 2;
        cx.beginPath(); cx.arc(w.x, w.y, w.r, 0, 6.2832); cx.stroke();
        for (j = 0; j < nodes.length; j++) {
          var n = nodes[j], dn = Math.hypot(n.x - w.x, n.y - w.y);
          if (Math.abs(dn - w.r) < 14 && dn > 1) { n.x += (n.x - w.x) / dn * 5; n.y += (n.y - w.y) / dn * 5; }
        }
      }
      if (mouse.on) {
        var gl = cx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 220);
        gl.addColorStop(0, rgba(cols.a, cols.dark ? .16 : .1)); gl.addColorStop(1, rgba(cols.a, 0));
        cx.fillStyle = gl; cx.fillRect(mouse.x - 220, mouse.y - 220, 440, 440);
      }
    }
    var raf = 0, running = false;
    function loop() { frame(); raf = requestAnimationFrame(loop); }
    function start() { if (!running && !calm) { running = true; raf = requestAnimationFrame(loop); } }
    function stop() { running = false; cancelAnimationFrame(raf); }
    readColors(); size(); frame();
    if (!calm) start();
    window.addEventListener('resize', function () { size(); frame(); });
    window.addEventListener('pointermove', function (e) { if (e.pointerType === 'touch') return; mouse.x = e.clientX; mouse.y = e.clientY; mouse.on = true; });
    document.addEventListener('pointerleave', function () { mouse.on = false; });
    document.addEventListener('pointerdown', function (e) { if (!calm && e.clientY < H) waves.push({ x: e.clientX, y: e.clientY, r: 4 }); });
    document.addEventListener('visibilitychange', function () { if (document.hidden) stop(); else start(); });
    new MutationObserver(function () { readColors(); if (calm) frame(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    /* gentle tilt on cards, and a ripple on buttons */
    if (!calm && window.matchMedia && matchMedia('(hover: hover)').matches) {
      document.addEventListener('pointermove', function (e) {
        var c = e.target.closest && e.target.closest('.project, .service, .stat, .pcard, .spark-card');
        document.querySelectorAll('.tilting').forEach(function (n) { if (n !== c) { n.classList.remove('tilting'); n.style.transform = ''; } });
        if (!c) return;
        var r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        c.classList.add('tilting');
        c.style.transform = 'perspective(900px) rotateX(' + (-py * 5).toFixed(2) + 'deg) rotateY(' + (px * 6).toFixed(2) + 'deg) translateY(-4px)';
      });
    }
    document.addEventListener('click', function (e) {
      var b = e.target.closest && e.target.closest('.btn');
      if (!b || calm) return;
      var r = b.getBoundingClientRect(), s = document.createElement('span');
      s.className = 'ripple'; s.style.left = (e.clientX - r.left) + 'px'; s.style.top = (e.clientY - r.top) + 'px';
      b.appendChild(s); setTimeout(function () { s.remove(); }, 650);
    });
  }

  function shortcuts() {
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target.isContentEditable;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); palette(); }
      else if (e.key === '/' && !typing && !e.ctrlKey && !e.metaKey) { e.preventDefault(); palette(); }
    });
    var bar = h('div', { class: 'scrollbar', 'aria-hidden': 'true' });
    document.body.append(bar);
    var tick = false;
    function upd() {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
      tick = false;
    }
    addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(upd); } }, { passive: true });
    upd();
  }

  /* ---------- learning log and services ---------- */
  function sortedLog() {
    return S.log.filter(function (e) { return e && (e.title || e.text); }).slice().sort(function (a, b) {
      return String(b.date || '').localeCompare(String(a.date || ''));
    });
  }

  function renderLog(el, limit) {
    if (!el) return;
    var list = sortedLog();
    if (limit) list = list.slice(0, limit);
    if (!list.length) {
      el.append(h('div', { class: 'empty' },
        h('p', { class: 'empty-title', text: 'The first entry is coming.' }),
        h('p', { text: 'I will log what I study and build here, with dates, as I go.' })));
      return;
    }
    var month = '';
    list.forEach(function (e) {
      var d = e.date ? new Date(e.date) : null;
      var m = d && !isNaN(d) ? new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' }).format(d) : '';
      if (!limit && m && m !== month) { month = m; el.append(h('h2', { class: 'log-month', text: m })); }
      var item = h('article', { class: 'log-item' },
        h('time', { datetime: e.date || null, text: e.date ? fmtDate(e.date) : '' }),
        h('h3', { text: e.title || '' }));
      String(e.text || '').split(/\n\s*\n/).filter(Boolean).forEach(function (t) { item.append(h('p', { text: t })); });
      if ((e.tags || []).length) item.append(h('ul', { class: 'tags' }, e.tags.map(function (t) { return h('li', { text: t }); })));
      if (e.link && /^https?:\/\//i.test(e.link)) item.append(h('p', {}, h('a', Object.assign({ class: 'textlink small' }, ext(e.link)), 'See the work')));
      el.append(item);
    });
  }

  PAGES.log = function () {
    renderLog($('#log'));
    var sum = $('#log-summary'), list = sortedLog();
    if (sum && list.length) sum.textContent = list.length + (list.length === 1 ? ' entry' : ' entries') + '. Last update: ' + (list[0].date ? fmtDate(list[0].date) : 'recently') + '.';
  };

  PAGES.services = function () {
    var host = $('#services');
    var mail = $('#svc-mail');
    if (mail && S.email) mail.href = 'mailto:' + S.email + '?subject=' + encodeURIComponent('Working together');
    if (!host) return;
    var list = S.services.filter(function (v) { return v && v.title; });
    if (!list.length) {
      host.append(h('div', { class: 'empty' },
        h('p', { class: 'empty-title', text: 'Services will be listed here soon.' }),
        h('p', { text: 'In the meantime, write to me with what you need.' }),
        h('a', { class: 'btn btn-ghost', href: 'contact.html' }, 'Contact')));
      return;
    }
    list.forEach(function (v, i) {
      var ar = v.lang === 'ar';
      var card = h('article', { class: 'service' + (ar ? ' is-ar' : ''), lang: ar ? 'ar' : 'en', dir: ar ? 'rtl' : 'ltr' });
      card.style.setProperty('--sc', COVER_COLORS[i % COVER_COLORS.length]);
      card.append(h('h3', { text: v.title }));
      if (v.summary) card.append(h('p', { class: 'svc-sum', text: v.summary }));
      if ((v.points || []).length) card.append(h('ul', { class: 'svc-points' }, v.points.map(function (t) { return h('li', { text: t }); })));
      if (v.note) card.append(h('p', { class: 'svc-note muted', text: v.note }));
      var href = v.link && /^(https?:\/\/|mailto:)/i.test(v.link) ? v.link
        : (S.email ? 'mailto:' + S.email + '?subject=' + encodeURIComponent(v.title) : 'contact.html');
      card.append(h('p', { class: 'actions' }, h('a', Object.assign({ class: 'btn btn-primary btn-sm' }, /^https?:/i.test(href) ? ext(href) : { href: href }), v.ctaLabel || (ar ? 'اسأل عن هذه الخدمة' : 'Ask about this'))));
      host.append(card);
    });
  };

  /* ---------- optional visitor counter (GoatCounter, no cookies) ---------- */
  function analytics() {
    var code = String((S.analytics && S.analytics.goatcounter) || '').trim();
    if (!/^[a-z0-9-]{2,40}$/.test(code) || location.protocol === 'file:' || /^(localhost|127\.)/.test(location.hostname)) return;
    var sc = document.createElement('script');
    sc.async = true;
    sc.src = 'https://gc.zgo.at/count.js';
    sc.setAttribute('data-goatcounter', 'https://' + code + '.goatcounter.com/count');
    document.head.append(sc);
  }

  /* ---------- the blog on this site ---------- */
  var idxPromise = null;
  function fetchIndex() {
    if (!idxPromise) {
      idxPromise = fetch('posts/index.json?v=' + Math.floor(Date.now() / 300000))
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; })
        .then(function (a) { return Array.isArray(a) ? a.filter(function (p) { return p && p.slug; }) : []; });
    }
    return idxPromise;
  }
  function pubPosts(idx) {
    return idx.filter(function (p) { return !p.draft; }).sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
  }
  function postUrl(p) { return 'posts/' + p.slug + '.html'; }
  function slugT(t) { return String(t || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  function bookOfPost(p) {
    if (!p.book) return null;
    return S.books.filter(function (b) { return (b.id || slugT(b.title)) === p.book || slugT(b.title) === p.book; })[0] || null;
  }
  /* A post belongs to a book only when it is linked to one. Everything else is a personal article. */
  function postsOfBook(idx, b) {
    var key = b.id || slugT(b.title), alt = slugT(b.title);
    return pubPosts(idx).filter(function (p) { return p.book && (p.book === key || p.book === alt); });
  }
  function kindOf(p) { return p && p.book ? 'book' : 'personal'; }
  function personalLabel(ar, long) { return ar ? 'مقال شخصي' : (long ? 'Personal article' : 'Personal'); }
  function fmtDateL(iso, ar) {
    try { return new Intl.DateTimeFormat(ar ? 'ar-u-nu-latn' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso)); } catch (e) { return ''; }
  }
  function minsText(n, ar) {
    if (!ar) return n + ' min read';
    return n === 1 ? 'قراءة في دقيقة' : n === 2 ? 'قراءة في دقيقتين' : 'قراءة في ' + n + ' دقائق';
  }
  var BT = {
    en: { reply: 'Reply by email', replyText: 'Disagree, want to add something, or have a question? Write to me. I read every email.', replyBtn: 'Write a reply', share: 'Share', copy: 'Copy link', copied: 'Copied', aboutBook: 'About the book', part: 'Part', prev: 'Previous', next: 'Next', more: 'Keep reading', inSeries: 'In this series' },
    ar: { reply: 'ردّ عليّ بالبريد', replyText: 'تختلف معي، أو تريد أن تضيف، أو عندك سؤال؟ راسلني، فأنا أقرأ كل رسالة.', replyBtn: 'اكتب ردّك', share: 'شارك المقال', copy: 'انسخ الرابط', copied: 'تم النسخ', aboutBook: 'عن الكتاب', part: 'الجزء', prev: 'السابق', next: 'التالي', more: 'تابع القراءة', inSeries: 'في هذه السلسلة' }
  };

  function postCard(p) {
    var ar = p.lang === 'ar';
    var color = COVER_COLORS[hash(p.slug) % COVER_COLORS.length];
    var cv = h('a', { class: 'pc-cover', href: postUrl(p), tabindex: '-1', 'aria-hidden': 'true' });
    if (p.cover) cv.append(h('img', { src: p.cover, alt: '', loading: 'lazy' }));
    else { cv.style.background = color; cv.append(h('span', { class: 'pc-letter', text: (p.title || '?').trim().charAt(0) })); }
    var card = h('article', { class: 'pcard', lang: ar ? 'ar' : 'en', dir: ar ? 'rtl' : 'ltr' }, cv);
    var body = h('div', { class: 'pc-body' });
    body.append(h('p', { class: 'pc-meta' },
      h('time', { datetime: p.date, text: fmtDateL(p.date, ar) }),
      h('span', { text: minsText(p.mins || 1, ar) })));
    body.append(h('h3', {}, h('a', { href: postUrl(p), text: p.title })));
    if (p.excerpt) body.append(h('p', { class: 'pc-ex', text: p.excerpt }));
    var chips = h('p', { class: 'pc-chips' });
    var b = bookOfPost(p);
    if (kindOf(p) === 'personal') chips.append(h('span', { class: 'chip-s chip-personal', text: personalLabel(ar) }));
    else if (b) chips.append(h('span', { class: 'chip-s chip-book', text: b.title }));
    card.dataset.kind = kindOf(p);
    if (p.series && p.series.name) chips.append(h('span', { class: 'chip-s chip-series', text: p.series.name + (p.series.order ? ' · ' + p.series.order : '') }));
    (p.tags || []).slice(0, 3).forEach(function (t) { chips.append(h('span', { class: 'chip-s chip-tag', text: t })); });
    if (chips.children.length) body.append(chips);
    card.append(body);
    return card;
  }

  function renderLatest(ul, max) {
    if (!ul) return;
    fetchIndex().then(function (idx) {
      var list = pubPosts(idx).slice(0, max);
      if (!list.length) {
        ul.append(h('li', { class: 'muted' }, 'New articles are on the way. ', h('a', { class: 'textlink', href: 'blog.html' }, 'Open the blog')));
        return;
      }
      list.forEach(function (p) {
        ul.append(h('li', {},
          h('a', { href: postUrl(p), dir: 'auto', text: p.title }),
          h('time', { datetime: p.date, text: fmtDate(p.date) })));
      });
    });
  }

  PAGES.blog = function () {
    var q0 = new URLSearchParams(location.search);
    var state = { lang: 'all', kind: /^(book|personal)$/.test(q0.get('kind') || '') ? q0.get('kind') : 'all', q: q0.get('q') || '', series: q0.get('series') || '', book: q0.get('book') || '', tag: q0.get('tag') || '' };
    var grid = $('#posts-grid'), ctrl = $('#blog-controls'), seriesHost = $('#series'), posts = [];

    function draw() {
      grid.textContent = '';
      var q = state.q.trim().toLowerCase();
      var list = posts.filter(function (p) {
        if (state.lang !== 'all' && p.lang !== state.lang) return false;
        if (state.kind !== 'all' && kindOf(p) !== state.kind) return false;
        if (state.series && !(p.series && p.series.name === state.series)) return false;
        if (state.book && p.book !== state.book) return false;
        if (state.tag && (p.tags || []).indexOf(state.tag) === -1) return false;
        if (q && [p.title, p.excerpt, (p.tags || []).join(' ')].join(' ').toLowerCase().indexOf(q) === -1) return false;
        return true;
      });
      if (state.series) list.sort(function (a, b) { return ((a.series && a.series.order) || 0) - ((b.series && b.series.order) || 0); });
      if (!list.length) {
        grid.append(h('div', { class: 'empty' }, h('p', { class: 'empty-title', text: posts.length ? 'No posts match.' : 'The first posts are on the way.' }),
          h('p', { text: posts.length ? 'Try another word or clear the filters.' : 'New articles will appear here soon.' })));
        return;
      }
      list.forEach(function (p) { grid.append(postCard(p)); });
    }

    function drawCtrl() {
      ctrl.textContent = '';
      var chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Language' });
      [['all', 'All'], ['ar', 'العربية'], ['en', 'English']].forEach(function (c) {
        chips.append(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.lang === c[0]), onclick: function () { state.lang = c[0]; drawCtrl(); draw(); } }, c[1]));
      });
      var kinds = h('div', { class: 'chips', role: 'group', 'aria-label': 'Type of article' });
      [['all', 'All types'], ['book', 'About books'], ['personal', 'Personal']].forEach(function (c) {
        kinds.append(h('button', { class: 'chip', type: 'button', 'aria-pressed': String(state.kind === c[0]), onclick: function () { state.kind = c[0]; drawCtrl(); draw(); } }, c[1]));
      });
      var input = h('input', { type: 'search', placeholder: 'Search the posts', 'aria-label': 'Search the posts', dir: 'auto', value: state.q });
      input.addEventListener('input', function () { state.q = input.value; draw(); });
      ctrl.append(h('div', { class: 'toolbar' }, chips, kinds, input));
      var active = [];
      if (state.series) active.push(['Series: ' + state.series, 'series']);
      if (state.book) { var bk = S.books.filter(function (b) { return (b.id || slugT(b.title)) === state.book; })[0]; active.push(['Book: ' + (bk ? bk.title : state.book), 'book']); }
      if (state.tag) active.push(['Tag: ' + state.tag, 'tag']);
      if (active.length) {
        var row = h('p', { class: 'active-filters' });
        active.forEach(function (a) { row.append(h('button', { class: 'pill', type: 'button', onclick: function () { state[a[1]] = ''; drawCtrl(); draw(); } }, a[0] + '  ✕')); });
        ctrl.append(row);
      }
      var tags = {};
      posts.forEach(function (p) { (p.tags || []).forEach(function (t) { tags[t] = (tags[t] || 0) + 1; }); });
      var top = Object.keys(tags).sort(function (a, b) { return tags[b] - tags[a]; }).slice(0, 10);
      if (top.length) ctrl.append(h('p', { class: 'tagrow' }, top.map(function (t) {
        return h('button', { class: 'chip-s chip-tag' + (state.tag === t ? ' on' : ''), type: 'button', onclick: function () { state.tag = state.tag === t ? '' : t; drawCtrl(); draw(); } }, t);
      })));
    }

    function drawSeries() {
      if (!seriesHost) return;
      seriesHost.textContent = '';
      var groups = {};
      posts.forEach(function (p) { if (p.series && p.series.name) (groups[p.series.name] = groups[p.series.name] || []).push(p); });
      Object.keys(groups).forEach(function (name) {
        var ps = groups[name], b = null;
        ps.forEach(function (p) { b = b || bookOfPost(p); });
        var total = (b && b.series && b.series.parts) || 0, done = ps.length;
        var info = h('div', {}, h('h3', { text: name }),
          b ? h('p', { class: 'muted', text: b.title + ', ' + b.author }) : null);
        if (total) {
          var tr = h('div', { class: 'bar-track light', role: 'img', 'aria-label': done + ' of ' + total + ' published' }, h('span', { class: 'bar-fill' }));
          tr.firstChild.style.setProperty('--w', Math.min(100, Math.round(done / total * 100)) + '%');
          info.append(tr, h('span', { class: 'small muted', text: done + ' of ' + total + ' articles published' }));
        } else info.append(h('p', { class: 'small muted', text: done + (done === 1 ? ' article' : ' articles') }));
        seriesHost.append(h('article', { class: 'series' + (b ? ' has-cover' : '') }, b ? cover(b, true) : null, info,
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { state.series = name; drawCtrl(); draw(); grid.scrollIntoView({ behavior: 'smooth', block: 'start' }); } }, 'Read the series')));
      });
      var sec = $('#series-sec');
      if (sec) sec.hidden = !seriesHost.children.length;
    }

    fetchIndex().then(function (idx) {
      posts = pubPosts(idx);
      drawCtrl(); draw(); drawSeries();
    });
  };

  PAGES.post = function () {
    var node = $('#post-data');
    if (!node) return;
    var meta;
    try { meta = JSON.parse(node.textContent); } catch (e) { return; }
    var ar = meta.lang === 'ar', L = BT[ar ? 'ar' : 'en'];
    var foot = $('#post-foot'), kick = $('#post-kicker');
    var url = location.href.split('#')[0];

    if (kick && kindOf(meta) === 'personal') kick.append(h('span', { class: 'chip-s chip-personal', text: personalLabel(ar, true) }));
    if (kick && meta.series && meta.series.name) {
      kick.append(h('a', { href: 'blog.html?series=' + encodeURIComponent(meta.series.name), text: meta.series.name + (meta.series.order ? ' · ' + L.part + ' ' + meta.series.order : '') }));
    }
    if (!foot) return;

    var b = bookOfPost(meta);
    if (b) {
      foot.append(h('aside', { class: 'post-book' }, h('div', { class: 'pb-cover' }, cover(b)),
        h('div', {}, h('p', { class: 'muted small', text: L.aboutBook }), h('h3', { text: b.title }), h('p', { class: 'muted', text: b.author }),
          h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () { bookDialog([b], 0); } }, ar ? 'تفاصيل الكتاب' : 'Book details'))));
    }

    var subject = (ar ? 'ردّ على: ' : 'Re: ') + meta.title;
    var bodyTxt = (ar ? 'المقال: ' : 'Article: ') + url + '\n\n';
    foot.append(h('section', { class: 'post-reply' }, h('h3', { text: L.reply }), h('p', { text: L.replyText }),
      h('a', { class: 'btn btn-primary', href: 'mailto:' + S.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(bodyTxt), text: L.replyBtn })));

    var copy = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', text: L.copy });
    copy.addEventListener('click', function () {
      var done = function () { copy.textContent = L.copied; setTimeout(function () { copy.textContent = L.copy; }, 1800); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, function () {});
    });
    foot.append(h('div', { class: 'post-share' }, h('span', { class: 'muted small', text: L.share }),
      h('a', Object.assign({ class: 'btn btn-ghost btn-sm' }, ext('https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(url))), 'LinkedIn'),
      h('a', Object.assign({ class: 'btn btn-ghost btn-sm' }, ext('https://wa.me/?text=' + encodeURIComponent(meta.title + ' ' + url))), 'WhatsApp'),
      copy));

    fetchIndex().then(function (idx) {
      var all = pubPosts(idx);
      if (meta.series && meta.series.name) {
        var sp = all.filter(function (p) { return p.series && p.series.name === meta.series.name; })
          .sort(function (a, c) { return (a.series.order || 0) - (c.series.order || 0); });
        var at = sp.map(function (p) { return p.slug; }).indexOf(meta.slug);
        if (sp.length > 1) {
          var nav = h('nav', { class: 'post-series', 'aria-label': L.inSeries }, h('h3', { text: L.inSeries + ': ' + meta.series.name }));
          var ol = h('ol', {});
          sp.forEach(function (p) { ol.append(h('li', { class: p.slug === meta.slug ? 'on' : '' }, p.slug === meta.slug ? h('span', { text: p.title }) : h('a', { href: postUrl(p), text: p.title }))); });
          nav.append(ol);
          var pn = h('p', { class: 'pn' });
          if (at > 0) pn.append(h('a', { class: 'btn btn-ghost btn-sm', href: postUrl(sp[at - 1]), text: (ar ? '→ ' : '← ') + L.prev }));
          if (at >= 0 && at < sp.length - 1) pn.append(h('a', { class: 'btn btn-primary btn-sm', href: postUrl(sp[at + 1]), text: L.next + (ar ? ' ←' : ' →') }));
          nav.append(pn);
          foot.insertBefore(nav, foot.firstChild);
        }
      }
      var others = all.filter(function (p) { return p.slug !== meta.slug; });
      others.sort(function (a, c) {
        function score(p) { return (meta.book && p.book === meta.book ? 4 : 0) + ((p.tags || []).filter(function (t) { return (meta.tags || []).indexOf(t) > -1; }).length) + (p.lang === meta.lang ? 1 : 0) + (kindOf(p) === kindOf(meta) ? 2 : 0); }
        return score(c) - score(a);
      });
      if (others.length) {
        var more = h('section', { class: 'post-more' }, h('h2', { text: L.more }));
        var g = h('div', { class: 'pgrid' });
        others.slice(0, 3).forEach(function (p) { g.append(postCard(p)); });
        more.append(g);
        foot.append(more);
      }
    });
  };

  /* ---------- boot ---------- */
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-bind]'), function (el) {
      var v = el.getAttribute('data-bind').split('.').reduce(function (o, k) { return o && o[k]; }, S);
      if (typeof v === 'string' && v) { el.textContent = v; if (AR.test(v)) el.setAttribute('dir', 'auto'); }
    });
  }

  renderHeader();
  renderFooter();
  bind();
  var page = document.body.dataset.page;
  if (PAGES[page]) PAGES[page]();
  motion();
  backdrop();
  pageLinks();
  shortcuts();
  analytics();
})();
