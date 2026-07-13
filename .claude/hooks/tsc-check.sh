#!/bin/bash
FILE=$(jq -r '.tool_input.file_path // .tool_response.filePath // ""')
echo "$FILE" | grep -qE '\.(ts|tsx)$' || exit 0

# Find the directory of the edited file, then walk up to find tsconfig.json
ABS_FILE=$(realpath "$FILE" 2>/dev/null || echo "$FILE")
DIR=$(dirname "$ABS_FILE")

# Walk up to find nearest tsconfig.json
TSCONFIG_DIR=""
D="$DIR"
while [ "$D" != "/" ]; do
  if [ -f "$D/tsconfig.json" ]; then
    TSCONFIG_DIR="$D"
    break
  fi
  D=$(dirname "$D")
done

# No tsconfig found — skip silently
[ -z "$TSCONFIG_DIR" ] && exit 0

OUTPUT=$(cd "$TSCONFIG_DIR" && npx tsc --noEmit 2>&1 | head -20)
RC=$?
if [ $RC -eq 0 ]; then
  echo '{"systemMessage": "TypeScript: OK"}'
else
  MSG=$(echo "$OUTPUT" | head -10 | tr '"' "'" | tr $'\n' ' ')
  echo "{\"systemMessage\": \"TypeScript errors: $MSG\"}"
fi
