# Hosting Trip Computer on Proxmox LXC

This guide walks you through deploying Trip Computer on a lightweight Debian 12 LXC container in Proxmox.

---

## 1. Create the LXC Container

### Via Proxmox UI

1. Download the Debian 12 template: **Datacenter → Storage → CT Templates → Download** (`debian-12-standard`)
2. Click **Create CT**
3. Configure:
   - **Hostname:** `trip-computer`
   - **Password:** *(set a root password)*
   - **Template:** `debian-12-standard_*.tar.zst`
   - **Disk:** 4 GB
   - **CPU:** 1 core
   - **Memory:** 512 MB
   - **Network:** DHCP or static IP on your LAN bridge
4. Click **Finish**, then **Start**

### Via CLI (on Proxmox host)

```bash
# Find the next available CT ID
CTID=200

pct create $CTID /var/lib/vz/template/cache/debian-12-standard_12.2-1_amd64.tar.zst \
  --hostname trip-computer \
  --cores 1 \
  --memory 512 \
  --swap 512 \
  --rootfs local-lvm:4 \
  --net0 name=eth0,bridge=vmbr0,ip=dhcp \
  --unprivileged 1 \
  --features nesting=1

pct start $CTID
pct enter $CTID
```

---

## 2. Initial Setup (inside the LXC)

```bash
apt update && apt upgrade -y
apt install -y curl git nginx
```

### Install Node.js 20 LTS via NodeSource

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node --version   # should be v20.x.x
npm --version
```

---

## 3. Clone and Configure the App

```bash
git clone https://github.com/Grant-Visser/trip-computer.git /opt/trip-computer
cd /opt/trip-computer

# Create the data directory for SQLite
mkdir -p /opt/trip-computer/backend/data

# Set up the backend .env
cp /opt/trip-computer/backend/.env.example /opt/trip-computer/backend/.env
# Edit if needed: nano /opt/trip-computer/backend/.env
# Default: PORT=3000, DB_PATH=./data/trip-computer.db
```

---

## 4. Deploy

```bash
cd /opt/trip-computer
bash scripts/deploy.sh
```

This will:
- Install backend npm deps
- Build the backend TypeScript → `dist/`
- Install frontend npm deps
- Build the Angular PWA → `dist/frontend/browser/`
- Restart the systemd service

---

## 5. Set Up the systemd Service

```bash
cp /opt/trip-computer/proxmox/trip-computer.service /etc/systemd/system/trip-computer.service
systemctl daemon-reload
systemctl enable trip-computer
systemctl start trip-computer
systemctl status trip-computer
```

The backend should be running on `http://localhost:3000`.

---

## 6. Configure Nginx

```bash
cp /opt/trip-computer/proxmox/nginx.conf /etc/nginx/sites-available/trip-computer
ln -s /etc/nginx/sites-available/trip-computer /etc/nginx/sites-enabled/trip-computer
rm -f /etc/nginx/sites-enabled/default   # remove default site

nginx -t    # test config
systemctl reload nginx
```

Nginx now:
- Serves the Angular PWA from `/opt/trip-computer/frontend/dist/frontend/browser/`
- Proxies `/api/` → `http://localhost:3000`
- Falls back to `/index.html` for Angular routing

---

## 7. Access the App

Open `http://<LXC-IP>` in your browser. The Trip Computer PWA should load.

On Android/iOS: tap **Add to Home Screen** to install as a PWA.

---

## 8. Updating

SSH into the container and run:

```bash
ssh root@<LXC-IP>
cd /opt/trip-computer
bash scripts/update.sh
```

This pulls the latest code from GitHub and redeploys.

---

## 9. Optional: Auto-Update via Cron

For automatic nightly updates:

```bash
crontab -e
# Add:
0 3 * * * cd /opt/trip-computer && git pull origin main && bash scripts/deploy.sh >> /var/log/trip-computer-update.log 2>&1
```

---

## 10. Optional: Expose via Tailscale or Cloudflare Tunnel

### Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up
# Access at http://trip-computer:80 from any Tailscale device
```

### Cloudflare Tunnel (for public HTTPS access)

```bash
# Install cloudflared, then:
cloudflared tunnel create trip-computer
cloudflared tunnel route dns trip-computer fuel.yourdomain.com
# Run tunnel pointing to http://localhost:80
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Service won't start | `journalctl -u trip-computer -n 50` |
| Nginx 502 bad gateway | Check backend: `systemctl status trip-computer` |
| Build fails | Ensure Node 20: `node --version` |
| SQLite permission error | `chown -R www-data:www-data /opt/trip-computer/backend/data` |
| App loads but API 404 | Check nginx config `location /api/` block |

---

## File Locations Summary

| Path | Contents |
|------|----------|
| `/opt/trip-computer/` | App root |
| `/opt/trip-computer/backend/.env` | Backend config (port, DB path) |
| `/opt/trip-computer/backend/data/trip-computer.db` | SQLite database |
| `/opt/trip-computer/frontend/dist/frontend/browser/` | Angular build output |
| `/etc/systemd/system/trip-computer.service` | systemd unit |
| `/etc/nginx/sites-available/trip-computer` | Nginx config |
