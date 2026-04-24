#!/usr/bin/env bash

# Author: Grant Visser / Ben (OpenClaw)
# Source: https://github.com/Grant-Visser/trip-computer

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

msg_info "Installing Dependencies"
$STD apt-get install -y \
  git \
  nginx \
  curl
msg_ok "Installed Dependencies"

NODE_VERSION="22" setup_nodejs

msg_info "Cloning Trip Computer"
$STD git clone https://github.com/Grant-Visser/trip-computer.git /opt/trip-computer
cd /opt/trip-computer
msg_ok "Cloned Trip Computer"

msg_info "Installing Node dependencies"
$STD npm ci
msg_ok "Installed Node dependencies"

msg_info "Building backend"
cd /opt/trip-computer/backend
$STD npm run build
msg_ok "Built backend"

msg_info "Building frontend"
cd /opt/trip-computer/frontend
$STD npm run build
msg_ok "Built frontend"

msg_info "Setting up frontend static files"
mkdir -p /var/www/trip-computer
cp -r /opt/trip-computer/frontend/dist/frontend/browser/. /var/www/trip-computer/
msg_ok "Frontend files in place"

msg_info "Setting up data directory"
mkdir -p /opt/trip-computer/backend/data
msg_ok "Data directory created"

msg_info "Creating .env"
cat <<EOF >/opt/trip-computer/backend/.env
NODE_ENV=production
PORT=3000
DB_PATH=/opt/trip-computer/backend/data/trip-computer.db
EOF
msg_ok "Created .env"

msg_info "Configuring Nginx"
cat <<EOF >/etc/nginx/sites-available/trip-computer
server {
    listen 80;
    server_name _;

    root /var/www/trip-computer;
    index index.html;

    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF
ln -sf /etc/nginx/sites-available/trip-computer /etc/nginx/sites-enabled/trip-computer
rm -f /etc/nginx/sites-enabled/default
systemctl enable -q nginx
systemctl restart nginx
msg_ok "Nginx configured"

msg_info "Creating systemd service"
cat <<EOF >/etc/systemd/system/trip-computer.service
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
EOF
systemctl enable -q --now trip-computer
msg_ok "Service created and started"

motd_ssh
customize
cleanup_lxc
