#!/bin/bash
# Stop hook — запускается когда Claude заканчивает сессию изменений

# Ищем корень git репозитория
GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null)
[ -z "$GIT_ROOT" ] && exit 0

cd "$GIT_ROOT" || exit 0

# Получаем коммиты с момента последнего тега или последние 20
LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null)
if [ -n "$LAST_TAG" ]; then
  COMMITS=$(git log "${LAST_TAG}..HEAD" --pretty=format:"%s" 2>/dev/null)
else
  COMMITS=$(git log --pretty=format:"%s" -20 2>/dev/null)
fi

# Если нет коммитов — выходим тихо
[ -z "$COMMITS" ] && exit 0

# Парсим по типу conventional commits
FEATURES=$(echo "$COMMITS" | grep -E '^feat(\(.+\))?!?:' | sed 's/^feat[^:]*: /- /')
FIXES=$(echo "$COMMITS" | grep -E '^fix(\(.+\))?!?:' | sed 's/^fix[^:]*: /- /')
BREAKING=$(echo "$COMMITS" | grep -E '^[a-z]+(\(.+\))?!:|BREAKING CHANGE' | sed 's/^[^:]*: /- /')
CHORES=$(echo "$COMMITS" | grep -E '^(chore|refactor|perf|docs|style|test)(\(.+\))?:' | sed 's/^[^:]*: /- /')

# Если нечего добавлять — выходим
[ -z "$FEATURES" ] && [ -z "$FIXES" ] && [ -z "$BREAKING" ] && exit 0

# Формируем новую секцию
DATE=$(date +%Y-%m-%d)
VERSION=${LAST_TAG:-"Unreleased"}
NEXT_SECTION="## [$VERSION] — $DATE\n"

[ -n "$BREAKING" ] && NEXT_SECTION="${NEXT_SECTION}\n### Breaking Changes\n${BREAKING}\n"
[ -n "$FEATURES" ] && NEXT_SECTION="${NEXT_SECTION}\n### Features\n${FEATURES}\n"
[ -n "$FIXES" ]    && NEXT_SECTION="${NEXT_SECTION}\n### Bug Fixes\n${FIXES}\n"
[ -n "$CHORES" ]   && NEXT_SECTION="${NEXT_SECTION}\n### Chores\n${CHORES}\n"

CHANGELOG="$GIT_ROOT/CHANGELOG.md"

# Создаём CHANGELOG.md если не существует
if [ ! -f "$CHANGELOG" ]; then
  printf "# Changelog\n\nAll notable changes to this project will be documented here.\n\n" > "$CHANGELOG"
fi

# Проверяем — уже есть ли эта версия в файле
if grep -qF "## [$VERSION]" "$CHANGELOG" 2>/dev/null; then
  exit 0
fi

# Вставляем новую секцию после заголовка (первые 3 строки)
HEADER=$(head -3 "$CHANGELOG")
BODY=$(tail -n +4 "$CHANGELOG")
printf "%s\n\n%b\n%s" "$HEADER" "$NEXT_SECTION" "$BODY" > "$CHANGELOG"

echo "{\"systemMessage\": \"CHANGELOG.md обновлён — добавлена секция $VERSION ($DATE)\"}"
