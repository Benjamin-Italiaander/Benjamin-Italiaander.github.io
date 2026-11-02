# Reken-quiz

Statische reken-quiz voor Felix (zelfde quiz-app als de klok-quiz).
Geserveerd op `/funny-numbers/quiz/`.

## Inhoud
- `index.html`, `quiz.js`, `style.css` — de quiz-app
- `header.md`, `main.md` — titel en intro op de startpagina
- `questions/*.md` — de quizzes (optellen, aftrekken, tafels 1–11, mix)
- `questions/index.json` — lijst van quizbestanden (manifest)
- `tools/gen_reken_quiz.py` — generator voor nieuwe reken-quizzes

## Nieuwe quiz maken
    python3 -I tools/gen_reken_quiz.py --mode add --max 20 --out questions/XX-naam.md --title "Titel"
    python3 -I tools/gen_reken_quiz.py --table 12 --out questions/XX-tafel-van-12.md --title "Tafel van 12"
    # daarna het manifest bijwerken:
    cd questions && ls *.md | sort -V | jq -R . | jq -s . > index.json

Modi: `add`, `sub`, `mul`, `div`, `mix`, of `--table N` voor één tafel.
Antwoorden/vragen worden geschud; een ronde draait minstens 20 vragen.
