/* Forget Me Not Travel — homepage behaviour (vanilla JS, no dependencies).
   Ports the interaction logic of the Claude Design prototype (Homepage.dc.html). */
(() => {
  'use strict';

  const E = 'cubic-bezier(.22,1,.36,1)';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const mqM = matchMedia('(max-width: 768px)');
  const mqWide = matchMedia('(min-width: 1024px)');
  const mqRM = matchMedia('(prefers-reduced-motion: reduce)');
  const mqHover = matchMedia('(hover: hover)');
  const mqFine = matchMedia('(hover: hover) and (pointer: fine)');
  const isM = () => mqM.matches;
  const rm = () => mqRM.matches;
  const pad = i => String(i + 1).padStart(2, '0');
  const shown = el => el.getClientRects().length > 0;
  const focusNoScroll = el => { if (!el) return; try { el.focus({ preventScroll: true }); } catch (x) { el.focus(); } };
  const playSafe = v => { const p = v.play(); if (p && p.catch) p.catch(() => {}); };

  window.dataLayer = window.dataLayer || [];
  const track = ev => window.dataLayer.push({ event: ev });

  const state = { past: false, menu: false, sheet: false, quoteVis: false, kbd: false, ctaVis: false, sp: 0, sent: false, lastScrollT: 0, scrollV: 0 };

  /* ---------------- Elements ---------------- */
  const hdr = $('[data-hdr]');
  const hero = $('#top');
  const heroContent = $('[data-hero-content]');
  const heroVideo = $('[data-hero-video]');
  const heroPoster = $('.hero__poster');
  const bar = $('[data-progress]');
  const glow = $('[data-glow]');
  const pxEls = $$('[data-px]');
  const sticky = $('[data-sticky]');
  const stickyLink = sticky && $('a', sticky);
  const hdrH = () => (hdr ? hdr.offsetHeight : 72);

  /* ---------------- Scrolling helpers ---------------- */
  function scrollToEl(el, focusFn) {
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY - hdrH() - 8;
    window.scrollTo({ top: Math.max(0, top), behavior: rm() ? 'auto' : 'smooth' });
    if (focusFn) setTimeout(() => focusNoScroll(focusFn()), rm() ? 0 : 700);
  }
  const goTo = id => { if (state.menu) closeMenu(false); scrollToEl(document.getElementById(id)); };
  const goTop = () => { if (state.menu) closeMenu(false); window.scrollTo({ top: 0, behavior: rm() ? 'auto' : 'smooth' }); };
  const quoteTarget = () => (isM() ? $('[data-quote-card]') : $('#quote'));
  const goQuote = () => {
    if (state.menu) closeMenu(false);
    scrollToEl(quoteTarget(), () => (state.sent ? $('[data-sent-h]') : $('#f-name')));
  };

  /* ---------------- Scroll-linked work (header, progress, parallax, glow) ---------------- */
  function scrollWork() {
    const y = window.scrollY, vh = window.innerHeight || 1, m = isM();
    const hb = hero ? hero.offsetHeight : 0;
    const se = document.scrollingElement || document.documentElement;
    const max = Math.max(1, se.scrollHeight - vh);

    if (hdr) {
      const solid = hb ? y > hb - hdrH() - 1 : true;
      hdr.classList.toggle('is-solid', solid);
      hdr.classList.toggle('is-shrunk', m && y > 40);
      if (solid) hdr.removeAttribute('data-dark'); else hdr.setAttribute('data-dark', 'true');
    }
    const past = hb ? y > hb * 0.6 : true;
    if (past !== state.past) { state.past = past; updateSticky(); }
    if (bar) bar.style.transform = 'scaleX(' + Math.min(1, y / max).toFixed(4) + ')';
    checkWipes();

    if (rm()) { if (glow) glow.style.transform = 'scaleY(1)'; return; }

    if (heroContent) {
      if (!m && hb && y < hb * 1.2) {
        const p = Math.min(1, y / (hb * 0.7));
        heroContent.style.opacity = (1 - p).toFixed(3);
        heroContent.style.transform = 'translate3d(0,' + (y * 0.28).toFixed(1) + 'px,0)';
        const sc = 'scale(' + (1 + Math.min(1, y / hb) * 0.1).toFixed(4) + ')';
        if (heroVideo) heroVideo.style.transform = sc;
        if (heroPoster) heroPoster.style.transform = sc;
      } else if (m) {
        heroContent.style.opacity = ''; heroContent.style.transform = '';
        if (heroVideo) heroVideo.style.transform = '';
        if (heroPoster) heroPoster.style.transform = '';
      }
    }

    if (!m) {
      const rects = pxEls.map(el => el.parentElement.getBoundingClientRect());
      pxEls.forEach((el, i) => {
        const r = rects[i];
        if (!r.height || r.bottom < -200 || r.top > vh + 200) return;
        const lim = r.height * 0.075;
        const off = Math.max(-lim, Math.min(lim, -(r.top + r.height / 2 - vh / 2) * 0.1));
        el.style.transform = 'translate3d(0,' + off.toFixed(1) + 'px,0)';
      });
    } else {
      pxEls.forEach(el => { el.style.transform = ''; });
    }

    if (glow) {
      const gh = glow.offsetHeight || 1;
      const rem = Math.max(0, max - y);
      const rev = Math.min(1, Math.max(0, (gh - rem) / gh));
      glow.style.transform = 'scaleY(' + (0.035 + 0.965 * rev).toFixed(3) + ')';
    }
  }

  let scRaf = 0, scT = 0, lastY = null, scrollDir = 1;
  function onScroll() {
    state.lastScrollT = performance.now();
    const y = window.scrollY;
    state.scrollV = y - (lastY == null ? y : lastY);
    if (state.scrollV) scrollDir = state.scrollV > 0 ? 1 : -1;
    lastY = y;
    if (scRaf) return;
    scRaf = requestAnimationFrame(() => { scRaf = 0; scrollWork(); });
    clearTimeout(scT);
    scT = setTimeout(() => { if (scRaf) { cancelAnimationFrame(scRaf); scRaf = 0; scrollWork(); } }, 120);
  }

  /* ---------------- Active section in the desktop nav ---------------- */
  function setupActiveNav() {
    const links = $$('.nav a[data-go]');
    let cur = '';
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) cur = e.target.id;
      else if (cur === e.target.id) cur = '';
      links.forEach(a => { if (a.dataset.go === cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }), { rootMargin: '-45% 0px -50% 0px' });
    links.forEach(a => { const el = document.getElementById(a.dataset.go); if (el) io.observe(el); });
  }

  /* ---------------- Hero video ---------------- */
  let heroVis = true;
  function heroSrc() {
    if (!heroVideo || rm()) return; // reduced motion: the poster image stays, nothing plays
    const want = heroVideo.dataset[isM() ? 'srcM' : 'srcD'];
    if (heroVideo.getAttribute('src') !== want) heroVideo.setAttribute('src', want);
  }
  function syncHero() {
    if (!heroVideo || !heroVideo.getAttribute('src')) return;
    if (heroVis && !rm()) playSafe(heroVideo); else if (!heroVideo.paused) heroVideo.pause();
  }
  function setupHero() {
    if (!heroVideo) return;
    heroVideo.muted = true; heroVideo.defaultMuted = true;
    heroSrc();
    ['loadeddata', 'canplay'].forEach(ev => heroVideo.addEventListener(ev, syncHero));
    // Some browsers pause autoplaying video on their own; try again shortly after.
    heroVideo.addEventListener('pause', () => { if (heroVis && !rm()) setTimeout(syncHero, 300); });
    new IntersectionObserver(es => { heroVis = es[0].isIntersecting; syncHero(); }).observe(hero);
    syncHero();
  }

  /* ---------------- Load-in animation ---------------- */
  function intro() {
    if (rm() || !Element.prototype.animate) return;
    if (isM()) {
      let line = -1, last = null;
      $$('.hero h1 .wi').forEach(w => {
        const t = w.parentElement.offsetTop;
        if (last === null || Math.abs(t - last) > 6) { line++; last = t; }
        w.animate([{ transform: 'translateY(110%)' }, { transform: 'none' }], { duration: 700, delay: 80 + line * 70, easing: E, fill: 'backwards' });
      });
      const L = Math.max(0, line) * 70, d = { 0: 0, 2: 200 + L, 3: 290 + L };
      $$('[data-hero]').forEach(el => {
        const i = +el.dataset.hero; if (i === 1) return;
        el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 560, delay: d[i] || 0, easing: E, fill: 'backwards' });
      });
      const cue = $('[data-cue]');
      if (cue) cue.animate([{ transform: 'translateY(-100%)' }, { transform: 'translateY(100%)' }], { duration: 1800, iterations: Infinity, easing: 'cubic-bezier(.65,0,.35,1)' });
      return;
    }
    $$('[data-hero]').forEach(el => {
      const i = +el.dataset.hero;
      el.animate([{ opacity: 0, transform: 'translateY(16px)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: i * 60, easing: E, fill: 'backwards' });
    });
  }

  /* ---------------- Scroll reveal ---------------- */
  function setupReveal() {
    if (rm()) return;
    const m = isM(), touch = m || !mqHover.matches, vh0 = window.innerHeight || 800;
    const els = $$('[data-reveal]').filter(el => shown(el) && (!touch || el.getBoundingClientRect().height < vh0 * 0.9));
    const io = new IntersectionObserver(es => es.forEach(e => {
      const el = e.target, d = touch ? 0 : +(el.dataset.revealDelay || 0);
      if (e.isIntersecting && touch) { el.style.opacity = '1'; el.style.transform = 'none'; io.unobserve(el); return; }
      if (e.isIntersecting) { el.style.transitionDelay = d + 'ms'; el.style.opacity = '1'; el.style.transform = 'none'; }
      else {
        const top = e.rootBounds ? e.rootBounds.top : 0;
        const above = e.boundingClientRect.bottom <= top + 2;
        el.style.transitionDelay = '0ms'; el.style.opacity = '0';
        el.style.transform = above ? 'translate3d(0,-20px,0)' : 'translate3d(0,28px,0)';
      }
    }));
    els.forEach(el => {
      el.style.transition = m ? 'opacity 700ms ' + E + ', transform 700ms ' + E
        : touch ? 'opacity 450ms ease, transform 500ms ' + E
        : 'opacity 600ms ' + E + ', transform 700ms ' + E;
      if (touch && el.getBoundingClientRect().top < vh0) return;
      if (touch) { el.style.opacity = '0'; el.style.transform = m ? 'translate3d(0,20px,0)' : 'translate3d(0,16px,0)'; }
      io.observe(el);
    });

    // Mobile: images wipe up from the bottom and settle from 1.06 to 1.
    if (m && Element.prototype.animate) {
      // Checked on scroll rather than with IntersectionObserver: a fully clipped element has no
      // visible area, so an observer would never report it.
      $$('[data-mimg]').forEach(el => {
        if (!shown(el) || el.getBoundingClientRect().top < vh0) return;
        el.style.clipPath = 'inset(100% 0 0 0)';
        wipes.push(el);
      });
      checkWipes();
    }
  }
  const wipes = [];
  function checkWipes() {
    if (!wipes.length) return;
    const vh = window.innerHeight || 800;
    for (let k = wipes.length - 1; k >= 0; k--) {
      const el = wipes[k], r = el.getBoundingClientRect();
      if (r.top > vh - r.height * 0.12 || r.bottom < 0) continue;
      wipes.splice(k, 1);
      el.style.clipPath = '';
      el.animate([{ clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)' }], { duration: 900, easing: E });
      const im = $('[data-mimg-in]', el) || $('img', el);
      if (im) im.animate([{ transform: 'scale(1.06)' }, { transform: 'scale(1)' }], { duration: 1200, easing: E });
    }
  }

  /* ---------------- Word-by-word headings, hero hover ripple, rating count-up (desktop) ---------------- */
  function setupWords() {
    if (rm() || isM() || !mqHover.matches) return;
    const els = $$('[data-words], [data-hero-h1]').filter(shown);
    els.forEach(el => {
      let ws;
      if (el.hasAttribute('data-hero-h1')) {
        ws = $$('.wi', el);
      } else {
        ws = [];
        const walk = p => Array.from(p.childNodes).forEach(n => {
          if (n.nodeType === 1 && n.tagName === 'EM') { walk(n); return; }
          if (n.nodeType !== 3 || !n.textContent.trim()) return;
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach(part => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span'); s.textContent = part; frag.appendChild(s); ws.push(s);
          });
          n.replaceWith(frag);
        });
        walk(el);
      }
      ws.forEach(w => { w.style.display = 'inline-block'; w.style.opacity = '0'; w.style.transform = 'translate3d(0,0.25em,0)'; });
      el._w = ws;

      if (el.hasAttribute('data-hero-h1')) {
        const lift = (k, on) => {
          const w = ws[k]; if (!w) return;
          const d = Math.abs(k - (on == null ? k : on));
          w.style.transition = 'color 300ms ease, transform 450ms ' + E;
          w.style.transform = on == null ? 'none' : 'translate3d(0,' + (d === 0 ? -0.08 : -0.03) + 'em,0)';
          w.style.color = (on != null && d === 0) ? '#05ACB4' : '';
        };
        ws.forEach((w, k) => {
          w.addEventListener('pointerenter', e => { if (e.pointerType !== 'mouse') return; lift(k - 1, k); lift(k, k); lift(k + 1, k); });
          w.addEventListener('pointerleave', e => { if (e.pointerType !== 'mouse') return; lift(k - 1, null); lift(k, null); lift(k + 1, null); });
        });
      }
    });
    const show = (el, on) => (el._w || []).forEach((w, k) => {
      const d = Math.min(k * 28, 400);
      w.style.transition = on ? 'opacity 600ms ease ' + d + 'ms, transform 700ms ' + E + ' ' + d + 'ms' : 'opacity 250ms ease, transform 250ms ease';
      w.style.opacity = on ? '1' : '0';
      w.style.transform = on ? 'none' : 'translate3d(0,0.25em,0)';
    });
    const io = new IntersectionObserver(es => es.forEach(e => show(e.target, e.isIntersecting)));
    els.forEach(el => io.observe(el));

    const cio = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target, to = parseFloat(el.dataset.count), st = performance.now();
      const step = n => { const p = Math.min(1, (n - st) / 1200); el.textContent = (to * (1 - Math.pow(1 - p, 3))).toFixed(1); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }), { threshold: 0.6 });
    $$('[data-count]').forEach(el => cio.observe(el));
  }

  /* ---------------- Photo strip: slow continuous drift on desktop ---------------- */
  const strip = { el: $('[data-strip]'), track: $('[data-strip-track]'), vis: false, hold: false, x: 0, v: null, half: 0, raf: 0, t: 0 };
  function syncMarquee() {
    if (!strip.track) return;
    if (isM() || rm()) strip.track.style.transform = '';
    const run = !rm() && !isM() && strip.vis;
    if (run && !strip.raf) { strip.t = 0; strip.raf = requestAnimationFrame(marqueeStep); }
    else if (!run && strip.raf) { cancelAnimationFrame(strip.raf); strip.raf = 0; }
  }
  function marqueeStep(t) {
    const dt = strip.t ? Math.min(50, t - strip.t) / 16.667 : 1; strip.t = t;
    if (!strip.half) {
      const d = $('[data-dup-start]', strip.track), first = strip.track.children[0];
      strip.half = d && first ? d.offsetLeft - first.offsetLeft : 0;
    }
    if (strip.half) {
      const target = strip.hold ? 0.6 * 0.12 : 0.6;
      strip.v = (strip.v == null ? target : strip.v) + (target - (strip.v == null ? target : strip.v)) * 0.05 * dt;
      strip.x = (((strip.x + strip.v * dt) % strip.half) + strip.half) % strip.half;
      strip.track.style.transform = 'translate3d(' + (-strip.x).toFixed(2) + 'px,0,0)';
    }
    strip.raf = requestAnimationFrame(marqueeStep);
  }
  function setupStrip() {
    if (!strip.el) return;
    const on = () => { strip.hold = true; }, off = () => { strip.hold = false; };
    strip.el.addEventListener('mouseenter', on); strip.el.addEventListener('mouseleave', off);
    strip.el.addEventListener('touchstart', on, { passive: true }); strip.el.addEventListener('touchend', off);
    new IntersectionObserver(es => { strip.vis = es[0].isIntersecting; syncMarquee(); }).observe(strip.el);
  }

  /* ---------------- Specialities: desktop panels + text, mobile carousel + bottom sheet ---------------- */
  const panels = $$('[data-panel]');
  const pVideos = panels.map(p => $('video', p));
  const specs = $$('[data-spec]');
  const sheet = $('[data-sheet]');
  const sheetBackdrop = $('.sheet-backdrop');
  const sheetCloseBtn = $('.sheet__close');
  let expVis = false, vidT = 0, shRet = null, sh = null;

  function setSp(i) {
    state.sp = i;
    panels.forEach((p, k) => {
      const on = k === i;
      p.classList.toggle('is-open', on);
      p.setAttribute('aria-pressed', on ? 'true' : 'false');
      const nb = $('[data-panel-next]', p); if (nb) nb.tabIndex = on ? 0 : -1;
    });
    specs.forEach((s, k) => s.classList.toggle('is-open', k === i));
    if (sheet && isM()) sheet.setAttribute('aria-labelledby', 'sp-t-' + i);
    syncVideos();
  }
  function syncVideos() {
    const idle = performance.now() - state.lastScrollT;
    if (idle < 350) { clearTimeout(vidT); vidT = setTimeout(syncVideos, 380 - idle); }
    pVideos.forEach((v, k) => {
      if (!v) return;
      const on = expVis && k === state.sp && !rm() && !isM();
      if (on && !v.getAttribute('src')) v.setAttribute('src', v.dataset.src); // only the open speciality's video ever loads
      if (!v.getAttribute('src')) return;
      if (on && idle < 350) return; // start once scrolling settles, so it doesn't stutter mid-scroll
      if (on) playSafe(v); else if (!v.paused) v.pause();
    });
  }
  function setupPanels() {
    panels.forEach((p, i) => {
      const nx = (i + 1) % panels.length;
      p.addEventListener('click', () => setSp(i));
      p.addEventListener('keydown', e => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSp(i); }
        else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          const n = (i + (e.key === 'ArrowRight' ? 1 : -1) + panels.length) % panels.length;
          setSp(n); panels[n].focus();
        }
      });
      const nb = $('[data-panel-next]', p);
      if (nb) nb.addEventListener('click', e => {
        e.stopPropagation(); setSp(nx);
        if (e.detail === 0) setTimeout(() => { const b = $('[data-panel-next]', panels[nx]); if (b) b.focus(); }, 30);
      });
    });
    const exp = $('#experiences');
    if (exp) new IntersectionObserver(es => { expVis = es[0].isIntersecting; syncVideos(); }).observe(exp);
  }

  function sheetAria() {
    if (!sheet) return;
    if (isM()) {
      sheet.setAttribute('role', 'dialog');
      sheet.setAttribute('aria-modal', 'true');
      sheet.setAttribute('aria-labelledby', 'sp-t-' + state.sp);
      sheet.setAttribute('aria-hidden', state.sheet ? 'false' : 'true');
    } else {
      ['role', 'aria-modal', 'aria-labelledby', 'aria-hidden'].forEach(a => sheet.removeAttribute(a));
      if (state.sheet) closeSheet();
    }
  }
  function openSheet(i) {
    shRet = document.activeElement;
    setSp(i);
    state.sheet = true;
    sheet.classList.add('is-open'); sheetBackdrop.classList.add('is-open');
    sheet.style.transform = '';
    sheetAria();
    document.body.style.overflow = 'hidden';
    sheet.scrollTop = 0;
    updateSticky();
    setTimeout(() => focusNoScroll(sheetCloseBtn), 80);
  }
  function closeSheet() {
    if (!state.sheet) return;
    state.sheet = false;
    sheet.classList.remove('is-open'); sheetBackdrop.classList.remove('is-open');
    sheet.style.transform = '';
    sheetAria();
    document.body.style.overflow = '';
    updateSticky();
    const r = shRet; shRet = null;
    if (r && r.focus) focusNoScroll(r);
  }
  function trapTab(e, root) {
    if (e.key !== 'Tab') return;
    const f = $$('a[href],button', root).filter(x => x.offsetParent !== null || getComputedStyle(x).position === 'fixed');
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function setupSheet() {
    if (!sheet) return;
    $$('[data-sheet-open]').forEach(b => b.addEventListener('click', () => openSheet(+b.dataset.sheetOpen)));
    $$('[data-sheet-close]').forEach(b => b.addEventListener('click', closeSheet));
    sheet.addEventListener('keydown', e => {
      if (!isM()) return;
      if (e.key === 'Escape') { e.preventDefault(); closeSheet(); return; }
      trapTab(e, sheet);
    });
    // Swipe down to close (only when the sheet is scrolled to its top)
    sheet.addEventListener('touchstart', e => {
      if (!isM() || !state.sheet) return;
      sh = { y: e.touches[0].clientY, ok: sheet.scrollTop <= 0, dy: 0 };
    }, { passive: true });
    sheet.addEventListener('touchmove', e => {
      if (!sh || !sh.ok) return;
      const dy = e.touches[0].clientY - sh.y;
      if (dy <= 0) { if (sh.dy) { sh.dy = 0; sheet.style.transform = 'none'; } return; }
      sh.dy = dy; sheet.style.transition = 'none'; sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: true });
    sheet.addEventListener('touchend', () => {
      const d = sh; sh = null;
      if (!d || !d.dy) return;
      sheet.style.transition = '';
      if (d.dy > 90) closeSheet(); else sheet.style.transform = 'none';
    });
    sheetAria();
  }

  // Snap rows on mobile: track which card is in place (scale + dots)
  function setupRowIndex(row, dotsWrap, gap) {
    if (!row) return () => {};
    const lis = $$(':scope > ul > li', row);
    const dots = dotsWrap ? Array.from(dotsWrap.children) : [];
    let idx = 0, raf = 0;
    const paint = () => {
      const m = isM();
      lis.forEach((li, k) => li.classList.toggle('is-off', m && !rm() && k !== idx));
      dots.forEach((d, k) => d.classList.toggle('is-on', k === idx));
    };
    row.addEventListener('scroll', () => {
      if (!isM() || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!lis.length) return;
        let i = Math.round(row.scrollLeft / (lis[0].offsetWidth + gap));
        if (row.scrollLeft >= row.scrollWidth - row.clientWidth - 4) i = lis.length - 1;
        i = Math.max(0, Math.min(lis.length - 1, i));
        if (i !== idx) { idx = i; paint(); }
      });
    }, { passive: true });
    paint();
    return paint;
  }

  /* ---------------- Destinations ---------------- */
  const destRow = $('[data-dest-row]');
  let justDragged = false;
  function setupDestinations() {
    if (!destRow) return;
    $$('[data-dest-scroll]').forEach(b => b.addEventListener('click', () => {
      destRow.scrollBy({ left: +b.dataset.destScroll * Math.max(276, destRow.clientWidth * 0.7), behavior: rm() ? 'auto' : 'smooth' });
    }));
    // Mouse drag to scroll (touch scrolls natively)
    destRow.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      const drag = { x: e.clientX, sl: destRow.scrollLeft, moved: false };
      const move = ev => {
        const dx = ev.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; destRow.style.scrollSnapType = 'none'; destRow.style.cursor = 'grabbing'; }
        if (drag.moved) { ev.preventDefault(); destRow.scrollLeft = drag.sl - dx; }
      };
      const up = () => {
        destRow.style.cursor = '';
        window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up);
        if (!drag.moved) return;
        justDragged = true; setTimeout(() => { justDragged = false; }, 60);
        const w = 276, t = Math.round(destRow.scrollLeft / w) * w;
        destRow.scrollTo({ left: t, behavior: 'smooth' });
        setTimeout(() => { destRow.style.scrollSnapType = ''; }, 450);
      };
      window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
    });
    $$('[data-dest]').forEach(b => b.addEventListener('click', e => {
      e.preventDefault();
      if (justDragged) return;
      const [title, cat] = b.dataset.dest.split('|');
      const line = "I'm interested in: " + title + ' (' + cat + ')';
      const trip = $('#f-trip');
      const t = trip.value;
      trip.value = t.length ? (t.endsWith('\n') ? t + line : t + '\n' + line) : line;
      setErr('trip', '');
      if (state.sent) showForm();
      if (isM()) {
        b.parentElement.classList.add('is-added');
        b.setAttribute('aria-label', title + ', ' + cat + '. Added to your quote');
      }
      const go = () => scrollToEl(quoteTarget(), () => trip);
      if (isM() && !rm()) setTimeout(go, 420); else go();
    }));
  }

  /* ---------------- Reviews carousel ---------------- */
  const rvRoot = $('[data-rv]');
  const rvItems = $$('[data-rv-item]');
  const rvImgs = $$('[data-rv-img]');
  const rvDots = $$('[data-rv-pick]');
  const rvProg = $('[data-rv-prog]');
  const rvProgWrap = $('[data-rv-prog-wrap]');
  const rvMinis = $$('.rv-mini');
  const rv = { i: 0, prev: -1, dir: 1, stop: false, el: 0, lt: 0, raf: 0, hov: false, fin: false, vis: false };
  const N = rvItems.length;

  function renderRv() {
    const m = isM();
    rvItems.forEach((it, i) => {
      const on = i === rv.i, out = i === rv.prev, d = m ? 0 : (out ? -rv.dir : rv.dir) * 28;
      it.classList.toggle('is-on', on);
      it.setAttribute('aria-hidden', on ? 'false' : 'true');
      it.style.transform = on ? '' : 'translateX(' + d + 'px)';
      const im = rvImgs[i];
      if (im) {
        im.classList.toggle('is-on', on);
        if (on) im.removeAttribute('aria-hidden'); else im.setAttribute('aria-hidden', 'true');
        im.style.transform = on ? '' : 'translateX(' + d + 'px) scale(.985)';
      }
    });
    rvDots.forEach((b, i) => { if (i === rv.i) b.setAttribute('aria-current', 'true'); else b.removeAttribute('aria-current'); });
    const count = $('[data-rv-count]'); if (count) count.textContent = pad(rv.i) + ' / ' + pad(N - 1);
    // Previous / next mini cards (desktop)
    [(rv.i + N - 1) % N, (rv.i + 1) % N].forEach((k, j) => {
      const mini = rvMinis[j]; if (!mini) return;
      $('[data-rv-mini-img]', mini).setAttribute('src', rvImgs[k].getAttribute('src'));
      $('[data-rv-mini-name]', mini).textContent = rvItems[k].dataset.name;
      $('[data-rv-mini-trip]', mini).textContent = rvItems[k].dataset.trip;
    });
    if (rvProgWrap) rvProgWrap.classList.toggle('is-off', rv.stop || rm() || m);
  }
  function rvTick(t) {
    const dt = rv.lt ? t - rv.lt : 0; rv.lt = t;
    if (!(rv.hov || rv.fin || document.hidden)) rv.el += Math.min(dt, 100);
    const p = Math.min(1, rv.el / 5000);
    if (rvProg) rvProg.style.transform = 'scaleX(' + p.toFixed(4) + ')';
    if (rv.el >= 5000) { rv.el = 0; goRev(1, true); }
    rv.raf = requestAnimationFrame(rvTick);
  }
  function syncRvLoop() {
    const run = rv.vis && !rv.stop && !rm() && !isM();
    if (run && !rv.raf) { rv.lt = 0; rv.raf = requestAnimationFrame(rvTick); }
    else if (!run && rv.raf) { cancelAnimationFrame(rv.raf); rv.raf = 0; }
  }
  function goRev(step, auto) {
    rv.el = 0; rv.prev = rv.i; rv.i = (rv.i + step + N) % N; rv.dir = step;
    if (!auto) stopRv();
    renderRv();
  }
  function pickRev(i) {
    if (i === rv.i) return;
    rv.el = 0; rv.prev = rv.i; rv.dir = i > rv.i ? 1 : -1; rv.i = i;
    stopRv(); renderRv();
  }
  function stopRv() {
    // Autoplay stops for good once the visitor takes control.
    if (rv.stop) return;
    rv.stop = true;
    if (rvProg) rvProg.style.transform = 'scaleX(0)';
    syncRvLoop();
  }
  function setupReviews() {
    if (!rvRoot || !N) return;
    $$('[data-rv-step]').forEach(b => b.addEventListener('click', () => goRev(+b.dataset.rvStep, false)));
    rvDots.forEach(b => b.addEventListener('click', () => pickRev(+b.dataset.rvPick)));
    rvRoot.addEventListener('mouseenter', () => { rv.hov = true; });
    rvRoot.addEventListener('mouseleave', () => { rv.hov = false; });
    const sec = $('[data-reviews]');
    sec.addEventListener('focusin', () => { rv.fin = true; });
    sec.addEventListener('focusout', e => { if (!sec.contains(e.relatedTarget)) rv.fin = false; });
    let tx0 = 0, ty0 = 0;
    rvRoot.addEventListener('touchstart', e => { const t = e.touches[0]; tx0 = t.clientX; ty0 = t.clientY; }, { passive: true });
    rvRoot.addEventListener('touchend', e => {
      const t = e.changedTouches[0], dx = t.clientX - tx0, dy = t.clientY - ty0;
      if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.4) goRev(dx < 0 ? 1 : -1, false);
    });
    new IntersectionObserver(es => { rv.vis = es[0].isIntersecting; syncRvLoop(); }).observe(sec);
    renderRv();
  }

  /* ---------------- Quote form ---------------- */
  const form = $('[data-form]');
  const sent = $('[data-sent]');
  const submitBtn = form && $('.form__submit', form);
  const fieldIds = { name: 'f-name', email: 'f-email', trip: 'f-trip' };
  const touched = {};
  let sending = false;

  function vf(k, v) {
    v = (v || '').trim();
    if (k === 'name') return v ? '' : 'Please enter your name.';
    if (k === 'email') return !v ? 'Please enter your email address.' : (/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address, like your@email.com.');
    if (k === 'trip') return v ? '' : 'Please tell us a little about your trip.';
    return '';
  }
  function setErr(k, msg) {
    const inp = document.getElementById(fieldIds[k]); if (!inp) return;
    const p = document.getElementById(fieldIds[k] + '-err');
    if (msg) {
      p.textContent = msg; p.hidden = false;
      inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', p.id);
    } else {
      p.textContent = ''; p.hidden = true;
      inp.setAttribute('aria-invalid', 'false'); inp.removeAttribute('aria-describedby');
    }
  }
  function showForm() {
    state.sent = false;
    form.hidden = false; sent.hidden = true;
    submitBtn.textContent = 'Submit'; submitBtn.setAttribute('aria-disabled', 'false');
  }
  function setupForm() {
    if (!form) return;
    Object.keys(fieldIds).forEach(k => {
      const inp = document.getElementById(fieldIds[k]);
      inp.setAttribute('aria-invalid', 'false');
      inp.addEventListener('input', () => { if (touched[k]) setErr(k, vf(k, inp.value)); });
      inp.addEventListener('blur', () => { touched[k] = true; setErr(k, vf(k, inp.value)); });
    });
    form.addEventListener('submit', e => {
      e.preventDefault();
      if (sending) return;
      let first = null;
      Object.keys(fieldIds).forEach(k => {
        touched[k] = true;
        const msg = vf(k, document.getElementById(fieldIds[k]).value);
        setErr(k, msg);
        if (msg && !first) first = k;
      });
      if (first) { document.getElementById(fieldIds[first]).focus(); return; }
      // The form isn't connected to a backend yet: show progress, then the success panel.
      sending = true;
      submitBtn.textContent = 'Sending…'; submitBtn.setAttribute('aria-disabled', 'true');
      track('form_submit');
      setTimeout(() => {
        sending = false; state.sent = true;
        form.hidden = true; sent.hidden = false;
        focusNoScroll($('[data-sent-h]'));
      }, 1100);
    });
  }

  /* ---------------- Mobile menu (drape) ---------------- */
  const menu = $('[data-menu]');
  const menuBtn = $('[data-menu-open]');
  const menuCloseBtn = $('[data-menu-close]');
  const mPath = $('[data-menu-path]');
  const HIDDEN = 'M1131,0 Q565.5,0 0,0 L0,0 L1131,0 Z';
  const FULL = 'M1131,861 Q565.5,861 0,861 L0,0 L1131,0 Z';
  let mraf = 0;
  const lerp = (a, b, u) => a + (b - a) * u;
  function openPath(t) {
    let by, cy;
    if (t < 0.5) { const u = Math.pow(t / 0.5, 4); by = lerp(0, 345, u); cy = lerp(0, 620, u); }
    else { const u = 1 - Math.pow(1 - (t - 0.5) / 0.5, 4); by = lerp(345, 861, u); cy = lerp(620, 861, u); }
    return 'M1131,' + by.toFixed(1) + ' Q565.5,' + cy.toFixed(1) + ' 0,' + by.toFixed(1) + ' L0,0 L1131,0 Z';
  }
  function closePath(t) {
    let ty, cy;
    if (t < 0.5) { const u = Math.pow(t / 0.5, 3); ty = lerp(0, 350, u); cy = lerp(0, 130, u); }
    else { const u = 1 - Math.pow(1 - (t - 0.5) / 0.5, 3); ty = lerp(350, 861, u); cy = lerp(130, 861, u); }
    return 'M1131,' + ty.toFixed(1) + ' Q565.5,' + cy.toFixed(1) + ' 0,' + ty.toFixed(1) + ' L0,861 L1131,861 Z';
  }
  function morph(opening) {
    if (!mPath) return;
    cancelAnimationFrame(mraf);
    if (rm()) { mPath.setAttribute('d', opening ? FULL : HIDDEN); return; }
    const st = performance.now(), D = opening ? 650 : 520;
    const step = now => {
      const t = Math.min(1, (now - st) / D);
      mPath.setAttribute('d', opening ? openPath(t) : closePath(t));
      if (t < 1) mraf = requestAnimationFrame(step); else if (!opening) mPath.setAttribute('d', HIDDEN);
    };
    mraf = requestAnimationFrame(step);
  }
  function openMenu() {
    state.menu = true;
    menu.classList.add('is-open'); menu.setAttribute('aria-hidden', 'false');
    menuBtn.setAttribute('aria-expanded', 'true');
    morph(true);
    document.body.style.overflow = 'hidden';
    updateSticky();
    setTimeout(() => menuCloseBtn.focus(), 80);
  }
  function closeMenu(restore) {
    if (!state.menu) return;
    state.menu = false;
    menu.classList.remove('is-open'); menu.setAttribute('aria-hidden', 'true');
    menuBtn.setAttribute('aria-expanded', 'false');
    morph(false);
    document.body.style.overflow = '';
    updateSticky();
    if (restore) setTimeout(() => menuBtn.focus(), 40);
  }
  function setupMenu() {
    if (!menu) return;
    menuBtn.addEventListener('click', openMenu);
    menuCloseBtn.addEventListener('click', () => closeMenu(true));
    menu.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); closeMenu(true); return; }
      trapTab(e, menu);
    });
  }

  /* ---------------- Mobile sticky "Request A Quotation" bar ---------------- */
  function updateSticky() {
    if (!sticky) return;
    const show = isM() && state.past && !state.menu && !state.quoteVis && !state.kbd && !state.ctaVis && !state.sheet;
    sticky.classList.toggle('is-on', show);
    sticky.setAttribute('aria-hidden', show ? 'false' : 'true');
    if (stickyLink) stickyLink.tabIndex = show ? 0 : -1;
  }
  function setupSticky() {
    const q = $('#quote');
    if (q) new IntersectionObserver(es => { state.quoteVis = es[0].isIntersecting; updateSticky(); }, { threshold: 0.12 }).observe(q);
    // Hide the bar whenever an inline quote/consultation button is on screen, so two never show at once.
    const seen = new Set();
    const io = new IntersectionObserver(es => {
      es.forEach(e => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
      state.ctaVis = seen.size > 0; updateSticky();
    });
    $$('main a[data-track="quote_click"]').forEach(el => io.observe(el));
    // …and while the on-screen keyboard is up.
    document.addEventListener('focusin', e => { if (e.target.matches('input,textarea') && isM()) { state.kbd = true; updateSticky(); } });
    document.addEventListener('focusout', e => {
      if (!e.target.matches('input,textarea')) return;
      setTimeout(() => { const a = document.activeElement; if (!(a && a.matches && a.matches('input,textarea'))) { state.kbd = false; updateSticky(); } }, 60);
    });
  }

  /* ---------------- Footer accordions (mobile) ---------------- */
  function setupFooter() {
    $$('[data-acc]').forEach(b => b.addEventListener('click', () => {
      const open = b.getAttribute('aria-expanded') !== 'true';
      b.setAttribute('aria-expanded', open ? 'true' : 'false');
      const p = document.getElementById(b.getAttribute('aria-controls'));
      if (p) p.classList.toggle('is-open', open);
    }));
  }

  /* ---------------- Depth: cursor light + magnetic buttons (desktop pointer only) ---------------- */
  function setupDepth() {
    if (!mqFine.matches || rm()) return;
    let last = null, cur = null, pe = null, raf = 0;
    const clearAll = () => { if (last) last.style.setProperty('--mo', '0'); last = null; if (cur) cur.style.translate = ''; cur = null; };
    document.addEventListener('pointermove', e => {
      pe = e; if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const t = pe.target; if (!t || !t.closest) return;
        const b = t.closest('[data-bg]');
        if (last && last !== b) last.style.setProperty('--mo', '0');
        last = b;
        if (b) {
          const r = b.getBoundingClientRect();
          b.style.setProperty('--mx', (pe.clientX - r.left) + 'px');
          b.style.setProperty('--my', (pe.clientY - r.top) + 'px');
          b.style.setProperty('--mo', '1');
        }
        const el = t.closest('[data-magnetic]');
        if (cur && cur !== el) cur.style.translate = '';
        cur = el;
        if (el) {
          if (!el._mg) { el._mg = 1; el.style.transition = getComputedStyle(el).transition + ', translate 450ms ' + E; }
          const r = el.getBoundingClientRect(), x = (pe.clientX - r.left) / r.width - 0.5, y = (pe.clientY - r.top) / r.height - 0.5;
          el.style.translate = (x * 10).toFixed(1) + 'px ' + (y * 8).toFixed(1) + 'px';
        }
      });
    }, { passive: true });
    document.addEventListener('mouseout', e => { if (!e.relatedTarget) clearAll(); });
  }

  /* ---------------- Touch press feedback (mobile) ---------------- */
  function setupPress() {
    let pressEl = null;
    const release = () => {
      const t = pressEl; if (!t) return; pressEl = null;
      t.style.transform = t._pt || '';
      setTimeout(() => { if (t !== pressEl) t.style.transition = t._ptr || ''; }, 220);
    };
    document.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'touch' || !isM() || rm()) return;
      const t = e.target.closest && e.target.closest('a,button'); if (!t) return;
      release();
      pressEl = t; t._pt = t.style.transform; t._ptr = t.style.transition;
      t.style.transition = 'transform 200ms ' + E; t.style.transform = 'scale(.97)';
    }, { passive: true });
    document.addEventListener('pointerup', release, { passive: true });
    document.addEventListener('pointercancel', release, { passive: true });
  }

  /* ---------------- Link routing + analytics ---------------- */
  function setupLinks() {
    document.addEventListener('click', e => {
      const t = e.target.closest && e.target.closest('[data-track]');
      if (t && t.getAttribute('type') !== 'submit') track(t.dataset.track);
    }, true);
    document.addEventListener('click', e => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target.closest && e.target.closest('[data-quote],[data-go],[data-go-top],[data-open-spec],[data-skip]');
      if (!a) return;
      e.preventDefault();
      if (a.hasAttribute('data-skip')) { scrollToEl($('#intro')); focusNoScroll($('#main')); return; }
      if (a.hasAttribute('data-quote')) { goQuote(); return; }
      if (a.hasAttribute('data-go-top')) { goTop(); return; }
      if (a.hasAttribute('data-open-spec')) {
        const i = +a.dataset.openSpec;
        if (isM()) { openSheet(i); return; }
        setSp(i);
        scrollToEl($('#experiences'));
        return;
      }
      goTo(a.dataset.go);
    });
  }

  /* ---------------- Missing images: hide them so the teal box shows ---------------- */
  function setupImgFallback() {
    document.addEventListener('error', e => { if (e.target.tagName === 'IMG') e.target.classList.add('is-broken'); }, true);
    $$('img').forEach(im => { if (im.complete && im.naturalWidth === 0 && im.getAttribute('src')) im.classList.add('is-broken'); });
  }

  /* ---------------- Breakpoint changes ---------------- */
  let paintExp = () => {}, paintDest = () => {};
  function onBreakpoint() {
    heroSrc(); syncHero();
    sheetAria();
    paintExp(); paintDest();
    strip.half = 0; syncMarquee();
    syncVideos(); syncRvLoop(); renderRv();
    updateSticky(); scrollWork();
  }

  /* ---------------- Init ---------------- */
  function init() {
    setupImgFallback();
    setupLinks();
    setupHero();
    setupMenu();
    setupActiveNav();
    setupPanels();
    setupSheet();
    paintExp = setupRowIndex($('[data-exp-row]'), $('[data-exp-dots]'), 12);
    paintDest = setupRowIndex(destRow, $('[data-dest-dots]'), 16);
    setupDestinations();
    setupReviews();
    setupForm();
    setupFooter();
    setupStrip();
    setupSticky();
    setupDepth();
    setupPress();
    setupReveal();
    intro();
    setupWords();
    scrollWork();

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', () => { strip.half = 0; scrollWork(); }, { passive: true });
    window.addEventListener('load', scrollWork, { once: true });
    const onMq = (mq, fn) => (mq.addEventListener ? mq.addEventListener('change', fn) : mq.addListener(fn));
    onMq(mqM, onBreakpoint);
    onMq(mqWide, () => { if (mqWide.matches) closeMenu(false); });
    onMq(mqRM, () => { heroSrc(); syncHero(); syncMarquee(); syncVideos(); syncRvLoop(); renderRv(); scrollWork(); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
