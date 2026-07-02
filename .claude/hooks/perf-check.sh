#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
echo "$FILE" | grep -qE '\.(ts|tsx|js|jsx)$' || exit 0
echo "$FILE" | grep -qE '\.(test|spec)\.(ts|tsx|js|jsx)$' && exit 0

ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
[ ! -f "$ABS_FILE" ] && exit 0

WARNINGS=""

# ── 1. N+1 запросы: Prisma/SQL внутри цикла ──────────────────────────────────
IN_LOOP=0
while IFS= read -r line; do
  TRIMMED=$(echo "$line" | sed 's/^[[:space:]]*//')
  echo "$TRIMMED" | grep -qE '^(for |while |forEach|map\(|reduce\()' && IN_LOOP=1
  [ "$IN_LOOP" = "1" ] && echo "$TRIMMED" | grep -qE 'prisma\.|await.*find|await.*create|await.*update|\.query\(' && \
    WARNINGS="$WARNINGS|N+1: Prisma внутри цикла (строка содержит: $TRIMMED)"
  echo "$TRIMMED" | grep -qE '^\}' && IN_LOOP=0
done < "$ABS_FILE"

# ── 2. import * — тяжёлый импорт всего модуля ────────────────────────────────
STAR_IMPORTS=$(grep -nE '^import \* as ' "$ABS_FILE" | head -3)
[ -n "$STAR_IMPORTS" ] && WARNINGS="$WARNINGS|import *: используй именованные импорты ($(echo "$STAR_IMPORTS" | tr $'\n' ';' | cut -c1-80))"

# ── 3. Синхронные операции FS ─────────────────────────────────────────────────
SYNC_FS=$(grep -nE 'readFileSync|writeFileSync|existsSync|mkdirSync|readdirSync' "$ABS_FILE" | head -3)
[ -n "$SYNC_FS" ] && WARNINGS="$WARNINGS|Sync FS: блокирует event loop — используй async версии"

# ── 4. console.log в продакшн-коде ───────────────────────────────────────────
CONSOLE=$(grep -cnE 'console\.(log|error|warn|info)\(' "$ABS_FILE" 2>/dev/null)
[ "$CONSOLE" -gt 3 ] 2>/dev/null && WARNINGS="$WARNINGS|console.log: $CONSOLE вызовов — удали или замени логгером"

# ── 5. React: отсутствует memo/useCallback для тяжёлых компонентов ────────────
if echo "$FILE" | grep -qE '\.tsx$'; then
  PROPS_COUNT=$(grep -cE 'props\.|const {' "$ABS_FILE" 2>/dev/null || echo 0)
  HAS_MEMO=$(grep -cE 'React\.memo|useMemo|useCallback' "$ABS_FILE" 2>/dev/null || echo 0)
  if [ "$PROPS_COUNT" -gt 5 ] && [ "$HAS_MEMO" = "0" ]; then
    WARNINGS="$WARNINGS|React: компонент с $PROPS_COUNT props без memo/useCallback"
  fi

  # Тяжёлые вычисления прямо в render (не в useMemo)
  HEAVY=$(grep -nE '\.sort\(|\.filter\(.*\.filter\(|\.reduce\(.*\.map\(' "$ABS_FILE" | head -3)
  [ -n "$HEAVY" ] && WARNINGS="$WARNINGS|Render: тяжёлые вычисления без useMemo"
fi

# ── 6. Большие массивы без пагинации ─────────────────────────────────────────
NO_LIMIT=$(grep -nE 'findMany\(\s*\{' "$ABS_FILE" | grep -vE 'take:|limit:' | head -3)
[ -n "$NO_LIMIT" ] && WARNINGS="$WARNINGS|Prisma findMany без take/limit — риск OOM"

# ── 7. await внутри map (вместо Promise.all) ─────────────────────────────────
AWAIT_MAP=$(grep -nE '\.map\(async|\.map\(.*await' "$ABS_FILE" | head -3)
[ -n "$AWAIT_MAP" ] && WARNINGS="$WARNINGS|await в map: используй Promise.all(arr.map(async...))"

# ── Выводим результат ─────────────────────────────────────────────────────────
if [ -z "$WARNINGS" ]; then
  exit 0  # всё OK — тихо выходим
fi

COUNT=$(echo "$WARNINGS" | tr '|' '\n' | grep -c .)
MSG=$(echo "$WARNINGS" | tr '|' '\n' | grep -v '^$' | head -4 | tr '"' "'" | tr $'\n' ' | ')
echo "{\"systemMessage\": \"Perf ($COUNT): $MSG\"}"
