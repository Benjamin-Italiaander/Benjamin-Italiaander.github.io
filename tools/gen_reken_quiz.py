#!/usr/bin/env python3
"""Generate arithmetic quizzes for the quiz app (same Markdown format as the
clock quizzes).

Each question is a sum like "7 + 5 = ?" with multiple-choice answers: the
correct result plus plausible near-miss distractors. The quiz engine shuffles
questions and answers itself and pads short quizzes to 20.

Usage:
  python3 gen_reken_quiz.py --mode add --max 20 --out questions/01-optellen.md --title "Optellen tot 20"

Modes:
  add   a + b           (b and the result stay within --max)
  sub   a - b           (a within --max, result >= 0)
  mul   a x b           (tables; factors 1..--max, default max 10)
  div   a : b = c       (exact division; b,c in 1..--max)
  mix   add + sub       (within --max)
"""
import argparse
import os
import random

MODES = ('add', 'sub', 'mul', 'div', 'mix')


def make_item(mode, mx, rng):
    """Return (prompt_without_=?, answer) for one question."""
    if mode == 'add':
        a = rng.randint(0, mx)
        b = rng.randint(0, mx - a)
        return f'{a} + {b}', a + b
    if mode == 'sub':
        a = rng.randint(0, mx)
        b = rng.randint(0, a)
        return f'{a} − {b}', a - b          # minus sign U+2212
    if mode == 'mul':
        a = rng.randint(1, mx)
        b = rng.randint(1, mx)
        return f'{a} × {b}', a * b           # ×
    if mode == 'div':
        b = rng.randint(1, mx)
        c = rng.randint(1, mx)
        return f'{b * c} ÷ {b}', c           # ÷
    if mode == 'mix':
        return make_item(rng.choice(('add', 'sub')), mx, rng)
    raise ValueError(mode)


def distractors(answer, choices, rng, step=1):
    """Plausible wrong answers near `answer` (never negative).

    For tables, pass step = the table number so neighbouring multiples
    (answer ± N) show up as tempting wrong answers."""
    deltas = [step, -step, 2 * step, -2 * step, 1, -1, 2, -2, 3, -3]
    cand = []
    for d in deltas:
        v = answer + d
        if v >= 0 and v != answer and v not in cand:
            cand.append(v)
    rng.shuffle(cand)
    return cand[:max(0, choices - 1)]


def build_question(mode, mx, choices, rng):
    prompt, answer = make_item(mode, mx, rng)
    opts = [answer] + distractors(answer, choices, rng)
    rng.shuffle(opts)
    lines = ['## Som', 'question:', f'{prompt} = ?']
    for o in opts:
        lines.append(f'- [{"x" if o == answer else " "}] {o}')
    return '\n'.join(lines)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--mode', choices=MODES, default='add')
    ap.add_argument('--table', type=int, default=None,
                    help='one table: N x 1..max (default max 10). Overrides --mode.')
    ap.add_argument('--max', type=int, default=None,
                    help='range: operands/result bound (default 20; 10 for mul/div)')
    ap.add_argument('--count', type=int, default=15, help='number of questions')
    ap.add_argument('--choices', type=int, default=4)
    ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--out', required=True, help='output .md path')
    ap.add_argument('--title', required=True, help='quiz title on the home card')
    args = ap.parse_args()

    choices = max(2, args.choices)
    rng = random.Random(args.seed)

    blocks = ['---', 'shuffle-questions: true', 'shuffle-answers: true',
              'language: nl', '---', '', f'# {args.title}', '']
    if args.table is not None:
        n = args.table
        mx = args.max if args.max is not None else 10
        for b in range(1, mx + 1):          # the full table, one fact per multiplier
            ans = n * b
            opts = [ans] + distractors(ans, choices, rng, step=n)
            rng.shuffle(opts)
            q = ['## Som', 'question:', f'{n} × {b} = ?']
            q += [f'- [{"x" if o == ans else " "}] {o}' for o in opts]
            blocks.append('\n'.join(q) + '\n')
    else:
        mx = args.max if args.max is not None else (10 if args.mode in ('mul', 'div') else 20)
        blocks += [build_question(args.mode, mx, choices, rng) + '\n'
                   for _ in range(args.count)]
    md = '\n'.join(blocks).rstrip() + '\n'

    os.makedirs(os.path.dirname(args.out) or '.', exist_ok=True)
    with open(args.out, 'w') as f:
        f.write(md)
    nq = md.count('## Som')
    what = f'tafel van {args.table}' if args.table is not None else args.mode
    print(f'Wrote {nq} {what} questions (max {mx}) to {args.out}')


if __name__ == '__main__':
    main()
