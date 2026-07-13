#!/bin/bash
# SessionStart hook — показывает статус проекта при начале сессии

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$GIT_ROOT" ] && exit 0

STATUS_FILE="$GIT_ROOT/MARKITPYS_STATUS.md"
SESSION_FILE="$GIT_ROOT/MARKITPYS_SESSION_START.md"

# Если файл статуса есть — показываем его краткое содержание
if [ -f "$STATUS_FILE" ]; then
  # Извлекаем незакрытые задачи (строки с "- [ ]")
  PENDING=$(grep "^- \[ \]" "$STATUS_FILE" 2>/dev/null | head -8 | sed 's/^- \[ \] /• /')
  DONE_COUNT=$(grep -c "^- \[x\]" "$STATUS_FILE" 2>/dev/null || echo 0)
  PENDING_COUNT=$(grep -c "^- \[ \]" "$STATUS_FILE" 2>/dev/null || echo 0)
  LAST_UPDATED=$(grep "Последнее обновление:" "$STATUS_FILE" 2>/dev/null | head -1 | sed 's/> //')

  MSG="📋 СТАТУС ПРОЕКТА MARKITPYS ($LAST_UPDATED)
✅ Сделано: $DONE_COUNT задач | ❌ Ожидает: $PENDING_COUNT задач

Ближайшие задачи:
$PENDING

📖 Полный статус: MARKITPYS_STATUS.md
🚀 Промт для MARKITPYS: MARKITPYS_SESSION_START.md"

  echo "{\"systemMessage\": \"$MSG\"}"
fi

exit 0
