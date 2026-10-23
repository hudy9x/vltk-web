# VPS deployment

- Site: https://gamelab.hudy9x.com
- SSH: `ssh -p 26266 root@103.121.91.177`
- Checkout: `/opt/vltk-web`, branch `main`, origin `https://github.com/hudy9x/vltk-web.git`
- Runtime: Node.js 24, Fastify on `127.0.0.1:3000`, nginx HTTPS reverse proxy.
- Service: `vltk-web`, runs as `vltk`, enabled at boot and restarts on failure.
- Persistent SQLite: `/var/lib/vltk-web/game.sqlite` (including WAL/SHM while running).
- Public assets and generated client files are writable by the service for build/cache operations.
- Keep dev dependencies installed: the running server imports esbuild and the source map codec.
- GM and combat sandbox are disabled in production.

## Operations

```sh
systemctl status vltk-web nginx
journalctl -u vltk-web -n 100 --no-pager
curl --fail http://127.0.0.1:3000/api/health
systemctl restart vltk-web
```

Back up SQLite with the SQLite online backup API, or stop the service before copying
the database and any WAL files. Keep the database outside the checkout when updating.

The initial deployment applies a local HTTPS proxy compatibility patch to
`src/server/index.ts` and adds a regression test. These changes and this deployment
directory must be reviewed/committed before a future clean checkout replaces them.
Do not use `git reset --hard` to update the live checkout.

After reviewing incoming changes, install dependencies with `npm ci --include=dev`,
run `npm run build` and `npm test`, then restart the service. Ensure `vltk` can write
`src/client/` and `public/` after updating. Validate HTTPS login and saves after restart.
The full test suite also imports the Tauri SDK from `tools/map-tool/node_modules`;
install that tool's dependencies before running it (the tool has its own pnpm lockfile).

The previous `arena` and `arena-udp` test services and `/opt/volam-pvp` are removed
after the new game passes deployment checks. The existing TLS certificate and
certbot renewal remain in use.
