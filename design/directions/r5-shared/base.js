/* Round 5 · shared behaviour
   - mobile menu
   - stitched frames that sew in when they scroll into view
   - the Research map (gold rivers, still; hover a district to name it once)
   - R5.rivers(): the three rivers in the hero. They draw in once on load and then
     (water = flow) small lights drift along them. Nothing moves anywhere else, and
     nothing reacts to scrolling. */
(function () {
  'use strict';
  var root = document.documentElement;
  root.classList.add('js');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var NS = 'http://www.w3.org/2000/svg';
  function $(s, c) { return (c || document).querySelector(s); }
  function el(name, attrs, parent) {
    var n = document.createElementNS(NS, name);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function easeOut(t) { return 1 - Math.pow(1 - clamp(t, 0, 1), 4); }
  function debounce(fn, ms) { var t; return function () { clearTimeout(t); t = setTimeout(fn, ms); }; }
  function opt(k, d) { return window.KR ? window.KR.get(k) : (root.getAttribute('data-' + k) || d); }

  // one gradient for every mote
  var gsvg = el('svg', { width: 0, height: 0, 'aria-hidden': 'true', focusable: 'false', style: 'position:absolute;width:0;height:0;overflow:hidden' });
  gsvg.innerHTML = '<defs><radialGradient id="mote"><stop offset="0" stop-color="#fff6dc"/><stop offset=".3" stop-color="#ffe2a0" stop-opacity=".85"/><stop offset="1" stop-color="#f5c048" stop-opacity="0"/></radialGradient></defs>';
  document.body.insertBefore(gsvg, document.body.firstChild);

  /* ─── Join dropdown (same two links as the live site's Join menu) ─── */
  var join = $('[data-join]');
  if (join) {
    var jBtn = join.querySelector('button'), jMenu = join.querySelector('.join__menu');
    var jSet = function (open) { jBtn.setAttribute('aria-expanded', String(open)); jMenu.hidden = !open; };
    jBtn.addEventListener('click', function () { jSet(jMenu.hidden); if (!jMenu.hidden) jMenu.querySelector('a').focus(); });
    document.addEventListener('click', function (e) { if (!join.contains(e.target)) jSet(false); });
    join.addEventListener('focusout', function (e) { if (e.relatedTarget && !join.contains(e.relatedTarget)) jSet(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !jMenu.hidden) { jSet(false); jBtn.focus(); } });
  }

  /* ─── mobile menu ─── */
  var burger = $('[data-burger]'), sheet = $('[data-sheet]');
  if (burger && sheet) {
    var setOpen = function (open) { burger.setAttribute('aria-expanded', String(open)); sheet.hidden = !open; };
    burger.addEventListener('click', function () { setOpen(burger.getAttribute('aria-expanded') !== 'true'); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') { setOpen(false); burger.focus(); }
    });
    sheet.addEventListener('click', function (e) { if (e.target.closest('a')) setOpen(false); });
    window.matchMedia('(min-width: 1081px)').addEventListener('change', function (m) { if (m.matches) setOpen(false); });
  }

  /* ─── stitched frames ─── */
  var stitchId = 0;
  function frame(host) {
    var svg = el('svg', { 'class': 'stitch-svg', 'aria-hidden': 'true', focusable: 'false' });
    var id = 'stm' + (++stitchId);
    svg.innerHTML = '<defs><mask id="' + id + '" maskUnits="userSpaceOnUse"><rect class="mk" pathLength="1"/></mask></defs>' +
      '<g mask="url(#' + id + ')"><rect class="st"/><rect class="st st2"/></g>';
    host.appendChild(svg);
    var rects = svg.querySelectorAll('rect');
    function size() {
      var w = host.offsetWidth, h = host.offsetHeight;
      if (!w || !h) return;
      svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
      var i1 = host.classList.contains('patch') ? 4 : 10, i2 = i1 + 5;
      [[rects[0], i1 - 3], [rects[1], i1], [rects[2], i2]].forEach(function (p) {
        p[0].setAttribute('x', p[1]); p[0].setAttribute('y', p[1]);
        p[0].setAttribute('width', Math.max(0, w - p[1] * 2)); p[0].setAttribute('height', Math.max(0, h - p[1] * 2));
        p[0].setAttribute('rx', 2);
      });
      if (host.classList.contains('patch') || host.classList.contains('medallion')) rects[2].style.display = 'none';
    }
    size();
    if ('ResizeObserver' in window) new ResizeObserver(size).observe(host);
  }
  [].forEach.call(document.querySelectorAll('[data-stitch]'), frame);
  var sewTargets = document.querySelectorAll('[data-stitch], .runner, [data-reveal]');
  if (reduce || !('IntersectionObserver' in window)) {
    [].forEach.call(sewTargets, function (t) { t.classList.add('is-sewn'); });
  } else {
    var sio = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-sewn'); sio.unobserve(e.target); } });
    }, { rootMargin: '0px 0px -12% 0px', threshold: .05 });
    [].forEach.call(sewTargets, function (t) { sio.observe(t); });
  }


  /* ─── OPTION: details = open / closed ─── */
  function applyDetails() {
    var open = opt('details') === 'open';
    [].forEach.call(document.querySelectorAll('[data-detail]'), function (d) { d.open = open; });
  }
  applyDetails();
  window.addEventListener('kr:opt', function (e) { if (e.detail.key === 'details') applyDetails(); });

  /* ─── geo data, fetched once ─── */
  var geoP = fetch('../../../assets/map/panjab-geo.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });

  /* ═══════════ Research map ═══════════ */
  var mapEl = $('[data-map-el]');
  function drawMap(geo) {
    var svg = el('svg', { viewBox: '-20 -10 1080 1190', 'aria-hidden': 'true', focusable: 'false' });
    var live = document.createElement('p');
    live.className = 'sr-only'; live.setAttribute('aria-live', 'polite');
    var gD = el('g', {}, svg), gR = el('g', {}, svg), gL = el('g', {}, svg), gC = el('g', {}, svg);
    var cityByName = {};
    geo.cities.forEach(function (c) {
      var g = el('g', { 'class': 'city' }, gC);
      el('circle', { cx: c.x, cy: c.y, r: 6 }, g);
      var left = c.x > 900;
      var tx = el('text', { x: c.x + (left ? -12 : 12), y: c.y - 9, 'text-anchor': left ? 'end' : 'start' }, g);
      tx.textContent = c.name;
      cityByName[c.name] = g;
    });
    var items = Object.keys(geo.districts).map(function (name) {
      var d = geo.districts[name];
      var p = el('path', { d: d.d, 'class': 'district' }, gD);
      var lab = null; // one name per place: a district sharing a city's name reuses the city label
      if (!cityByName[name]) { lab = el('text', { x: d.lx, y: d.ly, 'class': 'd-label', 'text-anchor': 'middle' }, gL); lab.textContent = name; }
      return { name: name, path: p, label: lab || cityByName[name], cx: d.cx };
    }).sort(function (a, b) { return a.cx - b.cx; });
    var riverEls = {};
    geo.rivers.forEach(function (r) {
      el('path', { d: r.d, 'class': 'r-bed' }, gR);
      (riverEls[r.name] = riverEls[r.name] || []).push(el('path', { d: r.d, 'class': 'river', 'data-river': r.name }, gR));
    });
    mapEl.appendChild(svg);
    mapEl.parentNode.appendChild(live);
    var current = -1;
    function on(i) {
      items.forEach(function (it, j) { var v = i === j; it.path.classList.toggle('is-on', v); it.label.classList.toggle('is-on', v); });
      current = i; live.textContent = i >= 0 ? items[i].name : '';
    }
    items.forEach(function (it, i) { it.path.addEventListener('mouseenter', function () { on(i); }); });
    gD.addEventListener('mouseleave', function () { on(-1); });
    mapEl.addEventListener('keydown', function (e) {
      var n = items.length;
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); on((current + 1) % n); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); on(current <= 0 ? n - 1 : current - 1); }
      else if (e.key === 'Escape') on(-1);
    });
    mapEl.addEventListener('blur', function () { on(-1); });
    [].forEach.call(document.querySelectorAll('.key__rivers li'), function (li) {
      var name = li.getAttribute('data-river');
      li.addEventListener('mouseenter', function () { (riverEls[name] || []).forEach(function (p) { p.classList.add('is-on'); }); });
      li.addEventListener('mouseleave', function () { (riverEls[name] || []).forEach(function (p) { p.classList.remove('is-on'); }); });
    });
  }
  if (mapEl) geoP.then(drawMap).catch(function () {
    var img = document.createElement('img');
    img.src = '../../../assets/map/panjab-map-stitched-on-indigo.svg'; img.alt = '';
    mapEl.appendChild(img);
  });

  /* ═══════════ hero rivers ═══════════
     R5.rivers({ host, svg, place(W, H) → { x, y, w, h }, from: 'top' | 'none', motes })
     place() returns the box (in host px) the Panjab river network is fitted into. */
  function riverPoints(d) {
    var nums = d.match(/-?\d+(\.\d+)?/g).map(Number), pts = [];
    for (var i = 0; i + 1 < nums.length; i += 2) pts.push([nums[i], nums[i + 1]]);
    return pts;
  }
  function Motes(group, paths, count, r, speed) {
    this.tracks = paths.map(function (p) { return { p: p, len: p.getTotalLength() }; }).filter(function (t) { return t.len > 10; });
    this.m = [];
    for (var i = 0; i < count; i++) {
      var m = { c: el('circle', { r: r, 'class': 'mote', fill: 'url(#mote)', opacity: 0 }, group) };
      this.m.push(m); this.spawn(m, true, r, speed);
    }
    this.r = r; this.speed = speed;
  }
  Motes.prototype.spawn = function (m, initial, r, speed) {
    m.t = this.tracks[(Math.random() * this.tracks.length) | 0];
    m.L = Math.random() * m.t.len;
    m.v = (speed || this.speed)[0] + Math.random() * ((speed || this.speed)[1] - (speed || this.speed)[0]);
    m.life = 5 + Math.random() * 6; m.age = initial ? Math.random() * m.life * .6 : 0;
    m.c.setAttribute('r', ((r || this.r) * (.6 + Math.random() * .7)).toFixed(2));
  };
  Motes.prototype.step = function (dt) {
    for (var i = 0; i < this.m.length; i++) {
      var m = this.m[i];
      m.age += dt; m.L += m.v * dt;
      var t = m.age / m.life;
      if (t >= 1 || m.L >= m.t.len) { this.spawn(m); continue; }
      var p = m.t.p.getPointAtLength(m.L), a = Math.sin(Math.PI * t);
      m.c.setAttribute('cx', p.x.toFixed(1)); m.c.setAttribute('cy', p.y.toFixed(1));
      m.c.setAttribute('opacity', (a * a * .95).toFixed(3));
    }
  };

  function rivers(o) {
    var state = { raf: 0, motes: null, visible: true, drawn: false };
    if ('IntersectionObserver' in window) new IntersectionObserver(function (es) {
      state.visible = es[0].isIntersecting; if (state.visible) loop();
    }).observe(o.host);
    var last = 0;
    function loop() {
      if (state.raf || reduce || !state.motes || !state.visible || opt('water') !== 'flow') return;
      last = performance.now();
      state.raf = requestAnimationFrame(function f(now) {
        state.raf = 0;
        if (!state.visible || opt('water') !== 'flow') return;
        state.motes.step(Math.min(.05, (now - last) / 1000) * (+opt('speed') || 1)); last = now;
        state.raf = requestAnimationFrame(f);
      });
    }
    function build(geo, animate) {
      var W = o.host.clientWidth, H = o.host.clientHeight;
      if (!W || !H) return;
      o.svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      o.svg.innerHTML = '';
      if (opt('water') === 'off') return;
      var box = o.place(W, H), s = Math.min(box.w / 1040, box.h / 1180);
      var ox = box.x + (box.w - 1040 * s) / 2, oy = box.y + (box.h - 1180 * s) / 2;
      var pick = {};
      geo.rivers.forEach(function (r) { if (!pick[r.name] || r.d.length > pick[r.name].d.length) pick[r.name] = r; });
      var ds = ['Ravi', 'Beas', 'Sutlej'].map(function (name) {
        var pts = riverPoints(pick[name].d).map(function (p) { return [ox + p[0] * s, oy + p[1] * s]; });
        var d = '';
        if (o.from === 'top') { // led in from the top edge of the hero
          var x0 = pts[0][0], y0 = pts[0][1];
          d = 'M' + x0.toFixed(1) + ' -4 C' + x0.toFixed(1) + ' ' + (y0 * .6).toFixed(1) + ' ' + x0.toFixed(1) + ' ' + (y0 - 20).toFixed(1) + ' ' + x0.toFixed(1) + ' ' + y0.toFixed(1);
        } else d = 'M' + pts[0][0].toFixed(1) + ' ' + pts[0][1].toFixed(1);
        for (var i = 1; i < pts.length; i++) d += 'L' + pts[i][0].toFixed(1) + ' ' + pts[i][1].toFixed(1);
        return d;
      });
      var lines = ds.map(function (d) {
        return { glow: el('path', { d: d, 'class': 'r-glow' }, o.svg), line: el('path', { d: d, 'class': 'r-line' }, o.svg) };
      });
      lines.forEach(function (l, i) { l.line.setAttribute('data-river', ['Ravi', 'Beas', 'Sutlej'][i]); });
      var mg = el('g', {}, o.svg);
      state.motes = new Motes(mg, lines.map(function (l) { return l.line; }), o.motes || (W < 700 ? 10 : 18), o.r || 3.4, o.speed || [16, 30]);
      if (animate && !reduce && opt('water') !== 'still') {
        // draw in once, easing out, rivers staggered
        lines.forEach(function (l, i) {
          var len = l.line.getTotalLength();
          [l.glow, l.line].forEach(function (p) { p.style.strokeDasharray = len + ' ' + len; p.style.strokeDashoffset = len; });
          l.len = len; l.delay = i * 320;
        });
        mg.style.opacity = 0;
        var t0 = performance.now(), dur = 2600;
        (function f(now) {
          var done = true;
          lines.forEach(function (l) {
            var t = (now - t0 - l.delay) / dur; if (t < 1) done = false;
            var off = (l.len * (1 - easeOut(t))).toFixed(1);
            l.line.style.strokeDashoffset = l.glow.style.strokeDashoffset = off;
          });
          if (!done) requestAnimationFrame(f);
          else { mg.style.transition = 'opacity 1.2s'; mg.style.opacity = 1; state.drawn = true; loop(); }
        })(t0);
      } else { state.drawn = true; loop(); }
    }
    geoP.then(function (geo) {
      build(geo, true);
      window.addEventListener('resize', debounce(function () { build(geo, false); }, 200));
      window.addEventListener('kr:opt', function (e) { if (e.detail.key === 'water') build(geo, e.detail.value !== 'still'); });
      window.addEventListener('kr:replay', function () { build(geo, true); });
    }).catch(function () {});
  }

  /* ═══════════ section colours & fonts (see sections.js) ═══════════ */
  var KS = window.KR_SECTIONS, CFG = window.KR_CONFIG || { options: [] };
  if (KS) {
    var cfgOpt = {};
    CFG.options.forEach(function (o) { if (o.key) cfgOpt[o.key] = o; });
    var loaded = {};
    var loadFont = function (f) {
      if (!f || !f.g || loaded[f.g]) return;
      loaded[f.g] = 1;
      var l = document.createElement('link'); l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=' + f.g + '&display=swap';
      document.head.appendChild(l);
    };
    var paintSection = function (sec) {
      var o = cfgOpt['bg-' + sec], els = document.querySelectorAll(KS.SECTIONS[sec].sel);
      if (o) {
        var v = opt('bg-' + sec, o.def);
        if (v === 'hero') v = opt('bg-hero', (cfgOpt['bg-hero'] || {}).def);
        var p = KS.PALETTE[v];
        [].forEach.call(els, function (e) {
          if (!p || v === o.orig) { e.removeAttribute('data-tone'); e.removeAttribute('data-bg'); e.style.removeProperty('--sec-bg'); }
          else { e.setAttribute('data-tone', p.tone); e.setAttribute('data-bg', v); e.style.setProperty('--sec-bg', p.hex); }
        });
      }
      var fo = cfgOpt['font-' + sec];
      if (fo) {
        var f = KS.FONTS[opt('font-' + sec, fo.def)];
        loadFont(f);
        [].forEach.call(els, function (e) {
          if (!f || opt('font-' + sec, fo.def) === 'spectral') { e.removeAttribute('data-hfont'); e.style.removeProperty('--f-head'); }
          else { e.setAttribute('data-hfont', ''); e.style.setProperty('--f-head', f.css); }
        });
      }
    };
    var paintGlobal = function () {
      var main = document.querySelector('main'), ftr = document.querySelector('.ftr');
      [['font-body', KS.BODY_FONTS, '--f-body', 'data-bfont'], ['font-pa', KS.PA_FONTS, '--f-pa', 'data-pafont']].forEach(function (g) {
        var o = cfgOpt[g[0]]; if (!o) return;
        var v = opt(g[0], o.def), f = g[1][v];
        loadFont(f);
        [main, ftr].forEach(function (e) {
          if (!e) return;
          if (!f || v === o.def) { e.style.removeProperty(g[2]); e.removeAttribute(g[3]); }
          else { e.style.setProperty(g[2], f.css); e.setAttribute(g[3], ''); }
        });
      });
    };
    var paintAll = function () { Object.keys(KS.SECTIONS).forEach(paintSection); paintGlobal(); };
    paintAll();
    window.addEventListener('kr:opt', function (e) {
      var k = e.detail.key;
      if (/^(bg|font)-/.test(k)) paintAll(); // footer can follow the hero, so repaint all
    });
  }

  window.R5 = { rivers: rivers, el: el, reduce: reduce };
})();
