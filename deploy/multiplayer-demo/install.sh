#!/usr/bin/env bash
# Install a reviewed, built demo tree. Does not deploy or restart the main game.
set -euo pipefail
demo_source=${1:?Usage: install.sh BUILD_TREE RELEASE_ID}
demo_release=${2:?Usage: install.sh BUILD_TREE RELEASE_ID}
[[ $EUID -eq 0 ]] || { echo 'Run as root.' >&2; exit 1; }
[[ $demo_release =~ ^[a-zA-Z0-9-]+$ ]] || { echo 'Invalid release ID.' >&2; exit 1; }
demo_root=/opt/vltk-multiplayer-demo
demo_target=$demo_root/releases/$demo_release
demo_nginx=/etc/nginx/conf.d/vltk-web.conf
demo_include='    include /etc/nginx/vltk-multiplayer-demo.locations;'
test -x "$demo_source/src/server/multiplayer-demo/target/release/demo-websocket"
test -x "$demo_source/src/server/multiplayer-demo/target/release/demo-webtransport"
test -f "$demo_nginx"
test ! -e "$demo_target"
getent passwd vltk-demo >/dev/null || useradd --system --no-create-home --shell /sbin/nologin vltk-demo
install -d -m 755 "$demo_target/bin" "$demo_target/client" /etc/vltk-multiplayer-demo
install -m 755 "$demo_source/src/server/multiplayer-demo/target/release/demo-websocket" "$demo_target/bin/"
install -m 755 "$demo_source/src/server/multiplayer-demo/target/release/demo-webtransport" "$demo_target/bin/"
cp -R "$demo_source/src/client/multiplayer-demo/." "$demo_target/client/"
chown -R root:root "$demo_target"
chmod -R a+rX "$demo_target/client"
install -m 644 "$demo_source/deploy/multiplayer-demo/vltk-demo@.service" /etc/systemd/system/
install -m 644 "$demo_source/deploy/multiplayer-demo/websocket.env" /etc/vltk-multiplayer-demo/
install -m 644 "$demo_source/deploy/multiplayer-demo/webtransport.env" /etc/vltk-multiplayer-demo/
install -m 644 "$demo_source/deploy/multiplayer-demo/nginx.locations.conf" /etc/nginx/vltk-multiplayer-demo.locations
demo_backup=/var/backups/vltk-multiplayer-demo/$demo_release
install -d -m 700 "$demo_backup"
cp -p "$demo_nginx" "$demo_backup/vltk-web.conf"
readlink "$demo_root/current" > "$demo_backup/previous-release" || true
if ! grep -Fq "$demo_include" "$demo_nginx"; then
    # Fail instead of guessing if the existing HTTPS block no longer matches.
    python3 - "$demo_nginx" <<'PY'
import sys
from pathlib import Path
p = Path(sys.argv[1])
source = p.read_text()
anchor = '    ssl_session_tickets off;\n'
if source.count(anchor) != 1:
    raise SystemExit('Cannot identify the HTTPS server block; nginx was not changed.')
p.write_text(source.replace(anchor, anchor + '\n    include /etc/nginx/vltk-multiplayer-demo.locations;\n'))
PY
fi
if ! nginx -t; then
    cp -p "$demo_backup/vltk-web.conf" "$demo_nginx"
    exit 1
fi
ln -s "$demo_target" "$demo_root/current.next"
mv -Tf "$demo_root/current.next" "$demo_root/current"
systemctl daemon-reload
systemctl enable vltk-demo@websocket vltk-demo@webtransport
systemctl restart vltk-demo@websocket vltk-demo@webtransport
demo_healthy=false
for demo_attempt in {1..20}; do
    if curl -fsS http://127.0.0.1:3101/health >/dev/null && curl -fsS http://127.0.0.1:3102/health >/dev/null; then
        demo_healthy=true
        break
    fi
    sleep 1
done
if [[ $demo_healthy != true ]]; then
    cp -p "$demo_backup/vltk-web.conf" "$demo_nginx"
    if [[ -s $demo_backup/previous-release ]]; then
        ln -s "$(cat "$demo_backup/previous-release")" "$demo_root/current.rollback"
        mv -Tf "$demo_root/current.rollback" "$demo_root/current"
        systemctl restart vltk-demo@websocket vltk-demo@webtransport
    else
        systemctl disable --now vltk-demo@websocket vltk-demo@webtransport
    fi
    echo 'Demo health check failed; activation rolled back.' >&2
    exit 1
fi
systemctl reload nginx
printf 'Activated demo release: %s\n' "$demo_release"
systemctl is-active vltk-demo@websocket vltk-demo@webtransport
