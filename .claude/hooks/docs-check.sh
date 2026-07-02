#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
echo "$FILE" | grep -qE '\.(ts|tsx)$' || exit 0
echo "$FILE" | grep -qE '\.(test|spec)\.(ts|tsx)$' && exit 0

ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
[ ! -f "$ABS_FILE" ] && exit 0

# ── 1. Проверяем экспорты без JSDoc ──────────────────────────────────────────
# Ищем строки с export function / export class / export const (стрелочные функции)
# у которых НЕТ /** ... */ выше

MISSING=""
PREV=""
while IFS= read -r line; do
  TRIMMED=$(echo "$line" | sed 's/^[[:space:]]*//')

  if echo "$TRIMMED" | grep -qE '^export (async function|function|class|const [A-Za-z]+ = \(|const [A-Za-z]+ = async)'; then
    # Проверяем, есть ли JSDoc в предыдущей непустой строке
    if ! echo "$PREV" | grep -qE '^\s*\*/\s*$|^\s*\*\s|^/\*\*'; then
      NAME=$(echo "$TRIMMED" | grep -oE '(function|class|const) [A-Za-z_]+' | awk '{print $2}' | head -1)
      MISSING="$MISSING $NAME"
    fi
  fi

  # Запоминаем предыдущую непустую строку
  if [ -n "$TRIMMED" ]; then
    PREV="$TRIMMED"
  fi
done < "$ABS_FILE"

if [ -n "$MISSING" ]; then
  MSG=$(echo "$MISSING" | tr ' ' ',' | sed 's/^,//')
  echo "{\"systemMessage\": \"JSDoc отсутствует:$MSG\"}"
fi

# ── 2. Запускаем TypeDoc если конфиг найден ───────────────────────────────────
DIR=$(dirname "$ABS_FILE")
TYPEDOC_DIR=""
D="$DIR"
while [ "$D" != "/" ]; do
  if [ -f "$D/typedoc.json" ] || [ -f "$D/typedoc.config.js" ] || [ -f "$D/typedoc.config.mjs" ]; then
    TYPEDOC_DIR="$D"
    break
  fi
  if [ -f "$D/package.json" ] && jq -e '.typedocOptions' "$D/package.json" >/dev/null 2>&1; then
    TYPEDOC_DIR="$D"
    break
  fi
  D=$(dirname "$D")
done

if [ -n "$TYPEDOC_DIR" ]; then
  OUTPUT=$(cd "$TYPEDOC_DIR" && npx typedoc 2>&1 | tail -5)
  RC=$?
  if [ $RC -eq 0 ]; then
    echo '{"systemMessage": "TypeDoc: документация обновлена"}'
  else
    MSG=$(echo "$OUTPUT" | tr '"' "'" | tr $'\n' ' ')
    echo "{\"systemMessage\": \"TypeDoc ошибка: $MSG\"}"
  fi
fi
