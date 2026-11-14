(function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  // Header turns solid once the page scrolls past the top
  var header = $('.site-header');
  if (header && !header.classList.contains('always')) {
    var onScroll = function () { header.classList.toggle('solid', window.scrollY > 24); };
    window.addEventListener('scroll', onScroll, { passive: true }); onScroll();
  }

  // Mobile menu
  var menuBtn = $('#menu-toggle'), mobileNav = $('#mobile-nav');
  if (menuBtn && mobileNav) {
    var setMenu = function (open) {
      menuBtn.setAttribute('aria-expanded', String(open));
      menuBtn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      mobileNav.hidden = !open;
      if (open && header) header.classList.add('solid');
    };
    menuBtn.addEventListener('click', function () { setMenu(menuBtn.getAttribute('aria-expanded') !== 'true'); });
    mobileNav.addEventListener('click', function (e) { if (e.target.closest('a')) setMenu(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') { setMenu(false); menuBtn.focus(); }
    });
  }

  // Reveal sections as they scroll in
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var ro = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); ro.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { ro.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  // Highlight the nav or table-of-contents link for the section in view
  function spy(selector) {
    var links = $$(selector);
    if (!links.length || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        links.forEach(function (a) {
          if (a.getAttribute('href').split('#')[1] === en.target.id) a.setAttribute('aria-current', 'true');
          else a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-40% 0px -55% 0px' });
    links.forEach(function (a) {
      var id = (a.getAttribute('href') || '').split('#')[1];
      var el = id && document.getElementById(id);
      if (el) io.observe(el);
    });
  }
  spy('.nav-list a[href^="#"]');
  spy('.toc a');

  // Cursor-following glow on cards
  $$('.cap, .case').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top) + 'px');
    });
  });

  // Hero background: a slow "ledger rain" of payment-run tokens
  var canvas = $('#rain');
  if (canvas && canvas.getContext && !reduce) {
    var ctx = canvas.getContext('2d');
    var tokens = ['0', '1', '£', '✓', '↻', '0', '1', '200', 'OK', 'SQS', 'idem', 'retry', '0', '1', '✓', '→'];
    var cols = [], W = 0, H = 0, colW = 26, dpr = Math.min(window.devicePixelRatio || 1, 2), running = true, last = 0;
    var size = function () {
      var r = canvas.getBoundingClientRect(); W = r.width; H = r.height;
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.ceil(W / colW); cols = [];
      for (var i = 0; i < n; i++) cols.push({ y: Math.random() * H, v: 18 + Math.random() * 40, a: Math.random() < .35 ? .9 : .35 });
    };
    size(); window.addEventListener('resize', size);
    var draw = function (t) {
      if (!running) return;
      var dt = Math.min((t - last) / 1000, .05); last = t;
      ctx.clearRect(0, 0, W, H);
      ctx.font = '12px "JetBrains Mono", monospace';
      for (var i = 0; i < cols.length; i++) {
        var c = cols[i]; c.y += c.v * dt; if (c.y > H + 200) c.y = -Math.random() * 300;
        for (var k = 0; k < 9; k++) {
          var y = c.y - k * 18; if (y < -20 || y > H) continue;
          var fade = (1 - k / 9) * c.a * .55;
          ctx.fillStyle = k === 0 ? 'rgba(100,216,198,' + (fade + .15) + ')' : 'rgba(139,157,245,' + fade * .7 + ')';
          ctx.fillText(tokens[(i * 7 + k + Math.floor(c.y / 18)) % tokens.length], i * colW + 4, y);
        }
      }
      requestAnimationFrame(draw);
    };
    requestAnimationFrame(function (t) { last = t; draw(t); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        var vis = en[0].isIntersecting;
        if (vis && !running) { running = true; requestAnimationFrame(function (t) { last = t; draw(t); }); }
        running = vis;
      }).observe(canvas);
    }
  }

  // Terminal: retype the session (the full text is already in the page without JS)
  var term = $('#term');
  if (term && !reduce) {
    var lines = $$('.tl', term).map(function (el) { return { el: el, html: el.innerHTML, text: el.textContent }; });
    lines.forEach(function (l) { l.el.textContent = ''; });
    var li = 0;
    var typeLine = function () {
      if (li >= lines.length) return;
      var l = lines[li], isCmd = l.el.classList.contains('cmd'), i = 0;
      var step = function () {
        if (!isCmd || i >= l.text.length) { l.el.innerHTML = l.html; li++; setTimeout(typeLine, isCmd ? 260 : 140); return; }
        i++; l.el.textContent = l.text.slice(0, i); setTimeout(step, 28 + Math.random() * 40);
      };
      step();
    };
    setTimeout(typeLine, 700);
  }

  // Payment-run walkthrough: an ARIA tab list with arrow-key navigation
  var tablist = $('[role="tablist"].stages');
  if (tablist) {
    var tabs = $$('[role="tab"]', tablist);
    var select = function (tab, focus) {
      tabs.forEach(function (t) {
        var on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
      });
      if (focus) tab.focus();
    };
    tabs.forEach(function (tab, i) {
      tab.addEventListener('click', function () { select(tab, false); });
      tab.addEventListener('keydown', function (e) {
        var j = null;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % tabs.length;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + tabs.length) % tabs.length;
        if (e.key === 'Home') j = 0;
        if (e.key === 'End') j = tabs.length - 1;
        if (j !== null) { e.preventDefault(); select(tabs[j], true); }
      });
    });
  }

  // Copy buttons
  $$('[data-copy]').forEach(function (btn) {
    var status = document.getElementById(btn.getAttribute('data-status'));
    btn.addEventListener('click', function () {
      var el = document.getElementById(btn.getAttribute('data-copy'));
      var text = el.textContent.trim();
      var say = function (msg) {
        btn.textContent = msg;
        if (status) status.textContent = msg === 'Copied' ? 'Email address copied' : 'Email address selected';
        setTimeout(function () { btn.textContent = 'Copy'; }, 1800);
      };
      var fallback = function () {
        var r = document.createRange(); r.selectNodeContents(el);
        var s = window.getSelection(); s.removeAllRanges(); s.addRange(r);
        say('Selected');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { say('Copied'); }, fallback);
      } else { fallback(); }
    });
  });
})();
