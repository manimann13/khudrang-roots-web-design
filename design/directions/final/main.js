/* ═══════════ Hero artwork ═══════════
   A band of mustard (sarson) plants along the bottom of the hero, drawn with a seeded random so
   the drawing is the same on every load. Colours live in styles.css (.hero__art). */
(function () {
  'use strict';
  var hero = document.querySelector('.hero'), svg = hero.querySelector('[data-hero-art]'), el = R5.el;
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  function flower(g, x, y, r, rot) { // four round petals, like the sprig in the logo
    var f = el('g', { transform: 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + rot.toFixed(0) + ')' }, g);
    for (var i = 0; i < 4; i++) el('ellipse', { cx: 0, cy: -r * .9, rx: r * .62, ry: r, transform: 'rotate(' + (i * 90) + ')', 'class': 'a2 petal' }, f);
    el('circle', { cx: 0, cy: 0, r: r * .38, 'class': 'a1f eye' }, f);
  }
  /* sarson fills the gap under the card and photos: at each x, plants grow up to just below whatever
     sits above them (the card or a photo), so they never run into a photo. Heights are mixed, short
     and tall, inside that space. Each plant is its own <g> so it can sway with the mouse (below). */
  var plants = [];
  function ceilingAt(H) {
    var hr = hero.getBoundingClientRect(), boxes = [];
    [].forEach.call(hero.querySelectorAll('.hero__card, .hero__photo'), function (n) {
      if (n.offsetParent === null) return;
      var r = n.getBoundingClientRect(); boxes.push([r.left - hr.left - 8, r.right - hr.left + 8, r.bottom - hr.top + 16]);
    });
    return function (x) {
      var c = H * .42;                                   // never taller than this
      boxes.forEach(function (b) { if (x > b[0] && x < b[1]) c = Math.max(c, b[2]); });
      return Math.min(c, H - 40);
    };
  }
  function sarson(W, H, R) {
    var g = el('g', {}, svg), step = W < 700 ? 10 : 12, ceil = ceilingAt(H);
    plants = [];
    for (var x = -10; x < W + 10; x += step * (.7 + R() * .6)) {
      var room = Math.min(H - ceil(x), W < 700 ? 120 : 190); // space below whatever is above, capped so none get too long
      var r = R(), mix = r < .35 ? .35 + R() * .2 : r < .8 ? .55 + R() * .2 : .78 + R() * .22; // short, medium, tall
      var h = Math.max(34, room * mix);
      var lean = (R() - .5) * 22, top = H - h;
      var pg = el('g', { 'class': 'plant' }, g);
      el('path', { d: 'M' + x.toFixed(1) + ' ' + (H + 4) + ' Q' + (x + lean * .3).toFixed(1) + ' ' + (H - h * .5).toFixed(1) + ' ' + (x + lean).toFixed(1) + ' ' + top.toFixed(1), 'class': 'a1 stem' }, pg);
      if (R() < .5) { // a leaf
        var ly = H - h * (.25 + R() * .3), s = R() < .5 ? -1 : 1;
        el('path', { d: 'M' + (x + lean * .15).toFixed(1) + ' ' + ly.toFixed(1) + ' q' + (s * 12) + ' -10 ' + (s * 22) + ' -4 q' + (s * -10) + ' 6 ' + (s * -22) + ' 4z', 'class': 'a1f leaf' }, pg);
      }
      var n = 2 + (R() * 4 | 0);
      for (var i = 0; i < n; i++) flower(pg, x + lean + (R() - .5) * 16, top + (R() - .3) * 14, 3.2 + R() * 2.6, R() * 90);
      plants.push({ g: pg, x: x, h: h, cur: 0, tgt: 0 });
    }
  }
  function draw() {
    var W = hero.clientWidth, H = hero.clientHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.innerHTML = '';
    sarson(W, H, rng(7));
  }
  draw();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw); // plants fit under the card, whose size depends on fonts
  window.addEventListener('load', draw);
  var t; window.addEventListener('resize', function () { clearTimeout(t); t = setTimeout(draw, 200); });

  /* the flowers right around the mouse lean gently away from it and ease back; flowers further
     away don't move. TWEAK: REACH (px around the pointer), LEAN (max degrees). Off for touch and reduced motion. */
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !window.matchMedia('(hover: hover)').matches) return;
  var REACH = 50, LEAN = 5, raf = 0;
  function tick() {
    var moving = false, H = hero.clientHeight;
    plants.forEach(function (p) {
      p.cur += (p.tgt - p.cur) * .1;
      if (Math.abs(p.tgt - p.cur) > .02) moving = true;
      p.g.setAttribute('transform', 'rotate(' + p.cur.toFixed(2) + ' ' + p.x.toFixed(1) + ' ' + H + ')');
    });
    raf = moving ? requestAnimationFrame(tick) : 0;
  }
  function kick() { if (!raf) raf = requestAnimationFrame(tick); }
  hero.addEventListener('pointermove', function (e) {
    var r = hero.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top, H = r.height;
    plants.forEach(function (p) {
      var d = p.x - mx, near = Math.abs(d) > REACH * 2 ? 0 : Math.exp(-(d * d) / (2 * REACH * REACH));
      var among = my > H - p.h - 30 ? 1 : 0;           // only when the pointer is down among the flowers
      p.tgt = (d >= 0 ? 1 : -1) * LEAN * near * among;
    });
    kick();
  });
  hero.addEventListener('pointerleave', function () { plants.forEach(function (p) { p.tgt = 0; }); kick(); });
})();

/* ═══════════ Hero photos open full size ═══════════
   Each hero photo becomes a button. Clicking grows the photo out of its spot on the page into a
   stitched frame in the middle of the screen (and shrinks it back on close). Esc, the × or a click
   on the dark backdrop closes it; focus returns to the photo. Reduced motion: no grow, just appear. */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var dlg = document.createElement('dialog');
  dlg.className = 'lightbox';
  dlg.setAttribute('aria-label', 'Photo');
  dlg.innerHTML = '<figure class="lightbox__frame"><img alt=""><button class="lightbox__close" type="button" aria-label="Close photo">×</button></figure>';
  document.body.appendChild(dlg);
  var frame = dlg.querySelector('.lightbox__frame'), big = dlg.querySelector('img'), opener = null, thumb = null, closing = false;
  var EASE = 'cubic-bezier(.22, 1, .36, 1)';

  function flip(fromRect, reverse) { // animate the frame between the thumbnail's box and its own box
    var to = frame.getBoundingClientRect();
    var sx = fromRect.width / to.width, sy = fromRect.height / to.height;
    var dx = fromRect.left + fromRect.width / 2 - (to.left + to.width / 2), dy = fromRect.top + fromRect.height / 2 - (to.top + to.height / 2);
    var rot = (thumb && parseFloat(getComputedStyle(thumb).getPropertyValue('--r'))) || 0;
    var small = 'translate(' + dx + 'px,' + dy + 'px) scale(' + sx + ',' + sy + ') rotate(' + rot + 'deg)';
    var kf = [{ transform: small, opacity: .6 }, { transform: 'none', opacity: 1 }];
    return frame.animate(reverse ? kf.slice().reverse() : kf, { duration: reverse ? 320 : 480, easing: EASE, fill: 'both' });
  }
  function close() {
    if (closing || !dlg.open) return;
    closing = true;
    var done = function () { closing = false; dlg.close(); frame.getAnimations().forEach(function (a) { a.cancel(); }); };
    dlg.classList.remove('is-open');
    if (reduce || !thumb) return done();
    flip(thumb.getBoundingClientRect(), true).finished.then(done, done);
  }
  dlg.querySelector('.lightbox__close').addEventListener('click', close);
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); }); // Esc animates out too
  dlg.addEventListener('close', function () { if (opener) opener.focus(); });

  [].forEach.call(document.querySelectorAll('.hero__photo img'), function (img) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'zoom';
    b.setAttribute('aria-label', 'Open photo: ' + img.alt);
    img.parentNode.insertBefore(b, img); b.appendChild(img);
    b.addEventListener('click', function () {
      opener = b; thumb = b.closest('.hero__photo');
      big.alt = img.alt;
      var full = img.src.replace('-800.webp', '-1400.webp');
      var show = function () {
        dlg.showModal();
        requestAnimationFrame(function () { dlg.classList.add('is-open'); });
        if (!reduce) flip(thumb.getBoundingClientRect(), false);
      };
      big.src = img.src;                                   // start with the copy already loaded
      if (big.decode) big.decode().then(show, show); else show();
      var hi = new Image(); hi.onload = function () { if (dlg.open) big.src = full; }; hi.src = full;
    });
  });
})();

/* ═══════════ Dividers between sections ═══════════
   A thin element is slipped between each pair of sections (and before the footer); styles.css
   draws a torn-paper edge on it in the colour of the section above. */
(function () {
  'use strict';
  var main = document.querySelector('main');
  var kids = [].slice.call(main.children).filter(function (n) { return /^(SECTION|DIV)$/.test(n.tagName); });
  kids.forEach(function (n, i) {
    var next = kids[i + 1];
    if (!next || n.classList.contains('runner') || next.classList.contains('runner')) return; // partners→team already has its stitched runner
    var d = document.createElement('div'); d.className = 'divider'; d.setAttribute('aria-hidden', 'true');
    n.after(d);
  });
  var f = document.createElement('div'); f.className = 'divider'; f.setAttribute('aria-hidden', 'true');
  main.after(f);
})();

/* No right-click "Save / Copy image" and no dragging on photos or the big ਸੇਵਾ. */
(function () {
  'use strict';
  var guarded = function (t) { return t.closest && t.closest('img, picture, .seva__word, .lightbox__frame'); };
  ['contextmenu', 'dragstart', 'copy'].forEach(function (ev) {
    document.addEventListener(ev, function (e) { if (guarded(e.target)) e.preventDefault(); });
  });
})();

/* Dividers: give each one the colour of the section above it (edge styles paint with it). */
(function () {
  'use strict';
  [].forEach.call(document.querySelectorAll('.divider'), function (d) {
    var up = d.previousElementSibling || (d.parentNode === document.body ? document.querySelector('main').lastElementChild : null);
    if (d.previousElementSibling && d.previousElementSibling.tagName === 'MAIN') up = d.previousElementSibling.lastElementChild;
    while (up && up.classList.contains('divider')) up = up.previousElementSibling;
    if (up) d.style.setProperty('--up', getComputedStyle(up).backgroundColor);
    // under the hero the tear goes the other way: the next section's paper tears up over the flower stems
    if (up && up.classList.contains('hero') && d.nextElementSibling) {
      d.classList.add('divider--rise'); d.style.setProperty('--up', getComputedStyle(d.nextElementSibling).backgroundColor);
    }
  });
})();
