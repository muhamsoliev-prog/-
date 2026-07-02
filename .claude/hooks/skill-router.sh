#!/bin/bash
# UserPromptSubmit — анализирует запрос и подсказывает нужный агент/скилл

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // ""' | tr '[:upper:]' '[:lower:]')

[ -z "$PROMPT" ] && exit 0

# ── Матчинг по ключевым словам ────────────────────────────────────────────────

AGENT=""
REASON=""

# planner — планирование, архитектура, с чего начать
if echo "$PROMPT" | grep -qiE 'как реализовать|с чего начать|спланируй|архитектур|разбей на|какой подход|план|planning|architect'; then
  AGENT="planner"
  REASON="задача требует планирования"

# database — схема, миграция, запросы
elif echo "$PROMPT" | grep -qiE 'prisma|миграци|схем[аыу]|модел[ьи]|индекс|таблиц|relation|foreign key|database|bigint|diram'; then
  AGENT="database"
  REASON="задача связана с БД/Prisma"

# frontend — UI, компоненты, страницы
elif echo "$PROMPT" | grep -qiE 'компонент|страниц[аыу]|форм[аыу]|кнопк|ui|tailwind|shadcn|tsx|react|server component|client component|app/|layout|page\.tsx'; then
  AGENT="frontend"
  REASON="задача связана с UI/React"

# backend — API, очереди, сервисы
elif echo "$PROMPT" | grep -qiE 'api|route|endpoint|server action|bullmq|очеред|worker|redis|webhook|middleware|auth|session|jwt'; then
  AGENT="backend"
  REASON="задача связана с backend/API"

# tester — тесты
elif echo "$PROMPT" | grep -qiE 'тест|test|spec|vitest|playwright|e2e|coverage|mock|покры'; then
  AGENT="tester"
  REASON="задача связана с тестами"

# reviewer — ревью, проверка
elif echo "$PROMPT" | grep -qiE 'проверь|ревью|review|посмотри|оцени|что не так|проблем|баг|ошибк'; then
  AGENT="reviewer"
  REASON="задача требует code review"
fi

[ -z "$AGENT" ] && exit 0  # не определили — не мешаем

echo "{\"systemMessage\": \"Skill-роутер: для этой задачи используй агент [$AGENT] ($REASON). Запусти через Agent(subagent_type='$AGENT').\"}"
