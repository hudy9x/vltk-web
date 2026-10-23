#!/bin/bash
# Installed as root-owned /usr/local/sbin/vltk-deploy-dispatch.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
if [[ ${SSH_ORIGINAL_COMMAND:-} =~ ^deploy\ ([0-9a-f]{40})$ ]]; then
  exec /usr/local/sbin/vltk-deploy "${BASH_REMATCH[1]}"
fi
echo 'Only deploy <40-character commit SHA> is permitted.' >&2
exit 64
