#!/usr/bin/env bash
# ==============================================================================
# Trip Computer — Container Install Script
# Runs INSIDE the LXC container. Called by trip-computer.sh on the host.
# ==============================================================================
set -euo pipefail

YW="\033[33m" GN="\033[1;92m" RD="\033[01;31m" BL="\033[36m" CL="\033[m"
CM="${GN}✓${CL}" CROSS="${RD}✗${CL}" TAB="  "

msg_info()  { echo -e "${TAB}${YW}○${CL} ${1}..."; }
msg_ok()    { echo -e "${TAB}${CM} ${1}"; }
msg_error() { echo -e "${TAB}${CROSS} ${RD}${1}${CL}"; exit 1; }

REPO_URL="https://github.com/Grant-Visser/trip-computer.git"
NODE_MAJOR=22

# ── System update ─────────────────────────────────────────────────────────────
msg_info "Updating system"
apt-get update -qq
apt-get upgrade -y -qq
msg_ok "System updated"

# ── Dependencies ──────────────────────────────────────────────────────────────
msg_info "Installing dependencies"
apt-get install -y -qq \
  curl \
  git \
  nginx \
  ca-certificates \
  gnupg
msg_ok "Dependencies installed"

# ── Node.js 22 LTS via NodeSource ─────────────────────────────────────────────
msg_info "Installing Node.js $NODE_MAJOR LTS"
curl -fsSL https://deb.nodesource.com/setup_${NODE_MAJOR}.x | bash - >/dev/null 2>&1
apt-get install -y -qq nodejs
msg_ok "Node.js $(node -v) installed"

# ── Clone repo ────────────────────────────────────────────────────────────────
msg_info "Cloning Trip Computer"
git clone -q "$REPO_URL" /opt/trip-computer
msg_ok "Repository cloned"

# ── Install dependencies ──────────────────────────────────────────────────────
msg_info "Installing Node dependencies"
cd /opt/trip-computer
npm ci --silent
msg_ok "Node dependencies installed"

# ── Build backend ─────────────────────────────────────────────────────────────
msg_info "Building backend"
cd /opt/trip-computer/backend
npm run build >/dev/null 2>&1
msg_ok "Backend built"

# ── Build frontend ────────────────────────────────────────────────────────────
msg_info "Building frontend (this may take a minute)"
cd /opt/trip-computer/frontend
npm run build >/dev/null 2>&1
msg_ok "Frontend built"

# ── Deploy frontend static files ──────────────────────────────────────────────
msg_info "Deploying frontend"
mkdir -p /var/www/trip-computer
cp -r /opt/trip-computer/frontend/dist/frontend/browser/. /var/www/trip-computer/
msg_ok "Frontend deployed"

# ── Data directory + env ──────────────────────────────────────────────────────
msg_info "Setting up data directory"
mkdir -p /opt/trip-computer/backend/data
cat <<EOF >/opt/trip-computer/backend/.env
NODE_ENV=production
PORT=3000
DB_PATH=/opt/trip-computer/backend/data/trip-computer.db
EOF
msg_ok "Data directory and .env ready"

# ── Nginx ─────────────────────────────────────────────────────────────────────
msg_info "Configuring Nginx"
cat <<'NGINXCONF' >/etc/nginx/sites-available/trip-computer
server {
    listen 80;
    server_name _;

    root /var/www/trip-computer;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINXCONF
ln -sf /etc/nginx/sites-available/trip-computer /etc/nginx/sites-enabled/trip-computer
rm -f /etc/nginx/sites-enabled/default
nginx -t -q
systemctl enable nginx -q
systemctl restart nginx
msg_ok "Nginx configured and running"

# ── systemd service ───────────────────────────────────────────────────────────
msg_info "Creating systemd service"
cat <<'SVCEOF' >/etc/systemd/system/trip-computer.service
[Unit]
Description=Trip Computer Backend
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/trip-computer/backend
EnvironmentFile=/opt/trip-computer/backend/.env
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SVCEOF
systemctl daemon-reload
systemctl enable trip-computer -q
systemctl start trip-computer
msg_ok "Service created and started"

# ── Verify ────────────────────────────────────────────────────────────────────
sleep 2
if systemctl is-active --quiet trip-computer; then
  msg_ok "Backend is running"
else
  msg_error "Backend failed to start — check: journalctl -u trip-computer -n 20"
fi

if systemctl is-active --quiet nginx; then
  msg_ok "Nginx is running"
else
  msg_error "Nginx failed to start — check: journalctl -u nginx -n 20"
fi

echo ""
echo -e "${GN}  Installation complete!${CL}"
