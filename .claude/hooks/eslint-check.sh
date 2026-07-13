#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
echo "$FILE" | grep -qE '\.(ts|tsx|js|jsx|mjs|cjs)$' || exit 0

ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
[ ! -f "$ABS_FILE" ] && exit 0

# Walk up to find eslint config
DIR=$(dirname "$ABS_FILE")
ESLINT_DIR=""
D="$DIR"
while [ "$D" != "/" ]; do
  if [ -f "$D/.eslintrc.json" ] || [ -f "$D/.eslintrc.js" ] || [ -f "$D/.eslintrc.cjs" ] || [ -f "$D/eslint.config.js" ] || [ -f "$D/eslint.config.mjs" ]; then
    ESLINT_DIR="$D"
    break
  fi
  # Also check package.json for eslintConfig key
  if [ -f "$D/package.json" ] && jq -e '.eslintConfig' "$D/package.json" >/dev/null 2>&1; then
    ESLINT_DIR="$D"
    break
  fi
  D=$(dirname "$D")
done

[ -z "$ESLINT_DIR" ] && exit 0

OUTPUT=$(cd "$ESLINT_DIR" && npx eslint --max-warnings=0 "$ABS_FILE" 2>&1 | head -20)
RC=$?
if [ $RC -eq 0 ]; then
  echo '{"systemMessage": "ESLint: OK"}'
else
  MSG=$(echo "$OUTPUT" | head -10 | tr '"' "'" | tr $'\n' ' ')
  echo "{\"systemMessage\": \"ESLint errors: $MSG\"}"
fi
