#!/bin/bash
cd /d/Project-Bot/my-first-project
NODE_ENV=development npm run dev:backend &
sleep 3
curl -s http://localhost:3003/api/trading/pairs 2>&1 | head -10
