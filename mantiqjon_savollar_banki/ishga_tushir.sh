#!/bin/sh
# MANTIQJON savollar banki oynasini ochadi (server allaqachon ishlayotgan bo'lsa, faqat oyna ochiladi)
cd "$(dirname "$0")"
if ! python3 -c "import urllib.request;urllib.request.urlopen('http://127.0.0.1:8765/api/holat',timeout=1)" 2>/dev/null; then
  nohup python3 mjbank.py serve --ochma > /tmp/mantiqjon_bank.log 2>&1 &
  sleep 1
fi
for b in google-chrome google-chrome-stable chromium chromium-browser; do
  if command -v $b >/dev/null 2>&1; then exec $b --app=http://127.0.0.1:8765/ --new-window; fi
done
xdg-open http://127.0.0.1:8765/
