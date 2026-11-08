#!/bin/bash
# 每個主題一張代表畫面
cd /home/claude/castle-strike
for L in 0 1 2 3 4 5; do
  node test/shot.mjs /home/claude/castle-strike/dist/debug.html /tmp/g${L}_ auto "?level=$L" > /tmp/g${L}.log 2>&1 &
done
wait
