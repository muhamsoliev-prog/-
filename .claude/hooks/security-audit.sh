#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
[ -z "$FILE" ] && exit 0

ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
BASENAME=$(basename "$ABS_FILE")

# ── package.json → npm audit ──────────────────────────────────────────────────
if [ "$BASENAME" = "package.json" ]; then
  DIR=$(dirname "$ABS_FILE")
  OUTPUT=$(cd "$DIR" && npm audit --audit-level=moderate --json 2>/dev/null)
  VULNS=$(echo "$OUTPUT" | jq -r '.metadata.vulnerabilities | .moderate + .high + .critical' 2>/dev/null)

  if [ -z "$VULNS" ] || [ "$VULNS" = "0" ]; then
    echo '{"systemMessage": "npm audit: уязвимостей не найдено"}'
  else
    CRITICAL=$(echo "$OUTPUT" | jq -r '.metadata.vulnerabilities.critical' 2>/dev/null)
    HIGH=$(echo "$OUTPUT" | jq -r '.metadata.vulnerabilities.high' 2>/dev/null)
    MODERATE=$(echo "$OUTPUT" | jq -r '.metadata.vulnerabilities.moderate' 2>/dev/null)
    echo "{\"systemMessage\": \"npm audit: critical=$CRITICAL high=$HIGH moderate=$MODERATE — запустите npm audit fix\"}"
  fi
  exit 0
fi

# ── Код (.ts/.tsx/.js/.jsx) → semgrep ────────────────────────────────────────
echo "$FILE" | grep -qE '\.(ts|tsx|js|jsx)$' || exit 0
[ ! -f "$ABS_FILE" ] && exit 0

# Ищем корень проекта (package.json) вверх по дереву
PROJECT_DIR=""
D=$(dirname "$ABS_FILE")
while [ "$D" != "/" ]; do
  if [ -f "$D/package.json" ]; then
    PROJECT_DIR="$D"
    break
  fi
  D=$(dirname "$D")
done
[ -z "$PROJECT_DIR" ] && exit 0

# Проверяем наличие semgrep
if ! command -v semgrep >/dev/null 2>&1; then
  # Fallback: простой grep на критичные паттерны
  ISSUES=$(grep -nE \
    'eval\(|innerHTML\s*=|dangerouslySetInnerHTML|child_process|exec\(|shell=true|Math\.random\(\)|crypto\.createHash\("md5"\)|console\.(log|error)\(.*password|\.env\b' \
    "$ABS_FILE" 2>/dev/null | head -5)

  if [ -z "$ISSUES" ]; then
    exit 0  # тихо — нет проблем и нет semgrep
  else
    MSG=$(echo "$ISSUES" | tr '"' "'" | tr $'\n' ' ')
    echo "{\"systemMessage\": \"Security warning: $MSG\"}"
  fi
  exit 0
fi

# semgrep есть — запускаем с правилами безопасности
OUTPUT=$(semgrep --config "p/security-audit" --config "p/secrets" \
  --json --quiet "$ABS_FILE" 2>/dev/null)
COUNT=$(echo "$OUTPUT" | jq -r '.results | length' 2>/dev/null)

if [ -z "$COUNT" ] || [ "$COUNT" = "0" ]; then
  echo '{"systemMessage": "Security audit: OK"}'
else
  FINDINGS=$(echo "$OUTPUT" | jq -r '.results[] | "\(.check_id) line \(.start.line)"' 2>/dev/null | head -5 | tr $'\n' ' ')
  echo "{\"systemMessage\": \"Security audit: $COUNT проблем — $FINDINGS\"}"
fi
