#!/usr/bin/env bash
# ============================================================
#  Manual test run for NotificationService
#  Prerequisite: `cds watch` running in another terminal
#
#  Mocked auth accepts HTTP Basic with an empty password,
#  so `-u sami:` logs you in as the mock user "sami".
# ============================================================
set -u
BASE="http://localhost:4004/odata/v4/notification"

pass() { echo "  ✅ $1"; }
fail() { echo "  ❌ $1"; }

echo
echo "── 1. admin emits a COMMENT notification for sami ──────────"
EMIT=$(curl -s -u admin: -X POST "$BASE/raise" \
  -H "Content-Type: application/json" \
  -d '{
        "recipientID": "sami",
        "type": "COMMENT",
        "sourceType": "POST",
        "sourceId": "3b9f1c2e-0000-4000-8000-000000000001",
        "params": "{\"actorName\":\"Karim Trabelsi\",\"title\":\"Migration HANA Cloud\"}"
      }')
echo "$EMIT"
echo "$EMIT" | grep -q '"value"' && pass "emit returned an ID" || fail "emit failed"
SAMI_NOTIF_ID=$(echo "$EMIT" | sed -n 's/.*"value":"\([^"]*\)".*/\1/p')

echo
echo "── 2. and a SECURITY_EVENT (should come back CRITICAL) ─────"
curl -s -u admin: -X POST "$BASE/raise" \
  -H "Content-Type: application/json" \
  -d '{"recipientID":"sami","type":"SECURITY_EVENT","sourceType":"SYSTEM",
       "params":"{\"detail\":\"Acces sensible detecte\"}"}'
echo

echo
echo "── 3. sami reads his inbox ─────────────────────────────────"
curl -s -u sami: "$BASE/Notifications?\$orderby=createdAt%20desc" | head -c 900
echo

echo
echo "── 4. SECURITY: nadia must not see sami's notification ────"
# Not asserting an empty array: nadia legitimately has her own seed-data
# notifications (db/data/aymax.knowledgehub-Notifications.csv). The real
# check is that SAMI's specific notification ID never appears for her.
YAS=$(curl -s -u nadia: "$BASE/Notifications")
echo "$YAS"
echo "$YAS" | grep -q "$SAMI_NOTIF_ID" \
  && fail "LEAK — nadia can see sami's notification, stop and fix @restrict" \
  || pass "row-level restriction works"

echo
echo "── 5. sami's unread count (varies with seed data - just showing it) ───────"
curl -s -u sami: "$BASE/unreadCount()"
echo

echo
echo "── 6. validation: an unknown type must be rejected (400) ───"
BAD=$(curl -s -u admin: -X POST "$BASE/raise" \
  -H "Content-Type: application/json" \
  -d '{"recipientID":"sami","type":"NOT_A_REAL_TYPE"}')
echo "$BAD"
echo "$BAD" | grep -q 'type must be one of' \
  && pass "invalid type rejected" || fail "validation did not fire"

echo
echo "── 7. SECURITY: nadia tries to mark sami's notif read ────"
NOTIF_ID=$(curl -s -u sami: "$BASE/Notifications?\$top=1" \
  | sed -n 's/.*"ID":"\([^"]*\)".*/\1/p')
echo "   target notification: $NOTIF_ID"
STEAL=$(curl -s -u nadia: -X POST "$BASE/markRead" \
  -H "Content-Type: application/json" -d "{\"notificationID\":\"$NOTIF_ID\"}")
echo "$STEAL"
echo "$STEAL" | grep -q 'false' \
  && pass "action-level ownership check works" \
  || fail "LEAK — actions are not checking ownership"

echo
echo "── 8. sami marks all read, then re-counts (expect 0) ───────"
curl -s -u sami: -X POST "$BASE/markAllRead" -H "Content-Type: application/json" -d '{}'
echo
curl -s -u sami: "$BASE/unreadCount()"
echo
echo
echo "Done."