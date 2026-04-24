# Hosting Trip Computer on Proxmox LXC

## One-Command Install

From your **Proxmox host shell** as root:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/Grant-Visser/trip-computer/main/proxmox/trip-computer.sh)"
```

The script will:
- Ask for **Default** or **Advanced** setup
- Prompt you to select template and disk storage from your available pools
- Create a **Debian 13 LXC** (1 core, 512MB RAM, 4GB disk)
- Install Node.js 22 LTS, clone the repo, build frontend + backend
- Configure Nginx (port 80) and a systemd service
- Print the URL when done

**Default mode** — just pick storage, everything else is automatic.  
**Advanced mode** — full control over CT ID, hostname, CPU, RAM, disk size, bridge.

---

## Updating

Run this from the Proxmox host:

```bash
pct exec <CTID> -- bash -c 'cd /opt/trip-computer && git pull && npm ci && cd backend && npm run build && cd ../frontend && npm run build && cp -r dist/frontend/browser/. /var/www/trip-computer/ && systemctl restart trip-computer'
```

Or SSH into the container and run the same command directly.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Service won't start | `journalctl -u trip-computer -n 50` |
| Nginx 502 bad gateway | `systemctl status trip-computer` |
| Build fails | `node --version` — should be v22.x |
| API 404 | Check `/etc/nginx/sites-available/trip-computer` — `location /api/` block |

---

## File Locations

| Path | Contents |
|------|----------|
| `/opt/trip-computer/` | App root |
| `/opt/trip-computer/backend/.env` | Backend config (port, DB path) |
| `/opt/trip-computer/backend/data/trip-computer.db` | SQLite database |
| `/var/www/trip-computer/` | Angular build output (served by Nginx) |
| `/etc/systemd/system/trip-computer.service` | systemd unit |
| `/etc/nginx/sites-available/trip-computer` | Nginx config |
