#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/bin/super-sdd"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

assert_file() { [ -f "$1" ] || { printf 'FAIL: missing %s\n' "$1" >&2; exit 1; }; }
assert_fails() { if "$@" >/dev/null 2>&1; then printf 'FAIL: expected failure: %s\n' "$*" >&2; exit 1; fi; }
refute() { if [ -e "$1" ] || [ -L "$1" ]; then printf 'FAIL: %s\n' "$2" >&2; exit 1; fi; }

bash "$ROOT/test/version_check.sh" >/dev/null

# Fresh project: openspec init has run, nothing else.
mkdir -p "$WORK/fresh/openspec/schemas"
cd "$WORK/fresh"
"$CLI" install >/dev/null
assert_file openspec/schemas/super-sdd/schema.yaml
assert_file openspec/schemas/super-sdd/templates/proposal.md
assert_file .agents/skills/openspec-sync-designs/SKILL.md
grep -q '^schema: super-sdd$' openspec/config.yaml
refute mise.toml "wrote mise.toml; OpenSpec setup is not this installer's job"
refute .claude "created .claude in a project that does not use it"

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

# A Claude project that has never had .claude/skills. This is the common shape: a repo
# with CLAUDE.md and .claude/rules that adopted OpenSpec before super-sdd.
mkdir -p "$WORK/claude/openspec" "$WORK/claude/.claude/rules"
cd "$WORK/claude"
"$CLI" install >/dev/null
assert_file .claude/skills/openspec-sync-designs/SKILL.md      # resolves through the link
[ -L .claude/skills/openspec-sync-designs ] || { printf 'FAIL: mirror is not a symlink\n' >&2; exit 1; }
[ "$(readlink .claude/skills/openspec-sync-designs)" = "../../.agents/skills/openspec-sync-designs" ] \
  || { printf 'FAIL: mirror link is not relative to the project\n' >&2; exit 1; }
[ -d .claude/rules ] || { printf 'FAIL: clobbered .claude/rules\n' >&2; exit 1; }

# A dangling link is still replaceable: -e alone reports it as absent.
rm -rf .agents/skills/openspec-sync-designs
"$CLI" install --force >/dev/null
assert_file .claude/skills/openspec-sync-designs/SKILL.md

# Not an OpenSpec project: stop and say so rather than guessing.
mkdir -p "$WORK/bare"
cd "$WORK/bare"
assert_fails "$CLI" install
refute openspec "created openspec/; running openspec init is the user's job"

# Unknown arguments are rejected rather than silently ignored.
mkdir -p "$WORK/args/openspec"
cd "$WORK/args"
assert_fails "$CLI" install --nonsense

printf 'ok: all install checks passed\n'
