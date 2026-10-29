'use strict';
const $ = id => document.getElementById(id);
const QUESTIONS_DIR = 'questions/';
const quizzes = new Map();   // name -> {name, title, desc, questions, error}
let current = null;          // quiz being played
let round = [], index = 0, log = [], checked = false;
let mode = 'quiz';            // 'quiz': random order, questions only; 'learn': repetition mode, in order with background text

/* ---------- small helpers ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k) { try { return localStorage.getItem('mdquiz:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('mdquiz:' + k, v); } catch { /* storage unavailable */ } },
};

/* ---------- Interface language ---------- */
const STRINGS = {
  en: {
    language: 'Language', theme: 'Toggle dark mode',
    loading: 'Loading quizzes…', noQuizzes: 'No quiz files found in questions/.', fileErrors: '⚠ This file has errors',
    questions: n => `${n} questions`, best: p => `Best ${p}%`,
    backAll: '← All quizzes', allQuizzes: 'All quizzes', backQuizzes: 'Back to quizzes', errorTitle: 'Something went wrong',
    quizOnly: 'Quiz only →', quizOnlyDesc: 'All questions in random order',
    learn: 'Repetition mode →', learnDesc: 'Background text with the question below it · from question 1 to the last, in order',
    quit: '✕ Quit', quitConfirm: 'Quit this quiz? Your progress will be lost.', stay: 'Keep going', leave: 'Quit',
    progress: (i, n) => `Question ${i} of ${n}`, readAloud: '🔊 Read aloud', stopReading: '⏹ Stop reading', background: 'Background',
    selectAll: 'Select all correct answers', selectOne: 'Select one answer',
    keys: 'Keys:', keySelect: 'select', keyContinue: 'continue',
    check: 'Check answer', next: 'Next →', results: 'See results →', chooseFirst: 'Choose an answer first.',
    correct: '✓ Correct!', wrong: '✗ Not quite.', showCorrect: 'The correct answer is highlighted in green.',
    perfect: 'Perfect score! 🎉', great: 'Great job!', getting: 'Getting there', practise: 'Keep practising',
    score: (r, n) => `${r} of ${n} correct`, review: 'Review your mistakes',
    retry: 'Retry missed questions', restart: 'Restart quiz',
  },
  nl: {
    language: 'Taal', theme: 'Donkere modus aan/uit',
    loading: 'Quizzen laden…', noQuizzes: 'Geen quizbestanden gevonden in questions/.', fileErrors: '⚠ Dit bestand bevat fouten',
    questions: n => `${n} vragen`, best: p => `Beste ${p}%`,
    backAll: '← Alle quizzen', allQuizzes: 'Alle quizzen', backQuizzes: 'Terug naar de quizzen', errorTitle: 'Er ging iets mis',
    quizOnly: 'Alleen quiz →', quizOnlyDesc: 'Alle vragen in willekeurige volgorde',
    learn: 'Herhaalmodus →', learnDesc: 'Achtergrondtekst met de vraag eronder · van vraag 1 tot de laatste, op volgorde',
    quit: '✕ Stoppen', quitConfirm: 'Stoppen met deze quiz? Je voortgang gaat verloren.', stay: 'Doorgaan', leave: 'Stoppen',
    progress: (i, n) => `Vraag ${i} tot en met ${n}`, readAloud: '🔊 Voorlezen', stopReading: '⏹ Stop met voorlezen', background: 'Achtergrond',
    selectAll: 'Kies alle juiste antwoorden', selectOne: 'Kies één antwoord',
    keys: 'Toetsen:', keySelect: 'kiezen', keyContinue: 'verder',
    check: 'Controleer antwoord', next: 'Volgende →', results: 'Bekijk resultaat →', chooseFirst: 'Kies eerst een antwoord.',
    correct: '✓ Goed!', wrong: '✗ Helaas, fout.', showCorrect: 'Het juiste antwoord is groen gemarkeerd.',
    perfect: 'Perfecte score! 🎉', great: 'Goed gedaan!', getting: 'Je komt er wel', practise: 'Blijf oefenen',
    score: (r, n) => `${r} van ${n} goed`, review: 'Bekijk je fouten',
    retry: 'Foute vragen opnieuw', restart: 'Quiz opnieuw starten',
  },
  de: {
    language: 'Sprache', theme: 'Dunkelmodus umschalten',
    loading: 'Quizze werden geladen…', noQuizzes: 'Keine Quizdateien in questions/ gefunden.', fileErrors: '⚠ Diese Datei enthält Fehler',
    questions: n => `${n} Fragen`, best: p => `Bestwert ${p} %`,
    backAll: '← Alle Quizze', allQuizzes: 'Alle Quizze', backQuizzes: 'Zurück zu den Quizzen', errorTitle: 'Etwas ist schiefgelaufen',
    quizOnly: 'Nur Quiz →', quizOnlyDesc: 'Alle Fragen in zufälliger Reihenfolge',
    learn: 'Wiederholungsmodus →', learnDesc: 'Hintergrundtext mit der Frage darunter · von Frage 1 bis zur letzten, der Reihe nach',
    quit: '✕ Beenden', quitConfirm: 'Quiz beenden? Dein Fortschritt geht verloren.', stay: 'Weitermachen', leave: 'Beenden',
    progress: (i, n) => `Frage ${i} von ${n}`, readAloud: '🔊 Vorlesen', stopReading: '⏹ Vorlesen stoppen', background: 'Hintergrund',
    selectAll: 'Wähle alle richtigen Antworten', selectOne: 'Wähle eine Antwort',
    keys: 'Tasten:', keySelect: 'auswählen', keyContinue: 'weiter',
    check: 'Antwort prüfen', next: 'Weiter →', results: 'Ergebnis anzeigen →', chooseFirst: 'Wähle zuerst eine Antwort.',
    correct: '✓ Richtig!', wrong: '✗ Leider falsch.', showCorrect: 'Die richtige Antwort ist grün markiert.',
    perfect: 'Volle Punktzahl! 🎉', great: 'Sehr gut!', getting: 'Auf einem guten Weg', practise: 'Weiter üben',
    score: (r, n) => `${r} von ${n} richtig`, review: 'Deine Fehler',
    retry: 'Falsche Fragen wiederholen', restart: 'Quiz neu starten',
  },
  fr: {
    language: 'Langue', theme: 'Activer ou désactiver le mode sombre',
    loading: 'Chargement des quiz…', noQuizzes: 'Aucun fichier de quiz trouvé dans questions/.', fileErrors: '⚠ Ce fichier contient des erreurs',
    questions: n => `${n} questions`, best: p => `Record ${p} %`,
    backAll: '← Tous les quiz', allQuizzes: 'Tous les quiz', backQuizzes: 'Retour aux quiz', errorTitle: 'Une erreur est survenue',
    quizOnly: 'Quiz seul →', quizOnlyDesc: 'Toutes les questions dans un ordre aléatoire',
    learn: 'Mode révision →', learnDesc: 'Texte de contexte avec la question en dessous · de la question 1 à la dernière, dans l’ordre',
    quit: '✕ Quitter', quitConfirm: 'Quitter ce quiz ? Ta progression sera perdue.', stay: 'Continuer', leave: 'Quitter',
    progress: (i, n) => `Question ${i} sur ${n}`, readAloud: '🔊 Lire à voix haute', stopReading: '⏹ Arrêter la lecture', background: 'Contexte',
    selectAll: 'Choisis toutes les bonnes réponses', selectOne: 'Choisis une réponse',
    keys: 'Touches :', keySelect: 'choisir', keyContinue: 'continuer',
    check: 'Vérifier la réponse', next: 'Suivant →', results: 'Voir les résultats →', chooseFirst: 'Choisis d’abord une réponse.',
    correct: '✓ Correct !', wrong: '✗ Pas tout à fait.', showCorrect: 'La bonne réponse est surlignée en vert.',
    perfect: 'Score parfait ! 🎉', great: 'Bravo !', getting: 'Tu y es presque', practise: 'Continue à t’entraîner',
    score: (r, n) => `${r} bonnes réponses sur ${n}`, review: 'Revois tes erreurs',
    retry: 'Refaire les questions ratées', restart: 'Recommencer le quiz',
  },
  es: {
    language: 'Idioma', theme: 'Activar o desactivar el modo oscuro',
    loading: 'Cargando cuestionarios…', noQuizzes: 'No se encontraron cuestionarios en questions/.', fileErrors: '⚠ Este archivo tiene errores',
    questions: n => `${n} preguntas`, best: p => `Mejor resultado ${p} %`,
    backAll: '← Todos los cuestionarios', allQuizzes: 'Todos los cuestionarios', backQuizzes: 'Volver a los cuestionarios', errorTitle: 'Algo salió mal',
    quizOnly: 'Solo cuestionario →', quizOnlyDesc: 'Todas las preguntas en orden aleatorio',
    learn: 'Modo repaso →', learnDesc: 'Texto de contexto con la pregunta debajo · de la pregunta 1 a la última, en orden',
    quit: '✕ Salir', quitConfirm: '¿Salir de este cuestionario? Perderás tu progreso.', stay: 'Continuar', leave: 'Salir',
    progress: (i, n) => `Pregunta ${i} de ${n}`, readAloud: '🔊 Leer en voz alta', stopReading: '⏹ Dejar de leer', background: 'Contexto',
    selectAll: 'Elige todas las respuestas correctas', selectOne: 'Elige una respuesta',
    keys: 'Teclas:', keySelect: 'elegir', keyContinue: 'continuar',
    check: 'Comprobar respuesta', next: 'Siguiente →', results: 'Ver resultados →', chooseFirst: 'Elige primero una respuesta.',
    correct: '✓ ¡Correcto!', wrong: '✗ No es correcto.', showCorrect: 'La respuesta correcta está marcada en verde.',
    perfect: '¡Puntuación perfecta! 🎉', great: '¡Muy bien!', getting: 'Vas por buen camino', practise: 'Sigue practicando',
    score: (r, n) => `${r} de ${n} correctas`, review: 'Repasa tus errores',
    retry: 'Repetir las preguntas falladas', restart: 'Reiniciar cuestionario',
  },
};
const LANG_NAMES = { en: 'English', nl: 'Nederlands', de: 'Deutsch', fr: 'Français', es: 'Español' };
// Saved choice, else the first browser language we have, else English.
let lang = [store.get('lang'), ...navigator.languages.map(l => l.slice(0, 2).toLowerCase())].find(l => l in STRINGS) || 'en';
const t = (key, ...args) => { const s = STRINGS[lang][key]; return typeof s === 'function' ? s(...args) : s; };
// Elements with data-i18n="key" get their text from STRINGS; set el.dataset.i18n to change it later.
function label(el, key) { el.dataset.i18n = key; el.textContent = t(key); return el; }
function applyLang() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
  for (const el of document.querySelectorAll('[data-i18n-title]')) { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', el.title); }
  $('lang').textContent = lang.toUpperCase();
  $('lang-menu').innerHTML = Object.entries(LANG_NAMES).map(([code, name]) =>
    `<button type="button" role="menuitemradio" lang="${code}" data-lang="${code}" aria-checked="${code === lang}"><b>${code.toUpperCase()}</b>${name}</button>`).join('');
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const calm = matchMedia('(prefers-reduced-motion: reduce)');
// Switch screens, with a cross-fade where the browser supports view transitions.
function show(id) {
  stopSpeaking();
  const swap = () => {
    for (const s of ['home', 'intro', 'quiz', 'results', 'error']) $(s).hidden = s !== id;
    window.scrollTo(0, 0);
  };
  if (document.startViewTransition && !calm.matches && $(id).hidden) return document.startViewTransition(swap).updateCallbackDone;
  swap();
  return Promise.resolve();
}
// Replay an element's entrance animation.
function animate(el) { el.classList.remove('enter'); void el.offsetWidth; el.classList.add('enter'); }
function fail(msg) { $('error-msg').textContent = msg; show('error'); }

/* ---------- Markdown (a small, safe subset: no raw HTML) ---------- */
// "images/x.png" resolves from the site root; "./x.png" or "../x.png" from the Markdown file.
function resolveUrl(src, base, image) {
  if (/^data:image\//i.test(src)) return image ? src : null;
  let u;
  try { u = new URL(src, /^\.\.?\//.test(src) ? base : document.baseURI); } catch { return null; }
  return /^https?:$/.test(u.protocol) ? u.href : null;
}
function emphasis(s) {
  return s.replace(/\*\*(.+?)\*\*|__(.+?)__/g, (_, a, b) => `<strong>${a ?? b}</strong>`)
    .replace(/\*([^*\s](?:[^*]*[^*\s])?)\*|\b_([^_]+)_\b/g, (_, a, b) => `<em>${a ?? b}</em>`);
}
function inline(s, base) {
  const re = /`([^`]+)`|!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)|\[([^\]]+)\]\(\s*([^)\s]+)\s*\)/g;
  let out = '', last = 0, m;
  while ((m = re.exec(s))) {
    out += emphasis(esc(s.slice(last, m.index)));
    if (m[1] != null) out += `<code>${esc(m[1])}</code>`;
    else if (m[3] != null) {
      const url = resolveUrl(m[3], base, true);
      out += url ? `<img class="figure" src="${esc(url)}" alt="${esc(m[2])}" loading="lazy">` : esc(m[0]);
    } else {
      const url = resolveUrl(m[5], base, false);
      out += url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${emphasis(esc(m[4]))}</a>` : esc(m[0]);
    }
    last = re.lastIndex;
  }
  return out + emphasis(esc(s.slice(last)));
}
function blocks(text, base) {
  const lines = text.split('\n'), out = [];
  let para = [], list = null;
  const flushPara = () => { if (para.length) out.push(`<p>${para.map(l => inline(l, base)).join('<br>')}</p>`); para = []; };
  const flushList = () => { if (list) out.push(`<${list.tag}>${list.items.map(i => `<li>${inline(i, base)}</li>`).join('')}</${list.tag}>`); list = null; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      flushPara(); flushList();
      const code = [];
      while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i]);
      out.push(`<pre><code>${esc(code.join('\n'))}</code></pre>`);
      continue;
    }
    // Table: a "| a | b |" row followed by a "|---|---|" separator line.
    if (/^\s*\|/.test(line) && /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(lines[i + 1] ?? '')) {
      flushPara(); flushList();
      const cells = l => l.trim().replace(/^\||\|$/g, '').split('|').map(c => inline(c.trim(), base));
      const head = cells(line), rows = [];
      for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows.push(cells(lines[i]));
      i--;
      out.push(`<div class="table-wrap"><table><thead><tr>${head.map(c => `<th>${c}</th>`).join('')}</tr></thead>`
        + `<tbody>${rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
      continue;
    }
    const h = line.match(/^(#{1,6})\s+(.*)$/);
    if (h) {
      flushPara(); flushList();
      out.push(`<h${h[1].length}>${inline(h[2], base)}</h${h[1].length}>`);
      continue;
    }
    const li = line.match(/^\s*(?:([-*+])|\d+[.)])\s+(.*)$/);
    if (li) {
      flushPara();
      const tag = li[1] ? 'ul' : 'ol';
      if (list && list.tag !== tag) flushList();
      (list ??= { tag, items: [] }).items.push(li[2]);
    } else if (!line.trim()) { flushPara(); flushList(); }
    else { flushList(); para.push(line.trim()); }
  }
  flushPara(); flushList();
  return out.join('');
}

/* ---------- Quiz file parser ---------- */
const SETTINGS = { 'shuffle-questions': true, 'shuffle-answers': true, language: '' };
// Optional front matter at the very top of the file:
// ---
// shuffle-answers: false
// language: nl
// ---
function frontMatter(lines) {
  const settings = { ...SETTINGS };
  if (lines[0]?.trim() !== '---') return settings;
  const end = lines.indexOf('---', 1);
  if (end < 0) throw Error('Settings block at the top is not closed with "---".');
  for (const line of lines.splice(0, end + 1).slice(1, -1)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    const m = line.match(/^\s*([\w-]+)\s*:\s*(.*?)\s*$/), key = m?.[1].toLowerCase();
    if (!m || !(key in SETTINGS)) throw Error(`Unknown setting "${line.trim()}". Allowed: ${Object.keys(SETTINGS).join(', ')}.`);
    const value = m[2].toLowerCase();
    if (key === 'language') {
      if (!/^[a-z]{2,3}(-[a-z]{2})?$/.test(value)) throw Error(`Setting "language" must be a language code such as nl, en or de-DE.`);
      settings.language = value;
      continue;
    }
    if (!/^(true|false|yes|no|on|off)$/.test(value)) throw Error(`Setting "${key}" must be true or false.`);
    settings[key] = /^(true|yes|on)$/.test(value);
  }
  return settings;
}
function parse(md, base) {
  const lines = md.replace(/\r\n?/g, '\n').split('\n');
  const settings = frontMatter(lines);
  let title = '', q = null, mode = '', fence = false;
  const desc = [], raw = [];
  for (const line of lines) {
    const isFence = /^\s*```/.test(line), code = fence || isFence;
    if (isFence) fence = !fence;
    if (!code && !title && !q && /^#\s+/.test(line)) { title = line.replace(/^#\s+/, '').trim(); continue; }
    // Inside background-info, headings belong to the background text until "question:" or the answers.
    if (!code && mode === 'info' && /^#{1,6}\s+/.test(line)) { q.info.push(line); continue; }
    if (!code && /^##\s+/.test(line)) {
      q = { heading: line.replace(/^##\s+/, '').replace(/^\d+[.)]\s+/, '').trim(), prompt: [], question: null, info: [], answers: [], explain: [] };
      raw.push(q); mode = 'prompt'; continue;
    }
    if (!code && /^\s*(-{3,}|\*{3,})\s*$/.test(line)) continue;
    if (!q) { desc.push(line); continue; }
    const a = !code && line.match(/^\s*[-*+]\s+\[([xX ])\]\s*(.*)$/);
    if (a) { q.answers.push({ correct: a[1] !== ' ', text: a[2] }); mode = 'answers'; continue; }
    const qm = !code && line.match(/^\s*question\s*:\s*(.*)$/i);
    if (qm) { q.question = [qm[1]]; mode = 'question'; continue; }
    const b = !code && line.match(/^\s*background-info\s*:\s*(.*)$/i);
    if (b) { q.info.push(b[1]); mode = 'info'; continue; }
    const e = !code && line.match(/^\s*(?:Explanation|Uitleg)\s*:\s*(.*)$/i);
    if (e) { q.explain.push(e[1]); mode = 'explain'; continue; }
    if (mode === 'prompt') q.prompt.push(line);
    else if (mode === 'question') q.question.push(line);
    else if (mode === 'info') q.info.push(line);
    else if (mode === 'explain') q.explain.push(line);
    else if (line.trim()) {
      if (/^\s{2,}/.test(line)) q.answers.at(-1).text += '\n' + line.trim(); // continued answer
      else { q.explain.push(line); mode = 'explain'; }
    }
  }
  const errors = [];
  const questions = raw.map((q, i) => {
    if (q.question) q.info.unshift(...q.prompt); // loose text under the title counts as background
    const n = i + 1, right = q.answers.filter(a => a.correct).length;
    if (q.answers.length < 2) errors.push(`Question ${n}: needs at least two "- [ ]" answers.`);
    else if (!right) errors.push(`Question ${n}: mark at least one answer as correct with "- [x]".`);
    else if (right === q.answers.length) errors.push(`Question ${n}: all answers are marked correct.`);
    return {
      n,
      multi: right > 1,
      // "## Title" + "question:" makes the heading a subject title; without "question:" the heading is the question.
      title: q.question ? inline(q.heading, base) : '',
      html: blocks((q.question ?? [q.heading, ...q.prompt]).join('\n').trim(), base),
      info: blocks(q.info.join('\n').trim(), base),
      explain: blocks(q.explain.join('\n').trim(), base),
      answers: q.answers.map(a => ({ correct: a.correct, html: inline(a.text, base).replace(/\n/g, '<br>') })),
    };
  });
  if (!questions.length) errors.push('No questions found. Start each question with "## ", and mark answers with "- [x]" / "- [ ]".');
  if (errors.length) throw Error(errors.join('\n'));
  return { title: title || 'Untitled quiz', desc: blocks(desc.join('\n').trim(), base), settings, questions };
}

/* ---------- Finding quizzes ---------- */
// Uses questions/index.json when present, otherwise the server's directory listing
// (works with `python3 -m http.server` and Nginx `autoindex on`).
async function discover() {
  const dir = new URL(QUESTIONS_DIR, document.baseURI);
  try {
    const r = await fetch(new URL('index.json', dir), { cache: 'no-cache' });
    if (r.ok) return (await r.json()).map(f => String(f).replace(/^questions\//, ''));
  } catch { /* no manifest */ }
  const r = await fetch(dir, { cache: 'no-cache' });
  if (!r.ok) throw Error(`Could not list ${QUESTIONS_DIR} (HTTP ${r.status}). Add a questions/index.json file listing the quiz files.`);
  const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
  const names = [...doc.querySelectorAll('a[href]')]
    .map(a => new URL(a.getAttribute('href'), dir))
    .filter(u => u.href.startsWith(dir.href) && /\.(md|markdown)$/i.test(u.pathname))
    .map(u => decodeURIComponent(u.pathname.slice(dir.pathname.length)));
  return [...new Set(names)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
async function loadQuiz(name) {
  if (quizzes.has(name)) return quizzes.get(name);
  const url = new URL(QUESTIONS_DIR + encodeURI(name), document.baseURI);
  let quiz;
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) throw Error(`Cannot load ${name} (HTTP ${r.status}).`);
    quiz = { name, ...parse(await r.text(), url.href) };
  } catch (e) {
    quiz = { name, title: name.replace(/\.(md|markdown)$/i, ''), error: e.message };
  }
  quizzes.set(name, quiz);
  return quiz;
}

/* ---------- Screens ---------- */
const hashFor = name => '#/quiz/' + encodeURIComponent(name);
function bestText(name) {
  const best = store.get('best:' + name);
  return best != null ? t('best', best) : '';
}
// header.md (next to index.html) is the site name in the top bar and the tab title; it is optional.
let siteTitle = '';
async function renderHeader() {
  const url = new URL('header.md', document.baseURI);
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return;
    const text = (await r.text()).split(/\r?\n/).map(l => l.replace(/^#+\s*/, '').trim()).filter(Boolean).join(' ');
    $('header-md').innerHTML = inline(text, url.href);
    siteTitle = $('header-md').textContent.trim();
  } catch { /* no header.md */ }
}

// main.md (next to index.html) is shown above the quiz list; it is optional.
async function renderMain() {
  const url = new URL('main.md', document.baseURI);
  try {
    const r = await fetch(url, { cache: 'no-cache' });
    if (!r.ok) return;
    $('main-md').innerHTML = blocks((await r.text()).replace(/\r\n?/g, '\n').trim(), url.href);
    $('main-md').hidden = false;
  } catch { /* no main.md */ }
}
async function renderHome() {
  show('home');
  renderMain();
  const grid = $('quizzes');
  let names;
  try { names = await discover(); } catch (e) { grid.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
  if (!names.length) { grid.innerHTML = `<p class="muted">${t('noQuizzes')}</p>`; return; }
  const list = await Promise.all(names.map(loadQuiz));
  grid.innerHTML = list.map(q => q.error
    ? `<a class="card broken" href="${hashFor(q.name)}"><h2>${esc(q.title)}</h2><span class="muted small">${t('fileErrors')}</span></a>`
    : `<a class="card" href="${hashFor(q.name)}"><h2>${esc(q.title)}</h2>
        <div class="meta"><span class="badge">${t('questions', q.questions.length)}</span><span>${bestText(q.name)}</span></div></a>`).join('');
}
async function renderIntro(name) {
  const quiz = await loadQuiz(name);
  if (quiz.error) return fail(`${name}\n\n${quiz.error}`);
  current = quiz;
  $('intro-title').textContent = quiz.title;
  $('intro-desc').innerHTML = quiz.desc;
  const best = bestText(name);
  $('intro-meta').innerHTML = `<span class="badge">${t('questions', quiz.questions.length)}</span>${best ? `<span>${best}</span>` : ''}`;
  document.title = siteTitle ? `${quiz.title} · ${siteTitle}` : quiz.title;
  show('intro').then(() => $('begin-quiz').focus());
}

function start(questions, newMode = mode) {
  mode = newMode;
  const shuffleA = current.settings['shuffle-answers'];
  // Repetition mode always goes from the first question to the last, in file order.
  const ordered = mode === 'learn' ? [...questions].sort((a, b) => a.n - b.n)
    : current.settings['shuffle-questions'] ? shuffle(questions) : [...questions];
  // Short quizzes are padded to at least MIN_QUESTIONS by repeating them, so every
  // round has a reasonable length. Each extra cycle is reshuffled in shuffle mode,
  // and we avoid showing the same question twice in a row across a cycle boundary.
  const MIN_QUESTIONS = 20;
  const full = ordered.slice();
  while (ordered.length && full.length < MIN_QUESTIONS) {
    const cycle = (mode !== 'learn' && current.settings['shuffle-questions'])
      ? shuffle(questions) : ordered.slice();
    if (full.length && cycle.length > 1 && cycle[0] === full[full.length - 1]) {
      [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    }
    full.push(...cycle);
  }
  if (ordered.length && ordered.length < MIN_QUESTIONS) full.length = MIN_QUESTIONS;
  round = full
    .map(q => ({ ...q, answers: shuffleA ? shuffle(q.answers) : q.answers }));
  index = 0; log = [];
  show('quiz');
  renderQuestion();
}
function renderQuestion() {
  checked = false;
  const q = round[index], type = q.multi ? 'checkbox' : 'radio';
  relabelQuiz();
  $('progress-bar').style.width = `${100 * index / round.length}%`;
  const score = log.filter(l => l.ok).length;
  $('streak').textContent = log.length ? `✓ ${score}/${log.length}` : '';
  // Repetition mode shows the background text above the question.
  const withInfo = mode === 'learn' && q.info;
  stopSpeaking();
  $('info').innerHTML = withInfo ? `<div class="info-head"><span class="label" data-i18n="background">${t('background')}</span>`
    + (speech ? `<button id="speak" class="speak" type="button" data-i18n="readAloud">${t('readAloud')}</button>` : '')
    + `</div>${q.title ? `<h2 class="info-title">${q.title}</h2>` : ''}${q.info}` : '';
  $('info').hidden = !withInfo;
  label($('kind'), q.multi ? 'selectAll' : 'selectOne');
  $('question').innerHTML = q.html;
  $('answers').className = 'answers';
  $('answers').innerHTML = q.answers.map((a, i) => `
    <label class="answer${q.multi ? ' multi' : ''}">
      <input type="${type}" name="answer" value="${i}">
      <span class="key">${String.fromCharCode(65 + i)}</span>
      <span class="text">${a.html}</span>
    </label>`).join('');
  $('feedback').className = ''; $('feedback').innerHTML = '';
  $('check').hidden = !q.multi; $('next').hidden = true;   // single-answer checks on click
  label($('next'), index === round.length - 1 ? 'results' : 'next');
  animate($('stage'));
}
function relabelQuiz() {
  if (round.length) $('progress-text').textContent = t('progress', index + 1, round.length);
}
function check() {
  if (checked) return;
  const q = round[index];
  const inputs = [...$('answers').querySelectorAll('input')];
  const selected = inputs.filter(i => i.checked).map(i => Number(i.value));
  if (!selected.length) {
    $('feedback').className = 'warn';
    $('feedback').innerHTML = `<span data-i18n="chooseFirst">${t('chooseFirst')}</span>`;
    return;
  }
  const ok = q.answers.every((a, i) => a.correct === selected.includes(i));
  log.push({ q, selected, ok });
  $('answers').classList.add('done');
  $('answers').querySelectorAll('.answer').forEach((el, i) => {
    if (q.answers[i].correct) el.classList.add('correct');
    else if (selected.includes(i)) el.classList.add('wrong');
    inputs[i].disabled = true;
  });
  const fallback = ok ? '' : `<p data-i18n="showCorrect">${t('showCorrect')}</p>`;
  $('feedback').className = ok ? 'ok' : 'bad';
  $('feedback').innerHTML = `<strong class="title" data-i18n="${ok ? 'correct' : 'wrong'}">${t(ok ? 'correct' : 'wrong')}</strong>${q.explain || fallback}`;
  $('progress-bar').style.width = `${100 * (index + 1) / round.length}%`;
  checked = true;
  $('check').hidden = true; $('next').hidden = false;
  $('next').focus({ preventScroll: true });
  // On small screens the feedback is often below the fold.
  $('feedback').scrollIntoView({ block: 'nearest', behavior: calm.matches ? 'auto' : 'smooth' });
}
function next() {
  if (++index === round.length) finish();
  else { renderQuestion(); window.scrollTo(0, 0); }
}
function finish() {
  const right = log.filter(l => l.ok).length, pct = Math.round(100 * right / log.length);
  const missed = log.filter(l => !l.ok);
  // Only full runs count towards the best score, not retries of missed questions.
  if (mode === 'quiz' && round.length === current.questions.length) {
    const prev = Number(store.get('best:' + current.name) ?? -1);
    if (pct > prev) store.set('best:' + current.name, pct);
  }
  $('ring').style.setProperty('--p', 0);
  requestAnimationFrame(() => requestAnimationFrame(() => $('ring').style.setProperty('--p', pct)));
  $('ring').style.setProperty('--c', pct >= 80 ? 'var(--ok)' : pct >= 50 ? 'var(--accent)' : 'var(--bad)');
  $('pct').textContent = pct + '%';
  label($('verdict'), pct === 100 ? 'perfect' : pct >= 80 ? 'great' : pct >= 50 ? 'getting' : 'practise');
  relabelResults();
  $('retry').hidden = !missed.length;
  $('review').innerHTML = missed.length ? `<h2 data-i18n="review">${t('review')}</h2>` + missed.map(({ q, selected }) => `
    <div class="review-item">
      <div class="q">${q.html}</div>
      <ul>${q.answers.map((a, i) => a.correct ? `<li class="right">✓ ${a.html}</li>`
        : selected.includes(i) ? `<li class="picked">${a.html}</li>` : '').join('')}</ul>
      ${q.explain ? `<div class="explain">${q.explain}</div>` : ''}
    </div>`).join('') : '';
  show('results');
}
function relabelResults() {
  $('score').textContent = `${t('score', log.filter(l => l.ok).length, log.length)} · ${current.title}`;
}

/* ---------- Read the background text aloud (Web Speech API, built into the browser) ---------- */
const speech = window.speechSynthesis;
let reading = false;
function setSpeakLabel() { if ($('speak')) label($('speak'), reading ? 'stopReading' : 'readAloud'); }
function stopSpeaking() {
  if (!speech) return;
  reading = false;
  speech.cancel();
  document.querySelectorAll('.reading').forEach(el => el.classList.remove('reading'));
  setSpeakLabel();
}
function voiceFor(code) {
  const voices = speech.getVoices(), c = code.toLowerCase();
  return voices.find(v => v.lang.toLowerCase().replace('_', '-') === c)
    || voices.find(v => v.lang.toLowerCase().startsWith(c.slice(0, 2)) && v.localService)
    || voices.find(v => v.lang.toLowerCase().startsWith(c.slice(0, 2)));
}
// Speaks heading by heading, paragraph by paragraph (and sentence by sentence for long ones):
// short pieces avoid browsers cutting off long speech, and let us highlight what is being read.
function speakInfo() {
  stopSpeaking();
  const code = current.settings.language || lang, voice = voiceFor(code);
  const parts = [...$('info').querySelectorAll('.info-title, h1, h2, h3, h4, h5, h6, p, li, tr')]
    .map(el => ({ el, text: (el.tagName === 'TR' ? [...el.cells].map(c => c.innerText).join(', ') : el.innerText).trim() }))
    .filter(p => p.text);
  const utterances = parts.flatMap(({ el, text }) => (text.match(/[^.!?]+[.!?]*\s*/g) || [text]).map(sentence => {
    const u = new SpeechSynthesisUtterance(sentence.trim());
    u.lang = code; if (voice) u.voice = voice;
    u.onstart = () => { document.querySelectorAll('.reading').forEach(e => e.classList.remove('reading')); el.classList.add('reading'); };
    return u;
  }));
  if (!utterances.length) return;
  utterances.at(-1).onend = () => { if (reading) stopSpeaking(); };
  reading = true;
  setSpeakLabel();
  utterances.forEach(u => speech.speak(u));
}
if (speech) speech.getVoices(); // starts loading the voice list
$('info').addEventListener('click', e => { if (e.target.closest('#speak')) reading ? stopSpeaking() : speakInfo(); });
window.addEventListener('pagehide', stopSpeaking);

/* ---------- Events ---------- */
$('begin-quiz').onclick = () => start(current.questions, 'quiz');
$('begin-learn').onclick = () => start(current.questions, 'learn');
$('check').onclick = check;
$('next').onclick = next;
$('answers').onsubmit = e => e.preventDefault();
// Single-answer questions are checked the moment an option is picked (no Check button).
$('answers').addEventListener('change', e => {
  const q = round[index];
  if (!checked && q && !q.multi && e.target.type === 'radio' && e.target.checked) check();
});
$('retry').onclick = () => start(log.filter(l => !l.ok).map(l => l.q));
$('restart').onclick = () => start(current.questions);
$('quit').onclick = e => {
  e.preventDefault();
  if (log.length) $('confirm-quit').showModal();
  else renderIntro(current.name);
};
// The dialog's form closes it; Esc also closes it and keeps you in the quiz.
$('confirm-quit').querySelector('form').onsubmit = e => {
  if (e.submitter?.value === 'quit') renderIntro(current.name);
};
document.addEventListener('keydown', e => {
  if ($('quiz').hidden || $('lightbox').open || $('confirm-quit').open || $('lang-menu').matches(':popover-open') || e.ctrlKey || e.metaKey || e.altKey) return;
  const n = Number(e.key);
  if (n >= 1 && n <= 9 && !checked) {
    const input = $('answers').querySelectorAll('input')[n - 1];
    if (input) {
      input.checked = input.type === 'radio' ? true : !input.checked; input.focus();
      if (!round[index].multi) check();   // single-answer: check right away
    }
  } else if (e.key === 'Enter') {
    e.preventDefault();
    checked ? next() : check();
  }
});

// Click an image to see it full size (answer images select the answer instead).
document.addEventListener('click', e => {
  const img = e.target.closest('img.figure');
  if (img && !img.closest('.answer, .brand')) {
    const box = $('lightbox');
    box.querySelector('img').src = img.src;
    box.querySelector('img').alt = img.alt;
    box.showModal();
  } else if (e.target.closest('#lightbox')) $('lightbox').close();
});

// Theme: follows the system, the button overrides it.
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  for (const m of document.querySelectorAll('meta[name="theme-color"]')) m.content = t === 'dark' ? '#0b1020' : '#f4f6fb';
}
setTheme(store.get('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
$('theme').onclick = () => {
  const t = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(t); store.set('theme', t);
};

// Language: follows the browser, the menu in the top bar changes it.
$('lang-menu').onclick = e => {
  const pick = e.target.closest('[data-lang]');
  if (!pick) return;
  $('lang-menu').hidePopover();
  lang = pick.dataset.lang;
  store.set('lang', lang);
  applyLang();
  if (!$('quiz').hidden) relabelQuiz();
  else if (!$('results').hidden) relabelResults();
  else if (!$('home').hidden || !$('intro').hidden) route();
};
applyLang();

/* ---------- Routing: #/quiz/<file> or home ---------- */
function route() {
  document.title = siteTitle || 'Quiz';
  const m = location.hash.match(/^#\/quiz\/(.+)$/);
  if (m) renderIntro(decodeURIComponent(m[1]));
  else renderHome();
}
window.addEventListener('hashchange', route);
renderHeader().finally(route);
