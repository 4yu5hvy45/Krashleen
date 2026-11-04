(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const goTo = el => lenis ? lenis.scrollTo(el, { offset: 0 }) : (el === 0 ? scrollTo(0, 0) : el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }));

  /* ---------- menu ---------- */
  const menuBtns = [$('#menuBtn'), $('#menuBtn2')];
  const setMenu = open => {
    body.classList.toggle('menu-open', open);
    menuBtns.forEach(b => b && b.setAttribute('aria-expanded', open));
    open ? lenis && lenis.stop() : lenis && lenis.start();
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
  const intro = () => {
    pre && pre.classList.add('done');
    setTimeout(() => {
      h1 && h1.classList.add('in');
      $$('.hero .rv').forEach(el => el.classList.add('in'));
      $$('.hero .draw').forEach(el => el.classList.add('in'));
      if (sticker && !reduce) { setTimeout(() => sticker.classList.add('on'), 1600); setTimeout(() => sticker.classList.remove('on'), 3800); }
    }, reduce ? 0 : 450);
  };
  if (reduce || sessionStorageSeen()) { pre && (pre.style.display = 'none'); intro(); }
  else addEventListener('load', () => setTimeout(intro, 1300));
  setTimeout(() => { if (pre && !pre.classList.contains('done')) intro(); }, 3500);
  function sessionStorageSeen() {
    try { const s = sessionStorage.getItem('kk-seen'); sessionStorage.setItem('kk-seen', '1'); return !!s; } catch { return false; }
  }

  /* ---------- reveal ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in');
    $$('img', e.target).forEach(i => e.target.classList.contains('gal') && i.classList.add('dev'));
    io.unobserve(e.target);
  }), { rootMargin: '0px 0px -10% 0px' });
  $$('.rv, .draw, .gal').forEach(el => { if (!el.closest('.hero')) io.observe(el); });

  /* ---------- rails: progress, dark sections, parallax, mbar ---------- */
  const prog = $('#prog'), mprog = $('#mprog'), mbar = $('#mbar');
  const darks = $$('[data-dark]');
  const para = $$('[data-speed]');
  let lastY = 0;
  const onScroll = () => {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    const p = max > 0 ? y / max : 0;
    if (prog) prog.style.transform = `scaleY(${p})`;
    if (mprog) mprog.style.transform = `scaleX(${p})`;
    const mid = innerHeight / 2;
    body.classList.toggle('on-dark', darks.some(d => { const r = d.getBoundingClientRect(); return r.top < mid && r.bottom > mid; }));
    if (!reduce && y < innerHeight * 1.2) para.forEach(el => el.style.transform = `translate3d(0,${y * parseFloat(el.dataset.speed)}px,0)`);
    if (mbar) mbar.classList.toggle('hide', y > lastY && y > 300 && !body.classList.contains('menu-open') && !sheetOpen);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), lbImg = $('#lbImg');
  const openLB = (src, alt) => { lbImg.src = src; lbImg.alt = alt || ''; lb.classList.add('open'); $('#lbClose').focus(); };
  const closeLB = () => lb.classList.remove('open');
  lb.addEventListener('click', closeLB);

  /* ---------- media board: drag on desktop mouse, tap to open everywhere ---------- */
  const canDrag = () => fine && matchMedia('(min-width: 901px)').matches;
  let z = 10;
  $$('#board .clip').forEach(clip => {
    clip.tabIndex = 0; clip.setAttribute('role', 'button');
    clip.setAttribute('aria-label', 'Open ' + ($('img', clip).alt || 'clipping'));
    let sx = 0, sy = 0, ox = 0, oy = 0, down = false, moved = false;
    const base = getComputedStyle(clip).transform;
    const baseT = base === 'none' ? '' : base;
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
    // a click only fires for a real tap/click, never for a scroll gesture on touch screens
    clip.addEventListener('click', () => { if (moved) { moved = false; return; } openLB(clip.dataset.full, $('img', clip).alt); });
    clip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(clip.dataset.full, $('img', clip).alt); } });
  });

  /* ---------- work filters ---------- */
  const rows = $$('.row');
  $$('.chip').forEach(ch => ch.addEventListener('click', () => {
    $$('.chip').forEach(c => c.setAttribute('aria-pressed', c === ch));
    const f = ch.dataset.filter;
    rows.forEach(r => r.hidden = !(f === 'all' || r.dataset.cat === f));
  }));

  /* ---------- hover preview (desktop) ---------- */
  const pv = $('#preview');
  if (fine && pv) {
    const imgs = {};
    rows.forEach(r => { const src = $('button', r).dataset.img; const im = new Image(); im.src = src; im.alt = ''; pv.appendChild(im); imgs[src] = im; });
    let x = 0, y = 0, cx = 0, cy = 0, on = false;
    const loop = () => { cx += (x - cx) * .14; cy += (y - cy) * .14; pv.style.left = cx + 'px'; pv.style.top = cy + 'px'; if (on) requestAnimationFrame(loop); };
    rows.forEach(r => { const b = $('button', r);
      b.addEventListener('mouseenter', e => {
        Object.values(imgs).forEach(i => i.classList.remove('cur')); imgs[b.dataset.img].classList.add('cur');
        if (!on) { cx = x = e.clientX + 170; cy = y = e.clientY; on = true; requestAnimationFrame(loop); }
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
    $$('.case-media figure', sbody).forEach(f => f.addEventListener('click', () => { const i = $('img', f); openLB(i.src, i.alt); }));
    if (!sheetOpen) {
      lastFocus = document.activeElement; sheetOpen = true;
      sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false');
      lenis && lenis.stop(); body.style.overflow = 'hidden';
    }
    setTimeout(() => $('.sheet-bar [data-close]').focus(), 60);
    if (push) history.replaceState(null, '', '#case/' + id);
  }
  function closeCase() {
    if (!sheetOpen) return; sheetOpen = false;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    lenis && lenis.start(); body.style.overflow = '';
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
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  const m = location.hash.match(/^#case\/([\w-]+)/); if (m) openCase(m[1], false);

  /* ---------- featured horizontal scroll ---------- */
  const pin = $('#featPin'), track = $('#featTrack');
  const horiz = () => !reduce && matchMedia('(min-width: 901px)').matches;
  let dist = 0;
  const size = () => {
    if (!horiz()) { pin.style.removeProperty('--feat-h'); track.style.transform = ''; return; }
    dist = Math.max(0, track.scrollWidth - innerWidth);
    pin.style.setProperty('--feat-h', (innerHeight + dist) + 'px');
  };
  const feat = () => {
    if (!horiz()) return;
    const r = pin.getBoundingClientRect();
    const p = Math.min(1, Math.max(0, -r.top / (pin.offsetHeight - innerHeight || 1)));
    track.style.transform = `translate3d(${-dist * p}px,0,0)`;
    $('#featBar').parentElement.style.setProperty('--p', p);
  };
  addEventListener('resize', () => { size(); feat(); onScroll(); });
  addEventListener('scroll', feat, { passive: true });
  addEventListener('load', () => { size(); feat(); });
  size(); onScroll();

  /* ---------- copy buttons ---------- */
  $$('.cpy').forEach(b => b.addEventListener('click', async () => {
    const t = $('#' + b.dataset.copy).textContent.trim();
    try { await navigator.clipboard.writeText(t); b.textContent = 'Copied'; } catch { b.textContent = 'Select it'; }
    setTimeout(() => b.textContent = 'Copy', 1800);
  }));
})();
