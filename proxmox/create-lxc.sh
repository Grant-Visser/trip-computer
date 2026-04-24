#!/bin/bash
# ============================================================
# Trip Computer — Proxmox LXC Setup Script
# Run this on your Proxmox HOST as root.
# ============================================================
set -euo pipefail

# Check we're on a Proxmox host
if ! command -v pct &>/dev/null; then
  echo "❌ This script must be run on the Proxmox host (pct not found)"
  exit 1
fi

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      Trip Computer — LXC Setup           ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ---- Helper: prompt with default -------------------------
prompt() {
  local label="$1" default="$2" varname="$3"
  read -rp "  $label [$default]: " val
  eval "$varname=\"${val:-$default}\""
}

# ---- Container ID ----------------------------------------
NEXT_ID=$(pvesh get /cluster/nextid 2>/dev/null || echo "200")
prompt "Container ID" "$NEXT_ID" CTID

# ---- Hostname --------------------------------------------
prompt "Hostname" "trip-computer" HOSTNAME

# ---- CPU / Memory / Disk ---------------------------------
prompt "CPU cores" "1" CORES
prompt "Memory (MB)" "512" MEMORY
prompt "Disk size (GB)" "4" DISK

# ---- Network bridge --------------------------------------
echo ""
echo "  Available bridges:"
ip link show | grep -E '^[0-9]+: vmbr' | awk -F': ' '{print "    -", $2}' || true
prompt "Network bridge" "vmbr0" BRIDGE

# ---- Template storage ------------------------------------
echo ""
echo "  Available storage pools:"
pvesm status 2>/dev/null | awk 'NR>1 {printf "    %-20s type=%-10s avail=%s\n", $1, $2, $5}' || true
echo ""
prompt "Template storage (where to download CT templates)" "local" TEMPLATE_STORAGE

# ---- Disk storage ----------------------------------------
prompt "Disk storage (where to create the container disk)" "local-lvm" STORAGE

# ---- App port --------------------------------------------
prompt "App port (exposed by Docker inside container)" "8080" APP_PORT

# ---- Confirm ---------------------------------------------
echo ""
echo "┌─────────────────────────────────────────┐"
echo "│  Ready to create LXC with:              │"
echo "│                                         │"
printf "│  %-12s %-26s│\n" "CT ID:"      "$CTID"
printf "│  %-12s %-26s│\n" "Hostname:"   "$HOSTNAME"
printf "│  %-12s %-26s│\n" "CPU cores:"  "$CORES"
printf "│  %-12s %-26s│\n" "Memory:"     "${MEMORY}MB"
printf "│  %-12s %-26s│\n" "Disk:"       "${DISK}GB on $STORAGE"
printf "│  %-12s %-26s│\n" "Bridge:"     "$BRIDGE"
printf "│  %-12s %-26s│\n" "Tmpl store:" "$TEMPLATE_STORAGE"
printf "│  %-12s %-26s│\n" "App port:"   "$APP_PORT"
echo "└─────────────────────────────────────────┘"
echo ""
read -rp "  Proceed? [y/N]: " confirm
[[ "${confirm,,}" == "y" ]] || { echo "Aborted."; exit 0; }

REPO_URL="https://github.com/Grant-Visser/trip-computer.git"

# ---- Download template -----------------------------------
echo ""
echo "🔍 Looking for Debian template..."
pveam update -q 2>/dev/null || true

TEMPLATE=$(pveam available --section system 2>/dev/null | awk '{print $2}' | grep "^debian-13" | head -1)
if [ -z "$TEMPLATE" ]; then
  TEMPLATE=$(pveam available --section system 2>/dev/null | awk '{print $2}' | grep "^debian-12" | head -1)
fi
if [ -z "$TEMPLATE" ]; then
  echo "❌ No Debian template found after pveam update. Check your internet connection."
  exit 1
fi

echo "📥 Downloading template: $TEMPLATE"
pveam download "$TEMPLATE_STORAGE" "$TEMPLATE" 2>/dev/null || echo "   (already downloaded)"

# ---- Create container ------------------------------------
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
sleep 6

# ---- Install Docker --------------------------------------
echo "🐳 Installing Docker..."
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

# ---- Clone and start app ---------------------------------
echo "📦 Cloning and starting Trip Computer..."
pct exec "$CTID" -- bash -c "
  git clone $REPO_URL /opt/trip-computer
  cd /opt/trip-computer
  docker compose up -d --build
"

# ---- Done ------------------------------------------------
echo ""
IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
echo "✅ Done!"
echo ""
echo "🌐 Trip Computer: http://$IP:$APP_PORT"
echo ""
echo "To update later:"
echo "  pct exec $CTID -- bash -c 'cd /opt/trip-computer && git pull && docker compose up -d --build'"
