#!/bin/bash
# Root-owned controller; builds run as vltk-build, only the online branch can activate.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
umask 022
[[ $EUID == 0 && $# == 1 && $1 =~ ^[0-9a-f]{40}$ ]] || exit 64
sha=$1
branch=codex/game-webtransport-rust
repository=/opt/vltk-repository.git
releases=/opt/vltk-releases
live=/opt/vltk-web
state=/var/lib/vltk-deploy
backup_dir=/var/backups/vltk-web
cargo=/var/cache/vltk-build/.cargo/bin/cargo
exec 9>/run/lock/vltk-deploy.lock
flock --wait 600 9

git --git-dir="$repository" fetch --prune origin "+refs/heads/$branch:refs/heads/$branch"
if [[ $(git --git-dir="$repository" rev-parse "refs/heads/$branch") != "$sha" ]]; then
  echo "Refusing commit outside the current online branch tip: $sha" >&2
  exit 65
fi
if [[ -f $state/current-sha && $(cat "$state/current-sha") == "$sha" ]] && systemctl is-active --quiet vltk-web vltk-multiplayer; then
  echo "Online release $sha is already active."
  exit 0
fi
[[ -L $live && -d $releases && -d $state && -x $cargo && -f /etc/vltk-online-web.env && -f /etc/vltk-multiplayer.env ]] || { echo 'Complete online VPS setup first.' >&2; exit 1; }
previous=$(readlink -f "$live")
release=$(mktemp -d "$releases/$sha.XXXXXX")
chmod 0755 "$release"
switched=0
services_stopped=0
rust_was_active=0
systemctl is-active --quiet vltk-multiplayer && rust_was_active=1

activate() {
  ln -s "$1" /opt/.vltk-web-next
  mv -Tf /opt/.vltk-web-next "$live"
}
finish() {
  status=$?
  trap - EXIT
  systemctl stop vltk-web-preview.service vltk-multiplayer-preview.service >/dev/null 2>&1 || true
  if (( status != 0 )); then
    echo "Deployment failed for $sha." >&2
    if (( switched || services_stopped )); then
      rm -f /opt/.vltk-web-next
      activate "$previous"
      if (( rust_was_active )); then systemctl restart vltk-multiplayer || true
      else systemctl stop vltk-multiplayer || true; fi
      systemctl restart vltk-web || true
    fi
    journalctl -u vltk-web -u vltk-multiplayer -u vltk-web-preview -u vltk-multiplayer-preview -n 35 --no-pager >&2 || true
  fi
  exit "$status"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP
healthy() {
  curl --fail --silent --max-time 3 "$1" | python3 -c 'import json,sys; raw=sys.stdin.read(); assert raw.strip()=="ok" or json.loads(raw).get("ok") is True' 2>/dev/null
}
wait_for_health() {
  for ((attempt=0; attempt<60; attempt++)); do
    if healthy "$1"; then return 0; fi
    sleep 1
  done
  return 1
}

git --git-dir="$repository" archive "$sha" | tar -x -C "$release"
for directory in img fx snd music fonts ui; do
  if [[ -d $previous/public/$directory ]]; then cp -anP "$previous/public/$directory" "$release/public/"; fi
done
chown -R vltk-build:vltk-build "$release"
reuse_rust=0
if [[ -x $previous/bin/vltk-multiplayer-webtransport && -f $previous/.release-sha ]] && \
  git --git-dir="$repository" diff --quiet "$(cat "$previous/.release-sha")" "$sha" -- \
  ':(glob)src/server/multiplayer/**/*.rs' src/server/multiplayer/webtransport/Cargo.toml src/server/multiplayer/webtransport/Cargo.lock; then
  reuse_rust=1
fi
install -d -o vltk-build -g vltk-build /var/cache/vltk-build/online-target
(
  cd "$release"
  runuser -u vltk-build -- npm ci --include=dev
  runuser -u vltk-build -- npm run build
  install -d -o vltk-build -g vltk-build "$release/.battlefield-cache"
  runuser -u vltk-build -- env "VLTK_BATTLEFIELD_CACHE_DIR=$release/.battlefield-cache" \
    /usr/bin/node -e "require('./src/server/multiplayer/definitions/catalog.cjs').world()"
  if (( ! reuse_rust )); then
    runuser -u vltk-build -- env CARGO_TARGET_DIR=/var/cache/vltk-build/online-target \
      nice -n 10 "$cargo" build --release --locked --jobs 1 --manifest-path src/server/multiplayer/webtransport/Cargo.toml
  fi
)
install -d -o vltk-build -g vltk-build "$release/bin"
if (( reuse_rust )); then
  install -o vltk-build -g vltk-build -m 0755 "$previous/bin/vltk-multiplayer-webtransport" "$release/bin/"
else
  install -o vltk-build -g vltk-build -m 0755 /var/cache/vltk-build/online-target/release/vltk-multiplayer-webtransport "$release/bin/"
fi

# Preview both processes with isolated ports, SQLite and reward journal.
systemd-run --unit=vltk-multiplayer-preview --collect \
  --property=KillSignal=SIGINT --property=TimeoutStopSec=30 \
  --property=User=vltk-build --property=Group=vltk-build \
  --property=WorkingDirectory="$release" --property=MemoryMax=256M \
  --property=NoNewPrivileges=yes --property=PrivateTmp=yes \
  --property=EnvironmentFile=/etc/vltk-multiplayer.env \
  /usr/bin/env WT_BIND=127.0.0.1:4435 WT_HTTP_BIND=127.0.0.1:3105 \
  "PVE_OUTBOX_FILE=$release/.preview-rewards.jsonl" "$release/bin/vltk-multiplayer-webtransport"
wait_for_health http://127.0.0.1:3105/health
systemd-run --unit=vltk-web-preview --collect \
  --property=User=vltk-build --property=Group=vltk-build \
  --property=WorkingDirectory="$release" --property=MemoryMax=700M \
  --property=NoNewPrivileges=yes --property=PrivateTmp=yes \
  --property=EnvironmentFile=/etc/vltk-online-web.env \
  /usr/bin/env NODE_ENV=production PORT=3003 "DB_PATH=$release/.health.sqlite" \
  MULTIPLAYER_WT_CONTROL_URL=http://127.0.0.1:3105 "VLTK_BATTLEFIELD_CACHE_DIR=$release/.battlefield-cache" /usr/bin/node "$release/src/server/index.ts"
wait_for_health http://127.0.0.1:3003/api/health
systemctl stop vltk-web-preview.service vltk-multiplayer-preview.service
rm -f "$release"/.health.sqlite* "$release"/.preview-rewards*
chown -hR root:root "$release"
chown -hR vltk:vltk "$release/src/client" "$release/public"
printf '%s\n' "$sha" > "$release/.release-sha"

# Publish the content-addressed cache before activation; old releases use different keys.
install -d -o vltk -g vltk -m 0750 /var/lib/vltk-web/battlefield-cache
for cache in "$release"/.battlefield-cache/*.json; do
  install -o vltk -g vltk -m 0640 "$cache" /var/lib/vltk-web/battlefield-cache/
done
# Freeze both writers before taking the paired SQLite/journal backup.
services_stopped=1
systemctl stop vltk-web
systemctl stop vltk-multiplayer
mkdir -p "$backup_dir"
chmod 0700 "$backup_dir"
python3 - "$backup_dir" "$sha" <<'PY'
import datetime, pathlib, sqlite3, sys, shutil
folder = pathlib.Path(sys.argv[1])
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
prefix = 'game-' + stamp + '-' + sys.argv[2][:12]
filename = folder / (prefix + '.sqlite')
with sqlite3.connect('file:/var/lib/vltk-web/game.sqlite?mode=ro', uri=True) as source, sqlite3.connect(filename) as target:
    source.backup(target)
    assert target.execute('PRAGMA quick_check').fetchone()[0] == 'ok'
filename.chmod(0o600)
journal = pathlib.Path('/var/lib/vltk-multiplayer')
if journal.exists():
    target = folder / (prefix + '-multiplayer')
    shutil.copytree(journal, target, symlinks=True)
    target.chmod(0o700)
print('Paired backup:', filename)
PY
switched=1
activate "$release"
systemctl restart vltk-multiplayer
wait_for_health http://127.0.0.1:3104/health
systemctl restart vltk-web
wait_for_health http://127.0.0.1:3000/api/health
systemctl is-active --quiet vltk-web vltk-multiplayer
curl --fail --silent --show-error --max-time 15 \
  --resolve gamelab.hudy9x.com:443:127.0.0.1 https://gamelab.hudy9x.com/api/health \
  | python3 -c 'import json,sys; assert json.load(sys.stdin)["ok"] is True'
printf '%s\n' "$sha" > "$state/current-sha"
printf '%s\n' "$previous" > "$state/previous-release"
switched=0
services_stopped=0
echo "Deployed online Node + Rust $sha successfully."
python3 - "$releases" "$release" "$previous" "$backup_dir" <<'PY'
import pathlib, re, shutil, sys
folder, current, previous, backups = map(pathlib.Path, sys.argv[1:])
releases = sorted((p for p in folder.iterdir() if p.is_dir() and re.fullmatch(r'[0-9a-f]{40}\.[A-Za-z0-9]+', p.name)), key=lambda p: p.stat().st_mtime, reverse=True)
for path in releases[5:]:
    if path not in (current, previous): shutil.rmtree(path)
for path in sorted(backups.glob('game-*.sqlite'), reverse=True)[5:]:
    journal = path.with_name(path.stem + '-multiplayer')
    if journal.exists(): shutil.rmtree(journal)
    path.unlink()
PY
