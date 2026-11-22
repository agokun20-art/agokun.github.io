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
      const maxByHeight = el.classList.contains('hero__name') ? window.innerHeight * 0.62 : Infinity;
      const size = Math.min((el.clientWidth / w) * 100 * 0.972, maxByHeight);
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
  let velocity = 0;
  const updateNav = (y) => {
    const dy = y - lastY;
    velocity = dy;
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
    toggleLabel.textContent = 'Close';
  }
  function closeMenu() {
    if (!menu || !menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggleLabel.textContent = 'Menu';
    menuTimer = setTimeout(() => { menu.hidden = true; }, 950);
  }
  if (toggle) {
    toggle.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 900) closeMenu(); });
  }

  /* ---------- Parallax ---------- */
  const parallaxEls = $$('[data-parallax]').map((el) => ({ el, img: $('img', el) }));
  const updateParallax = () => {
    if (reduce) return;
    const vh = window.innerHeight;
    parallaxEls.forEach(({ el, img }) => {
      const r = el.getBoundingClientRect();
      if (r.bottom < 0 || r.top > vh) return;
      const p = clamp((vh - r.top) / (vh + r.height), 0, 1);
      img.style.transform = 'translate3d(0,' + (-p * 16.6).toFixed(2) + '%,0)';
    });
  };

  /* ---------- Marquee ---------- */
  const track = $('.marquee__track');
  let marqueeX = 0;
  let marqueeHalf = 0;
  const measureMarquee = () => { if (track) marqueeHalf = track.scrollWidth / 2; };
  measureMarquee();
  window.addEventListener('resize', measureMarquee);
  fontsReady.then(measureMarquee);

  /* ---------- Cursor, work preview, magnetic button ---------- */
  const cursor = $('.cursor');
  const preview = $('[data-preview]');
  const previewImgs = preview ? $$('img', preview) : [];
  const mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const cur = { x: mouse.x, y: mouse.y };
  const pre = { x: mouse.x, y: mouse.y };
  let activeWork = null;

  const setWork = (li) => {
    if (li === activeWork) return;
    activeWork = li;
    if (!preview) return;
    preview.classList.toggle('is-on', !!li);
    if (li) {
      const idx = Number(li.dataset.work);
      previewImgs.forEach((img, i) => img.classList.toggle('is-on', i === idx));
    }
  };
  const hitTest = () => {
    if (!fine) return;
    const el = document.elementFromPoint(mouse.x, mouse.y);
    setWork(el ? el.closest('[data-work]') : null);
    if (!cursor) return;
    const magnetic = !!(el && el.closest('[data-magnetic]'));
    cursor.classList.toggle('is-hidden', !!activeWork || magnetic);
    cursor.classList.toggle('is-link', !magnetic && !!(el && el.closest('a, button')));
  };

  if (fine) {
    window.addEventListener('pointermove', (e) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      if (cursor && !cursor.classList.contains('is-on')) {
        cur.x = pre.x = mouse.x;
        cur.y = pre.y = mouse.y;
        cursor.classList.add('is-on');
      }
      hitTest();
    }, { passive: true });
    document.addEventListener('pointerleave', () => { if (cursor) cursor.classList.remove('is-on'); setWork(null); });

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

  /* ---------- Hero shader: slow silk ---------- */
  const shader = (() => {
    const canvas = $('[data-shader]');
    if (!canvas) return null;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' });
    if (!gl) return null;

    const vert = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
    const frag = `
      precision highp float;
      uniform vec2 uRes; uniform float uTime; uniform vec2 uMouse;
      float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
      float noise(vec2 p){
        vec2 i = floor(p), f = fract(p);
        vec2 u = f * f * f * (f * (f * 6. - 15.) + 10.);
        return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
      }
      float fbm(vec2 p){
        float a = .5, s = 0.;
        for (int i = 0; i < 4; i++) { s += a * noise(p); p = mat2(1.6, 1.2, -1.2, 1.6) * p + 3.1; a *= .5; }
        return s;
      }
      float field(vec2 p, float t){
        vec2 q = vec2(fbm(p + vec2(0., t)), fbm(p + vec2(5.2, -t * .8)));
        vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + t * .6), fbm(p + 2.6 * q + vec2(8.3, 2.8) - t * .4));
        return fbm(p * .9 + 2.4 * r);
      }
      void main(){
        vec2 uv = gl_FragCoord.xy / uRes;
        vec2 p = (gl_FragCoord.xy - .5 * uRes) / uRes.y;
        p += uMouse * .05;
        p = mat2(.88, -.47, .47, .88) * p;
        p *= vec2(.32, .95);
        float t = uTime * .028;
        float e = .02;
        float f = field(p, t);
        float fx = field(p + vec2(e, 0.), t);
        float fy = field(p + vec2(0., e), t);
        vec3 n = normalize(vec3((f - fx) / e, (f - fy) / e, 1.15));
        vec3 l = normalize(vec3(-.5 + uMouse.x * .3, .6 + uMouse.y * .25, .62));
        float diff = clamp(dot(n, l), 0., 1.);
        float spec = pow(clamp(dot(reflect(-l, n), vec3(0., 0., 1.)), 0., 1.), 9.);
        vec3 shadow = vec3(.02, .017, .014);
        vec3 cloth = vec3(.235, .19, .14);
        vec3 sheen = vec3(.9, .76, .56);
        vec3 col = mix(shadow, cloth, smoothstep(.25, 1., diff));
        col += sheen * spec * .16;
        float vig = smoothstep(1.3, .1, length((uv - vec2(.64, .6)) * vec2(1.2, 1.45)));
        col *= mix(.1, 1., vig);
        col += (hash(gl_FragCoord.xy + uTime) - .5) * .012;
        gl_FragColor = vec4(col, 1.);
      }`;

    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, vert);
    const fs = compile(gl.FRAGMENT_SHADER, frag);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uMouse = gl.getUniformLocation(prog, 'uMouse');
    const m = { x: 0, y: 0 };
    let visible = true;

    const resize = () => {
      const scale = Math.min(window.devicePixelRatio || 1, 1) * 0.6;
      const w = Math.max(2, Math.round(canvas.clientWidth * scale));
      const h = Math.max(2, Math.round(canvas.clientHeight * scale));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    window.addEventListener('resize', resize);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(canvas);
    }

    const seed = 40;
    const draw = (time) => {
      if (!visible) return;
      m.x = lerp(m.x, mouse.x / window.innerWidth - 0.5, 0.03);
      m.y = lerp(m.y, 0.5 - mouse.y / window.innerHeight, 0.03);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, seed + time / 1000);
      gl.uniform2f(uMouse, m.x, m.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    draw(0);
    return { draw };
  })();

  /* ---------- Frame loop ---------- */
  let scrollDirty = true;
  window.addEventListener('scroll', () => { scrollDirty = true; }, { passive: true });
  window.addEventListener('resize', () => { scrollDirty = true; });

  const frame = (time) => {
    if (scrollDirty) {
      scrollDirty = false;
      updateNav(window.scrollY);
      updateManifesto();
      updateParallax();
      hitTest();
    } else {
      velocity *= 0.9;
    }

    if (fine && cursor) {
      cur.x = lerp(cur.x, mouse.x, 0.22);
      cur.y = lerp(cur.y, mouse.y, 0.22);
      cursor.style.transform = 'translate3d(' + cur.x.toFixed(1) + 'px,' + cur.y.toFixed(1) + 'px,0)';
    }
    if (fine && preview) {
      const px = pre.x;
      pre.x = lerp(pre.x, mouse.x, 0.1);
      pre.y = lerp(pre.y, mouse.y, 0.1);
      const tilt = clamp((pre.x - px) * 0.35, -9, 9);
      preview.style.transform = 'translate3d(' + pre.x.toFixed(1) + 'px,' + pre.y.toFixed(1) + 'px,0) rotate(' + tilt.toFixed(2) + 'deg)';
    }
    if (track && marqueeHalf && !reduce) {
      marqueeX -= 0.6 + Math.min(Math.abs(velocity), 60) * 0.12;
      if (marqueeX <= -marqueeHalf) marqueeX += marqueeHalf;
      track.style.transform = 'translate3d(' + marqueeX.toFixed(2) + 'px,0,0)';
    }
    if (shader && !reduce) shader.draw(time);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
})();
