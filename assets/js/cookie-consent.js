/* Cookie consent banner for italiaander.net (Google Consent Mode v2).
 *
 * Every page sets the consent default in its <head> (denied unless the visitor
 * accepted earlier). This script shows the banner when no choice is stored yet,
 * updates consent when the visitor chooses, and adds a "Cookie settings" link
 * so the choice can be changed later. Any element with [data-cookie-settings]
 * also reopens the banner.
 *
 * Text follows the page language: Dutch on <html lang="nl">, English otherwise.
 */
(function () {
  var KEY = 'cookie-consent';
  var nl = (document.documentElement.lang || '').toLowerCase().indexOf('nl') === 0;
  var t = nl ? {
    text: 'Deze site gebruikt cookies van Google Analytics om te zien hoe de site wordt gebruikt. Die cookies worden alleen geplaatst als je akkoord gaat.',
    accept: 'Accepteren', decline: 'Weigeren', more: 'Meer info',
    settings: 'Cookie-instellingen', label: 'Cookiemelding'
  } : {
    text: 'This site uses Google Analytics cookies to see how the site is used. They are only placed if you agree.',
    accept: 'Accept', decline: 'Decline', more: 'More info',
    settings: 'Cookie settings', label: 'Cookie notice'
  };

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return null; } }
  function store(v) { try { localStorage.setItem(KEY, v); } catch (e) {} }

  function gtag() { (window.dataLayer = window.dataLayer || []).push(arguments); }

  // Remove Google Analytics cookies that may remain from an earlier "accept".
  function clearGaCookies() {
    var host = location.hostname, parts = host.split('.');
    var domains = ['', host, '.' + host];
    if (parts.length > 1) domains.push('.' + parts.slice(-2).join('.'));
    document.cookie.split(';').forEach(function (c) {
      var name = c.split('=')[0].trim();
      if (name.indexOf('_ga') !== 0 && name.indexOf('_gid') !== 0) return;
      domains.forEach(function (d) {
        document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/' + (d ? '; domain=' + d : '');
      });
    });
  }

  function choose(granted) {
    store(granted ? 'granted' : 'denied');
    gtag('consent', 'update', { analytics_storage: granted ? 'granted' : 'denied' });
    if (!granted) clearGaCookies();
    hide();
  }

  var css =
    '.cc-banner{position:fixed;left:50%;bottom:16px;transform:translateX(-50%);z-index:2147483000;' +
    'width:min(720px,calc(100% - 32px));box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;gap:12px 20px;' +
    'padding:16px 20px;border-radius:16px;border:1px solid rgba(255,255,255,.12);' +
    'background:rgba(14,14,24,.94);color:#ececf4;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);' +
    'box-shadow:0 18px 50px rgba(0,0,0,.45);font:400 14px/1.55 Inter,system-ui,-apple-system,"Segoe UI",sans-serif;text-align:left}' +
    '.cc-banner[hidden]{display:none}' +
    '.cc-banner p{flex:1 1 280px;margin:0}' +
    '.cc-banner a{color:#a78bfa;text-decoration:underline;text-underline-offset:2px}' +
    '.cc-actions{display:flex;gap:10px;flex:0 0 auto}' +
    '.cc-btn{min-width:110px;padding:9px 16px;border-radius:10px;border:1px solid rgba(167,139,250,.55);' +
    'background:rgba(167,139,250,.14);color:#ececf4;font-family:inherit;font-size:14px;font-weight:600;line-height:1.2;cursor:pointer;transition:background .2s,border-color .2s}' +
    '.cc-btn:hover{background:rgba(167,139,250,.28);border-color:#a78bfa}' +
    '.cc-btn:focus-visible{outline:2px solid #22d3ee;outline-offset:2px}' +
    '@media (max-width:520px){.cc-actions{width:100%}.cc-btn{flex:1}}' +
    '.cc-settings-link{background:none;border:0;padding:0;font:inherit;color:inherit;cursor:pointer;text-decoration:underline;text-underline-offset:2px}' +
    '.cc-settings-wrap{text-align:center;padding:16px;font:400 13px/1.4 system-ui,sans-serif;opacity:.75}';

  var banner;

  function build() {
    var style = document.createElement('style');
    style.textContent = css;
    document.head.appendChild(style);

    banner = document.createElement('div');
    banner.className = 'cc-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', t.label);
    banner.hidden = true;
    banner.innerHTML =
      '<p>' + t.text + ' <a href="/about/#cookies">' + t.more + '</a></p>' +
      '<div class="cc-actions">' +
      '<button type="button" class="cc-btn" data-cc="decline">' + t.decline + '</button>' +
      '<button type="button" class="cc-btn" data-cc="accept">' + t.accept + '</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-cc]');
      if (b) choose(b.getAttribute('data-cc') === 'accept');
    });
    document.body.appendChild(banner);

    addSettingsLink();

    document.addEventListener('click', function (e) {
      var el = e.target.closest('[data-cookie-settings]');
      if (el) { e.preventDefault(); show(); }
    });
  }

  // Put a "Cookie settings" link in the site footer, or at the end of the page.
  function addSettingsLink() {
    if (document.querySelector('.cc-settings-link')) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'cc-settings-link';
    btn.setAttribute('data-cookie-settings', '');
    btn.textContent = t.settings;
    var links = document.querySelector('footer .site-links');
    if (links) { links.appendChild(btn); return; }
    var wrap = document.createElement('div');
    wrap.className = 'cc-settings-wrap';
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
  }

  function show() { banner.hidden = false; banner.querySelector('[data-cc="accept"]').focus({ preventScroll: true }); }
  function hide() { banner.hidden = true; }

  function init() {
    build();
    if (!read()) banner.hidden = false;
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
