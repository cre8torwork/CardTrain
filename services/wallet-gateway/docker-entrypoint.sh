#!/usr/bin/env sh
set -eu

# Materialize the P12 keys + per-wallet cybs.ini from environment at container
# start. The P12s arrive base64-encoded in env (never committed, never on a
# shared disk) and are written only to this container's ephemeral filesystem.

CFG=/app/config
mkdir -p "$CFG"

CYBS_ENV="${CYBS_ENV:-test}"          # test | production
API_VER="${CYBS_API_VERSION:-1.219}"
if [ "$CYBS_ENV" = "production" ]; then
  HOST="ics2ws.ic3.com"
else
  HOST="ics2wstest.ic3.com"
fi

write_ini() {
  wallet="$1"; mid="$2"; p12_b64="$3"; keypass="$4"
  [ -n "$mid" ] || { echo "skip $wallet: no merchant id"; return; }
  [ -n "$p12_b64" ] || { echo "skip $wallet: no P12"; return; }
  echo "$p12_b64" | base64 -d > "$CFG/$wallet.p12"
  cat > "$CFG/cybs.$wallet.ini" <<EOF
merchant_id = "$mid"
wsdl = "https://$HOST/commerce/1.x/transactionProcessor/CyberSourceTransaction_$API_VER.wsdl"
nvp_wsdl = "https://$HOST/commerce/1.x/transactionProcessor/CyberSourceTransaction_NVP_$API_VER.wsdl"

[SSL]
KEY_ALIAS = '$mid'
KEY_FILE = '$wallet.p12'
KEY_PASS = '$keypass'
KEY_DIRECTORY = '$CFG'
EOF
  echo "wrote $CFG/cybs.$wallet.ini ($wallet, $CYBS_ENV)"
}

write_ini apple  "${CYBS_APPLE_MERCHANT_ID:-}"  "${CYBS_APPLE_P12_BASE64:-}"  "${CYBS_APPLE_KEY_PASS:-${CYBS_APPLE_MERCHANT_ID:-}}"
write_ini google "${CYBS_GOOGLE_MERCHANT_ID:-}" "${CYBS_GOOGLE_P12_BASE64:-}" "${CYBS_GOOGLE_KEY_PASS:-${CYBS_GOOGLE_MERCHANT_ID:-}}"

# Serve on the port Railway/Fly inject via $PORT (default 8080).
exec php -S "0.0.0.0:${PORT:-8080}" -t /app/public
