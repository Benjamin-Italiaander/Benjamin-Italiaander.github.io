/* Shared script for italiaander.net */
(function () {
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  // Reveal on scroll
  var els = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function (el) { io.observe(el); });
  } else {
    els.forEach(function (el) { el.classList.add('in'); });
  }

  // Seamless marquee: duplicate the tags once
  var track = document.getElementById('track');
  if (track) track.innerHTML += track.innerHTML;

  // Mouse-follow glow + subtle tilt on cards
  document.querySelectorAll('.glow').forEach(function (card) {
    var tilt = card.classList.contains('card') && !reduced;
    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
      if (tilt && e.pointerType === 'mouse') {
        var rx = ((y / r.height) - .5) * -8, ry = ((x / r.width) - .5) * 8;
        card.style.transform = 'perspective(900px) rotateX(' + rx + 'deg) rotateY(' + ry + 'deg) translateY(-4px)';
      }
    });
    card.addEventListener('pointerleave', function () { card.style.transform = ''; });
  });

  // Mobile menu toggle + mark the current page in the menu
  var nav = document.querySelector('.topnav');
  var btn = nav && nav.querySelector('.menu-btn');
  if (btn) {
    btn.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      btn.setAttribute('aria-expanded', open);
      btn.firstElementChild.className = open ? 'bi bi-x-lg' : 'bi bi-list';
    });
    nav.querySelectorAll('#menu a').forEach(function (a) {
      if (a.pathname === location.pathname && !a.hash) a.setAttribute('aria-current', 'page');
      a.addEventListener('click', function () {
        nav.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.firstElementChild.className = 'bi bi-list';
      });
    });
  }

  if (reduced) return;

  // Rotating roles typewriter
  var roles = ['Linux Fanatic', 'Network Engineer', 'Open Infrastructure Enthusiast', 'Local AI Enthusiast'];
  var typed = document.getElementById('typed');
  if (typed) {
  var ri = 0, ci = roles[0].length, deleting = true;
  function tick() {
    if (deleting) {
      ci--;
      if (ci <= 0) { deleting = false; ri = (ri + 1) % roles.length; }
    } else {
      ci++;
    }
    typed.textContent = roles[ri].slice(0, Math.max(ci, 0));
    var delay = deleting ? 35 : 75;
    if (!deleting && ci >= roles[ri].length) { deleting = true; delay = 2200; }
    setTimeout(tick, delay);
  }
  setTimeout(tick, 2400);
  }

  // Terminal typing animation (static content stays if JS is off)
  var term = document.getElementById('term');
  if (!term) return;
  var lines = [
    ['cmd', 'whoami'], ['out', 'benjamin-italiaander', 'o'],
    ['cmd', 'cat interests.txt'], ['out', 'linux · networking · local-ai · open-infra', 'h'],
    ['cmd', 'ping future'], ['out', '64 bytes from digital-independence: time=0.42 ms', 'o'],
    ['cmd', 'echo $MOTTO'], ['out', 'Building the infrastructure that should already exist.', 'h']
  ];
  term.innerHTML = '';
  var caret = document.createElement('span'); caret.className = 'caret';
  function span(cls, txt) { var s = document.createElement('span'); s.className = cls; s.textContent = txt; return s; }
  function prompt() { term.appendChild(span('p', '~ $')); term.appendChild(document.createTextNode(' ')); }
  var li = 0;
  function next() {
    if (li >= lines.length) { prompt(); term.appendChild(caret); return; }
    var l = lines[li++];
    if (l[0] === 'cmd') {
      prompt();
      var c = span('c', ''); term.appendChild(c); term.appendChild(caret);
      var i = 0;
      (function type() {
        c.textContent = l[1].slice(0, ++i);
        if (i < l[1].length) setTimeout(type, 55 + Math.random() * 60);
        else setTimeout(function () { caret.remove(); term.appendChild(document.createTextNode('\n')); next(); }, 300);
      })();
    } else {
      term.appendChild(span(l[2], l[1])); term.appendChild(document.createTextNode('\n'));
      setTimeout(next, 450);
    }
  }
  setTimeout(next, 900);
})();
