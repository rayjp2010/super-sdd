#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLI="$ROOT/bin/super-sdd"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

assert_file() { [ -f "$1" ] || { printf 'FAIL: missing %s\n' "$1" >&2; exit 1; }; }
assert_fails() { if "$@" >/dev/null 2>&1; then printf 'FAIL: expected failure: %s\n' "$*" >&2; exit 1; fi; }
refute() { if [ -e "$1" ] || [ -L "$1" ]; then printf 'FAIL: %s\n' "$2" >&2; exit 1; fi; }
SKILLS=(openspec-sync-designs design-docs technical-diagrams)

bash "$ROOT/test/version_check.sh" >/dev/null

# Fresh project: openspec init has run, nothing else.
mkdir -p "$WORK/fresh/openspec/schemas"
cd "$WORK/fresh"
"$CLI" install >/dev/null
assert_file openspec/schemas/super-sdd/schema.yaml
assert_file openspec/schemas/super-sdd/templates/proposal.md
for skill in "${SKILLS[@]}"; do assert_file ".agents/skills/$skill/SKILL.md"; done
assert_file .agents/skills/design-docs/scripts/ste-lint.mjs
assert_file .agents/skills/technical-diagrams/scripts/render.mjs
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

# A config.yaml carrying real project settings gets the super-sdd settings merged in under
# --force, keeping everything else. Each case is: input, then the exact expected output.
ENTRY="$(sed -n 's/^[[:space:]]*- //p' "$ROOT/openspec/config.yaml")"
assert_merge() {
  printf '%s' "$1" > openspec/config.yaml
  "$CLI" install --force >/dev/null
  printf '%s' "$2" | diff - openspec/config.yaml >&2 \
    || { printf 'FAIL: merge of %s\n' "$3" >&2; exit 1; }
  # A second run finds nothing to add.
  "$CLI" install --force >/dev/null
  printf '%s' "$2" | diff -q - openspec/config.yaml >/dev/null \
    || { printf 'FAIL: re-merge of %s changed the file\n' "$3" >&2; exit 1; }
}

assert_merge 'schema: mine

context: |
  keep me
' "schema: super-sdd

context: |
  keep me

operations:
  archive:
    guidance:
      - $ENTRY
" 'a config without operations'

assert_merge 'schema: mine
operations:
    apply:
        guidance:
            - "a1"
rules:
  proposal:
    - r1
' "schema: super-sdd
operations:
    apply:
        guidance:
            - \"a1\"
    archive:
        guidance:
            - $ENTRY
rules:
  proposal:
    - r1
" 'operations without archive, at its own indent'

assert_merge 'schema: mine
operations:
  archive:
    guidance:
    - "g1"
    # project note

  apply:
    guidance:
      - "a1"
' "schema: super-sdd
operations:
  archive:
    guidance:
    - \"g1\"
    - $ENTRY
    # project note

  apply:
    guidance:
      - \"a1\"
" 'an existing archive guidance list'

assert_merge 'schema: mine
operations:
  archive:
' "schema: super-sdd
operations:
  archive:
    guidance:
      - $ENTRY
" 'an empty archive'

# OpenSpec itself reads the merged file as intended, when its CLI is available.
if openspec --version >/dev/null 2>&1; then
  printf 'schema: mine\ncontext: |\n  keep me\noperations:\n  archive:\n    guidance:\n      - "g1"\n' > openspec/config.yaml
  "$CLI" install --force >/dev/null
  mkdir -p openspec/changes/demo && touch openspec/changes/demo/proposal.md
  parsed="$(openspec instructions archive --change demo --json)"
  rm -rf openspec/changes
  printf '%s' "$parsed" | grep -q '"context": "keep me' \
    || { printf 'FAIL: OpenSpec lost context after merge\n' >&2; exit 1; }
  printf '%s' "$parsed" | tr -d '\n ' | grep -qF "$(printf '"operationGuidance":["g1",%s]' "$ENTRY" | tr -d ' ')" \
    || { printf 'FAIL: OpenSpec does not read the merged guidance\n%s\n' "$parsed" >&2; exit 1; }
else
  printf 'skip: openspec CLI unavailable, merged config not parsed by OpenSpec\n'
fi

# A layout the text merge cannot edit safely is left alone, even under --force.
printf 'schema: mine\noperations: {archive: {guidance: [g1]}}\n' > openspec/config.yaml
"$CLI" install --force >/dev/null
grep -q '^schema: mine$' openspec/config.yaml
grep -q '^operations: {archive: {guidance: \[g1\]}}$' openspec/config.yaml

# Without --force, an edited config.yaml is left alone.
mkdir -p "$WORK/edited/openspec"
cd "$WORK/edited"
printf 'schema: mine\n\ncontext: |\n  keep me\n' > openspec/config.yaml
"$CLI" install >/dev/null
printf 'schema: mine\n\ncontext: |\n  keep me\n' | diff -q - openspec/config.yaml >/dev/null \
  || { printf 'FAIL: install without --force edited config.yaml\n' >&2; exit 1; }

# A Claude project that has never had .claude/skills. This is the common shape: a repo
# with CLAUDE.md and .claude/rules that adopted OpenSpec before super-sdd.
mkdir -p "$WORK/claude/openspec" "$WORK/claude/.claude/rules"
cd "$WORK/claude"
"$CLI" install >/dev/null
for skill in "${SKILLS[@]}"; do
  assert_file ".claude/skills/$skill/SKILL.md"      # resolves through the link
  [ -L ".claude/skills/$skill" ] || { printf 'FAIL: %s mirror is not a symlink\n' "$skill" >&2; exit 1; }
  [ "$(readlink ".claude/skills/$skill")" = "../../.agents/skills/$skill" ] \
    || { printf 'FAIL: %s mirror link is not relative to the project\n' "$skill" >&2; exit 1; }
done
[ -d .claude/rules ] || { printf 'FAIL: clobbered .claude/rules\n' >&2; exit 1; }

# A dangling link is still replaceable: -e alone reports it as absent.
rm -rf .agents/skills/openspec-sync-designs
"$CLI" install --force >/dev/null
assert_file .claude/skills/openspec-sync-designs/SKILL.md

# A project that already has one of the skills is refused before anything is written.
mkdir -p "$WORK/partial/openspec" "$WORK/partial/.agents/skills/design-docs"
cd "$WORK/partial"
assert_fails "$CLI" install
refute openspec/schemas/super-sdd "wrote the schema before refusing"
refute .agents/skills/openspec-sync-designs "wrote a skill before refusing"

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
