#!/bin/bash
# Stop hook — автоматически обновляет MARKITPYS_STATUS.md на основе коммитов

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$GIT_ROOT" ] && exit 0

cd "$GIT_ROOT" || exit 0

STATUS_FILE="$GIT_ROOT/MARKITPYS_STATUS.md"
[ ! -f "$STATUS_FILE" ] && exit 0

# Берём коммиты за последний час
RECENT_COMMITS=$(git log --since="1 hour ago" --pretty=format:"%s" 2>/dev/null)
[ -z "$RECENT_COMMITS" ] && exit 0

DATE=$(date '+%Y-%m-%d %H:%M')
BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null)

# Парсим что было сделано и автоматически обновляем статус задач
# Если в коммите есть ключевые слова — закрываем соответствующую задачу

update_task() {
  local pattern="$1"
  local status_file="$2"
  # Меняем "- [ ]" на "- [x]" для строк содержащих паттерн
  sed -i "s/^- \[ \] \(.*${pattern}.*\)/- [x] \1/" "$status_file" 2>/dev/null
}

# Анализируем коммиты и закрываем задачи
while IFS= read -r commit; do
  commit_lower=$(echo "$commit" | tr '[:upper:]' '[:lower:]')

  echo "$commit_lower" | grep -qE "design|дизайн|3d|2d|editor|planner" && \
    update_task "Дизайн-раздел разбросан" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "photo|фото|image|seed|unsplash" && \
    update_task "Фото товаров" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "order|заказ|checkout" && \
    update_task "Заказ не доходит" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "profile|профил" && \
    update_task "Профиль покупателя" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "barcode|штрих" && \
    update_task "штрих-код" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "search|поиск" && \
    update_task "Поиск" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "mobile|мобил|responsive" && \
    update_task "Мобильная версия" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "seller|продавец|dashboard" && \
    update_task "Seller dashboard" "$STATUS_FILE"

  echo "$commit_lower" | grep -qE "notification|уведомлен" && \
    update_task "Уведомления продавцу" "$STATUS_FILE"

done <<< "$RECENT_COMMITS"

# Обновляем дату последнего обновления
sed -i "s/Последнее обновление: .*/Последнее обновление: $DATE/" "$STATUS_FILE" 2>/dev/null

# Добавляем запись в лог сессий
LOG_MARKER="<!-- MARKITPYS_SESSIONS_LOG -->"
if grep -q "$LOG_MARKER" "$STATUS_FILE" 2>/dev/null; then
  COMMITS_LIST=$(git log --since="1 hour ago" --pretty=format:"- %s" 2>/dev/null | head -5)
  SESSION_ENTRY="### $DATE | $BRANCH
$COMMITS_LIST
"
  TMP=$(mktemp)
  awk -v entry="$SESSION_ENTRY" -v marker="$LOG_MARKER" '
    { print }
    $0 == marker { print ""; print entry }
  ' "$STATUS_FILE" > "$TMP" && mv "$TMP" "$STATUS_FILE"
fi

DONE=$(grep -c "^- \[x\]" "$STATUS_FILE" 2>/dev/null || echo 0)
PENDING=$(grep -c "^- \[ \]" "$STATUS_FILE" 2>/dev/null || echo 0)

echo "{\"systemMessage\": \"MARKITPYS_STATUS.md обновлён: ✅ $DONE сделано | ❌ $PENDING ожидает\"}"
