#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/bin/super-sdd"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

assert_file() { [ -f "$1" ] || { printf 'FAIL: missing %s\n' "$1" >&2; exit 1; }; }
assert_fails() { if "$@" >/dev/null 2>&1; then printf 'FAIL: expected failure: %s\n' "$*" >&2; exit 1; fi; }

bash "$ROOT/test/version_check.sh" >/dev/null

# Fresh project: openspec init has run, nothing else.
mkdir -p "$WORK/fresh/openspec/schemas"
cd "$WORK/fresh"
"$CLI" install >/dev/null
assert_file openspec/schemas/super-sdd/schema.yaml
assert_file openspec/schemas/super-sdd/templates/proposal.md
assert_file .agents/skills/openspec-sync-designs/SKILL.md
grep -q '^schema: super-sdd$' openspec/config.yaml

# Refuses to clobber, unless forced.
assert_fails "$CLI" install
"$CLI" install --force >/dev/null
assert_file openspec/schemas/super-sdd/schema.yaml

# A default config.yaml from 'openspec init' is replaced.
printf 'schema: spec-driven\n\n# context: |\n#   example\n' > openspec/config.yaml
"$CLI" install --force >/dev/null
grep -q '^schema: super-sdd$' openspec/config.yaml

# A config.yaml carrying real project settings is left alone.
printf 'schema: mine\n\ncontext: |\n  keep me\n' > openspec/config.yaml
"$CLI" install --force >/dev/null
grep -q '^schema: mine$' openspec/config.yaml
grep -q 'keep me' openspec/config.yaml

# .claude/skills is mirrored only when the project already uses it.
if [ -e .claude/skills/openspec-sync-designs ]; then
  printf 'FAIL: mirrored without .claude/skills\n' >&2; exit 1
fi
mkdir -p .claude/skills
"$CLI" install --force >/dev/null
assert_file .claude/skills/openspec-sync-designs/SKILL.md

# Not an OpenSpec project.
mkdir -p "$WORK/bare"
cd "$WORK/bare"
assert_fails "$CLI" install

printf 'ok: all install checks passed\n'
