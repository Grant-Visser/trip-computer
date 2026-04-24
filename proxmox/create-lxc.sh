#!/bin/bash
# ============================================================
# Trip Computer — Proxmox LXC Setup Script
# Run this on your Proxmox HOST as root.
# ============================================================
set -euo pipefail

# ---- Config (edit these if needed) -------------------------
CTID=200                          # Container ID (change if taken)
HOSTNAME="trip-computer"
STORAGE="local-lvm"               # Storage pool for the container disk
MEMORY=512                        # MB
CORES=1
DISK=4                            # GB
BRIDGE="vmbr0"
TEMPLATE_STORAGE="local"          # Where to store/find the template
REPO_URL="https://github.com/Grant-Visser/trip-computer.git"
APP_PORT=8080                     # Port exposed inside the container
# ------------------------------------------------------------

# Check we're on a Proxmox host
if ! command -v pct &>/dev/null; then
  echo "❌ This script must be run on the Proxmox host (pct not found)"
  exit 1
fi

echo "🔍 Checking for Debian 13 (Trixie) template..."
TEMPLATE=$(pveam available --section system 2>/dev/null | grep "debian-13" | head -1 | awk '{print $2}')

if [ -z "$TEMPLATE" ]; then
  echo "⚠️  Debian 13 template not found, falling back to Debian 12..."
  TEMPLATE=$(pveam available --section system 2>/dev/null | grep "debian-12" | head -1 | awk '{print $2}')
fi

if [ -z "$TEMPLATE" ]; then
  echo "❌ No Debian template found. Run: pveam update"
  exit 1
fi

echo "📥 Downloading template: $TEMPLATE"
pveam download "$TEMPLATE_STORAGE" "$TEMPLATE" || echo "Already downloaded."

echo "🏗️  Creating LXC container (ID: $CTID)..."
pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE" \
  --hostname "$HOSTNAME" \
  --memory "$MEMORY" \
  --cores "$CORES" \
  --rootfs "$STORAGE:$DISK" \
  --net0 "name=eth0,bridge=$BRIDGE,ip=dhcp" \
  --unprivileged 1 \
  --features "nesting=1" \
  --start 1 \
  --onboot 1

echo "⏳ Waiting for container to boot..."
sleep 5

echo "🐳 Installing Docker inside container..."
pct exec "$CTID" -- bash -c "
  set -e
  apt-get update -qq
  apt-get install -y -qq ca-certificates curl gnupg git
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  DISTRO=\$(. /etc/os-release && echo \"\$VERSION_CODENAME\")
  echo \"deb [arch=amd64 signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian \$DISTRO stable\" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -qq
  apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin
  systemctl enable docker
  systemctl start docker
"

echo "📦 Cloning Trip Computer repo..."
pct exec "$CTID" -- bash -c "
  git clone $REPO_URL /opt/trip-computer
  cd /opt/trip-computer
  docker compose up -d --build
"

echo ""
echo "✅ Done!"
IP=$(pct exec "$CTID" -- hostname -I | awk '{print $1}')
echo "🌐 Trip Computer is running at: http://$IP:$APP_PORT"
echo ""
echo "To update the app later, run inside the container:"
echo "  pct exec $CTID -- bash -c 'cd /opt/trip-computer && git pull && docker compose up -d --build'"
