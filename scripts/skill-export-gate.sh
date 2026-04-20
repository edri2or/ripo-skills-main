#!/bin/bash
# pre-commit hook: auto-export any staged SKILL.md from .claude/plugins/ to exported-skills/
set -euo pipefail

STAGED=$(git diff --cached --name-only 2>/dev/null \
  | grep -E '^\.claude/plugins/.+/SKILL\.md$' || true)

[ -z "$STAGED" ] && exit 0

cat > /tmp/process_skill.py << 'PYEOF'
import sys, re, os

src_path = sys.argv[1]
dst_path = sys.argv[2]

with open(src_path, 'r') as f:
    content = f.read()

body = re.sub(r'```[\s\S]*?```', '', content)

PROJECT_FILES = {
    'PRODUCT.md':  '[your-product-file]',
    'JOURNEY.md':  '[your-journey-file]',
    'AGENT.md':    '[your-agent-file]',
    'REGISTRY.md': '[your-registry-file]',
}
SERVICES = ['Railway', 'Supabase', 'Telegram', 'OpenRouter', 'TypeORM', 'Prisma', 'Vercel', 'Cloudflare']

score = 100
blocked = []

def penalise(label, amount):
    global score
    if label not in blocked:
        blocked.append(label)
        score -= amount

for m in re.findall(r'dev/(?:changes|ideas)/[\w-]+', body):
    penalise(m, 15)
for ref in PROJECT_FILES:
    if ref in body:
        penalise(ref, 15)
for svc in SERVICES:
    if svc in body:
        penalise(svc, 10)
for p in re.findall(r'`(/(?!tmp)[^`\s]{3,})`', body):
    penalise(p, 15)

fm_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)
if fm_match:
    src_exp_match = re.search(r'^source-experiment:\s*"?(\S+?)"?\s*$', fm_match.group(1), re.MULTILINE)
    if src_exp_match and src_exp_match.group(1) != 'core':
        penalise('non-core source-experiment', 20)

score = max(0, min(100, score))
synthesis_required = score < 80
out = content

if synthesis_required:
    saved = []
    def save(block_match):
        saved.append(block_match.group(0))
        return f'<<<BLOCK_{len(saved)-1}>>>'
    out = re.sub(r'```[\s\S]*?```', save, out)
    out = re.sub(r'dev/(changes|ideas)/[\w-]+',
                 lambda m: f'dev/{m.group(1)}/[your-{m.group(1)[:-1]}-slug]', out)
    for ref, ph in PROJECT_FILES.items():
        out = out.replace(ref, ph)
    for svc in SERVICES:
        out = out.replace(svc, f'[your-{svc.lower()}]')
    for i, block in enumerate(saved):
        out = out.replace(f'<<<BLOCK_{i}>>>', block)
    out = re.sub(r'(source-experiment:\s*)[^\n]+', r'\1core', out, count=1)

meta = [f'scope: global', f'portability: {score}',
        f'synthesis-required: {"true" if synthesis_required else "false"}']
if synthesis_required and blocked:
    meta += ['blocked-refs:'] + [f'  - {b}' for b in blocked]
out = re.sub(r'\n---\n', '\n' + '\n'.join(meta) + '\n---\n', out, count=1)

os.makedirs(os.path.dirname(dst_path), exist_ok=True)
with open(dst_path, 'w') as f:
    f.write(out)

action = 'synthesized' if synthesis_required else 'direct'
print(f'SCORE:{score}|ACTION:{action}|REFS:{len(blocked)}')
PYEOF

for SKILL_PATH in $STAGED; do
  SKILL=$(echo "$SKILL_PATH" | sed 's|.*/\([^/]*\)/SKILL\.md|\1|')
  EXPORTED="exported-skills/$SKILL/SKILL.md"

  OUT=$(python3 /tmp/process_skill.py "$SKILL_PATH" "$EXPORTED")
  SCORE=$(echo "$OUT" | grep -oP 'SCORE:\K[0-9]+')
  ACTION=$(echo "$OUT" | grep -oP 'ACTION:\K\w+')

  git add "$EXPORTED"
  echo "skill-export-gate: $SKILL → $EXPORTED (score: $SCORE/100, $ACTION)"
done
