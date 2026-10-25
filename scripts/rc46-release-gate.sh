#!/usr/bin/env bash
set -Eeuo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
report_root="${REPORT_DIR:-${TMPDIR:-/tmp}/newapi-rc46-release-gate/$(date -u +%Y%m%dT%H%M%SZ)}"
mkdir -p "$report_root"
pass_count=0
fail_count=0
warn_count=0

pass_item() { pass_count=$((pass_count + 1)); printf 'PASS  %s\n' "$1" | tee -a "$report_root/summary.txt"; }
fail_item() { fail_count=$((fail_count + 1)); printf 'FAIL  %s\n' "$1" | tee -a "$report_root/summary.txt"; }
warn_item() { warn_count=$((warn_count + 1)); printf 'WARN  %s\n' "$1" | tee -a "$report_root/summary.txt"; }

run_check() {
  local name="$1"
  shift
  local log_file="$report_root/${name}.log"
  printf '\n== %s ==\n' "$name" | tee -a "$report_root/summary.txt"
  if "$@" >"$log_file" 2>&1; then
    pass_item "$name"
  else
    fail_item "$name (see ${log_file})"
  fi
}

cd "$repo_root"
: >"$report_root/summary.txt"
printf 'candidate_branch=%s\ncandidate_commit=%s\nreport_dir=%s\n' \
  "$(git branch --show-current)" "$(git rev-parse HEAD)" "$report_root" >"$report_root/metadata.txt"

if [[ "$(git branch --show-current)" == "upgrade/hema-rc46" ]]; then
  pass_item "branch is upgrade/hema-rc46"
else
  fail_item "expected branch upgrade/hema-rc46"
fi
if [[ -z "$(git status --porcelain)" ]]; then pass_item "working tree is clean"; else fail_item "working tree has uncommitted changes"; fi
run_check git_diff_check git diff --check

if [[ "$(awk '$1 == "go" {print $2; exit}' go.mod)" == "1.26.10" ]]; then pass_item "go.mod declares Go 1.26.10"; else fail_item "go.mod Go version is not 1.26.10"; fi
if rg -q 'golang:1\.26\.10-alpine' Dockerfile; then pass_item "Dockerfile uses Go 1.26.10"; else fail_item "Dockerfile Go version mismatch"; fi
if git diff --quiet 7cf75bb8d..HEAD -- web/public/hema-home; then pass_item "HEMA homepage matches UI baseline"; else fail_item "HEMA homepage differs from 7cf75bb8d"; fi

for required_file in web/public/hema-home/home.html web/public/hema-home/main.js web/public/hema-home/styles.css; do
  if [[ -f "$required_file" ]]; then pass_item "HEMA UI file exists: $required_file"; else fail_item "missing HEMA UI file: $required_file"; fi
done

go_mod_cache="${GOMODCACHE:-${repo_root}/.cache/go-mod}"
go_cache="${GOCACHE:-${repo_root}/.cache/go-build}"
mkdir -p "$go_mod_cache" "$go_cache"
export GOMODCACHE="$go_mod_cache" GOCACHE="$go_cache"

if command -v bun >/dev/null 2>&1; then
  if [[ "$(bun --version)" == "1.4.0" ]]; then pass_item "Bun runtime is 1.4.0"; else fail_item "Bun runtime must be 1.4.0"; fi
  run_check frontend_install bash -c 'cd web && bun install --frozen-lockfile'
  run_check frontend_typecheck bash -c 'cd web && bun run typecheck'
  run_check frontend_lint bash -c 'cd web && bun run lint'
  run_check frontend_test bash -c 'cd web && bun run test'
  run_check frontend_build bash -c 'cd web && bun run build:check'
else
  fail_item "bun is unavailable; frontend gate cannot run"
fi

if command -v docker >/dev/null 2>&1; then
  run_check docker_build bash -c 'docker build --pull=false -t new-api:rc46-gate .'
  run_check docker_image_id bash -c 'docker image inspect new-api:rc46-gate --format "{{.Id}}"'
else
  fail_item "docker is unavailable; image gate cannot run"
fi

if command -v go >/dev/null 2>&1; then
  if [[ "$(go version | awk '{print $3}')" == "go1.26.10" ]]; then pass_item "Go runtime is 1.26.10"; else fail_item "Go runtime must be 1.26.10"; fi
  if [[ -d web/dist ]]; then
    run_check go_test bash -c 'go test ./...'
    run_check root_build bash -c 'go build ./...'
  else
    fail_item "web/dist is missing; root Go tests are blocked until frontend build"
  fi
  run_check relaykit_build bash -c 'cd relaykit && GOWORK=off go build ./...'
  run_check relaykit_test bash -c 'cd relaykit && GOWORK=off go test ./...'
  run_check tokenkit_build bash -c 'cd tokenkit && GOWORK=off go build ./...'
  run_check tokenkit_test bash -c 'cd tokenkit && GOWORK=off go test ./...'
else
  fail_item "go is unavailable"
fi

if [[ -n "${BASE_URL:-}" && -n "${API_KEY:-}" && -n "${MODEL:-}" ]]; then
  base_url="${BASE_URL%/}"
  curl_common=(curl --silent --show-error --connect-timeout 10 --max-time 120)
  auth_header="Authorization: Bearer ${API_KEY}"
  api_dir="$report_root/api"
  mkdir -p "$api_dir"
  has_request_id() { rg -qi '^X-Oneapi-Request-Id:[[:space:]]*[^[:space:]]+' "$1"; }
  if "${curl_common[@]}" --fail-with-body "$base_url/v1/models" -H "$auth_header" -D "$api_dir/models.headers" >"$api_dir/models.json" 2>"$api_dir/models.err" && rg -q '^HTTP/[0-9.]+ 2[0-9][0-9]' "$api_dir/models.headers" && has_request_id "$api_dir/models.headers"; then pass_item "api_models"; else fail_item "api_models (status or X-Request-ID missing)"; fi
  chat_body='{"model":"'"$MODEL"'","messages":[{"role":"user","content":"release gate ping"}],"stream":false,"max_tokens":16}'
  if "${curl_common[@]}" --fail-with-body "$base_url/v1/chat/completions" -H "$auth_header" -H 'Content-Type: application/json' -D "$api_dir/chat.headers" -o "$api_dir/chat.json" --data "$chat_body" >"$api_dir/chat.stdout" 2>"$api_dir/chat.err"; then
    if rg -q '"id"\s*:\s*"[^"]+"' "$api_dir/chat.json" && rg -q '"usage"\s*:' "$api_dir/chat.json" && has_request_id "$api_dir/chat.headers"; then pass_item "api_chat_non_stream"; else fail_item "api_chat_non_stream response contract or X-Request-ID missing"; fi
  else fail_item "api_chat_non_stream"; fi
  if "${curl_common[@]}" --fail-with-body "$base_url/v1/chat/completions" -H "$auth_header" -H 'Content-Type: application/json' -D "$api_dir/chat-stream.headers" -o "$api_dir/chat-stream.sse" --data '{"model":"'"$MODEL"'","messages":[{"role":"user","content":"release gate stream ping"}],"stream":true,"max_tokens":16}' >"$api_dir/chat-stream.stdout" 2>"$api_dir/chat-stream.err"; then
    if rg -q '\[DONE\]' "$api_dir/chat-stream.sse" && rg -q '"finish_reason"\s*:' "$api_dir/chat-stream.sse" && has_request_id "$api_dir/chat-stream.headers"; then pass_item "api_chat_stream_done"; else fail_item "api_chat_stream response contract or X-Request-ID missing"; fi
  else
    fail_item "api_chat_stream"
  fi
  if "${curl_common[@]}" --fail-with-body "$base_url/v1/messages" -H "$auth_header" -H 'Content-Type: application/json' -D "$api_dir/messages.headers" -o "$api_dir/messages.json" --data '{"model":"'"$MODEL"'","max_tokens":16,"messages":[{"role":"user","content":"release gate ping"}]}' >"$api_dir/messages.stdout" 2>"$api_dir/messages.err"; then if has_request_id "$api_dir/messages.headers"; then pass_item "api_messages_non_stream"; else fail_item "api_messages_non_stream X-Request-ID missing"; fi; else fail_item "api_messages_non_stream"; fi
  if "${curl_common[@]}" --fail-with-body "$base_url/v1/responses" -H "$auth_header" -H 'Content-Type: application/json' -D "$api_dir/responses.headers" -o "$api_dir/responses.json" --data '{"model":"'"$MODEL"'","input":"release gate ping","max_output_tokens":16}' >"$api_dir/responses.stdout" 2>"$api_dir/responses.err"; then if has_request_id "$api_dir/responses.headers"; then pass_item "api_responses_non_stream"; else fail_item "api_responses_non_stream X-Request-ID missing"; fi; else fail_item "api_responses_non_stream"; fi
  if curl --silent --show-error --connect-timeout 10 --max-time 30 -D "$api_dir/error.headers" -o "$api_dir/error.json" -X POST "$base_url/v1/chat/completions" -H "$auth_header" -H 'Content-Type: application/json' --data '{"model":"__release_gate_invalid_model__","messages":[{"role":"user","content":"release gate error ping"}]}' >/dev/null 2>"$api_dir/error.err"; then
    if rg -q '^HTTP/[0-9.]+ [45][0-9][0-9]' "$api_dir/error.headers" && has_request_id "$api_dir/error.headers"; then pass_item "api_error_response"; else fail_item "api_error_response status or X-Request-ID missing"; fi
  else
    if rg -q '^HTTP/[0-9.]+ [45][0-9][0-9]' "$api_dir/error.headers" && has_request_id "$api_dir/error.headers"; then pass_item "api_error_response"; else fail_item "api_error_response transport failure or X-Request-ID missing"; fi
  fi
else
  warn_item "API smoke skipped; set BASE_URL, API_KEY, and MODEL"
fi

cat >"$report_root/result.json" <<EOF
{
  "branch": "$(git branch --show-current)",
  "commit": "$(git rev-parse HEAD)",
  "pass": $pass_count,
  "fail": $fail_count,
  "warn": $warn_count,
  "release_ready": $( [[ "$fail_count" -eq 0 ]] && printf true || printf false )
}
EOF
printf '\npass=%s fail=%s warn=%s\n' "$pass_count" "$fail_count" "$warn_count"
if [[ "$fail_count" -gt 0 ]]; then exit 1; fi

