#!/bin/bash
# PreToolUse хук — проверяет нужен ли вызов Context7

INPUT=$(cat)  # читаем stdin один раз
TOOL=$(echo "$INPUT" | jq -r '.tool_name // ""')
echo "$TOOL" | grep -qiE 'context7' || exit 0

QUERY=$(echo "$INPUT" | jq -r '.tool_input.query // .tool_input.libraryName // .tool_input.topic // ""' | tr '[:upper:]' '[:lower:]')

# Стабильные API — не требуют Context7, отвечаем из обучающих данных
STABLE_PATTERNS="useState|useEffect|useCallback|useMemo|useRef|useContext|\
async.await|promise.all|array.map|array.filter|array.reduce|\
typescript.generic|typescript.type|typescript.interface|\
console.log|json.parse|json.stringify|\
react.component|react.hook|react.props|\
css.flexbox|css.grid|tailwind.class|\
git.commit|git.push|git.branch|\
javascript.closure|javascript.prototype|javascript.event"

if echo "$QUERY" | grep -qiE "$STABLE_PATTERNS"; then
  echo "{
    \"continue\": false,
    \"stopReason\": \"Context7 пропущен: '$QUERY' — стабильное API, ответ из обучающих данных. Экономия токенов.\"
  }"
  exit 0
fi

# Логируем разрешённые вызовы для контроля расходов
LOG_FILE="/home/user/-/.claude/context7-usage.log"
echo "$(date '+%Y-%m-%d %H:%M') | $TOOL | $QUERY" >> "$LOG_FILE"

exit 0
