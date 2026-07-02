#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
BASENAME=$(basename "$FILE")

# Срабатываем только на package.json или импорты в TS/JS файлах
IS_PKG=0
IS_CODE=0
[ "$BASENAME" = "package.json" ] && IS_PKG=1
echo "$FILE" | grep -qE '\.(ts|tsx|js|jsx)$' && IS_CODE=1
[ "$IS_PKG" = "0" ] && [ "$IS_CODE" = "0" ] && exit 0

ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
[ ! -f "$ABS_FILE" ] && exit 0

WARNINGS=""

# ── Режим 1: package.json ──────────────────────────────────────────────────────
if [ "$IS_PKG" = "1" ]; then
  PKG_DIR=$(dirname "$ABS_FILE")

  # 1а. Дублирующиеся пакеты в deps и devDeps
  DEPS=$(jq -r '.dependencies // {} | keys[]' "$ABS_FILE" 2>/dev/null)
  DEV_DEPS=$(jq -r '.devDependencies // {} | keys[]' "$ABS_FILE" 2>/dev/null)
  DUPES=$(comm -12 <(echo "$DEPS" | sort) <(echo "$DEV_DEPS" | sort) | tr $'\n' ', ' | sed 's/,$//')
  [ -n "$DUPES" ] && WARNINGS="$WARNINGS|Дубли в deps+devDeps: $DUPES"

  # 1б. Пинированные версии без ^ (точные версии = сложнее обновлять)
  PINNED=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | to_entries[] | select(.value | test("^[0-9]")) | .key' "$ABS_FILE" 2>/dev/null | head -5 | tr $'\n' ', ' | sed 's/,$//')
  [ -n "$PINNED" ] && WARNINGS="$WARNINGS|Точные версии (без ^): $PINNED"

  # 1в. Известные тяжёлые пакеты без замены
  HEAVY=$(jq -r '(.dependencies // {}) | keys[]' "$ABS_FILE" 2>/dev/null | grep -E '^(moment|lodash|jquery|underscore|request|bluebird)$' | tr $'\n' ', ' | sed 's/,$//')
  [ -n "$HEAVY" ] && WARNINGS="$WARNINGS|Тяжёлые пакеты (есть легче): $HEAVY"

  # 1г. Уязвимые версии — npm audit (только critical/high)
  if command -v npm >/dev/null 2>&1; then
    AUDIT=$(cd "$PKG_DIR" && npm audit --audit-level=high --json 2>/dev/null)
    CRITICAL=$(echo "$AUDIT" | jq -r '.metadata.vulnerabilities.critical // 0' 2>/dev/null)
    HIGH=$(echo "$AUDIT" | jq -r '.metadata.vulnerabilities.high // 0' 2>/dev/null)
    TOTAL=$((CRITICAL + HIGH))
    [ "$TOTAL" -gt 0 ] && WARNINGS="$WARNINGS|npm audit: critical=$CRITICAL high=$HIGH — запусти npm audit fix"
  fi

  # 1д. Лицензии — предупреждаем о GPL (несовместима с коммерческим проектом)
  if [ -d "$PKG_DIR/node_modules" ]; then
    GPL_PKGS=$(find "$PKG_DIR/node_modules" -maxdepth 2 -name "package.json" \
      -exec jq -r 'select(.license | strings | test("GPL")) | .name' {} \; 2>/dev/null | head -5 | tr $'\n' ', ' | sed 's/,$//')
    [ -n "$GPL_PKGS" ] && WARNINGS="$WARNINGS|GPL лицензия (риск для коммерции): $GPL_PKGS"
  fi
fi

# ── Режим 2: TS/JS файл — анализ импортов ─────────────────────────────────────
if [ "$IS_CODE" = "1" ]; then
  # Ищем package.json вверх
  PKG_FILE=""
  D=$(dirname "$ABS_FILE")
  while [ "$D" != "/" ]; do
    [ -f "$D/package.json" ] && PKG_FILE="$D/package.json" && break
    D=$(dirname "$D")
  done

  if [ -n "$PKG_FILE" ]; then
    ALL_DEPS=$(jq -r '(.dependencies // {}) + (.devDependencies // {}) | keys[]' "$PKG_FILE" 2>/dev/null)

    # 2а. Импорты пакетов не объявленных в package.json
    IMPORTS=$(grep -E "^import .* from ['\"]" "$ABS_FILE" 2>/dev/null \
      | grep -oE "from ['\"][^'\".]+" | sed "s/from ['\"]//; s/\/.*$//" \
      | grep -v '^@types/' | sort -u)

    UNKNOWN=""
    while IFS= read -r pkg; do
      [ -z "$pkg" ] && continue
      echo "$ALL_DEPS" | grep -qF "$pkg" || UNKNOWN="$UNKNOWN $pkg"
    done <<< "$IMPORTS"
    UNKNOWN=$(echo "$UNKNOWN" | tr ' ' '\n' | grep -v '^$' | head -5 | tr $'\n' ', ' | sed 's/,$//')
    [ -n "$UNKNOWN" ] && WARNINGS="$WARNINGS|Не в package.json: $UNKNOWN"

    # 2б. Глубокие импорты из lodash (должны быть tree-shaken)
    LODASH_DEEP=$(grep -E "from 'lodash'" "$ABS_FILE" 2>/dev/null | grep -v "from 'lodash/")
    [ -n "$LODASH_DEEP" ] && WARNINGS="$WARNINGS|lodash: используй 'lodash/get' вместо 'lodash' для tree-shaking"

    # 2в. Импорт всего barrel-файла при использовании одного символа
    BARREL=$(grep -cE "^import \{[^}]{80,}\} from" "$ABS_FILE" 2>/dev/null || echo 0)
    [ "$BARREL" -gt 0 ] 2>/dev/null && WARNINGS="$WARNINGS|Большой barrel-импорт (${BARREL}шт) — раздели на отдельные импорты"
  fi
fi

# ── Вывод ──────────────────────────────────────────────────────────────────────
[ -z "$WARNINGS" ] && exit 0

COUNT=$(echo "$WARNINGS" | tr '|' '\n' | grep -c .)
MSG=$(echo "$WARNINGS" | tr '|' '\n' | grep -v '^$' | head -4 | tr '"' "'" | tr $'\n' ' | ')
echo "{\"systemMessage\": \"Deps ($COUNT): $MSG\"}"
