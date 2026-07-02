#!/bin/bash
# Stop hook — сохраняет итоги сессии в долгосрочную память

MEMORY_FILE="/home/user/.claude/CLAUDE.md"
[ ! -f "$MEMORY_FILE" ] && exit 0

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$GIT_ROOT" ] && exit 0

cd "$GIT_ROOT" || exit 0

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)
DATE=$(date '+%Y-%m-%d %H:%M')

# Коммиты сделанные за последний час
RECENT_COMMITS=$(git log --since="1 hour ago" --pretty=format:"- %s" 2>/dev/null | head -10)
[ -z "$RECENT_COMMITS" ] && exit 0  # нечего записывать — тихо выходим

# Файлы изменённые за последний час
CHANGED_FILES=$(git diff --name-only HEAD~1 HEAD 2>/dev/null | head -10 | tr '\n' ', ' | sed 's/,$//')

# Формируем запись
ENTRY="### $DATE | $BRANCH"
[ -n "$CHANGED_FILES" ] && ENTRY="$ENTRY | файлы: $CHANGED_FILES"
ENTRY="$ENTRY
$RECENT_COMMITS"

# Вставляем после маркера журнала
if grep -q "<!-- Сессии автоматически" "$MEMORY_FILE" 2>/dev/null; then
  MARKER="<!-- Сессии автоматически добавляются хуком memory-save.sh -->"
  TMP=$(mktemp)
  awk -v entry="$ENTRY" -v marker="$MARKER" '
    { print }
    $0 == marker { print ""; print entry }
  ' "$MEMORY_FILE" > "$TMP" && mv "$TMP" "$MEMORY_FILE"
fi

echo "{\"systemMessage\": \"Память обновлена: $DATE — $(echo "$RECENT_COMMITS" | wc -l) коммит(а) записано\"}"
