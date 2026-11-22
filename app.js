/* app.js: renders the shared header and footer and fills each page from data.js */
(function () {
  'use strict';
  var S = window.SITE;
  if (!S) return;

  // The admin panel drops empty fields, so give every section a safe default.
  ['links', 'hero', 'about', 'cv', 'now'].forEach(function (k) { S[k] = S[k] || {}; });
  ['books', 'certificates', 'education', 'experience', 'skills', 'languages', 'interests', 'path', 'method',
    'labs', 'projects', 'labEnvironment', 'focus', 'howIWork', 'confidential'].forEach(function (k) { S[k] = S[k] || []; });
  S.now.console = S.now.console || [];
  S.links.blog = S.links.blog || 'https://lam-tokhlaq.blogspot.com';
  S.initials = S.initials || 'YA';

  var NAV = [
    ['Home', 'index'], ['About', 'about'], ['Work', 'projects'], ['Library', 'library'],
    ['Blog', 'blog'], ['Certificates', 'certificates'], ['Community', 'community'], ['Contact', 'contact']
  ];

  var ICON = {
    theme: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17" /><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>',
    menu: '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'
  };

  var STATE = { 'done': 'Done', 'in-progress': 'In progress', 'next': 'Next', 'later': 'Later' };
  var BOOK_STATUS = { reading: 'Reading', read: 'Read', next: 'Up next' };
  var COVER_COLORS = ['#7B1E36', '#1F4FD1', '#0B7A75', '#B85C12', '#6B3FB8', '#C2307F', '#1F8A5F', '#222B33', '#8A5A2B', '#0E86B0'];
  var PAGE_COLORS = { index: '#7B1E36', about: '#0B7A75', projects: '#2B55D6', library: '#B85C12', blog: '#6B3FB8', certificates: '#1F8A5F', community: '#C2307F', contact: '#0E86B0' };

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
    return el;
  }

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

  function blogSearch(q) {
    return S.links.blog.replace(/\/$/, '') + '/search?q=' + encodeURIComponent(q);
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
    host.append(h('div', { class: 'wrap bar' }, brand, nav, h('div', { class: 'bar-tools' }, themeBtn, menuBtn)));
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
    var links = [['Blog', L.blog], ['LinkedIn', L.linkedin], ['GitHub', L.github]];
    if (L.youtube) links.push(['YouTube', L.youtube]);
    host.append(h('div', { class: 'wrap foot' },
      h('div', {},
        h('p', { class: 'foot-name', text: S.name }),
        h('p', { class: 'muted', text: S.role + '. ' + S.location + '.' })),
      h('ul', { class: 'foot-links' }, links.map(function (l) {
        return h('li', {}, h('a', ext(l[1]), l[0]));
      })),
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

  /* ---------- blog feed (Blogger JSONP, with a graceful fallback) ---------- */
  function blogHost() {
    try { return new URL(S.links.blog).hostname.split('.')[0]; } catch (e) { return ''; }
  }

  function fetchPosts(max, cb) {
    var name = '__bp' + Math.random().toString(36).slice(2);
    var script = document.createElement('script');
    var done = false;
    var timer;
    function finish(r) {
      if (done) return;
      done = true;
      clearTimeout(timer);
      try { delete window[name]; } catch (e) { window[name] = undefined; }
      script.remove();
      cb(r);
    }
    timer = setTimeout(function () { finish(null); }, 7000);
    window[name] = function (d) {
      var entries = (d && d.feed && d.feed.entry) || [];
      var host = blogHost();
      finish(entries.map(function (en) {
        var link = (en.link || []).filter(function (l) { return l.rel === 'alternate'; })[0];
        return {
          title: (en.title && en.title.$t) || '',
          url: link ? link.href : '',
          date: (en.published && en.published.$t) || ''
        };
      }).filter(function (p) {
        try { return p.title && new URL(p.url).hostname.indexOf(host + '.blogspot.') === 0; } catch (e) { return false; }
      }));
    };
    script.onerror = function () { finish(null); };
    script.src = S.links.blog.replace(/\/$/, '') + '/feeds/posts/default?alt=json-in-script&max-results=' + max + '&callback=' + name;
    document.head.append(script);
  }

  function renderPosts(ul, max) {
    if (!ul) return;
    ul.append(h('li', { class: 'muted', text: 'Loading the latest posts' }));
    fetchPosts(max, function (posts) {
      ul.textContent = '';
      if (!posts || !posts.length) {
        ul.append(h('li', { class: 'muted' }, 'The latest posts are on the blog. ',
          h('a', Object.assign({ class: 'textlink' }, ext(S.links.blog)), 'Open the blog')));
        return;
      }
      posts.forEach(function (p) {
        ul.append(h('li', {},
          h('a', Object.assign({ dir: 'auto' }, ext(p.url)), p.title),
          h('time', { datetime: p.date, text: fmtDate(p.date) })));
      });
    });
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
    renderPosts($('#latest-posts'), 3);
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

  function bookCard(b) {
    var parts = [];
    var el = h('article', { class: 'book' }, cover(b));
    el.append(h('h3', { text: b.title }));
    el.append(h('p', { class: 'muted by', text: b.author }));
    el.append(h('p', { class: 'meta-row' }, badge(BOOK_STATUS[b.status] || b.status, b.status), b.topic ? h('span', { class: 'muted small topic', style: '--tc:' + COVER_COLORS[hash(b.topic) % COVER_COLORS.length], text: b.topic }) : null));
    if (b.rating) el.append(h('p', { class: 'stars', 'aria-label': 'Rated ' + b.rating + ' out of 5', text: '★'.repeat(b.rating) + '☆'.repeat(5 - b.rating) }));
    if (b.takeaway) el.append(h('p', { class: 'takeaway', text: b.takeaway }));
    if (b.note) el.append(h('p', { class: 'small', text: b.note }));
    if (b.series) el.append(h('a', Object.assign({ class: 'textlink small' }, ext(blogSearch(b.series.title))), 'Read the series'));
    return el;
  }

  PAGES.library = function () {
    var grid = $('#shelf'), chips = $('#chips'), q = $('#q'), empty = $('#empty'), count = $('#count');
    var state = { status: 'all', q: '' };
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
        return [b.title, b.author, b.topic].join(' ').toLowerCase().indexOf(term) !== -1;
      });
      grid.textContent = '';
      list.forEach(function (b) { grid.append(bookCard(b)); });
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

  PAGES.blog = function () {
    var host = $('#series');
    var withSeries = S.books.filter(function (b) { return b.series; });
    if (host) withSeries.forEach(function (b) {
      var s = b.series;
      var pct = s.parts ? Math.round((s.done / s.parts) * 100) : 100;
      host.append(h('article', { class: 'series' },
        cover(b, true),
        h('div', {},
          h('h3', { class: 'ar-line', lang: 'ar', text: s.title }),
          h('p', { class: 'muted', text: b.title + ', ' + b.author }),
          s.state === 'in-progress'
            ? h('div', { class: 'progress' },
                h('div', { class: 'bar-track', role: 'img', 'aria-label': s.done + ' of ' + s.parts + ' parts written' }, h('span', { style: 'width:' + pct + '%' })),
                h('span', { class: 'small muted', text: s.done + ' of ' + s.parts + ' parts written' }))
            : h('p', { class: 'small muted', text: s.parts ? 'Complete, ' + s.parts + ' articles' : 'Complete' })),
        h('a', Object.assign({ class: 'btn btn-ghost btn-sm' }, ext(blogSearch(s.title))), 'Read the series')));
    });
    renderPosts($('#blog-posts'), 8);
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

  PAGES.community = function () {
    var L = S.links;
    var yt = $('#yt-action');
    if (yt) {
      if (L.youtube) yt.append(h('a', Object.assign({ class: 'btn btn-primary' }, ext(L.youtube)), 'Watch on YouTube'));
      else yt.append(h('a', { class: 'btn btn-primary', href: 'mailto:' + S.email + '?subject=' + encodeURIComponent('Notify me: channel launch') }, 'Tell me when it starts'),
        h('span', { class: 'muted small', text: 'No spam. One email when the first video is out.' }));
    }
    var cm = $('#cm-action');
    if (cm) {
      if (L.community) cm.append(h('a', Object.assign({ class: 'btn btn-primary' }, ext(L.community)), 'Join the community'));
      else cm.append(h('a', { class: 'btn btn-primary', href: 'mailto:' + S.email + '?subject=' + encodeURIComponent('Community waitlist') }, 'Join the waitlist'),
        h('span', { class: 'muted small', text: 'You will get one email when the doors open.' }));
    }
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
      var rows = [['LinkedIn', L.linkedin], ['GitHub', L.github], ['Blog', L.blog]];
      if (L.youtube) rows.push(['YouTube', L.youtube]);
      rows.forEach(function (r) {
        ls.append(h('li', {}, h('a', ext(r[1]), r[0]), h('span', { class: 'muted small', text: r[1].replace(/^https?:\/\//, '') })));
      });
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
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href]');
      if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
      var u;
      try { u = new URL(a.href, location.href); } catch (x) { return; }
      if (u.origin !== location.origin || u.pathname === location.pathname || !/\.html$|\/$/.test(u.pathname)) return;
      if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      e.preventDefault();
      document.body.classList.add('leaving');
      setTimeout(function () { location.href = u.href; }, 170);
    });
  }

  /* ---------- boot ---------- */
  function bind() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-bind]'), function (el) {
      var v = el.getAttribute('data-bind').split('.').reduce(function (o, k) { return o && o[k]; }, S);
      if (typeof v === 'string' && v) el.textContent = v;
    });
  }

  renderHeader();
  renderFooter();
  bind();
  var page = document.body.dataset.page;
  if (PAGES[page]) PAGES[page]();
  motion();
  pageLinks();
})();
