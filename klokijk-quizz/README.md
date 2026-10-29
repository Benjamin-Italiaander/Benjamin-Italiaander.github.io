# Static Markdown Quiz

A client-side quiz site. No database, build step, backend, npm or external CDN.
Every Markdown file in `questions/` becomes its own quiz.

## Run

From this directory:

```sh
python3 -m http.server 8080
```

Open http://localhost:8080. Opening `index.html` straight from disk (`file://`) does not work, because browsers block `fetch` there.

## Adding a quiz

Drop a `.md` file into `questions/`. The home page finds it automatically through the
server's directory listing. This works with `python3 -m http.server` and with Nginx when `autoindex on;` is set for `/questions/`.

If your host has no directory listing (GitHub Pages, Netlify, Nginx without autoindex), add
`questions/index.json` listing the files:

```json
["klein-vaarbewijs-quiz.md", "networking-example.md"]
```

You can create it with: `cd questions && ls *.md | jq -R . | jq -s . > index.json`

## Site name

`header.md` (next to `index.html`) is shown in the top bar and used as the browser tab title.
Keep it to one line; it may contain an image, e.g. a logo: `![logo](images/logo.png) My quizzes`.

## Home page text

`main.md` (next to `index.html`) is shown at the top of the home page, above the quiz list.
It supports the same Markdown as the quizzes, including headings and images. Leave it out to show only the quiz list.

## Quiz format

See `questions/01-klein-vaarbewijs-quiz.md`. Each question is a block like this:

```markdown
## Rompvormen

background-info:
Een knikspant is heel geschikt voor het kleine binnenwater.
Op ruim water met veel golfslag is een rondspant aan te bevelen.

question: Het meest geschikt voor golven is een:

- [ ] Knikspantschip.
- [x] Rondspantschip.

Explanation: Een rondspant vaart rustiger door de golven.
```

- `# Title`: the quiz name. Any text after it, before the first question, becomes the description.
- `## Subject title`: starts a new question. No numbers needed; the order in the file is the order in repetition mode. The title is shown above the background text.
- `background-info:` starts the background text for repetition mode. It can be several lines and contain images, lists, tables and headings (`#`, `##`, `###`); headings here stay part of the background text until `question:`.
- `question:` starts the question text. It runs until the answers.
- `- [x]` marks a correct answer and `- [ ]` an incorrect one.
- More than one `[x]` makes it a "select all that apply" question.
- `Explanation:` (or `Uitleg:`) after the answers is shown once the question is answered.
- Older files still work: without a `question:` line, the `##` line itself is the question (a leading number such as `## 3.` is removed).
- `---` between questions is optional.
- You can use `**bold**`, `*italic*`, `` `code` ``, `[links](https://…)`, lists and code blocks.

### Settings

An optional block at the very top of the file (before the `#` title):

```markdown
---
shuffle-questions: false
shuffle-answers: false
---
# My quiz
```

| Setting             | Default | Effect                                                         |
|---------------------|---------|----------------------------------------------------------------|
| `shuffle-questions` | `true`  | Ask the questions in a random order in quiz-only mode (repetition mode is always in order) |
| `shuffle-answers`   | `true`  | Show each question's answers in a random order (turn off for "All of the above" style answers) |
| `language`          | interface language | Language of the quiz text, e.g. `nl`, `en`, `de`. Used to pick the voice for *Read aloud* |

Values can be `true`/`false`, `yes`/`no` or `on`/`off`. An unknown setting is reported as an error, which catches typos.

### Images

```markdown
![Alt text](images/diagram.png)      ← relative to the site root
![Alt text](./pictures/sign.jpg)     ← relative to the Markdown file
![Alt text](https://example.com/x.png)
```

Images work in questions, in answers (`- [x] ![alt](images/a.png)`) and in explanations.
Click an image in a question to enlarge it.

## Modes

The quiz's start page offers two modes:

- **Quiz only**: just the questions, in random order. Only this mode counts towards your best score.
- **Repetition mode**: goes from the first question to the last, in file order. Each question shows its background text with the question below it. Questions without a `background-info:` block are shown directly.

## Features

- Answers and questions are shuffled, unless the file's settings turn that off
- Keyboard: `1`–`9` select an answer, `Enter` checks or goes to the next question
- The results page lists the questions you got wrong, and you can retry only those
- Your best score per quiz is stored in your browser
- Light and dark mode
- Responsive: on wide screens repetition mode shows the background text beside the question; on phones the Check/Next button stays at the bottom of the screen
- *Read aloud* button on the background text (repetition mode), using the browser's built-in speech. It reads in the quiz's `language`; which voices are available depends on the device
- Smooth screen transitions and animations (turned off when the system asks for reduced motion)
- Interface in English, Dutch, German, French or Spanish: pick one with the language button in the top bar (the first visit follows the browser's language). Only the buttons and labels change; the quiz content stays as written in the Markdown. To add a language, add a block to `STRINGS` and a name to `LANG_NAMES` in `quiz.js`

## Notes

Answers are visible in the Markdown source, so this is for studying, not for secure exams.
Raw HTML in Markdown is not rendered, and `javascript:` links are ignored.
