#!/usr/bin/env python3
"""Generate a Dutch "grote wijzer" (minute-hand) clock-reading quiz for the
rekensommen quiz app.

For each 5-minute position it draws a clean clock SVG showing ONE hand (the big
hand) pointing at that position, then writes a Markdown quiz file asking where
the hand points. Multiple-choice answers use the Dutch 5-minute labels; the quiz
engine shuffles questions and answers itself.

Usage:
  python3 gen_klok_quiz.py [--dir DIR] [--count N] [--choices K] [--seed S]

  --dir DIR     questions/ folder to write into
                (default: /var/www/html/rekensommen/questions)
  --count N     number of questions. Default: one per position (12), in order.
                If N is given, positions are sampled at random (with repeats
                allowed when N > 12).
  --choices K   answer options per question (2..12, default 4)
  --seed S      random seed, for a reproducible set
"""
import argparse
import math
import os
import random

# minute position on the clock -> Dutch label for where the big hand points
LABELS = {
    0:  'heel uur',
    5:  '5 over',
    10: '10 over',
    15: 'kwart over',
    20: '10 voor half',
    25: '5 voor half',
    30: 'half',
    35: '5 over half',
    40: '10 over half',
    45: 'kwart voor',
    50: '10 voor',
    55: '5 voor',
}
POSITIONS = list(LABELS.keys())  # 0,5,...,55

DEFAULT_OUTFILE = '02-grote-wijzer.md'
DEFAULT_TITLE = 'Klok kijken – de grote wijzer'

# ---- clock geometry (viewBox 0 0 240 240) ----
CX = CY = 120
R_FACE = 112
R_TICK_OUT = 104
R_TICK_HOUR_IN = 90
R_TICK_MIN_IN = 98
R_NUM = 74
HAND_LEN = 82          # minute hand (the "grote wijzer")
HEAD_LEN = 22
HEAD_HALF = 12
SHAFT_W = 8
HOUR_HAND_LEN = 54     # hour hand (the "kleine wijzer"): shorter and thicker
HOUR_HEAD_LEN = 16
HOUR_HEAD_HALF = 11
HOUR_SHAFT_W = 10
MIN_COLOR = '#dc2626'  # red  minute hand
HOUR_COLOR = '#1d4ed8' # blue hour hand

# whole-hour labels for the two-hand quiz
HOUR_LABELS = {h: f'{h} uur' for h in range(1, 13)}
HOURS = list(range(1, 13))

# minute offsets past the hour (excluding :00, which is the hele-uren quiz)
OFFSETS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
# human name of each offset, used for a quiz's title
OFFSET_NAMES = {
    5: '5 over', 10: '10 over', 15: 'kwart over', 20: '10 voor half',
    25: '5 voor half', 30: 'half', 35: '5 over half', 40: '10 over half',
    45: 'kwart voor', 50: '10 voor', 55: '5 voor',
}


def dutch_time(h, m):
    """Dutch spoken time for clock hour h (1..12) and minute m (0..55, step 5)."""
    nxt = h % 12 + 1  # the hour the Dutch half/voor expressions count toward
    return {
        0:  f'{h} uur',
        5:  f'5 over {h}',
        10: f'10 over {h}',
        15: f'kwart over {h}',
        20: f'10 voor half {nxt}',
        25: f'5 voor half {nxt}',
        30: f'half {nxt}',
        35: f'5 over half {nxt}',
        40: f'10 over half {nxt}',
        45: f'kwart voor {nxt}',
        50: f'10 voor {nxt}',
        55: f'5 voor {nxt}',
    }[m]


def _pt(minute, radius):
    """Point on the clock at `minute` (0..60, 0=top, clockwise) and `radius`."""
    a = math.radians(minute * 6)
    return CX + radius * math.sin(a), CY - radius * math.cos(a)


def _face_parts(label):
    """The clock face: circle, minute/hour ticks and the hour numbers 1..12."""
    parts = [
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" '
        f'width="240" height="240" role="img" aria-label="{label}">',
        f'<circle cx="{CX}" cy="{CY}" r="{R_FACE}" fill="#ffffff" '
        'stroke="#1f2937" stroke-width="4"/>',
    ]
    for m in range(60):
        inner = R_TICK_HOUR_IN if m % 5 == 0 else R_TICK_MIN_IN
        x1, y1 = _pt(m, inner)
        x2, y2 = _pt(m, R_TICK_OUT)
        w = 3 if m % 5 == 0 else 1.4
        parts.append(f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" '
                     f'y2="{y2:.1f}" stroke="#374151" stroke-width="{w}"/>')
    for h in range(1, 13):
        x, y = _pt(h * 5, R_NUM)
        parts.append(f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="middle" '
                     'dominant-baseline="central" font-family="Arial, sans-serif" '
                     f'font-size="20" font-weight="700" fill="#1f2937">{h}</text>')
    return parts


def _hand_parts(minute, length, color, head_len, head_half, shaft_w):
    """A single hand (shaft + arrow tip) pointing at `minute`."""
    tipx, tipy = _pt(minute, length)
    bx, by = _pt(minute, length - head_len)
    a = math.radians(minute * 6)
    perpx, perpy = math.cos(a), math.sin(a)  # unit vector perpendicular to hand
    lx, ly = bx + head_half * perpx, by + head_half * perpy
    rx, ry = bx - head_half * perpx, by - head_half * perpy
    return [
        f'<line x1="{CX}" y1="{CY}" x2="{bx:.1f}" y2="{by:.1f}" '
        f'stroke="{color}" stroke-width="{shaft_w}" stroke-linecap="round"/>',
        f'<polygon points="{tipx:.1f},{tipy:.1f} {lx:.1f},{ly:.1f} '
        f'{rx:.1f},{ry:.1f}" fill="{color}"/>',
    ]


def _hub():
    return [f'<circle cx="{CX}" cy="{CY}" r="7" fill="#1f2937"/>', '</svg>']


def clock_svg(minute):
    """Clock face with one hand (the minute hand) pointing at `minute`."""
    parts = _face_parts('klok met wijzer')
    parts += _hand_parts(minute, HAND_LEN, MIN_COLOR, HEAD_LEN, HEAD_HALF, SHAFT_W)
    parts += _hub()
    return '\n'.join(parts)


def clock_svg_hours(hour):
    """Clock face for a whole hour: long minute hand on 12, short hour hand on `hour`."""
    parts = _face_parts(f'klok die {hour} uur aanwijst')
    # minute hand (red, long) straight up on the 12
    parts += _hand_parts(0, HAND_LEN, MIN_COLOR, HEAD_LEN, HEAD_HALF, SHAFT_W)
    # hour hand (blue, short) on the hour number (number h sits at minute h*5)
    parts += _hand_parts(hour * 5, HOUR_HAND_LEN, HOUR_COLOR,
                         HOUR_HEAD_LEN, HOUR_HEAD_HALF, HOUR_SHAFT_W)
    parts += _hub()
    return '\n'.join(parts)


def clock_svg_time(h, m):
    """Two-hand clock for time h:m, with the hour hand at its true fractional spot."""
    parts = _face_parts(f'klok die {dutch_time(h, m)} aanwijst')
    # minute hand (red, long) on the minute
    parts += _hand_parts(m, HAND_LEN, MIN_COLOR, HEAD_LEN, HEAD_HALF, SHAFT_W)
    # hour hand (blue, short): number h sits at minute h*5, plus m/60 of the way on
    hour_pos = ((h % 12) + m / 60.0) * 5.0
    parts += _hand_parts(hour_pos, HOUR_HAND_LEN, HOUR_COLOR,
                         HOUR_HEAD_LEN, HOUR_HEAD_HALF, HOUR_SHAFT_W)
    parts += _hub()
    return '\n'.join(parts)


def svg_name(minute):
    return f'klok-{minute:02d}.svg'


def hour_svg_name(hour):
    return f'uur-{hour:02d}.svg'


def time_svg_name(h, m):
    return f't-{h:02d}-{m:02d}.svg'


def build_question(minute, choices, rng, pool):
    """One Markdown question block for the given position.

    Distractors are drawn only from `pool` (the positions this quiz uses), so a
    quiz limited to a few positions never offers answers outside that set.
    """
    correct = LABELS[minute]
    others = [LABELS[p] for p in pool if p != minute]
    rng.shuffle(others)
    opts = [correct] + others[:max(0, choices - 1)]
    rng.shuffle(opts)
    lines = [
        '## Klok kijken',
        'background-info:',
        'De grote wijzer (de lange wijzer) wijst naar een plek op de klok. '
        'Elke plek heeft een naam: 12 is "heel uur", 3 is "kwart over", '
        '6 is "half" en 9 is "kwart voor".',
        'question:',
        f'![Klok met de grote wijzer](./{svg_name(minute)}) Waar wijst de grote wijzer naar?',
    ]
    for o in opts:
        mark = 'x' if o == correct else ' '
        lines.append(f'- [{mark}] {o}')
    return '\n'.join(lines)


def build_hour_question(hour, choices, rng):
    """One Markdown question for a whole-hour (two-hand) clock."""
    correct = HOUR_LABELS[hour]
    others = [HOUR_LABELS[h] for h in HOURS if h != hour]
    rng.shuffle(others)
    opts = [correct] + others[:max(0, choices - 1)]
    rng.shuffle(opts)
    lines = [
        '## Hele uren',
        'background-info:',
        'De lange wijzer (rood) staat op de 12. De korte wijzer (blauw) wijst '
        'naar het uur. Staat de korte wijzer op de 3? Dan is het 3 uur.',
        'question:',
        f'![Klok met twee wijzers](./{hour_svg_name(hour)}) Hoe laat is het?',
    ]
    for o in opts:
        mark = 'x' if o == correct else ' '
        lines.append(f'- [{mark}] {o}')
    return '\n'.join(lines)


def build_time_question(h, m, choices, rng, pool_times):
    """One Markdown question for a two-hand clock at time h:m.

    Distractors are other spoken times drawn from `pool_times`."""
    correct = dutch_time(h, m)
    others, seen = [], {correct}
    for (h2, m2) in pool_times:
        lbl = dutch_time(h2, m2)
        if lbl not in seen:
            seen.add(lbl)
            others.append(lbl)
    rng.shuffle(others)
    opts = [correct] + others[:max(0, choices - 1)]
    rng.shuffle(opts)
    lines = [
        '## Klok kijken',
        'background-info:',
        'De lange wijzer (rood) en de korte wijzer (blauw) wijzen samen de tijd '
        'aan. De korte wijzer geeft het uur, de lange wijzer de minuten.',
        'question:',
        f'![Klok met twee wijzers](./{time_svg_name(h, m)}) Hoe laat is het?',
    ]
    for o in opts:
        mark = 'x' if o == correct else ' '
        lines.append(f'- [{mark}] {o}')
    return '\n'.join(lines)


def _write_quiz(dir_, outfile, title, questions_md):
    blocks = [
        '---', 'shuffle-questions: true', 'shuffle-answers: true', 'language: nl',
        '---', '', f'# {title}', '',
    ]
    blocks += [q + '\n' for q in questions_md]
    md = '\n'.join(blocks).rstrip() + '\n'
    out = os.path.join(dir_, outfile)
    with open(out, 'w') as f:
        f.write(md)
    return out


def main_time(args, rng):
    """One two-hand quiz for a single minute offset, or a mixed one (--mixed)."""
    os.makedirs(args.dir, exist_ok=True)

    if args.mixed:
        # the mix includes the whole hours (offset 0) as well as every offset
        pool = [(h, m) for m in [0] + OFFSETS for h in HOURS]
        for (h, m) in pool:
            with open(os.path.join(args.dir, time_svg_name(h, m)), 'w') as f:
                f.write(clock_svg_time(h, m))
        n = args.count if args.count else 24
        times = [rng.choice(pool) for _ in range(n)] if n > len(pool) \
            else rng.sample(pool, n)
        title = args.title if args.title != DEFAULT_TITLE else 'Klok kijken – alles gemixt'
        outfile = args.outfile if args.outfile != DEFAULT_OUTFILE else '16-gemixt.md'
    else:
        m = args.offset
        pool = [(h, m) for h in HOURS]
        for (h, _m) in pool:
            with open(os.path.join(args.dir, time_svg_name(h, m)), 'w') as f:
                f.write(clock_svg_time(h, m))
        if args.count is None:
            times = pool[:]
        elif args.count <= len(pool):
            times = rng.sample(pool, args.count)
        else:
            times = [rng.choice(pool) for _ in range(args.count)]
        title = args.title if args.title != DEFAULT_TITLE \
            else f'Klok kijken – {OFFSET_NAMES[m]}'
        outfile = args.outfile if args.outfile != DEFAULT_OUTFILE else f'offset-{m:02d}.md'

    choices = max(2, min(args.choices, len(pool)))
    questions = [build_time_question(h, m, choices, rng, pool) for (h, m) in times]
    out = _write_quiz(args.dir, outfile, title, questions)
    print(f'Wrote {len(questions)} questions to {out}')


def main_hours(args, rng):
    """Generate the two-hand whole-hour quiz (1 uur .. 12 uur)."""
    title = args.title if args.title != DEFAULT_TITLE else 'Klok kijken – hele uren'
    outfile = args.outfile if args.outfile != DEFAULT_OUTFILE else '04-hele-uren.md'
    choices = max(2, min(args.choices, len(HOURS)))

    os.makedirs(args.dir, exist_ok=True)
    for h in HOURS:
        with open(os.path.join(args.dir, hour_svg_name(h)), 'w') as f:
            f.write(clock_svg_hours(h))

    if args.count is None:
        hours = HOURS[:]
    elif args.count <= len(HOURS):
        hours = rng.sample(HOURS, args.count)
    else:
        hours = [rng.choice(HOURS) for _ in range(args.count)]

    blocks = [
        '---', 'shuffle-questions: true', 'shuffle-answers: true', 'language: nl',
        '---', '', f'# {title}', '',
    ]
    blocks += [build_hour_question(h, choices, rng) + '\n' for h in hours]
    md = '\n'.join(blocks).rstrip() + '\n'

    out = os.path.join(args.dir, outfile)
    with open(out, 'w') as f:
        f.write(md)
    print(f'Wrote {len(HOURS)} hour SVGs and {len(hours)} questions to {out}')


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--dir', default='/var/www/html/rekensommen/questions')
    ap.add_argument('--count', type=int, default=None)
    ap.add_argument('--choices', type=int, default=4)
    ap.add_argument('--seed', type=int, default=None)
    ap.add_argument('--outfile', default=DEFAULT_OUTFILE)
    ap.add_argument('--title', default=DEFAULT_TITLE,
                    help='quiz title shown on the home card')
    ap.add_argument('--positions', default=None,
                    help='comma-separated minute positions to use, e.g. '
                         '"0,15,30,45". Default: all of 0,5,...,55.')
    ap.add_argument('--mode', choices=('minute', 'hours'), default='minute',
                    help='minute: one hand, reads the minute position (default). '
                         'hours: two hands, whole hours 1..12 uur.')
    ap.add_argument('--offset', type=int, default=None,
                    help='two-hand quiz at this minute offset past the hour over '
                         'all 12 hours, e.g. 15 (kwart over), 30 (half), 45 '
                         '(kwart voor). One of ' + ','.join(map(str, OFFSETS)) + '.')
    ap.add_argument('--mixed', action='store_true',
                    help='two-hand quiz mixing every offset and hour.')
    args = ap.parse_args()

    rng = random.Random(args.seed)

    if args.mixed:
        return main_time(args, rng)
    if args.offset is not None:
        if args.offset not in OFFSETS:
            ap.error(f'--offset must be one of {OFFSETS}')
        return main_time(args, rng)
    if args.mode == 'hours':
        return main_hours(args, rng)

    if args.positions:
        try:
            pool = [int(p) for p in args.positions.split(',') if p.strip() != '']
        except ValueError:
            ap.error('--positions must be comma-separated numbers, e.g. 0,15,30,45')
        bad = [p for p in pool if p not in LABELS]
        if bad:
            ap.error(f'unknown position(s) {bad}. Allowed: {POSITIONS}')
    else:
        pool = POSITIONS[:]
    choices = max(2, min(args.choices, len(pool)))

    os.makedirs(args.dir, exist_ok=True)

    # one SVG per position in the pool (reused across questions)
    for m in pool:
        with open(os.path.join(args.dir, svg_name(m)), 'w') as f:
            f.write(clock_svg(m))

    # which positions to ask
    if args.count is None:
        minutes = pool[:]                 # one question per pool position
    elif args.count <= len(pool):
        minutes = rng.sample(pool, args.count)
    else:
        minutes = [rng.choice(pool) for _ in range(args.count)]

    blocks = [
        '---',
        'shuffle-questions: true',
        'shuffle-answers: true',
        'language: nl',
        '---',
        '',
        f'# {args.title}',
        '',
    ]
    blocks += [build_question(m, choices, rng, pool) + '\n' for m in minutes]
    md = '\n'.join(blocks).rstrip() + '\n'

    out = os.path.join(args.dir, args.outfile)
    with open(out, 'w') as f:
        f.write(md)

    print(f'Wrote {len(POSITIONS)} SVGs and {len(minutes)} questions to {out}')


if __name__ == '__main__':
    main()
