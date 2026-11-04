(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- smooth scroll ---------- */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
    requestAnimationFrame(raf);
  }
  const scrollTo = target => lenis ? lenis.scrollTo(target, { offset: -10 }) : target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    const el = id === '#top' ? document.body : $(id);
    if (!el) return;
    e.preventDefault(); closeMenu(); scrollTo(id === '#top' ? 0 : el);
  }));

  /* ---------- intro ---------- */
  requestAnimationFrame(() => document.documentElement.classList.add('ready'));
  const peek = $('#heroSticker');
  if (peek && !reduce) { setTimeout(() => peek.classList.add('peek'), 2200); setTimeout(() => peek.classList.remove('peek'), 4200); }

  /* ---------- nav ---------- */
  const nav = $('#nav'); let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    nav.classList.toggle('scrolled', y > 40);
    nav.classList.toggle('hide', y > lastY && y > 500 && !sheetOpen);
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });

  const menu = $('#mobileMenu'), menuBtn = $('#menuBtn');
  function closeMenu() { menu.classList.remove('open'); menu.setAttribute('aria-hidden', 'true'); menuBtn.setAttribute('aria-expanded', 'false'); }
  menuBtn.addEventListener('click', () => { menu.classList.add('open'); menu.setAttribute('aria-hidden', 'false'); menuBtn.setAttribute('aria-expanded', 'true'); });
  $('#menuClose').addEventListener('click', closeMenu);

  /* ---------- reveal + counters ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
  }), { rootMargin: '0px 0px -8% 0px' });
  $$('.rv').forEach(el => io.observe(el));

  const fmt = (v, dec) => dec ? v.toFixed(dec) : Math.round(v).toLocaleString('en-IN');
  const countIO = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; countIO.unobserve(e.target);
    const el = e.target, to = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, suf = el.dataset.suffix || '';
    if (reduce) return;
    const t0 = performance.now(), dur = 1600;
    const tick = t => { const p = Math.min(1, (t - t0) / dur), k = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(to * k, dec).replace(/(\d)(?=(\d{3})+$)/, '$1,') + suf; if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }), { threshold: .6 });
  $$('[data-count]').forEach(el => countIO.observe(el));

  /* ---------- lightbox ---------- */
  const lb = $('#lb'), lbImg = $('#lbImg');
  const openLB = (src, alt) => { lbImg.src = src; lbImg.alt = alt || ''; lb.classList.add('open'); $('#lbClose').focus(); };
  const closeLB = () => lb.classList.remove('open');
  lb.addEventListener('click', closeLB);

  /* ---------- draggable clippings ---------- */
  const board = $('#board');
  let z = 10;
  $$('.clip', board).forEach(clip => {
    clip.tabIndex = 0; clip.setAttribute('role', 'button');
    clip.setAttribute('aria-label', 'Open ' + ($('img', clip).alt || 'clipping'));
    let sx, sy, ox = 0, oy = 0, moved = false, down = false, base = getComputedStyle(clip).transform;
    const desktop = () => matchMedia('(min-width: 761px)').matches;
    clip.addEventListener('pointerdown', e => {
      down = true; moved = false; sx = e.clientX - ox; sy = e.clientY - oy;
      clip.style.zIndex = ++z;
      if (desktop()) { clip.setPointerCapture(e.pointerId); clip.classList.add('dragging'); }
    });
    clip.addEventListener('pointermove', e => {
      if (!down || !desktop()) return;
      const nx = e.clientX - sx, ny = e.clientY - sy;
      if (Math.abs(nx - ox) + Math.abs(ny - oy) > 3) moved = true;
      ox = nx; oy = ny;
      clip.style.transform = `translate(${ox}px,${oy}px) ${base === 'none' ? '' : base} rotate(0deg) scale(1.03)`;
    });
    const up = () => {
      if (!down) return; down = false; clip.classList.remove('dragging');
      if (desktop()) clip.style.transform = `translate(${ox}px,${oy}px) ${base === 'none' ? '' : base}`;
      if (!moved) openLB(clip.dataset.full, $('img', clip).alt);
    };
    clip.addEventListener('pointerup', up);
    clip.addEventListener('pointercancel', () => { down = false; clip.classList.remove('dragging'); });
    clip.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLB(clip.dataset.full, $('img', clip).alt); } });
  });

  /* ---------- work filters ---------- */
  const rows = $$('.row');
  $$('.chip').forEach(ch => ch.addEventListener('click', () => {
    $$('.chip').forEach(c => c.setAttribute('aria-pressed', c === ch));
    const f = ch.dataset.filter;
    rows.forEach(r => r.hidden = !(f === 'all' || r.dataset.cat === f));
  }));

  /* ---------- hover preview ---------- */
  const pv = $('#preview');
  if (fine && pv) {
    const imgs = {};
    rows.forEach(r => { const b = $('button', r), src = b.dataset.img;
      const im = new Image(); im.src = src; im.alt = ''; pv.appendChild(im); imgs[src] = im; });
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y, on = false;
    const loop = () => { cx += (x - cx) * .14; cy += (y - cy) * .14;
      pv.style.left = cx + 'px'; pv.style.top = cy + 'px'; if (on) requestAnimationFrame(loop); };
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
  const sheet = $('#sheet'), body = $('#sheetBody');
  const order = rows.map(r => $('button', r).dataset.case);
  let sheetOpen = false, current = null, lastFocus = null;
  function openCase(id, push = true) {
    const tpl = $('#case-' + id); if (!tpl) return;
    current = id;
    body.innerHTML = ''; body.appendChild(tpl.content.cloneNode(true)); body.scrollTop = 0;
    $$('.case-media figure', body).forEach(f => f.addEventListener('click', () => { const i = $('img', f); openLB(i.src, i.alt); }));
    if (!sheetOpen) { lastFocus = document.activeElement; sheetOpen = true;
      sheet.classList.add('open'); sheet.setAttribute('aria-hidden', 'false'); lenis && lenis.stop(); document.body.style.overflow = 'hidden'; }
    setTimeout(() => $('[data-close]', sheet.querySelector('.sheet-bar')).focus(), 60);
    if (push) history.replaceState(null, '', '#case/' + id);
  }
  function closeCase() {
    if (!sheetOpen) return; sheetOpen = false;
    sheet.classList.remove('open'); sheet.setAttribute('aria-hidden', 'true');
    lenis && lenis.start(); document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname);
    lastFocus && lastFocus.focus();
  }
  const step = d => { const i = order.indexOf(current); openCase(order[(i + d + order.length) % order.length]); };
  $$('[data-case]').forEach(b => b.addEventListener('click', () => openCase(b.dataset.case)));
  $$('[data-close]', sheet).forEach(b => b.addEventListener('click', closeCase));
  $('#prevCase').addEventListener('click', () => step(-1));
  $('#nextCase').addEventListener('click', () => step(1));
  addEventListener('keydown', e => {
    if (e.key === 'Escape') { if (lb.classList.contains('open')) return closeLB(); closeCase(); closeMenu(); }
    if (sheetOpen && !lb.classList.contains('open')) { if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1); }
    if (sheetOpen && e.key === 'Tab') { // focus trap
      const f = $$('button, a[href], [tabindex="0"]', sheet).filter(el => el.offsetParent);
      if (!f.length) return; const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  const fromHash = () => { const m = location.hash.match(/^#case\/([\w-]+)/); if (m) openCase(m[1], false); };
  fromHash();

  /* ---------- featured horizontal scroll ---------- */
  const pin = $('#featPin'), track = $('#featTrack'), bar = $('#featBar');
  const horiz = () => !reduce && matchMedia('(min-width: 861px)').matches;
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
    bar.parentElement.style.setProperty('--p', p);
  };
  addEventListener('resize', () => { size(); feat(); });
  addEventListener('scroll', feat, { passive: true });
  addEventListener('load', () => { size(); feat(); });
  size();

  /* ---------- copy email ---------- */
  const cm = $('#copyMail');
  cm.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText('Krashleenkaurchhabra15@gmail.com'); cm.textContent = 'Copied ✓'; }
    catch { cm.textContent = 'Krashleenkaurchhabra15@gmail.com'; }
    setTimeout(() => cm.textContent = 'Copy email', 2200);
  });
})();
