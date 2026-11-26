/* md.js: a small, safe Markdown renderer used by the admin to preview and to publish posts.
   Everything is escaped first, so raw HTML in a post is shown as text and never runs. */
window.MD = (function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function okUrl(u) {
    u = String(u || '').trim();
    if (/^\s*(javascript|data|vbscript):/i.test(u)) return '';
    return u;
  }

  function ytId(u) {
    var m = String(u || '').match(/^https?:\/\/(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/);
    return m ? m[1] : '';
  }

  /* inline: input is already escaped */
  function inline(s) {
    var codes = [];
    s = s.replace(/`([^`]+)`/g, function (_, c) { codes.push(c); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, function (_, alt, url) {
      url = okUrl(url.replace(/&amp;/g, '&'));
      return url ? '<img src="' + esc(url) + '" alt="' + alt + '" loading="lazy">' : alt;
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (_, text, url) {
      url = okUrl(url.replace(/&amp;/g, '&'));
      if (!url) return text;
      var external = /^https?:/i.test(url);
      return '<a href="' + esc(url) + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + text + '</a>';
    });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
    s = s.replace(/(^|[\s(])_([^_\s][^_]*)_(?=$|[\s).,!?:;])/g, '$1<em>$2</em>');
    s = s.replace(/\u0000(\d+)\u0000/g, function (_, i) { return '<code>' + codes[Number(i)] + '</code>'; });
    return s;
  }

  function render(src) {
    var lines = String(src || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [], i = 0, m;

    function flushPara(buf) {
      if (!buf.length) return;
      out.push('<p dir="auto">' + buf.map(function (l) { return inline(esc(l)); }).join('<br>') + '</p>');
    }

    while (i < lines.length) {
      var line = lines[i];

      if (/^\s*$/.test(line)) { i++; continue; }

      if ((m = line.match(/^```\s*([\w-]*)\s*$/))) {
        var code = []; i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { code.push(lines[i]); i++; }
        i++;
        out.push('<pre dir="ltr"><code>' + esc(code.join('\n')) + '</code></pre>');
        continue;
      }

      if ((m = line.match(/^(#{1,3})\s+(.+?)\s*#*\s*$/))) {
        var lvl = m[1].length + 1;
        out.push('<h' + lvl + ' dir="auto">' + inline(esc(m[2])) + '</h' + lvl + '>');
        i++; continue;
      }

      if (/^\s*(---+|\*\*\*+)\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (/^>\s?/.test(line)) {
        var q = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { q.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote dir="auto">' + q.map(function (l) { return inline(esc(l)); }).join('<br>') + '</blockquote>');
        continue;
      }

      if (/^\s*[-*]\s+/.test(line)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) { ul.push(lines[i].replace(/^\s*[-*]\s+/, '')); i++; }
        out.push('<ul dir="auto">' + ul.map(function (l) { return '<li>' + inline(esc(l)) + '</li>'; }).join('') + '</ul>');
        continue;
      }

      if (/^\s*\d+[.)]\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) { ol.push(lines[i].replace(/^\s*\d+[.)]\s+/, '')); i++; }
        out.push('<ol dir="auto">' + ol.map(function (l) { return '<li>' + inline(esc(l)) + '</li>'; }).join('') + '</ol>');
        continue;
      }

      var t = line.trim();
      if (ytId(t) && /^\S+$/.test(t)) {
        out.push('<div class="embed"><iframe src="https://www.youtube-nocookie.com/embed/' + ytId(t) + '?rel=0" title="Video" loading="lazy" allowfullscreen></iframe></div>');
        i++; continue;
      }

      if ((m = t.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/))) {
        var url = okUrl(m[2]);
        if (url) {
          out.push('<figure><img src="' + esc(url) + '" alt="' + esc(m[1]) + '" loading="lazy">' + (m[1] ? '<figcaption dir="auto">' + esc(m[1]) + '</figcaption>' : '') + '</figure>');
          i++; continue;
        }
      }

      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !/^(#{1,3}\s|```|>\s?|\s*[-*]\s+|\s*\d+[.)]\s+|\s*(---+|\*\*\*+)\s*$)/.test(lines[i])) { para.push(lines[i]); i++; }
      if (!para.length) { para.push(lines[i]); i++; }
      flushPara(para);
    }
    return out.join('\n');
  }

  function plain(src) {
    return String(src || '').replace(/```[\s\S]*?```/g, ' ').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[#>*_`~-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function readMins(src) {
    var words = plain(src).split(' ').filter(Boolean).length;
    return Math.max(1, Math.round(words / 200));
  }

  function excerpt(src, n) {
    var t = plain(src);
    n = n || 170;
    return t.length > n ? t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…' : t;
  }

  return { render: render, esc: esc, readMins: readMins, excerpt: excerpt, plain: plain };
})();
