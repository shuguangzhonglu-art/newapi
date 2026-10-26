#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
report_root="${REPORT_DIR:-${TMPDIR:-/tmp}/newapi-rc46-db-matrix/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$report_root"
cd "$repo_root"

if [[ -n "${TEST_MYSQL_DSN:-}" || -n "${TEST_POSTGRES_DSN:-}" ]]; then
  if [[ "${ALLOW_EXTERNAL_DB:-}" != "1" ]]; then
    echo "Refusing external DB tests: set ALLOW_EXTERNAL_DB=1 only with isolated staging databases." >&2
    exit 2
  fi
fi

if ! command -v go >/dev/null 2>&1; then
  echo "go is required" >&2
  exit 2
fi

dist_created=0
if [[ ! -d web/dist ]]; then
  mkdir -p web/dist
  : > web/dist/index.html
  dist_created=1
fi
cleanup() {
  if [[ "$dist_created" -eq 1 ]]; then
    rm -rf web/dist
  fi
}
trap cleanup EXIT

export GOWORK=off
export GOMODCACHE="${GOMODCACHE:-${repo_root}/.cache/go-mod}"
export GOCACHE="${GOCACHE:-${repo_root}/.cache/go-build}"
mkdir -p "$GOMODCACHE" "$GOCACHE"

printf 'candidate_commit=%s\ngo=%s\n' "$(git rev-parse HEAD)" "$(go version)" >"$report_root/metadata.txt"
printf 'mysql_configured=%s\npostgres_configured=%s\n' \
  "${TEST_MYSQL_DSN:+yes}" "${TEST_POSTGRES_DSN:+yes}" >>"$report_root/metadata.txt"

run_matrix() {
  local name="$1"
  local pattern="$2"
  go test ./model -run "$pattern" -count=1 -v
}

pattern='^(TestMigrationSchemaStability|TestAuditLogSortIndexDatabaseMatrix|TestMigratePrefillGroupUniqueness(SQLite|MySQL|PostgreSQL)|TestMigrateTokenKeyUniqueness(SQLite|MySQL|PostgreSQL)|TestUserSessionPreviousRefreshHashMigration(SQLite|ConfiguredDatabases))$'
run_matrix migration_matrix "$pattern" 2>&1 | tee "$report_root/migration.log"

if [[ -z "${TEST_MYSQL_DSN:-}" || -z "${TEST_POSTGRES_DSN:-}" ]]; then
  echo "External MySQL/PostgreSQL matrix was not run: both isolated DSNs are required." | tee "$report_root/summary.txt"
  exit 3
fi

printf 'SQLite + MySQL + PostgreSQL migration matrix passed.\n' | tee -a "$report_root/summary.txt"

