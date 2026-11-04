(() => {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const body = document.body;
  let vh = innerHeight, vw = innerWidth;

  /* =========================================================
     One loop drives everything: Lenis, scroll effects, cursor.
     rAF follows the display's refresh rate (120Hz on ProMotion),
     and every scroll effect reads cached numbers only (no layout
     reads per frame), so frames stay well inside the 8ms budget.
     ========================================================= */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 1 }); // touch stays native
  }
  const scrollPos = () => lenis ? lenis.scroll : scrollY;
  let dirty = true, cursorActive = false, last = performance.now();
  const loop = t => {
    const dt = Math.min(64, t - last); last = t;
    if (lenis) lenis.raf(t);
    if (dirty) { dirty = false; applyScroll(scrollPos()); }
    if (cursorActive) stepCursor(dt);
    requestAnimationFrame(loop);
  };
  if (lenis) lenis.on('scroll', () => { dirty = true; });
  addEventListener('scroll', () => { dirty = true; }, { passive: true });

  const goTo = el => lenis ? lenis.scrollTo(el, { offset: 0 }) : (el === 0 ? scrollTo(0, 0) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- split headings into words ---------- */
  let wi = 0;
  const splitNode = node => {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
          const w = document.createElement('span'); w.className = 'w';
          const inner = document.createElement('span'); inner.style.setProperty('--i', wi++); inner.textContent = part;
          w.appendChild(inner); frag.appendChild(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1 && !/^(IMG|SVG|BR|svg)$/.test(n.tagName)) splitNode(n);
    });
  };
  $$('[data-split]').forEach(h => { wi = 0; h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim()); splitNode(h); });

  /* ---------- menu ---------- */
  const menuBtns = [$('#menuBtn'), $('#menuBtn2')];
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    menuBtns.forEach(b => b && b.setAttribute('aria-expanded', open));
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  menuBtns.forEach(b => b && b.addEventListener('click', () => setMenu(!body.classList.contains('menu-open'))));
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? 0 : $(id);
    if (el === null) return;
    e.preventDefault(); setMenu(false); goTo(el);
  }));

  /* ---------- preloader + hero intro ---------- */
  const pre = $('#pre'), h1 = $('#h1'), sticker = $('#hsticker');
  let introDone = false;
  const intro = () => {
    if (introDone) return; introDone = true;
    pre && pre.classList.add('done');
    setTimeout(() => {
      h1 && h1.classList.add('in');
      $$('.hero .rv, .hero .draw').forEach(el => el.classList.add('in'));
      if (sticker && !reduce) { setTimeout(() => sticker.classList.add('on'), 1600); setTimeout(() => sticker.classList.remove('on'), 3800); }
    }, reduce ? 0 : 450);
  };
  const seen = (() => { try { const s = sessionStorage.getItem('kk-seen'); sessionStorage.setItem('kk-seen', '1'); return !!s; } catch { return false; } })();
  if (reduce || seen) { if (pre) pre.style.display = 'none'; intro(); }
  else addEventListener('load', () => setTimeout(intro, 1200));
  setTimeout(intro, 3500);

  /* ---------- reveal on view ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target; el.classList.add('in');
    if (el.classList.contains('gal')) $$('img', el).forEach(i => i.classList.add('dev'));
    io.unobserve(el);
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.rv, .draw, .gal, [data-split], .reveal-img').forEach(el => { if (!el.closest('.hero')) io.observe(el); });

  /* ---------- cached measurements ---------- */
  const prog = $('#prog'), mprog = $('#mprog'), mbar = $('#mbar');
  const para = $$('[data-speed]').map(el => ({ el, k: parseFloat(el.dataset.speed) }));
  const darkEls = $$('[data-dark]');
  const pin = $('#featPin'), track = $('#featTrack'), featBar = $('#featBar');
  const panelImgs = $$('.panel .ph:not(.contain):not(.split) img');
  const curveFig = $('.curve'), curvePath = $('#curve .line'), curveDot = $('#curveDot'), curvePts = $$('#curve .pts circle');
  const horiz = () => !reduce && matchMedia('(min-width: 901px)').matches;
  const M = { docH: 0, heroH: 0, darks: [], feat: null, panels: [], curve: null };

  const absTop = el => { let y = 0; while (el) { y += el.offsetTop; el = el.offsetParent; } return y; };
  function measure() {
    vh = innerHeight; vw = innerWidth;
    // featured height first: it changes the page length
    if (pin && track) {
      if (horiz()) {
        const dist = Math.max(0, track.scrollWidth - track.parentElement.clientWidth);
        pin.style.setProperty('--feat-h', (vh + dist) + 'px');
        M.feat = { top: absTop(pin), h: vh + dist, dist };
        M.panels = panelImgs.map(img => { const p = img.closest('.panel'); return { img, x: p.offsetLeft, w: p.offsetWidth }; });
      } else { pin.style.removeProperty('--feat-h'); track.style.transform = ''; M.feat = null; panelImgs.forEach(i => i.style.transform = ''); }
    }
    M.docH = document.documentElement.scrollHeight;
    M.heroH = ($('.hero') || {}).offsetHeight || vh;
    M.darks = darkEls.map(d => { const t = absTop(d); return [t, t + d.offsetHeight]; });
    if (curveFig && curvePath) {
      const len = curvePath.getTotalLength();
      // where along the line each marker sits (0..1), so markers light up as the pen passes them
      const samples = [];
      for (let i = 0; i <= 240; i++) { const pt = curvePath.getPointAtLength(len * i / 240); samples.push([i / 240, pt.x, pt.y]); }
      const marks = curvePts.map(c => {
        const cx = +c.getAttribute('cx'), cy = +c.getAttribute('cy');
        let best = 0, bd = 1e9; samples.forEach(([f, x, y]) => { const d = (x - cx) ** 2 + (y - cy) ** 2; if (d < bd) { bd = d; best = f; } });
        return best;
      });
      M.curve = { top: absTop(curveFig), h: curveFig.offsetHeight, len, marks };
    }
    lastFP = lastCP = lastP = -1; dirty = true;
  }

  /* ---------- scroll effects (cached values only) ---------- */
  let lastY = 0, onDark = false, lastFP = -1, lastCP = -1, lastHide = null, lastP = -1;
  function applyScroll(y) {
    const max = M.docH - vh, p = max > 0 ? clamp(y / max, 0, 1) : 0;
    if (Math.abs(p - lastP) > .0005) { lastP = p; if (prog) prog.style.transform = `scaleY(${p.toFixed(4)})`; if (mprog) mprog.style.transform = `scaleX(${p.toFixed(4)})`; }

    const mid = y + vh / 2;
    const d = M.darks.some(([a, b]) => mid > a && mid < b);
    if (d !== onDark) { onDark = d; body.classList.toggle('on-dark', d); }

    if (!reduce && y < M.heroH) para.forEach(({ el, k }) => el.style.transform = `translate3d(0,${(y * k).toFixed(1)}px,0)`);

    const hide = y > lastY + 2 && y > 300 && !body.classList.contains('menu-open') && !sheetOpen;
    if (mbar && Math.abs(y - lastY) > 2 && hide !== lastHide) { lastHide = hide; mbar.classList.toggle('hide', hide); }
    lastY = y;

    if (M.feat) {
      const f = M.feat, fp = clamp((y - f.top) / (f.h - vh || 1), 0, 1), tx = f.dist * fp;
      if (fp !== lastFP) { lastFP = fp;
      track.style.transform = `translate3d(${(-tx).toFixed(1)}px,0,0)`;
      featBar.parentElement.style.setProperty('--p', fp.toFixed(4));
      M.panels.forEach(({ img, x, w }) => {
        const rel = clamp((x + w / 2 - tx - vw / 2) / vw, -1, 1);
        img.style.transform = `translate3d(${(rel * -5).toFixed(2)}%,0,0)`;
      });
      }
    }

    if (M.curve) {
      const c = M.curve, cp = reduce ? 1 : clamp((y + vh * 0.85 - c.top) / (vh * 0.55), 0, 1);
      if (cp !== lastCP) { lastCP = cp;
      curvePath.style.setProperty('--draw', (1 - cp).toFixed(4));
      const pt = curvePath.getPointAtLength(c.len * cp);
      curveDot.setAttribute('cx', pt.x.toFixed(1)); curveDot.setAttribute('cy', pt.y.toFixed(1));
      curveDot.style.opacity = cp > 0.001 && cp < 0.999 ? 1 : 0;
      curvePts.forEach((el, i) => el.classList.toggle('on', cp >= c.marks[i] - 0.01));
      }
    }
  }

  /* ---------- custom cursor ---------- */
  const cur = document.createElement('div'); cur.className = 'cursor'; cur.setAttribute('aria-hidden', 'true');
  cur.innerHTML = '<span></span>'; const curLabel = cur.firstChild;
  let mx = -100, my = -100, cx = -100, cy = -100;
  function stepCursor(dt) {
    const k = 1 - Math.pow(1 - 0.28, dt / 16.67); // same feel at 60Hz and 120Hz
    cx += (mx - cx) * k; cy += (my - cy) * k;
    cur.style.transform = `translate3d(${cx.toFixed(1)}px,${cy.toFixed(1)}px,0)`;
    if (Math.abs(mx - cx) < .1 && Math.abs(my - cy) < .1) cursorActive = false;
  }
  if (fine && !reduce) {
    body.appendChild(cur);
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mx = e.clientX; my = e.clientY; cursorActive = true;
      if (!cur.classList.contains('on')) { cx = mx; cy = my; cur.classList.add('on'); }
    }, { passive: true });
    document.addEventListener('mouseleave', () => cur.classList.remove('on'));
    document.addEventListener('mouseover', e => {
      const lab = e.target.closest('[data-cursor]');
      if (lab && !(lab.classList.contains('clip') && !matchMedia('(min-width: 901px)').matches)) {
        curLabel.textContent = lab.dataset.cursor; cur.classList.add('label'); cur.classList.remove('link'); return;
      }
      cur.classList.remove('label');
      cur.classList.toggle('link', !!e.target.closest('a, button, [role="button"], .chip'));
    });
  }

  /* ---------- magnetic + tilt (mouse only) ---------- */
  if (fine && !reduce) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${(dx * .22).toFixed(1)}px,${(dy * .3).toFixed(1)}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        el.style.setProperty('--rx', (-y * 8).toFixed(2) + 'deg');
        el.style.setProperty('--ry', (x * 10).toFixed(2) + 'deg');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
    });
  }

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), lbImg = $('#lbImg');
  const openLB = (src, alt) => { lbImg.src = src; lbImg.alt = alt || ''; lb.classList.add('open'); $('#lbClose').focus(); };
  const closeLB = () => lb.classList.remove('open');
  lb.addEventListener('click', closeLB);

  /* ---------- media board: drag with a mouse, tap/click to open ---------- */
  const canDrag = () => fine && matchMedia('(min-width: 901px)').matches;
  let z = 10;
  $$('#board .clip').forEach(clip => {
    clip.tabIndex = 0; clip.setAttribute('role', 'button');
    clip.setAttribute('aria-label', 'Open ' + ($('img', clip).alt || 'clipping'));
    let sx = 0, sy = 0, ox = 0, oy = 0, down = false, moved = false;
    const base = getComputedStyle(clip).transform, baseT = base === 'none' ? '' : base;
    clip.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || !canDrag()) return;
      down = true; moved = false; sx = e.clientX - ox; sy = e.clientY - oy;
      clip.style.zIndex = ++z; clip.setPointerCapture(e.pointerId); clip.classList.add('dragging');
    });
    clip.addEventListener('pointermove', e => {
      if (!down) return;
      const nx = e.clientX - sx, ny = e.clientY - sy;
      if (Math.abs(nx - ox) + Math.abs(ny - oy) > 2) moved = true;
      ox = nx; oy = ny;
      clip.style.transform = `translate(${ox}px,${oy}px) ${baseT} scale(1.03)`;
    });
    const end = () => { if (!down) return; down = false; clip.classList.remove('dragging'); clip.style.transform = `translate(${ox}px,${oy}px) ${baseT}`; };
    clip.addEventListener('pointerup', end);
    clip.addEventListener('pointercancel', end);
    clip.addEventListener('click', () => { if (moved) { moved = false; return; } openLB(clip.dataset.full, $('img', clip).alt); });
    clip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(clip.dataset.full, $('img', clip).alt); } });
  });

  /* ---------- work filters ---------- */
  const rows = $$('.row');
  $$('.chip').forEach(ch => ch.addEventListener('click', () => {
    $$('.chip').forEach(c => c.setAttribute('aria-pressed', c === ch));
    const f = ch.dataset.filter;
    rows.forEach(r => r.hidden = !(f === 'all' || r.dataset.cat === f));
    measure();
  }));

  /* ---------- hover preview on the work list ---------- */
  const pv = $('#preview');
  if (fine && pv && !reduce) {
    const imgs = {};
    rows.forEach(r => { const src = $('button', r).dataset.img; const im = new Image(); im.decoding = 'async'; im.src = src; im.alt = ''; pv.appendChild(im); imgs[src] = im; });
    let x = 0, y = 0, px = 0, py = 0, on = false, lt = 0;
    const tick = t => {
      const k = 1 - Math.pow(1 - .14, Math.min(64, t - (lt || t)) / 16.67 || 1); lt = t;
      px += (x - px) * k; py += (y - py) * k;
      pv.style.transform = `translate3d(${px.toFixed(1)}px,${py.toFixed(1)}px,0) translate(-50%,-50%) rotate(-3deg)`;
      if (on) requestAnimationFrame(tick);
    };
    rows.forEach(r => { const b = $('button', r);
      b.addEventListener('mouseenter', e => {
        Object.values(imgs).forEach(i => i.classList.remove('cur')); imgs[b.dataset.img].classList.add('cur');
        if (!on) { px = x = e.clientX + 170; py = y = e.clientY; on = true; lt = 0; requestAnimationFrame(tick); }
        pv.classList.add('on');
      });
      b.addEventListener('mousemove', e => { x = e.clientX + 170; y = e.clientY; });
    });
    $('#index').addEventListener('mouseleave', () => { pv.classList.remove('on'); on = false; });
  }

  /* ---------- case sheet ---------- */
  const sheet = $('#sheet'), sbody = $('#sheetBody');
  const order = rows.map(r => $('button', r).dataset.case);
  let sheetOpen = false, current = null, lastFocus = null;
  function openCase(id, push = true) {
    const tpl = $('#case-' + id); if (!tpl) return;
    current = id;
    sbody.innerHTML = ''; sbody.appendChild(tpl.content.cloneNode(true)); sbody.scrollTop = 0;
    $$('.case-media figure', sbody).forEach(f => { f.dataset.cursor = 'View'; f.addEventListener('click', () => { const i = $('img', f); openLB(i.src, i.alt); }); });
    if (!sheetOpen) {
      lastFocus = document.activeElement; sheetOpen = true;
      sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
      if (lenis) lenis.stop(); body.style.overflow = 'hidden';
    }
    setTimeout(() => $('.sheet-bar [data-close]').focus(), 60);
    if (push) history.replaceState(null, '', '#case/' + id);
  }
  function closeCase() {
    if (!sheetOpen) return; sheetOpen = false;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    if (lenis) lenis.start(); body.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    lastFocus && lastFocus.focus();
  }
  const step = d => { const i = order.indexOf(current); openCase(order[(i + d + order.length) % order.length]); };
  $$('[data-case]').forEach(b => b.addEventListener('click', () => openCase(b.dataset.case)));
  $$('[data-close]', sheet).forEach(b => b.addEventListener('click', closeCase));
  $('#prevCase').addEventListener('click', () => step(-1));
  $('#nextCase').addEventListener('click', () => step(1));
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (lb.classList.contains('open')) return closeLB(); if (sheetOpen) return closeCase(); setMenu(false); }
    if (sheetOpen && !lb.classList.contains('open')) { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }
    if (sheetOpen && e.key === 'Tab') {
      const f = $$('button, a[href], [tabindex="0"]', sheet).filter(el => el.offsetParent);
      if (!f.length) return; const first = f[0], lastF = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastF.focus(); }
      else if (!e.shiftKey && document.activeElement === lastF) { e.preventDefault(); first.focus(); }
    }
  });
  const hm = location.hash.match(/^#case\/([\w-]+)/); if (hm) openCase(hm[1], false);

  /* ---------- copy buttons ---------- */
  $$('.cpy').forEach(b => b.addEventListener('click', async () => {
    const t = $('#' + b.dataset.copy).textContent.trim();
    try { await navigator.clipboard.writeText(t); b.textContent = 'Copied'; } catch { b.textContent = 'Select it'; }
    setTimeout(() => b.textContent = 'Copy', 1800);
  }));

  /* ---------- go ---------- */
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(measure, 120); });
  addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  if ('ResizeObserver' in window) { let ro; new ResizeObserver(() => { clearTimeout(ro); ro = setTimeout(measure, 150); }).observe(document.body); }
  measure();
  requestAnimationFrame(loop);
})();
