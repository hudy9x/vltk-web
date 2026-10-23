#!/bin/bash
# Installed as root-owned /usr/local/sbin/vltk-deploy. Never execute npm as root.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
umask 022
[[ $EUID == 0 && $# == 1 && $1 =~ ^[0-9a-f]{40}$ ]] || exit 64
sha=$1
repository=/opt/vltk-repository.git
releases=/opt/vltk-releases
live=/opt/vltk-web
state=/var/lib/vltk-deploy
backup_dir=/var/backups/vltk-web
exec 9>/run/lock/vltk-deploy.lock
flock --wait 600 9

git --git-dir="$repository" fetch --prune origin +refs/heads/main:refs/heads/main
if [[ $(git --git-dir="$repository" rev-parse refs/heads/main) != "$sha" ]]; then
  echo "Skipping superseded commit $sha; a newer main commit will deploy."
  exit 0
fi
[[ -L $live && -d $releases && -d $state ]] || { echo 'Run VPS CD setup first.' >&2; exit 1; }
previous=$(readlink -f "$live")
release=$(mktemp -d "$releases/$sha.XXXXXX")
chmod 0755 "$release"
switched=0

activate() {
  ln -s "$1" /opt/.vltk-web-next
  mv -Tf /opt/.vltk-web-next "$live"
}

finish() {
  status=$?
  trap - EXIT
  systemctl stop vltk-web-preview.service >/dev/null 2>&1 || true
  if (( status != 0 )); then
    echo "Deployment failed for $sha." >&2
    if (( switched )); then
      echo "Restoring $previous" >&2
      rm -f /opt/.vltk-web-next
      activate "$previous"
      systemctl restart vltk-web || true
    fi
    journalctl -u vltk-web -u vltk-web-preview -n 30 --no-pager >&2 || true
  fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

healthy() {
  curl --fail --silent --max-time 3 "$1" \
    | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"] is True' 2>/dev/null
}

wait_for_health() {
  for ((attempt=0; attempt<40; attempt++)); do
    if healthy "$1"; then return 0; fi
    sleep 1
  done
  return 1
}

git --git-dir="$repository" archive "$sha" | tar -x -C "$release"
# Preserve downloaded media; committed assets in the new release always win.
for directory in img fx snd music fonts ui; do
  if [[ -d $previous/public/$directory ]]; then
    cp -anP "$previous/public/$directory" "$release/public/"
  fi
done
chown -R vltk-build:vltk-build "$release"
(
  cd "$release"
  runuser -u vltk-build -- env HOME=/var/cache/vltk-build npm ci --include=dev
  runuser -u vltk-build -- env HOME=/var/cache/vltk-build npm run build
)

systemd-run --unit=vltk-web-preview --collect \
  --property=User=vltk-build --property=Group=vltk-build \
  --property=WorkingDirectory="$release" --property=MemoryMax=700M \
  --property=NoNewPrivileges=yes --property=PrivateTmp=yes \
  --setenv=NODE_ENV=production --setenv=PORT=3003 \
  --setenv=DB_PATH="$release/.health.sqlite" \
  /usr/bin/node "$release/src/server/index.ts"
wait_for_health http://127.0.0.1:3003/api/health
systemctl stop vltk-web-preview.service
rm -f "$release"/.health.sqlite*
chown -hR root:root "$release"
[[ -d $release/src/client && ! -L $release/src/client && -d $release/public && ! -L $release/public ]]
chown -hR vltk:vltk "$release/src/client" "$release/public"
printf '%s\n' "$sha" > "$release/.release-sha"

mkdir -p "$backup_dir"
chmod 0700 "$backup_dir"
python3 - "$backup_dir" "$sha" <<'PY'
import datetime, pathlib, sqlite3, sys
folder = pathlib.Path(sys.argv[1])
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
filename = folder / ('game-' + stamp + '-' + sys.argv[2][:12] + '.sqlite')
with sqlite3.connect('file:/var/lib/vltk-web/game.sqlite?mode=ro', uri=True) as source, sqlite3.connect(filename) as target:
    source.backup(target)
    assert target.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
filename.chmod(0o600)
print('SQLite backup:', filename)
PY

# Setting this before the rename also covers signals during activation.
switched=1
activate "$release"
systemctl restart vltk-web
wait_for_health http://127.0.0.1:3000/api/health
systemctl is-active --quiet vltk-web
curl --fail --silent --show-error --max-time 15 \
  --resolve gamelab.hudy9x.com:443:127.0.0.1 https://gamelab.hudy9x.com/api/health \
  | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"] is True'
printf '%s\n' "$sha" > "$state/current-sha"
printf '%s\n' "$previous" > "$state/previous-release"
switched=0
echo "Deployed $sha successfully."

# Keep five releases/backups plus the current and rollback targets.
python3 - "$releases" "$release" "$previous" "$backup_dir" <<'PY'
import pathlib, re, shutil, sys
folder, current, previous, backups = map(pathlib.Path, sys.argv[1:])
releases = sorted((p for p in folder.iterdir() if p.is_dir() and re.fullmatch(r'[0-9a-f]{40}\.[A-Za-z0-9]+', p.name)), key=lambda p: p.stat().st_mtime, reverse=True)
for path in releases[5:]:
    if path not in (current, previous):
        shutil.rmtree(path)
for path in sorted(backups.glob('game-*.sqlite'), reverse=True)[5:]:
    path.unlink()
PY
