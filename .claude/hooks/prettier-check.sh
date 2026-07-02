#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
echo "$FILE" | grep -qE '\.(ts|tsx|js|jsx|mjs|cjs|json|css|scss|md)$' || exit 0

ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
[ ! -f "$ABS_FILE" ] && exit 0

# Ищем конфиг Prettier вверх по дереву директорий
DIR=$(dirname "$ABS_FILE")
PRETTIER_DIR=""
D="$DIR"
while [ "$D" != "/" ]; do
  if [ -f "$D/.prettierrc" ] || [ -f "$D/.prettierrc.json" ] || [ -f "$D/.prettierrc.js" ] || [ -f "$D/prettier.config.js" ] || [ -f "$D/prettier.config.mjs" ]; then
    PRETTIER_DIR="$D"
    break
  fi
  if [ -f "$D/package.json" ] && jq -e '.prettier' "$D/package.json" >/dev/null 2>&1; then
    PRETTIER_DIR="$D"
    break
  fi
  D=$(dirname "$D")
done

[ -z "$PRETTIER_DIR" ] && exit 0

# Форматируем файл на месте
OUTPUT=$(cd "$PRETTIER_DIR" && npx prettier --write "$ABS_FILE" 2>&1)
RC=$?
if [ $RC -eq 0 ]; then
  echo '{"systemMessage": "Prettier: файл отформатирован"}'
else
  MSG=$(echo "$OUTPUT" | head -5 | tr '"' "'" | tr $'\n' ' ')
  echo "{\"systemMessage\": \"Prettier ошибка: $MSG\"}"
fi
