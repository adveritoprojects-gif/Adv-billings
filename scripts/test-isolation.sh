#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
TOKENS_FILE="$ROOT_DIR/prisma/.test-tokens.json"

if [ ! -f "$TOKENS_FILE" ]; then
  echo "Missing $TOKENS_FILE" >&2
  echo "Run: npm run db:seed" >&2
  exit 1
fi

TOKEN_A=$(node -e "console.log(require('$TOKENS_FILE').ownerA.token)")
TOKEN_B=$(node -e "console.log(require('$TOKENS_FILE').ownerB.token)")
ORG_A=$(node -e "console.log(require('$TOKENS_FILE').ownerA.organizationId)")
ORG_B=$(node -e "console.log(require('$TOKENS_FILE').ownerB.organizationId)")

expect_status() {
  local expected="$1"
  shift
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" "$@")
  if [ "$code" != "$expected" ]; then
    echo "FAIL: expected HTTP $expected, got $code ($*)" >&2
    exit 1
  fi
  echo "PASS: HTTP $expected"
}

echo ""
echo "== 1. Unauthenticated requests are rejected =="
expect_status 401 "$BASE_URL/api/me"
expect_status 401 "$BASE_URL/api/activity"

echo ""
echo "== 2. Tampered/forged session cookies are rejected =="
expect_status 401 -H "Cookie: session=forged.signature" "$BASE_URL/api/me"
expect_status 401 -H "Cookie: session=${TOKEN_A}tampered" "$BASE_URL/api/me"

echo ""
echo "== 3. /api/me resolves the correct tenant, role, permissions =="
curl -s -H "Cookie: session=$TOKEN_A" "$BASE_URL/api/me" | node -e "
const payload = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const expectedOrg = process.argv[1];
if (payload.data.organization.id !== expectedOrg) {
  console.error('FAIL: wrong organization', payload.data.organization.id);
  process.exit(1);
}
console.log('PASS: org=' + payload.data.organization.slug +
  ' role=' + payload.data.role.key +
  ' permissions=' + payload.data.permissions.length +
  ' modules=' + payload.data.modules.length);
" "$ORG_A"

curl -s -H "Cookie: session=$TOKEN_B" "$BASE_URL/api/me" | node -e "
const payload = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const expectedOrg = process.argv[1];
if (payload.data.organization.id !== expectedOrg) {
  console.error('FAIL: wrong organization', payload.data.organization.id);
  process.exit(1);
}
console.log('PASS: org=' + payload.data.organization.slug +
  ' role=' + payload.data.role.key +
  ' permissions=' + payload.data.permissions.length +
  ' modules=' + payload.data.modules.length);
" "$ORG_B"

echo ""
echo "== 4. Organization A activity is scoped to Organization A =="
curl -s -H "Cookie: session=$TOKEN_A" "$BASE_URL/api/activity" | node -e "
const payload = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const orgA = process.argv[1];
const orgB = process.argv[2];
if (payload.organizationId !== orgA) {
  console.error('FAIL: endpoint resolved wrong organization');
  process.exit(1);
}
const foreign = payload.data.filter((row) => row.organizationId !== orgA);
if (foreign.length > 0) {
  console.error('FAIL: leaked ' + foreign.length + ' foreign rows');
  process.exit(1);
}
const leakedB = payload.data.filter((row) => row.action === 'seed.org_b_marker');
if (leakedB.length > 0) {
  console.error('FAIL: Organization B marker visible to Organization A');
  process.exit(1);
}
const own = payload.data.filter((row) => row.action === 'seed.org_a_marker');
if (own.length === 0) {
  console.error('FAIL: Organization A marker missing');
  process.exit(1);
}
console.log('PASS: ' + payload.data.length + ' rows, all owned by Organization A');
" "$ORG_A" "$ORG_B"

echo ""
echo "== 5. Organization B activity is scoped to Organization B =="
curl -s -H "Cookie: session=$TOKEN_B" "$BASE_URL/api/activity" | node -e "
const payload = JSON.parse(require('fs').readFileSync(0, 'utf8'));
const orgA = process.argv[1];
const orgB = process.argv[2];
if (payload.organizationId !== orgB) {
  console.error('FAIL: endpoint resolved wrong organization');
  process.exit(1);
}
const foreign = payload.data.filter((row) => row.organizationId !== orgB);
if (foreign.length > 0) {
  console.error('FAIL: leaked ' + foreign.length + ' foreign rows');
  process.exit(1);
}
const leakedA = payload.data.filter((row) => row.action === 'seed.org_a_marker');
if (leakedA.length > 0) {
  console.error('FAIL: Organization A marker visible to Organization B');
  process.exit(1);
}
const own = payload.data.filter((row) => row.action === 'seed.org_b_marker');
if (own.length === 0) {
  console.error('FAIL: Organization B marker missing');
  process.exit(1);
}
console.log('PASS: ' + payload.data.length + ' rows, all owned by Organization B');
" "$ORG_A" "$ORG_B"

echo ""
echo "ALL HTTP TENANT ISOLATION TESTS PASSED"
