#!/bin/bash
# Çift tıkla: Vercel'e yayınlar ve linki verir.
cd "$(dirname "$0")"
npm install
npx vercel --prod --yes
