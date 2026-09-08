#!/usr/bin/env bash
# VERSION is the single source of truth. It is <openspec-version>.<revision>: the
# last field is the schema revision, the first three are the OpenSpec release this
# was checked against, and a release tag must match the whole thing.
# Usage: version_check.sh [tag]
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VERSION="$(tr -d '[:space:]' < "$ROOT/VERSION")"

# A three-field VERSION would parse as an OpenSpec version of "1.11", silently
# dropping the patch the whole scheme exists to carry.
if ! printf '%s' "$VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$'; then
  printf 'error: VERSION %s is not <openspec-major>.<minor>.<patch>.<revision>\n' "$VERSION" >&2
  exit 1
fi

REVISION="${VERSION##*.}"
SCHEMA_REVISION="$(awk '/^version:/ {print $2; exit}' "$ROOT/openspec/schemas/super-sdd/schema.yaml")"

if [ "$REVISION" != "$SCHEMA_REVISION" ]; then
  printf 'error: VERSION %s has revision %s but schema.yaml says version: %s\n' \
    "$VERSION" "$REVISION" "$SCHEMA_REVISION" >&2
  exit 1
fi

if [ $# -gt 0 ] && [ "$1" != "v$VERSION" ]; then
  printf 'error: tag %s does not match VERSION %s (expected v%s)\n' "$1" "$VERSION" "$VERSION" >&2
  exit 1
fi

printf 'ok: version %s, schema revision %s\n' "$VERSION" "$SCHEMA_REVISION"
