#!/bin/bash
# Install configuration only. Activation is performed by vltk-deploy after preview checks.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
[[ $EUID == 0 ]] || exit 64
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
[[ -x /var/cache/vltk-build/.cargo/bin/cargo ]] || { echo 'Install stable Rust for vltk-build first.' >&2; exit 1; }
bash "$script_dir/setup-cd.sh"
install -d -m 0755 /etc/systemd/system/vltk-web.service.d
python3 - <<'PY'
import pathlib, secrets, os
rust=pathlib.Path('/etc/vltk-multiplayer.env')
web=pathlib.Path('/etc/vltk-online-web.env')
if rust.exists() or web.exists():
    def values(path):
        return dict(line.split('=',1) for line in path.read_text().splitlines() if '=' in line and not line.startswith('#')) if path.exists() else {}
    r,w=values(rust),values(web)
    secret=r.get('MULTIPLAYER_SECRET') or w.get('MULTIPLAYER_SECRET')
    assert secret and len(secret)>=32
    assert not (r.get('MULTIPLAYER_SECRET') and w.get('MULTIPLAYER_SECRET') and r['MULTIPLAYER_SECRET']!=w['MULTIPLAYER_SECRET']), 'Secrets do not match'
else: secret=secrets.token_hex(32)
configs={rust:f'MULTIPLAYER_SECRET={secret}\nWT_BIND=0.0.0.0:4434\nWT_HTTP_BIND=127.0.0.1:3104\nWT_PUBLIC_URL=https://103.121.91.177:4434/play\nWT_CERT_HOST=103.121.91.177\nWT_ORIGINS=https://gamelab.hudy9x.com\nPVE_OUTBOX_FILE=/var/lib/vltk-multiplayer/rewards.jsonl\n',web:f'MULTIPLAYER_SECRET={secret}\nMULTIPLAYER_WT_CONTROL_URL=http://127.0.0.1:3104\nVLTK_BATTLEFIELD_CACHE_DIR=/var/lib/vltk-web/battlefield-cache\n'}
for path,content in configs.items():
    if not path.exists():
        fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_EXCL,0o600)
        with os.fdopen(fd,'w') as out:out.write(content)
    path.chmod(0o600)
if 'VLTK_BATTLEFIELD_CACHE_DIR=' not in web.read_text():
    with web.open('a') as out:out.write('VLTK_BATTLEFIELD_CACHE_DIR=/var/lib/vltk-web/battlefield-cache\n')
PY
install -o root -g root -m 0644 "$script_dir/multiplayer/vltk-multiplayer.service" /etc/systemd/system/vltk-multiplayer.service
cat > /etc/systemd/system/vltk-web.service.d/online.conf <<'UNIT'
[Unit]
After=vltk-multiplayer.service
[Service]
EnvironmentFile=/etc/vltk-online-web.env
UNIT
systemctl daemon-reload
systemctl enable vltk-multiplayer
printf '%s\n' 'Online configuration installed; existing web process has not been restarted.'
