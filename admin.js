/* admin.js: edit the site's content from the browser and save it to GitHub.
   Saving needs the owner's private token, so nobody else can change anything. */
(function () {
  'use strict';

  var OWNER = 'eng-youssefamir';
  var REPO = 'eng-youssefamir.github.io';
  var BRANCH = 'main';
  var FILE = 'data.js';
  var API = 'https://api.github.com/repos/' + OWNER + '/' + REPO;

  var token = '';
  var data = null;
  var sha = '';
  var snapshot = '';
  var dirty = false;
  var current = 'basics';
  var uid = 0;

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }

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

  function getV(obj, path) {
    return String(path).split('.').reduce(function (o, k) { return o == null ? undefined : o[k]; }, obj);
  }

  function setV(obj, path, val) {
    var parts = String(path).split('.');
    var last = parts.pop();
    var o = parts.reduce(function (acc, k) { if (acc[k] == null || typeof acc[k] !== 'object') acc[k] = {}; return acc[k]; }, obj);
    if (val === undefined) delete o[last]; else o[last] = val;
  }

  function ensureArray(obj, path) {
    var v = getV(obj, path);
    if (!Array.isArray(v)) { v = []; setV(obj, path, v); }
    return v;
  }

  function slug(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }

  function toB64(str) {
    var bytes = new TextEncoder().encode(str), bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  }

  function fromB64(b64) {
    var bin = atob(String(b64).replace(/\s/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  /* ---------- token storage ---------- */
  function storedToken() {
    try { return localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken') || ''; } catch (e) { return ''; }
  }
  function keepToken(t, remember) {
    try {
      localStorage.removeItem('adminToken'); sessionStorage.removeItem('adminToken');
      (remember ? localStorage : sessionStorage).setItem('adminToken', t);
    } catch (e) { /* storage blocked: the token stays in memory for this visit */ }
  }
  function forgetToken() {
    try { localStorage.removeItem('adminToken'); sessionStorage.removeItem('adminToken'); } catch (e) { /* nothing to do */ }
  }

  /* ---------- GitHub API ---------- */
  function gh(path, opts) {
    opts = opts || {};
    var headers = { 'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    if (opts.body) headers['Content-Type'] = 'application/json';
    return fetch(API + path, {
      method: opts.method || 'GET',
      headers: headers,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      cache: 'no-store'
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.message || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  function parseDataJs(text) {
    var i = text.indexOf('window.SITE');
    var eq = text.indexOf('=', i);
    var end = text.lastIndexOf(';');
    if (i < 0 || eq < 0 || end < eq) throw new Error('ملف data.js بصيغة غير متوقعة');
    return JSON.parse(text.slice(eq + 1, end));
  }

  function prune(v) {
    if (Array.isArray(v)) return v.map(prune);
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).forEach(function (k) {
        var x = prune(v[k]);
        if (x === '' || x == null) return;
        if (typeof x === 'object' && !Array.isArray(x) && !Object.keys(x).length) return;
        o[k] = x;
      });
      return o;
    }
    return v;
  }

  function ensureIds() {
    var seen = {};
    (data.books || []).forEach(function (b) {
      var base = b.id || slug(b.title) || ('book-' + Date.now().toString(36));
      var id = base, n = 2;
      while (seen[id]) { id = base + '-' + n++; }
      seen[id] = true;
      b.id = id;
    });
  }

  function serialize() {
    ensureIds();
    return '/* Site content. Edit it from /admin.html, or by hand if you keep the JSON valid. */\n' +
      'window.SITE = ' + JSON.stringify(prune(data), null, 2) + ';\n';
  }

  /* ---------- images ---------- */
  function resizeImage(file, maxDim, quality) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      var url = URL.createObjectURL(file);
      img.onload = function () {
        var s = Math.min(1, maxDim / Math.max(img.width, img.height));
        var c = document.createElement('canvas');
        c.width = Math.round(img.width * s);
        c.height = Math.round(img.height * s);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality).split(',')[1]);
      };
      img.onerror = function () { reject(new Error('تعذّرت قراءة الصورة. جرّب ملف JPG أو PNG.')); };
      img.src = url;
    });
  }

  function uploadImage(file, path, maxDim) {
    return resizeImage(file, maxDim, 0.88).then(function (b64) {
      return gh('/contents/' + path + '?ref=' + BRANCH)
        .then(function (j) { return j.sha; }, function () { return undefined; })
        .then(function (existing) {
          var body = { message: 'Upload ' + path + ' from the admin panel', content: b64, branch: BRANCH };
          if (existing) body.sha = existing;
          return gh('/contents/' + path, { method: 'PUT', body: body });
        });
    });
  }

  /* ---------- save bar ---------- */
  function setState(text, cls) {
    var el = $('#savestate');
    el.textContent = text;
    el.className = 'savestate' + (cls ? ' ' + cls : '');
  }

  function refreshBar() {
    $('#save').disabled = !dirty;
    $('#discard').disabled = !dirty;
    if (dirty) setState('لديك تغييرات لم تُحفظ.', 'dirty');
  }

  function markDirty() {
    if (!dirty) { dirty = true; }
    refreshBar();
  }

  function save() {
    $('#save').disabled = true;
    $('#discard').disabled = true;
    setState('يحفظ…');
    var text;
    try { text = serialize(); } catch (e) { setState('تعذّر تجهيز الملف: ' + e.message, 'err'); refreshBar(); return; }
    gh('/contents/' + FILE, {
      method: 'PUT',
      body: { message: 'Update site content from the admin panel', content: toB64(text), sha: sha, branch: BRANCH }
    }).then(function (j) {
      sha = j.content && j.content.sha ? j.content.sha : sha;
      snapshot = JSON.stringify(data);
      dirty = false;
      refreshBar();
      setState('تم الحفظ. يظهر التغيير على الموقع خلال دقيقة أو دقيقتين.', 'ok');
    }).catch(function (e) {
      if (e.status === 409 || e.status === 422) setState('تغيّر الملف على GitHub بعد أن فتحته. أعد تحميل الصفحة ثم أعد التعديل.', 'err');
      else if (e.status === 401 || e.status === 403) setState('الرمز منتهي أو لا يملك صلاحية الكتابة. أنشئ رمزاً جديداً.', 'err');
      else setState('تعذّر الحفظ: ' + e.message, 'err');
      dirty = true;
      $('#save').disabled = false;
      $('#discard').disabled = false;
    });
  }

  /* ---------- schema (what can be edited) ---------- */
  var BOOK_STATUS = [['reading', 'أقرؤه الآن'], ['read', 'قرأته'], ['next', 'التالي']];
  var PATH_STATUS = [['done', 'منجز'], ['in-progress', 'قيد التعلم'], ['next', 'التالي'], ['later', 'لاحقاً']];
  var ITEM_STATUS = [['', 'بدون حالة']].concat(PATH_STATUS);
  var SERIES_STATE = [['complete', 'مكتملة'], ['in-progress', 'جارية']];
  var RATING = [['', 'بدون تقييم'], ['1', '1 من 5'], ['2', '2 من 5'], ['3', '3 من 5'], ['4', '4 من 5'], ['5', '5 من 5']];
  var STATUS_LABEL = { reading: 'يقرأه', read: 'قرأه', next: 'التالي' };

  var SECTIONS = [
    {
      id: 'basics', label: 'الأساسيات',
      intro: 'الاسم والمسمى والروابط والصورة. هذه المعلومات تظهر في أكثر من صفحة.',
      blocks: [
        { type: 'fields', title: 'البيانات العامة', fields: [
          { k: 'name', label: 'الاسم', t: 'text' },
          { k: 'role', label: 'المسمى الوظيفي', t: 'text', help: 'يظهر في أسفل كل صفحة وفي عنوان تبويب المتصفح. غيّره من "Platform Engineer in the making" إلى "Platform Engineer" حين تصبح مهندساً.' },
          { k: 'availability', label: 'سطر الإتاحة في الصفحة الرئيسية', t: 'text', wide: true },
          { k: 'email', label: 'البريد الإلكتروني', t: 'text', ltr: true },
          { k: 'location', label: 'البلد', t: 'text' }
        ] },
        { type: 'photo', title: 'الصورة الشخصية' },
        { type: 'fields', title: 'الروابط', fields: [
          { k: 'links.linkedin', label: 'LinkedIn', t: 'text', ltr: true },
          { k: 'links.github', label: 'GitHub', t: 'text', ltr: true },
          { k: 'links.blog', label: 'المدونة', t: 'text', ltr: true },
          { k: 'links.youtube', label: 'قناة YouTube', t: 'text', ltr: true, help: 'اتركه فارغاً حتى تُنشأ القناة. حين تضيفه يتحول زر صفحة المجتمع إلى "Watch on YouTube".' },
          { k: 'links.community', label: 'رابط المجتمع', t: 'text', ltr: true, help: 'اتركه فارغاً حتى يُفتح المجتمع. حين تضيفه يتحول الزر إلى "Join the community".' }
        ] },
        { type: 'fields', title: 'إحصاءات الزوار (اختياري)', fields: [
          { k: 'analytics.goatcounter', label: 'رمز GoatCounter', t: 'text', ltr: true, help: 'أنشئ حساباً مجانياً على goatcounter.com واختر اسماً (مثل youssefamir)، ثم اكتب هذا الاسم هنا فقط. يعرض لك عدد الزوار وبلدانهم دون ملفات تعريف ارتباط.' }
        ] },
        { type: 'fields', title: 'السيرة الذاتية (صفحة CV)', fields: [
          { k: 'cv.headline', label: 'العنوان تحت اسمك', t: 'text', wide: true },
          { k: 'cv.objective', label: 'الهدف المهني', t: 'textarea', rows: 6, wide: true }
        ] }
      ]
    },
    {
      id: 'home', label: 'الصفحة الرئيسية',
      intro: 'النصوص الكبيرة التي يراها الزائر أول ما يفتح الموقع.',
      blocks: [
        { type: 'fields', title: 'أعلى الصفحة', fields: [
          { k: 'hero.hello', label: 'التحية', t: 'text', wide: true },
          { k: 'hero.line1', label: 'السطر الأول من العنوان الكبير', t: 'text', wide: true },
          { k: 'hero.line2', label: 'السطر الثاني', t: 'text', wide: true },
          { k: 'hero.lead', label: 'الفقرة التعريفية', t: 'textarea', rows: 4, wide: true }
        ] },
        { type: 'fields', title: 'اقتباسات التحفيز', fields: [
          { k: 'quotes', label: 'جمل تظهر في بطاقة "تذكير اليوم" (واحدة في كل سطر)', t: 'lines', rows: 7, wide: true, help: 'تتغير الجملة كل يوم. إن تركتها فارغة تظهر جمل افتراضية.' }
        ] },
        { type: 'list', title: 'ماذا أفعل (ثلاثة أقسام)', path: 'focus', newLabel: 'قسم جديد', addLabel: 'إضافة قسم',
          itemTitle: function (it) { return it.title; },
          fields: [
            { k: 'title', label: 'العنوان', t: 'text', wide: true },
            { k: 'text', label: 'الشرح', t: 'textarea', rows: 3, wide: true },
            { k: 'link', label: 'الرابط (مثل library.html)', t: 'text', ltr: true },
            { k: 'linkLabel', label: 'نص الرابط', t: 'text' }
          ], blank: function () { return { title: '', text: '', link: '', linkLabel: '' }; } },
        { type: 'list', title: 'لوحة Platform (السطور الصغيرة)', path: 'now.console', newLabel: 'سطر جديد', addLabel: 'إضافة سطر',
          help: 'مثل: learning ثم Linux administration. غيّرها كلما تقدمت.',
          itemTitle: function (it) { return it.k; }, itemMeta: function (it) { return it.v; },
          fields: [
            { k: 'k', label: 'الوسم (بالإنجليزية)', t: 'text', ltr: true },
            { k: 'v', label: 'القيمة', t: 'text' }
          ], blank: function () { return { k: '', v: '' }; } }
      ]
    },
    {
      id: 'about', label: 'من أنا',
      intro: 'قصتك ومبادئك ولغاتك واهتماماتك.',
      blocks: [
        { type: 'fields', title: 'التعريف', fields: [
          { k: 'about.lead', label: 'الجملة تحت العنوان', t: 'text', wide: true },
          { k: 'about.paragraphs', label: 'فقرات التعريف', t: 'paras', rows: 10, wide: true, help: 'افصل بين الفقرة والتي بعدها بسطر فارغ.' }
        ] },
        { type: 'list', title: 'كيف أعمل', path: 'howIWork', newLabel: 'مبدأ جديد', addLabel: 'إضافة مبدأ',
          itemTitle: function (it) { return it.title; },
          fields: [
            { k: 'title', label: 'العنوان', t: 'text', wide: true },
            { k: 'text', label: 'الشرح', t: 'textarea', rows: 3, wide: true }
          ], blank: function () { return { title: '', text: '' }; } },
        { type: 'list', title: 'اللغات', path: 'languages', newLabel: 'لغة جديدة', addLabel: 'إضافة لغة',
          itemTitle: function (it) { return it.name; }, itemMeta: function (it) { return it.level; },
          fields: [
            { k: 'name', label: 'اللغة', t: 'text' },
            { k: 'level', label: 'المستوى', t: 'text' }
          ], blank: function () { return { name: '', level: '' }; } },
        { type: 'fields', title: 'الاهتمامات', fields: [
          { k: 'interests', label: 'اهتماماتك (واحد في كل سطر)', t: 'lines', rows: 8, wide: true }
        ] }
      ]
    },
    {
      id: 'books', label: 'الكتب',
      intro: 'كل كتاب قرأته أو تقرؤه. غيّر الحالة إلى "أقرؤه الآن" ليظهر في الصفحة الرئيسية تلقائياً.',
      blocks: [
        { type: 'list', title: 'المكتبة', path: 'books', newLabel: 'كتاب جديد', addLabel: 'إضافة كتاب', addTop: true, search: true,
          itemTitle: function (it) { return it.title; },
          itemMeta: function (it) { return (STATUS_LABEL[it.status] || '') + (it.author ? ' · ' + it.author : ''); },
          fields: [
            { k: 'title', label: 'عنوان الكتاب', t: 'text', ltr: true },
            { k: 'author', label: 'المؤلف', t: 'text', ltr: true },
            { k: 'status', label: 'الحالة', t: 'select', options: BOOK_STATUS },
            { k: 'topic', label: 'الموضوع (مثل Psychology)', t: 'text', ltr: true },
            { k: 'rating', label: 'تقييمك', t: 'select', options: RATING, int: true },
            { k: 'description', label: 'وصف الكتاب (يظهر عند الضغط على الكتاب. افصل الفقرات بسطر فارغ)', t: 'textarea', rows: 6, wide: true },
            { k: 'takeaway', label: 'أهم ما خرجت به (جملة أو جملتان)', t: 'textarea', rows: 3, wide: true },
            { k: 'note', label: 'ملاحظة قصيرة', t: 'text', wide: true },
            { k: 'cover', label: 'صورة الغلاف', t: 'cover', wide: true, help: 'اتركها فارغة ليبحث الموقع عن الغلاف تلقائياً، أو ارفع صورة غلافك بنفسك وستظهر بدل التلقائي.' },
            { k: 'series', label: 'سلسلة على المدونة', t: 'object', toggle: 'لهذا الكتاب سلسلة مقالات على المدونة',
              blank: function () { return { title: '', state: 'in-progress' }; },
              fields: [
                { k: 'title', label: 'عنوان السلسلة بالعربية', t: 'text', wide: true },
                { k: 'parts', label: 'عدد المقالات الكلي', t: 'int' },
                { k: 'done', label: 'المكتوب منها', t: 'int' },
                { k: 'state', label: 'حالة السلسلة', t: 'select', options: SERIES_STATE }
              ] }
          ], blank: function () { return { id: '', title: '', author: '', status: 'read', topic: '' }; } }
      ]
    },
    {
      id: 'certs', label: 'الشهادات والتعليم',
      intro: 'كل شهادة ودورة وكل مرحلة دراسية. الأحدث في الأعلى.',
      blocks: [
        { type: 'list', title: 'الشهادات والدورات', path: 'certificates', newLabel: 'شهادة جديدة', addLabel: 'إضافة شهادة', addTop: true,
          itemTitle: function (it) { return it.title; },
          itemMeta: function (it) { return (it.issuer || '') + (it.date ? ' · ' + it.date : ''); },
          fields: [
            { k: 'title', label: 'اسم الشهادة أو الدورة', t: 'text', ltr: true, wide: true },
            { k: 'issuer', label: 'الجهة المانحة', t: 'text', ltr: true },
            { k: 'date', label: 'التاريخ (مثل Oct 2026)', t: 'text', ltr: true },
            { k: 'type', label: 'النوع (مثل Course certificate)', t: 'text', ltr: true },
            { k: 'id', label: 'رقم الشهادة', t: 'text', ltr: true },
            { k: 'detail', label: 'تفاصيل (المدرب، عدد الساعات)', t: 'text', ltr: true, wide: true },
            { k: 'verify', label: 'رابط التحقق (اختياري)', t: 'text', ltr: true, wide: true }
          ], blank: function () { return { title: '', issuer: '', date: '', type: 'Course certificate', detail: '', id: '', verify: '' }; } },
        { type: 'list', title: 'التعليم', path: 'education', newLabel: 'مرحلة جديدة', addLabel: 'إضافة مرحلة', addTop: true,
          itemTitle: function (it) { return it.degree; }, itemMeta: function (it) { return it.school; },
          fields: [
            { k: 'degree', label: 'الدرجة والتخصص', t: 'text', ltr: true, wide: true },
            { k: 'school', label: 'الجامعة أو المعهد', t: 'text', ltr: true },
            { k: 'period', label: 'الفترة', t: 'text', ltr: true }
          ], blank: function () { return { degree: '', school: '', period: '' }; } }
      ]
    },
    {
      id: 'skills', label: 'المهارات',
      intro: 'مجموعات المهارات في صفحة "من أنا". اكتب كل مهارة في سطر.',
      blocks: [
        { type: 'list', title: 'مجموعات المهارات', path: 'skills', newLabel: 'مجموعة جديدة', addLabel: 'إضافة مجموعة',
          itemTitle: function (it) { return it.group; },
          itemMeta: function (it) { return (it.items || []).length + ' مهارة'; },
          fields: [
            { k: 'group', label: 'اسم المجموعة', t: 'text', ltr: true, wide: true },
            { k: 'items', label: 'المهارات (واحدة في كل سطر)', t: 'lines', rows: 6, wide: true }
          ], blank: function () { return { group: '', items: [] }; } }
      ]
    },
    {
      id: 'exp', label: 'الخبرات والجهات',
      intro: 'أضف هنا كل جهة عملت معها. حين تصبح مهندساً أضف وظيفتك الجديدة، وغيّر المسمى من تبويب "الأساسيات". الأحدث في الأعلى.',
      blocks: [
        { type: 'list', title: 'الخبرات', path: 'experience', newLabel: 'خبرة جديدة', addLabel: 'إضافة خبرة', addTop: true,
          itemTitle: function (it) { return it.role; },
          itemMeta: function (it) { return (it.company || '') + (it.period ? ' · ' + it.period : ''); },
          fields: [
            { k: 'role', label: 'المسمى', t: 'text', ltr: true },
            { k: 'company', label: 'الجهة', t: 'text', ltr: true },
            { k: 'period', label: 'المدة (مثل 2 years أو Jan 2027 to now)', t: 'text', ltr: true, wide: true },
            { k: 'points', label: 'ما فعلته (نقطة في كل سطر)', t: 'lines', rows: 5, wide: true }
          ], blank: function () { return { role: '', company: '', period: '', points: [] }; } }
      ]
    },
    {
      id: 'log', label: 'سجل التعلم',
      intro: 'سطران كل أسبوع عمّا تعلمته وبنيته. الأحدث يظهر أولاً مرتباً بالتاريخ. اكتبه بالإنجليزية ليقرأه من يوظّفك.',
      blocks: [
        { type: 'list', title: 'المدخلات', path: 'log', newLabel: 'مدخل جديد', addLabel: 'إضافة مدخل', addTop: true, search: true,
          itemTitle: function (it) { return it.title; }, itemMeta: function (it) { return it.date; },
          fields: [
            { k: 'date', label: 'التاريخ (مثل 2026-11-25)', t: 'text', ltr: true },
            { k: 'title', label: 'العنوان', t: 'text', wide: true },
            { k: 'text', label: 'ما تعلمته أو أنجزته (افصل الفقرات بسطر فارغ)', t: 'textarea', rows: 5, wide: true },
            { k: 'tags', label: 'وسوم (واحد في كل سطر، مثل Linux)', t: 'lines', rows: 3, ltr: true },
            { k: 'link', label: 'رابط للعمل (اختياري)', t: 'text', ltr: true }
          ], blank: function () { return { date: new Date().toISOString().slice(0, 10), title: '', text: '' }; } }
      ]
    },
    {
      id: 'services', label: 'الخدمات',
      intro: 'الخدمات التي تقدمها ونطاق عملك. اختر لغة كل خدمة، والخدمة العربية تُعرض بمحاذاة عربية كاملة. احذف أي خدمة لا تقدمها فعلاً.',
      blocks: [
        { type: 'list', title: 'قائمة الخدمات', path: 'services', newLabel: 'خدمة جديدة', addLabel: 'إضافة خدمة',
          itemTitle: function (it) { return it.title; }, itemMeta: function (it) { return it.lang === 'ar' ? 'عربية' : 'English'; },
          fields: [
            { k: 'title', label: 'اسم الخدمة', t: 'text', wide: true },
            { k: 'lang', label: 'لغة الخدمة', t: 'select', options: [['en', 'English'], ['ar', 'العربية']] },
            { k: 'ctaLabel', label: 'نص الزر (اختياري)', t: 'text' },
            { k: 'summary', label: 'وصف قصير', t: 'textarea', rows: 3, wide: true },
            { k: 'points', label: 'ما تقدمه (نقطة في كل سطر)', t: 'lines', rows: 5, wide: true },
            { k: 'note', label: 'ملاحظة (السعر أو طريقة العمل)', t: 'textarea', rows: 2, wide: true },
            { k: 'link', label: 'رابط الزر (اختياري، وإلا فهو بريد إليك)', t: 'text', ltr: true, wide: true }
          ], blank: function () { return { title: '', lang: 'ar', summary: '', points: [], note: '' }; } }
      ]
    },
    {
      id: 'projects', label: 'المشاريع',
      intro: 'أضف مشاريعك العلنية بالاسم والرابط والصور والفيديو. لا تنشر هنا أي عمل سري لعميل أو جهة.',
      blocks: [
        { type: 'list', title: 'المشاريع', path: 'projects', newLabel: 'مشروع جديد', addLabel: 'إضافة مشروع', addTop: true, search: true,
          itemTitle: function (it) { return it.title; },
          itemMeta: function (it) { var s = [['live', 'يعمل'], ['building', 'قيد العمل'], ['finished', 'منتهٍ']].filter(function (x) { return x[0] === it.status; })[0]; return s ? s[1] : ''; },
          fields: [
            { k: 'title', label: 'اسم المشروع', t: 'text', ltr: true, wide: true },
            { k: 'status', label: 'الحالة', t: 'select', options: [['building', 'قيد العمل'], ['live', 'يعمل الآن'], ['finished', 'منتهٍ']] },
            { k: 'role', label: 'دورك (مثل Personal project)', t: 'text', ltr: true },
            { k: 'summary', label: 'وصف قصير', t: 'textarea', rows: 3, wide: true, ltr: true },
            { k: 'problem', label: 'المشكلة (اختياري)', t: 'textarea', rows: 2, wide: true, ltr: true },
            { k: 'did', label: 'ما فعلته (اختياري)', t: 'textarea', rows: 3, wide: true, ltr: true },
            { k: 'result', label: 'النتيجة (اختياري)', t: 'textarea', rows: 2, wide: true, ltr: true },
            { k: 'tags', label: 'التقنيات (واحدة في كل سطر، مثل Linux)', t: 'lines', rows: 4, ltr: true },
            { k: 'link', label: 'رابط المشروع (اختياري)', t: 'text', ltr: true },
            { k: 'repo', label: 'رابط المستودع على GitHub (اختياري)', t: 'text', ltr: true },
            { k: 'video', label: 'رابط الفيديو', t: 'text', ltr: true, wide: true, help: 'الأفضل رابط YouTube (يمكن أن يكون Unlisted)، فيُشغَّل داخل الموقع. لا ترفع فيديو على GitHub لأنه ثقيل.' },
            { k: 'images', label: 'الصور (الأولى هي الغلاف)', t: 'images', wide: true }
          ], blank: function () { return { id: '', title: '', status: 'building', summary: '' }; } }
      ]
    },
    {
      id: 'path', label: 'المسار والمشاريع',
      intro: 'خارطة تعلمك وحالة كل خطوة، والمشاريع العلنية التي تنجزها.',
      blocks: [
        { type: 'list', title: 'مراحل المسار', path: 'path', newLabel: 'مرحلة جديدة', addLabel: 'إضافة مرحلة',
          itemTitle: function (it) { return it.name; },
          itemMeta: function (it) { var s = PATH_STATUS.filter(function (x) { return x[0] === it.status; })[0]; return s ? s[1] : ''; },
          fields: [
            { k: 'name', label: 'اسم المرحلة', t: 'text', ltr: true },
            { k: 'status', label: 'الحالة', t: 'select', options: PATH_STATUS },
            { k: 'summary', label: 'وصف قصير', t: 'text', ltr: true, wide: true },
            { k: 'items', label: 'المواضيع داخل المرحلة', t: 'list', wide: true, newLabel: 'موضوع جديد', addLabel: 'إضافة موضوع',
              itemTitle: function (it) { return it.t; },
              itemMeta: function (it) { var s = ITEM_STATUS.filter(function (x) { return x[0] === (it.s || ''); })[0]; return s ? s[1] : ''; },
              fields: [
                { k: 't', label: 'الموضوع', t: 'text', ltr: true },
                { k: 's', label: 'الحالة', t: 'select', options: ITEM_STATUS }
              ], blank: function () { return { t: '', s: '' }; } }
          ], blank: function () { return { name: '', status: 'later', summary: '', items: [] }; } },
        { type: 'fields', title: 'طريقة الدراسة وأهداف الشهادات', fields: [
          { k: 'method', label: 'كيف تدرس (نقطة في كل سطر)', t: 'lines', rows: 5, wide: true },
          { k: 'certTargets', label: 'الشهادات المستهدفة', t: 'textarea', rows: 3, wide: true }
        ] },
        { type: 'list', title: 'بيئة المختبر', path: 'labEnvironment', newLabel: 'سطر جديد', addLabel: 'إضافة سطر',
          itemTitle: function (it) { return it.k; }, itemMeta: function (it) { return it.v; },
          fields: [
            { k: 'k', label: 'الوسم', t: 'text', ltr: true },
            { k: 'v', label: 'القيمة', t: 'text', ltr: true }
          ], blank: function () { return { k: '', v: '' }; } },
        { type: 'list', title: 'الأعمال السرية', path: 'confidential', newLabel: 'عمل جديد', addLabel: 'إضافة عمل',
          itemTitle: function (it) { return it.title; },
          fields: [
            { k: 'title', label: 'العنوان', t: 'text', ltr: true, wide: true },
            { k: 'text', label: 'الوصف', t: 'textarea', rows: 3, wide: true }
          ], blank: function () { return { title: '', text: '' }; } }
      ]
    }
  ];

  /* ---------- field editors ---------- */
  function listFromLines(v) { return v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }
  function listFromParas(v) { return v.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean); }

  function field(def, obj, onChange) {
    var id = 'f' + (++uid);
    var wrap = h('div', { class: 'field' + (def.wide ? ' wide' : '') });
    var val = getV(obj, def.k);
    var input;

    function commit(v) { setV(obj, def.k, v); markDirty(); if (onChange) onChange(); }

    if (def.t === 'object') return objectField(def, obj, onChange);
    if (def.t === 'list') {
      wrap.append(h('label', { text: def.label }));
      listEditor(def, obj, def.k, wrap);
      return wrap;
    }

    wrap.append(h('label', { for: id, text: def.label }));
    switch (def.t) {
      case 'textarea':
        input = h('textarea', { id: id, rows: def.rows || 3, dir: def.ltr ? 'ltr' : 'auto' });
        input.value = val || '';
        input.addEventListener('input', function () { commit(input.value); });
        break;
      case 'lines':
        input = h('textarea', { id: id, rows: def.rows || 5, dir: 'auto' });
        input.value = (val || []).join('\n');
        input.addEventListener('input', function () { commit(listFromLines(input.value)); });
        break;
      case 'paras':
        input = h('textarea', { id: id, rows: def.rows || 8, dir: 'auto' });
        input.value = (val || []).join('\n\n');
        input.addEventListener('input', function () { commit(listFromParas(input.value)); });
        break;
      case 'select':
        input = h('select', { id: id }, def.options.map(function (o) { return h('option', { value: o[0], text: o[1] }); }));
        input.value = val == null ? '' : String(val);
        if (input.value !== (val == null ? '' : String(val))) input.value = def.options[0][0];
        input.addEventListener('change', function () {
          var v = input.value;
          commit(def.int ? (v === '' ? undefined : Number(v)) : v);
        });
        break;
      case 'int':
        input = h('input', { id: id, type: 'number', min: '0', inputmode: 'numeric', dir: 'ltr' });
        input.value = val == null ? '' : String(val);
        input.addEventListener('input', function () { commit(input.value === '' ? undefined : Number(input.value)); });
        break;
      case 'cover':
        input = coverEditor(id, obj, def, onChange);
        break;
      case 'images':
        input = imagesEditor(obj, def);
        break;
      default:
        input = h('input', { id: id, type: 'text', dir: def.ltr ? 'ltr' : 'auto', spellcheck: def.ltr ? 'false' : null });
        input.value = val == null ? '' : String(val);
        input.addEventListener('input', function () { commit(input.value); });
    }
    wrap.append(input);
    if (def.help) wrap.append(h('span', { class: 'help', text: def.help }));
    return wrap;
  }

  function objectField(def, obj, onChange) {
    var box = h('fieldset', { class: 'sub' });
    var chk = h('input', { type: 'checkbox', id: 'f' + (++uid) });
    var inner = h('div', { class: 'grid' });
    box.append(h('legend', { text: def.label }), h('label', { class: 'check', for: chk.id }, chk, def.toggle || def.label), inner);
    function build() {
      inner.textContent = '';
      var o = getV(obj, def.k);
      inner.hidden = !o;
      if (!o) return;
      def.fields.forEach(function (f) { inner.append(field(f, o, onChange)); });
    }
    chk.checked = !!getV(obj, def.k);
    chk.addEventListener('change', function () {
      setV(obj, def.k, chk.checked ? (def.blank ? def.blank() : {}) : undefined);
      markDirty();
      build();
    });
    build();
    return box;
  }

  function coverEditor(id, obj, def, onChange) {
    var text = h('input', { id: id, type: 'text', dir: 'ltr', placeholder: 'https://... أو ارفع صورة', spellcheck: 'false' });
    text.value = getV(obj, def.k) || '';
    text.addEventListener('input', function () { setV(obj, def.k, text.value); markDirty(); if (onChange) onChange(); });
    var file = h('input', { type: 'file', accept: 'image/*', 'aria-label': 'رفع صورة الغلاف' });
    var msg = h('span', { class: 'help' });
    file.addEventListener('change', function () {
      if (!file.files[0]) return;
      if (!obj.id) obj.id = slug(obj.title) || ('book-' + Date.now().toString(36));
      var path = 'covers/' + obj.id + '.jpg';
      msg.textContent = 'يرفع الصورة…';
      uploadImage(file.files[0], path, 600).then(function () {
        var url = path + '?v=' + Date.now();
        text.value = url;
        setV(obj, def.k, url);
        markDirty();
        msg.textContent = 'رُفعت الصورة. اضغط "حفظ التغييرات" لتثبيتها.';
      }).catch(function (e) { msg.textContent = 'تعذّر الرفع: ' + e.message; });
    });
    var prev = h('img', { class: 'coverprev', alt: '', hidden: !text.value });
    function showPrev() { prev.hidden = !text.value; if (text.value) prev.src = text.value; }
    showPrev();
    text.addEventListener('change', showPrev);
    file.addEventListener('change', function () { if (file.files[0]) { prev.src = URL.createObjectURL(file.files[0]); prev.hidden = false; } });
    var row = h('div', { class: 'coverrow' }, text, file);
    var box = h('div', {}, row, prev, msg);
    box.id = null;
    return box;
  }

  function imagesEditor(obj, def) {
    var box = h('div', {});
    var strip = h('div', { class: 'imgstrip' });
    var msg = h('span', { class: 'help' });
    var file = h('input', { type: 'file', accept: 'image/*', multiple: '', 'aria-label': 'رفع صور' });
    function paint() {
      strip.textContent = '';
      var arr = getV(obj, def.k) || [];
      arr.forEach(function (src, i) {
        strip.append(h('div', { class: 'imgcell' },
          h('img', { src: src, alt: '' }),
          h('button', { type: 'button', class: 'mini-btn del', 'aria-label': 'حذف الصورة', onclick: function () {
            arr.splice(i, 1); setV(obj, def.k, arr); markDirty(); paint();
          } }, '✕')));
      });
    }
    file.addEventListener('change', function () {
      var files = Array.prototype.slice.call(file.files || []);
      if (!files.length) return;
      if (!obj.id) obj.id = slug(obj.title) || ('project-' + Date.now().toString(36));
      var arr = getV(obj, def.k) || [];
      msg.textContent = 'يرفع ' + files.length + ' صورة…';
      files.reduce(function (chain, f, k) {
        return chain.then(function () {
          var path = 'projects/' + obj.id + '-' + Date.now().toString(36) + k + '.jpg';
          return uploadImage(f, path, 1400).then(function () { arr.push(path); setV(obj, def.k, arr); paint(); });
        });
      }, Promise.resolve()).then(function () {
        markDirty(); file.value = '';
        msg.textContent = 'رُفعت الصور. اضغط "حفظ التغييرات" لتثبيتها.';
      }).catch(function (e) { msg.textContent = 'تعذّر الرفع: ' + e.message; });
    });
    paint();
    box.append(strip, file, msg);
    return box;
  }

  /* ---------- list editor ---------- */
  function listEditor(def, root, path, container) {
    var arr = ensureArray(root, path);
    var box = h('div', { class: 'list' });
    var searchBox = null;

    if (def.search) {
      searchBox = h('input', { type: 'search', class: 'search-row', placeholder: 'ابحث في القائمة', 'aria-label': 'ابحث في القائمة', dir: 'auto' });
      searchBox.style.maxWidth = '360px';
      searchBox.style.marginBottom = '12px';
      searchBox.addEventListener('input', filter);
      container.append(searchBox);
    }
    container.append(box);
    container.append(h('div', { class: 'actions', style: 'margin-top:12px' },
      h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
        var item = def.blank();
        if (def.addTop) arr.unshift(item); else arr.push(item);
        markDirty();
        render(item);
      } }, '+ ' + def.addLabel)));

    function filter() {
      var q = (searchBox ? searchBox.value : '').trim().toLowerCase();
      Array.prototype.forEach.call(box.children, function (c) {
        if (c.dataset.q === undefined) return;
        c.hidden = q && c.dataset.q.indexOf(q) === -1;
      });
    }

    function render(openItem) {
      box.textContent = '';
      if (!arr.length) box.append(h('p', { class: 'list-empty', text: 'لا يوجد شيء هنا بعد.' }));
      arr.forEach(function (it, i) { box.append(card(it, i, it === openItem)); });
      filter();
    }

    function card(it, i, open) {
      var title = h('span', { class: 'card-title' });
      var meta = h('span', { class: 'card-meta' });
      var body = h('div', { class: 'card-body', hidden: !open });
      var el = h('div', { class: 'card' });
      function paint() {
        title.textContent = (def.itemTitle ? def.itemTitle(it) : '') || def.newLabel;
        meta.textContent = def.itemMeta ? def.itemMeta(it) : '';
        el.dataset.q = (title.textContent + ' ' + meta.textContent).toLowerCase();
      }
      paint();
      var grid = h('div', { class: 'grid' });
      def.fields.forEach(function (f) { grid.append(field(f, it, paint)); });
      body.append(grid);
      var toggle = h('button', { class: 'card-toggle', type: 'button', 'aria-expanded': String(!!open), onclick: function () {
        var show = body.hidden;
        body.hidden = !show;
        toggle.setAttribute('aria-expanded', String(show));
      } }, title, meta);
      function move(d) {
        var j = i + d;
        if (j < 0 || j >= arr.length) return;
        var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
        markDirty();
        render(it);
      }
      var acts = h('div', { class: 'card-acts' },
        h('button', { class: 'mini-btn', type: 'button', 'aria-label': 'تحريك للأعلى', onclick: function () { move(-1); } }, '↑'),
        h('button', { class: 'mini-btn', type: 'button', 'aria-label': 'تحريك للأسفل', onclick: function () { move(1); } }, '↓'),
        h('button', { class: 'mini-btn del', type: 'button', 'aria-label': 'حذف', onclick: function () {
          if (!window.confirm('حذف "' + title.textContent + '"؟')) return;
          arr.splice(i, 1);
          markDirty();
          render();
        } }, '✕'));
      el.append(h('div', { class: 'card-head' }, toggle, acts), body);
      return el;
    }

    render();
  }

  /* ---------- photo ---------- */
  function photoBlock(block, container) {
    var img = h('img', { alt: 'الصورة الحالية', src: (data.photo || 'photo.jpg') });
    var file = h('input', { type: 'file', accept: 'image/*', 'aria-label': 'اختر صورة' });
    var msg = h('p', { class: 'help', style: 'margin:0' });
    var btn = h('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: function () {
      if (!file.files[0]) { msg.textContent = 'اختر صورة أولاً.'; return; }
      msg.textContent = 'يرفع الصورة…';
      uploadImage(file.files[0], 'photo.jpg', 1200).then(function () {
        data.photo = 'photo.jpg?v=' + Date.now();
        markDirty();
        img.src = URL.createObjectURL(file.files[0]);
        msg.textContent = 'رُفعت الصورة. اضغط "حفظ التغييرات" لتثبيتها على الموقع.';
      }).catch(function (e) { msg.textContent = 'تعذّر الرفع: ' + e.message; });
    } }, 'رفع الصورة');
    container.append(h('div', { class: 'photo-edit' }, img,
      h('div', { class: 'actions' }, file, btn, msg,
        h('span', { class: 'help', text: 'الأفضل صورة عمودية واضحة للوجه. تُضبط الأبعاد تلقائياً.' }))));
  }

  /* ---------- panel and tabs ---------- */
  function renderPanel() {
    var sec = SECTIONS.filter(function (s) { return s.id === current; })[0];
    var panel = $('#panel');
    panel.textContent = '';
    panel.append(h('h2', { text: sec.label }), h('p', { class: 'panel-intro', text: sec.intro }));
    sec.blocks.forEach(function (b) {
      var block = h('section', { class: 'block' }, h('h3', { text: b.title }));
      if (b.help) block.append(h('p', { class: 'block-help', text: b.help }));
      if (b.type === 'fields') {
        var grid = h('div', { class: 'grid' });
        b.fields.forEach(function (f) { grid.append(field(f, data)); });
        block.append(grid);
      } else if (b.type === 'list') {
        listEditor(b, data, b.path, block);
      } else if (b.type === 'photo') {
        photoBlock(b, block);
      }
      panel.append(block);
    });
    Array.prototype.forEach.call($('#tabs').children, function (t) { t.setAttribute('aria-selected', String(t.dataset.id === current)); });
  }

  function renderTabs() {
    var tabs = $('#tabs');
    tabs.textContent = '';
    SECTIONS.forEach(function (s) {
      tabs.append(h('button', { class: 'tab', type: 'button', 'data-id': s.id, 'aria-selected': String(s.id === current), onclick: function () {
        current = s.id;
        renderPanel();
        window.scrollTo(0, 0);
      } }, s.label));
    });
  }

  /* ---------- connect ---------- */
  function openEditor() {
    $('#login').hidden = true;
    $('#editor').hidden = false;
    $('#savebar').hidden = false;
    $('#logout').hidden = false;
    renderTabs();
    renderPanel();
    refreshBar();
    setState('لا توجد تغييرات.');
  }

  function connect(t, remember, msgEl) {
    token = t.trim();
    msgEl.className = 'msg';
    msgEl.textContent = 'يتصل بـ GitHub…';
    return gh('').then(function (repo) {
      if (repo.permissions && repo.permissions.push === false) throw Object.assign(new Error('هذا الرمز يقرأ فقط. أعد إنشاءه بصلاحية Contents: Read and write.'), { status: 403 });
      return gh('/contents/' + FILE + '?ref=' + BRANCH);
    }).then(function (file) {
      if (!file.content) throw new Error('تعذّرت قراءة data.js');
      sha = file.sha;
      data = parseDataJs(fromB64(file.content));
      snapshot = JSON.stringify(data);
      var seeded = false, DEF = window.SITE_DEFAULTS || {};
      Object.keys(DEF).forEach(function (k) {
        if (data[k] === undefined) { data[k] = JSON.parse(JSON.stringify(DEF[k])); seeded = true; }
      });
      keepToken(token, remember);
      openEditor();
      if (seeded) { markDirty(); setState('أضفتُ أقساماً جديدة (الخدمات). راجعها ثم اضغط "حفظ التغييرات".', 'dirty'); }
    }).catch(function (e) {
      token = '';
      msgEl.className = 'msg';
      if (e.status === 401) msgEl.textContent = 'الرمز غير صحيح أو منتهي. تأكد أنك نسخته كاملاً.';
      else if (e.status === 403 || e.status === 404) msgEl.textContent = 'الرمز لا يصل إلى مستودع الموقع. تأكد أنك اخترت المستودع eng-youssefamir.github.io وصلاحية Contents.';
      else msgEl.textContent = 'تعذّر الاتصال: ' + e.message;
      forgetToken();
    });
  }

  /* ---------- boot ---------- */
  $('#login-form').addEventListener('submit', function (e) {
    e.preventDefault();
    connect($('#token').value, $('#remember').checked, $('#login-msg'));
  });
  $('#logout').addEventListener('click', function () {
    if (dirty && !window.confirm('لديك تغييرات لم تُحفظ. تسجيل الخروج سيتجاهلها. هل تريد المتابعة؟')) return;
    dirty = false;
    forgetToken();
    location.reload();
  });
  $('#save').addEventListener('click', save);
  $('#discard').addEventListener('click', function () {
    if (!window.confirm('تجاهل كل التغييرات التي لم تُحفظ؟')) return;
    data = JSON.parse(snapshot);
    dirty = false;
    renderPanel();
    refreshBar();
    setState('تم التجاهل.');
  });
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  var saved = storedToken();
  if (saved) {
    $('#token').value = saved;
    connect(saved, !!(function () { try { return localStorage.getItem('adminToken'); } catch (e) { return ''; } })(), $('#login-msg'));
  }
})();
