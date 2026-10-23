#!/bin/bash
# One-time administrative setup. Run from a directory containing the deploy scripts.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
[[ $EUID == 0 ]] || exit 64
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
mkdir -p /opt/vltk-releases /var/lib/vltk-deploy
if ! id vltk-build >/dev/null 2>&1; then
  useradd --system --home-dir /var/cache/vltk-build --create-home --shell /sbin/nologin vltk-build
fi
install -d -o vltk-build -g vltk-build -m 0750 /var/cache/vltk-build
if [[ ! -d /opt/vltk-repository.git ]]; then
  git clone --bare --no-hardlinks /opt/vltk-web /opt/vltk-repository.git
fi
git --git-dir=/opt/vltk-repository.git remote set-url origin https://github.com/hudy9x/vltk-web.git
if [[ ! -L /opt/vltk-web ]]; then
  sha=$(git -C /opt/vltk-web rev-parse HEAD)
  target="/opt/vltk-releases/bootstrap-$sha"
  [[ ! -e $target ]]
  mv /opt/vltk-web "$target"
  ln -s "$target" /opt/vltk-web
  printf '%s\n' "$sha" > /var/lib/vltk-deploy/current-sha
fi
install -o root -g root -m 0755 "$script_dir/vps-deploy.sh" /usr/local/sbin/vltk-deploy
install -o root -g root -m 0755 "$script_dir/ssh-dispatch.sh" /usr/local/sbin/vltk-deploy-dispatch
echo 'CD controller installed. Authorize a restricted deployment SSH key separately.'
