#!/bin/bash
cd "$(dirname "$0")"
echo "Starting Bing Ding Learning..."
echo "Opening http://localhost:3000 in your browser..."
sleep 2 && open http://localhost:3000 &
npm run dev
