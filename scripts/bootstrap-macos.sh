#!/bin/bash

set -euo pipefail

if [ "$(uname -s)" != "Darwin" ]; then
  echo "This launcher is for macOS. On Windows, use Start-Or-Birthday-Windows.bat."
  exit 1
fi

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RUNTIME_ROOT="$PROJECT_ROOT/.runtime"
NODE_HOME="$RUNTIME_ROOT/node-macos"
DOWNLOADS="$RUNTIME_ROOT/downloads"

is_supported_node() {
  local node_path="$1"
  local version major minor remainder
  version="$("$node_path" --version 2>/dev/null)" || return 1
  version="${version#v}"
  major="${version%%.*}"
  remainder="${version#*.}"
  minor="${remainder%%.*}"

  [[ "$major" =~ ^[0-9]+$ && "$minor" =~ ^[0-9]+$ ]] || return 1
  if [ "$major" -eq 20 ]; then [ "$minor" -ge 19 ]; return; fi
  if [ "$major" -eq 22 ]; then [ "$minor" -ge 12 ]; return; fi
  [ "$major" -ge 24 ]
}

install_portable_node() {
  echo "A compatible Node.js installation was not found."
  echo "Downloading a private Node.js 24 LTS runtime from nodejs.org..."

  mkdir -p "$DOWNLOADS"

  local machine_arch node_arch base_url checksums line expected_hash archive_name archive_path actual_hash
  machine_arch="$(uname -m)"
  case "$machine_arch" in
    arm64) node_arch="arm64" ;;
    x86_64) node_arch="x64" ;;
    *) echo "Unsupported Mac processor architecture: $machine_arch"; return 1 ;;
  esac

  base_url="https://nodejs.org/dist/latest-v24.x"
  checksums="$(curl --fail --silent --show-error --location "$base_url/SHASUMS256.txt")"
  line="$(printf '%s\n' "$checksums" | grep -E "^[a-f0-9]{64}  node-v[^ ]+-darwin-$node_arch\\.tar\\.gz$" | head -n 1 || true)"
  if [ -z "$line" ]; then
    echo "Could not find a macOS $node_arch Node.js download in the official checksum list."
    return 1
  fi

  expected_hash="${line%%  *}"
  archive_name="${line#*  }"
  archive_path="$DOWNLOADS/$archive_name"
  curl --fail --show-error --location "$base_url/$archive_name" --output "$archive_path"

  actual_hash="$(shasum -a 256 "$archive_path" | awk '{print $1}')"
  if [ "$actual_hash" != "$expected_hash" ]; then
    echo "The downloaded Node.js archive failed its SHA-256 verification and will not be used."
    return 1
  fi

  case "$NODE_HOME" in
    "$RUNTIME_ROOT"/node-macos) ;;
    *) echo "Refusing to modify a path outside the project runtime directory."; return 1 ;;
  esac

  rm -rf "$NODE_HOME"
  mkdir -p "$NODE_HOME"
  tar -xzf "$archive_path" -C "$NODE_HOME" --strip-components=1

  if ! is_supported_node "$NODE_HOME/bin/node"; then
    echo "Node.js was downloaded but its executable could not be validated."
    return 1
  fi
}

mkdir -p "$RUNTIME_ROOT"

NODE_EXECUTABLE=""
if [ -x "$NODE_HOME/bin/node" ] && [ -x "$NODE_HOME/bin/npm" ] && is_supported_node "$NODE_HOME/bin/node"; then
  NODE_EXECUTABLE="$NODE_HOME/bin/node"
elif command -v node >/dev/null 2>&1 && command -v npm >/dev/null 2>&1 && is_supported_node "$(command -v node)"; then
  NODE_EXECUTABLE="$(command -v node)"
else
  install_portable_node
  NODE_EXECUTABLE="$NODE_HOME/bin/node"
fi

export PATH="$(dirname "$NODE_EXECUTABLE"):$PATH"
echo
exec "$NODE_EXECUTABLE" "$PROJECT_ROOT/setup.js"
