#!/bin/bash

PROJECT_ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_ROOT" || exit 1

bash "$PROJECT_ROOT/scripts/bootstrap-macos.sh"
OR_BIRTHDAY_EXIT=$?

if [ "$OR_BIRTHDAY_EXIT" -ne 0 ]; then
  echo
  echo "Or Birthday could not start. Read the message above for details."
  echo
  read -r -p "Press Return to close this window..."
fi

exit "$OR_BIRTHDAY_EXIT"
