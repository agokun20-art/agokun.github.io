(function () {
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Hero sentence: wrap each word so it can rise into place.
  var say = $('.hero .say');
  if (say) {
    var i = 0;
    var wrap = function (node) {
      var outer = document.createElement('span');
      var inner = document.createElement('span');
      outer.className = 'w';
      outer.style.setProperty('--i', i++);
      inner.appendChild(node);
      outer.appendChild(inner);
      return outer;
    };
    Array.prototype.slice.call(say.childNodes).forEach(function (n) {
      if (n.nodeType === 3) {
        var frag = document.createDocumentFragment();
        n.textContent.split(/([ \t\n]+)/).forEach(function (part) {
          if (!part) return;
          frag.appendChild(/^[ \t\n]+$/.test(part) ? document.createTextNode(' ') : wrap(document.createTextNode(part)));
        });
        say.replaceChild(frag, n);
      } else {
        var holder = document.createComment('');
        say.replaceChild(holder, n);
        say.replaceChild(wrap(n), holder);
      }
    });
    var start = function () { requestAnimationFrame(function () { say.classList.add('is-in'); }); };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(start); else start();
    setTimeout(start, 1200);
  }

  // The brand reads "alex ships <whatever is on screen>".
  var obj = $('.bar__obj');
  var named = $$('[data-obj]');
  var shown = '';
  var setObj = function (name) {
    if (name === shown) return;
    shown = name;
    obj.textContent = '';
    if (name) { var b = document.createElement('b'); b.textContent = name; obj.appendChild(b); }
  };

  // Flow: the phone stays put while the three steps pass.
  var flow = $('.flow');
  var steps = $$('.flow__steps li', flow);
  var shots = $$('.flow__phone img', flow);
  var step = 0;
  var setStep = function (n) {
    if (n === step) return;
    step = n;
    steps.forEach(function (el, k) { el.classList.toggle('is-on', k === n); });
    shots.forEach(function (el, k) { el.classList.toggle('is-on', k === n); });
  };
  steps.forEach(function (el, k) {
    $('button', el).addEventListener('click', function () {
      var travel = flow.offsetHeight - window.innerHeight;
      window.scrollTo({ top: flow.offsetTop + travel * (k + 0.5) / steps.length });
    });
  });

  var less = $('.pllar__less');
  var ticking = false;
  var onScroll = function () {
    ticking = false;
    var vh = window.innerHeight;
    var r = flow.getBoundingClientRect();
    var p = Math.min(0.999, Math.max(0, -r.top / (r.height - vh)));
    setStep(Math.floor(p * steps.length));
    var mid = vh * 0.4, name = '';
    named.forEach(function (el) {
      var b = el.getBoundingClientRect();
      if (b.top <= mid && b.bottom > mid) name = el.getAttribute('data-obj');
    });
    setObj(name);
    if (less && !less.classList.contains('is-in') && less.getBoundingClientRect().top < vh * 0.78) less.classList.add('is-in');
  };
  var request = function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', request);
  onScroll();

  // Inflow: the hotkey works here too.
  var win = $('#win');
  var text = $('.win__text', win);
  var keys = {};
  $$('.key').forEach(function (el) { keys[el.getAttribute('data-key')] = el; });
  var down = { meta: false, shift: false, f: false };
  var closeTimer;
  var paint = function () { for (var k in keys) keys[k].classList.toggle('is-down', down[k]); };
  var release = function () { down.meta = down.shift = down.f = false; paint(); };
  var open = function () {
    clearTimeout(closeTimer);
    win.classList.remove('is-done');
    text.value = '';
    win.hidden = false;
    text.focus({ preventScroll: true });
    setTimeout(release, 260);
  };
  var close = function () { clearTimeout(closeTimer); win.hidden = true; };
  var send = function () {
    if (!text.value.trim()) { text.focus(); return; }
    win.classList.add('is-done');
    closeTimer = setTimeout(close, 2200);
  };
  var check = function () { if (down.meta && down.shift && down.f) open(); };

  for (var k in keys) (function (name) {
    keys[name].addEventListener('click', function () { down[name] = !down[name]; paint(); check(); });
  })(k);

  var nameOf = function (e) {
    if (e.key === 'Meta' || e.key === 'Control') return 'meta';
    if (e.key === 'Shift') return 'shift';
    if (e.code === 'KeyF') return 'f';
  };
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !win.hidden) { close(); return; }
    if (!win.hidden && e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); return; }
    var hot = e.code === 'KeyF' && e.shiftKey && (e.metaKey || e.ctrlKey);
    if (hot) {
      e.preventDefault();
      if (!win.hidden) { close(); release(); return; }
      down.meta = down.shift = down.f = true; paint(); open();
      return;
    }
    if (e.target === text) return;
    var n = nameOf(e);
    if (n && n !== 'f') { down[n] = true; paint(); }
  });
  document.addEventListener('keyup', function (e) {
    var n = nameOf(e);
    if (n && win.hidden) { down[n] = false; paint(); }
  });
  window.addEventListener('blur', release);
  $('.win__send', win).addEventListener('click', send);
  $('.win__x', win).addEventListener('click', close);
  document.addEventListener('pointerdown', function (e) {
    if (!win.hidden && !win.contains(e.target) && !e.target.closest('.key')) close();
  });
})();
