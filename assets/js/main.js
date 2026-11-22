(() => {
  'use strict';

  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Smooth scroll ---------- */
  let lenis = null;
  if (!reduce && fine && window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, autoRaf: true });
    lenis.stop();
  }
  const scrollToTarget = (el) => {
    if (lenis) lenis.scrollTo(el, { duration: 1.6 });
    else el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = $(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    closeMenu();
    scrollToTarget(target);
  });

  /* ---------- Fit wordmarks to the column width ---------- */
  const fitEls = $$('[data-fit]');
  const fit = () => {
    fitEls.forEach((el) => {
      const inner = el.firstElementChild;
      el.style.fontSize = '100px';
      const w = inner.getBoundingClientRect().width;
      if (!w) return;
      const size = (el.clientWidth / w) * 100 * 0.985;
      el.style.fontSize = size + 'px';
    });
  };
  fit();
  window.addEventListener('resize', fit);

  /* ---------- Loader ---------- */
  const start = () => {
    root.classList.add('is-loaded');
    if (lenis) lenis.start();
  };
  const fontsReady = (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve())
    .then(fit)
    .catch(() => {});
  if (reduce) {
    fontsReady.then(start);
  } else {
    const countEl = $('[data-count]');
    const bar = $('.loader__bar i');
    const duration = 1900;
    const t0 = performance.now();
    const counted = new Promise((resolve) => {
      const tick = (now) => {
        const p = clamp((now - t0) / duration, 0, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        if (countEl) countEl.textContent = String(Math.round(eased * 100)).padStart(3, '0');
        if (bar) bar.style.transform = 'scaleX(' + eased + ')';
        if (p < 1) requestAnimationFrame(tick);
        else resolve();
      };
      requestAnimationFrame(tick);
    });
    const fontsOrTimeout = Promise.race([fontsReady, new Promise((r) => setTimeout(r, 3000))]);
    Promise.all([counted, fontsOrTimeout]).then(() => setTimeout(start, 250));
  }

  /* ---------- Split headings into masked words ---------- */
  $$('[data-split]').forEach((el) => {
    let i = 0;
    const walk = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span');
            w.className = 'w';
            const wi = document.createElement('span');
            wi.className = 'wi';
            wi.style.setProperty('--i', i++);
            wi.textContent = part;
            w.appendChild(wi);
            frag.appendChild(w);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          walk(child);
        }
      });
    };
    walk(el);
  });

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$('[data-split], [data-reveal]');
  if ('IntersectionObserver' in window && !reduce) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.1 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('in'));
  }

  /* ---------- Manifesto: words light up with scroll ---------- */
  const manifesto = $('[data-words]');
  let words = [];
  if (manifesto) {
    const wrap = (node) => {
      Array.from(node.childNodes).forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const s = document.createElement('span');
            s.className = 'word';
            s.textContent = part;
            frag.appendChild(s);
          });
          child.replaceWith(frag);
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          wrap(child);
        }
      });
    };
    wrap(manifesto);
    words = $$('.word', manifesto);
  }
  const updateManifesto = () => {
    if (!words.length) return;
    const r = manifesto.getBoundingClientRect();
    const vh = window.innerHeight;
    const p = clamp((vh * 0.85 - r.top) / (r.height + vh * 0.35), 0, 1);
    const lit = Math.round(p * words.length);
    words.forEach((w, i) => w.classList.toggle('is-lit', i < lit));
  };

  /* ---------- Nav: hide on the way down, return on the way up ---------- */
  const nav = $('[data-nav]');
  let lastY = window.scrollY;
  const updateNav = (y) => {
    const dy = y - lastY;
    if (Math.abs(dy) > 4 && !document.body.classList.contains('menu-open')) {
      nav.classList.toggle('is-hidden', dy > 0 && y > 160);
    }
    lastY = y;
  };

  /* ---------- Mobile menu ---------- */
  const menu = $('[data-menu]');
  const toggle = $('[data-menu-toggle]');
  const toggleLabel = $('[data-menu-label]');
  let menuTimer = 0;
  function openMenu() {
    clearTimeout(menuTimer);
    menu.hidden = false;
    void menu.offsetWidth;
    menu.classList.add('is-open');
    document.body.classList.add('menu-open');
    nav.classList.remove('is-hidden');
    toggle.setAttribute('aria-expanded', 'true');
    toggleLabel.textContent = 'close';
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggleLabel.textContent = 'menu';
    menuTimer = setTimeout(() => { menu.hidden = true; }, 950);
  }
  if (toggle) {
    toggle.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMenu(); });
  }

  /* ---------- Cursor and magnetic button ---------- */
  const cursor = $('.cursor');
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const cur = { x: mouse.x, y: mouse.y };

  const hitTest = () => {
    if (!fine || !cursor) return;
    const el = document.elementFromPoint(mouse.x, mouse.y);
    cursor.classList.toggle('is-hidden', !!(el && el.closest('[data-magnetic]')));
    cursor.classList.toggle('is-link', !!(el && el.closest('a, button')));
  };

  if (fine) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (cursor && !cursor.classList.contains('is-on')) {
        cur.x = mouse.x;
        cur.y = mouse.y;
        cursor.classList.add('is-on');
      }
      hitTest();
    }, { passive: true });

    document.addEventListener('pointerleave', () => { if (cursor) cursor.classList.remove('is-on'); });

    $$('[data-magnetic]').forEach((el) => {
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transition = 'transform .25s ease-out, color .5s ease';
        el.style.transform = 'translate(' + (dx * 0.35).toFixed(1) + 'px,' + (dy * 0.35).toFixed(1) + 'px)';
      });
      el.addEventListener('pointerleave', () => {
        el.style.transition = 'transform 1s cubic-bezier(.19,1,.22,1), color .5s ease';
        el.style.transform = '';
      });
    });
  }

  /* ---------- Orbit ---------- */
  const orbit = $('.hero__orbit');
  if (orbit && orbit.pauseAnimations) {
    if (reduce) orbit.pauseAnimations();
    else if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => {
        if (e[0].isIntersecting) orbit.unpauseAnimations();
        else orbit.pauseAnimations();
      }).observe(orbit);
    }
  }

  /* ---------- Frame loop ---------- */
  let scrollDirty = true;
  window.addEventListener('scroll', () => { scrollDirty = true; }, { passive: true });
  window.addEventListener('resize', () => { scrollDirty = true; });

  const frame = () => {
    if (scrollDirty) {
      scrollDirty = false;
      updateNav(window.scrollY);
      updateManifesto();
      hitTest();
    }
    if (fine && cursor) {
      cur.x = lerp(cur.x, mouse.x, 0.22);
      cur.y = lerp(cur.y, mouse.y, 0.22);
      cursor.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0)';
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
