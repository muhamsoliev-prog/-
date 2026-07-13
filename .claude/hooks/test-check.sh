#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')

# Пропускаем не-TS/JS файлы и сами тестовые файлы
echo "$FILE" | grep -qE '\.(ts|tsx|js|jsx)$' || exit 0
echo "$FILE" | grep -qE '\.(test|spec)\.(ts|tsx|js|jsx)$' && exit 0

ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
[ ! -f "$ABS_FILE" ] && exit 0

# Ищем соответствующий тестовый файл рядом
BASE="${ABS_FILE%.*}"          # убираем расширение
EXT="${ABS_FILE##*.}"          # расширение без точки
TEST_FILE=""

for CANDIDATE in \
  "${BASE}.test.${EXT}" \
  "${BASE}.spec.${EXT}" \
  "${BASE}.test.ts" \
  "${BASE}.spec.ts" \
  "${BASE}.test.tsx" \
  "${BASE}.spec.tsx"; do
  if [ -f "$CANDIDATE" ]; then
    TEST_FILE="$CANDIDATE"
    break
  fi
done

# Ищем тест в папке __tests__
if [ -z "$TEST_FILE" ]; then
  DIR=$(dirname "$ABS_FILE")
  BASENAME=$(basename "$ABS_FILE")
  NOEXT="${BASENAME%.*}"
  for CANDIDATE in \
    "${DIR}/__tests__/${NOEXT}.test.ts" \
    "${DIR}/__tests__/${NOEXT}.spec.ts" \
    "${DIR}/__tests__/${NOEXT}.test.tsx" \
    "${DIR}/__tests__/${NOEXT}.spec.tsx"; do
    if [ -f "$CANDIDATE" ]; then
      TEST_FILE="$CANDIDATE"
      break
    fi
  done
fi

# Тест не найден — пропускаем тихо
[ -z "$TEST_FILE" ] && exit 0

# Ищем конфиг тест-раннера вверх по дереву
CONFIG_DIR=""
D=$(dirname "$ABS_FILE")
while [ "$D" != "/" ]; do
  if [ -f "$D/vitest.config.ts" ] || [ -f "$D/vitest.config.js" ] || [ -f "$D/vitest.config.mjs" ]; then
    CONFIG_DIR="$D"
    RUNNER="vitest"
    break
  fi
  if [ -f "$D/jest.config.ts" ] || [ -f "$D/jest.config.js" ] || [ -f "$D/jest.config.cjs" ]; then
    CONFIG_DIR="$D"
    RUNNER="jest"
    break
  fi
  D=$(dirname "$D")
done

[ -z "$CONFIG_DIR" ] && exit 0

# Запускаем только найденный тестовый файл
if [ "$RUNNER" = "vitest" ]; then
  OUTPUT=$(cd "$CONFIG_DIR" && npx vitest run "$TEST_FILE" --reporter=verbose 2>&1 | tail -20)
else
  OUTPUT=$(cd "$CONFIG_DIR" && npx jest "$TEST_FILE" --no-coverage 2>&1 | tail -20)
fi
RC=$?

TEST_NAME=$(basename "$TEST_FILE")
if [ $RC -eq 0 ]; then
  echo "{\"systemMessage\": \"Tests OK: $TEST_NAME\"}"
else
  MSG=$(echo "$OUTPUT" | grep -E 'FAIL|PASS|Error|expect' | head -5 | tr '"' "'" | tr $'\n' ' ')
  echo "{\"systemMessage\": \"Tests FAILED: $TEST_NAME — $MSG\"}"
fi
