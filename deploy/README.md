# Production deployment

Every push/merge to `main` starts [Deploy game](https://github.com/hudy9x/vltk-web/actions/workflows/deploy.yml).
It can also be run manually with **Run workflow**, selecting `main`.

```text
merge/push main
    -> GitHub Actions: install -> typecheck/build -> full test suite
    -> restricted SSH: deploy <verified SHA>
    -> VPS: prepare release -> build -> preview health check -> SQLite backup
    -> atomic symlink switch -> restart -> HTTPS health check
                                      | failure
                                      +-> restore previous release and restart
```

## Infrastructure

| Item | Location |
|---|---|
| Site | https://gamelab.hudy9x.com |
| Administrative SSH | `ssh -p 26266 root@103.121.91.177` |
| Active release | `/opt/vltk-web` (symlink) |
| Releases | `/opt/vltk-releases/<SHA>.<suffix>` |
| Fetch-only Git repository | `/opt/vltk-repository.git` |
| Current deployed SHA | `/var/lib/vltk-deploy/current-sha` |
| Previous release | `/var/lib/vltk-deploy/previous-release` |
| Persistent SQLite | `/var/lib/vltk-web/game.sqlite` |
| SQLite backups | `/var/backups/vltk-web/` |
| Deploy controller | `/usr/local/sbin/vltk-deploy` |
| SSH command dispatcher | `/usr/local/sbin/vltk-deploy-dispatch` |

Node.js 24 runs Fastify on `127.0.0.1:3000` behind nginx HTTPS. The `vltk-web`
systemd service runs as `vltk`, is enabled at boot, and restarts on failure.
Build/install scripts run as a separate unprivileged user, `vltk-build`.
Preview uses port `3003` and a temporary database, without touching player saves.
Runtime dev dependencies are retained because startup imports esbuild and the source map codec.

## GitHub configuration

Repository Actions secrets:

- `VPS_DEPLOY_KEY`: dedicated Ed25519 private key, never committed to Git.
- `VPS_KNOWN_HOSTS`: pinned `[103.121.91.177]:26266` SSH host key obtained through the verified admin connection.

The corresponding public key in root's `authorized_keys` uses:

```text
restrict,command="/usr/local/sbin/vltk-deploy-dispatch" ssh-ed25519 <public key> github-actions-vltk-web
```

This key permits only `deploy <40-character SHA>`; it cannot open a shell, forward
ports, or transfer files. The root-owned controller fetches only this repository's
`main` branch and refuses to deploy an outdated/different commit. Workflow actions
are pinned to immutable commit SHAs, with a read-only GitHub token. Concurrent
runs are serialized in GitHub and by `flock` on the VPS; queued obsolete commits skip deployment.

## Setup and maintenance

`setup-cd.sh` is a one-time administrative operation on the existing VPS. Upload
the deploy scripts to a root-controlled directory and run `bash setup-cd.sh` there.
It preserves the original checkout as a bootstrap release, creates the build user
and Git cache, and installs the controller/dispatcher. Add the restricted key and
Actions secrets separately. Keep normal administrative SSH access for maintenance.

Controller changes in Git **do not automatically replace root-owned scripts**.
Review them and re-run setup administratively before deploying changes that require
a new controller. Normal game/workflow changes deploy automatically.

Five recent generated releases and five deploy-created database backups are retained.
The current/previous targets and initial bootstrap release are preserved. Media
downloaded by the game is carried forward without overwriting newly committed assets.
The database remains outside releases and is never reset during deploy.

```sh
systemctl status vltk-web nginx
journalctl -u vltk-web -n 100 --no-pager
cat /var/lib/vltk-deploy/current-sha
curl --fail http://127.0.0.1:3000/api/health
# Redeploy current main after its workflow tests have passed:
/usr/local/sbin/vltk-deploy <main-SHA>
```

Failed activation rolls back **code**, without replacing the player database.
Future database migrations must remain backward compatible with the previous
release. Restoring a database backup is an explicit administrative operation
because it can discard writes made after that backup.

For an emergency manual code rollback, acquire `/run/lock/vltk-deploy.lock`, point
`/opt/vltk-web` to the recorded previous release using an atomic symlink rename,
and restart `vltk-web`. Update `current-sha` to that release's recorded SHA.
The next successful `main` workflow deploys its new commit again.
