#! /bin/bash

# This script writes the commit hash and timestamp to src/version.ts
echo "Generating version file..."

COMMIT_HASH=$(git rev-parse --short HEAD)
COMMIT_NUMBER_THIS_MONTH=$(git rev-list --count --since="$(date +%Y-%m-01)" HEAD)
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

cat <<EOL > src/version.ts
export const COMMIT: string = '$COMMIT_HASH';
export const COMMIT_NUMBER_THIS_MONTH: string = '$COMMIT_NUMBER_THIS_MONTH';
export const BUILD_TIMESTAMP: string = '$TIMESTAMP';
EOL

echo "Version file generated with commit $COMMIT_HASH at $TIMESTAMP" timestamp.
