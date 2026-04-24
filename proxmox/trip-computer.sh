#!/usr/bin/env bash
# ==============================================================================
# Trip Computer — Proxmox LXC Installer
# Inspired by community-scripts/ProxmoxVE style
# Run from the Proxmox host shell as root.
# ==============================================================================
set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
YW="\033[33m" GN="\033[1;92m" RD="\033[01;31m" BL="\033[36m"
BGN="\033[4;92m" CL="\033[m" BOLD="\033[1m" DIM="\033[2m"
CM="${GN}✓${CL}" CROSS="${RD}✗${CL}" INFO="${BL}●${CL}" TAB="  "

msg_info()  { echo -e "${TAB}${YW}○${CL} ${1}..."; }
msg_ok()    { echo -e "${TAB}${CM} ${1}"; }
msg_error() { echo -e "${TAB}${CROSS} ${RD}${1}${CL}"; exit 1; }
msg_warn()  { echo -e "${TAB}${YW}⚠${CL}  ${1}"; }

header_info() {
  clear
  cat <<'EOF'

  ████████╗██████╗ ██╗██████╗      ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗   ██╗████████╗███████╗██████╗
     ██╔══╝██╔══██╗██║██╔══██╗    ██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║   ██║╚══██╔══╝██╔════╝██╔══██╗
     ██║   ██████╔╝██║██████╔╝    ██║     ██║   ██║██╔████╔██║██████╔╝██║   ██║   ██║   █████╗  ██████╔╝
     ██║   ██╔══██╗██║██╔═══╝     ██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║   ██║   ██║   ██╔══╝  ██╔══██╗
     ██║   ██║  ██║██║██║         ╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ╚██████╔╝   ██║   ███████╗██║  ██║
     ╚═╝   ╚═╝  ╚═╝╚═╝╚═╝          ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝      ╚═════╝    ╚═╝   ╚══════╝╚═╝  ╚═╝

EOF
  echo -e "${DIM}  Fuel fill-up tracker | Angular PWA + Node.js backend${CL}\n"
}

# ── Preflight ─────────────────────────────────────────────────────────────────
[[ $EUID -ne 0 ]] && msg_error "Run as root on the Proxmox host"
command -v pct &>/dev/null || msg_error "pct not found — run this on the Proxmox host"

header_info

# ── Defaults ──────────────────────────────────────────────────────────────────
CTID=$(pvesh get /cluster/nextid 2>/dev/null || echo "200")
HOSTNAME="trip-computer"
CORES=1
MEMORY=512
DISK=4
BRIDGE="vmbr0"
TEMPLATE_STORAGE="local"
DISK_STORAGE="local-lvm"
APP_PORT=80
OS_VERSION=13

REPO_URL="https://github.com/Grant-Visser/trip-computer.git"
INSTALL_URL="https://raw.githubusercontent.com/Grant-Visser/trip-computer/main/proxmox/trip-computer-install.sh"

# ── Mode select ───────────────────────────────────────────────────────────────
echo -e "  ${BOLD}Setup mode:${CL}"
echo -e "  ${GN}1)${CL} Default  — sensible defaults, minimal prompts"
echo -e "  ${GN}2)${CL} Advanced — configure everything"
echo ""
read -rp "  Select [1]: " MODE_SEL
MODE_SEL="${MODE_SEL:-1}"

if [[ "$MODE_SEL" == "2" ]]; then
  echo ""
  echo -e "  ${BOLD}Advanced Configuration${CL}"
  echo -e "  ${DIM}Press Enter to accept the value in brackets${CL}\n"

  read -rp "  Container ID [$CTID]: "           v; CTID="${v:-$CTID}"
  read -rp "  Hostname [$HOSTNAME]: "           v; HOSTNAME="${v:-$HOSTNAME}"
  read -rp "  CPU cores [$CORES]: "             v; CORES="${v:-$CORES}"
  read -rp "  Memory MB [$MEMORY]: "            v; MEMORY="${v:-$MEMORY}"
  read -rp "  Disk GB [$DISK]: "                v; DISK="${v:-$DISK}"

  echo ""
  echo -e "  ${DIM}Available bridges:${CL}"
  ip link show 2>/dev/null | grep -oP '(?<=^\d+: )vmbr\w+' | sed 's/^/    /' || true

  read -rp "  Network bridge [$BRIDGE]: "       v; BRIDGE="${v:-$BRIDGE}"

  echo ""
  echo -e "  ${DIM}Available storage:${CL}"
  pvesm status 2>/dev/null | awk 'NR>1 {printf "    %-20s type=%-12s avail=%s\n", $1, $2, $5}' || true

  read -rp "  Template storage [$TEMPLATE_STORAGE]: "  v; TEMPLATE_STORAGE="${v:-$TEMPLATE_STORAGE}"
  read -rp "  Disk storage [$DISK_STORAGE]: "          v; DISK_STORAGE="${v:-$DISK_STORAGE}"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo -e "  ${BOLD}Container Summary${CL}"
echo -e "  ${DIM}──────────────────────────────────────${CL}"
printf "  %-18s ${GN}%s${CL}\n" "CT ID:"          "$CTID"
printf "  %-18s ${GN}%s${CL}\n" "Hostname:"        "$HOSTNAME"
printf "  %-18s ${GN}%s${CL}\n" "OS:"              "Debian $OS_VERSION"
printf "  %-18s ${GN}%s${CL}\n" "CPU / RAM:"       "${CORES} core(s) / ${MEMORY}MB"
printf "  %-18s ${GN}%s${CL}\n" "Disk:"            "${DISK}GB on ${DISK_STORAGE}"
printf "  %-18s ${GN}%s${CL}\n" "Bridge:"          "$BRIDGE"
printf "  %-18s ${GN}%s${CL}\n" "Template store:"  "$TEMPLATE_STORAGE"
echo -e "  ${DIM}──────────────────────────────────────${CL}"
echo ""
read -rp "  Proceed? [y/N]: " CONFIRM
[[ "${CONFIRM,,}" == "y" ]] || { echo "Aborted."; exit 0; }
echo ""

# ── Download template ─────────────────────────────────────────────────────────
msg_info "Updating template list"
pveam update -q 2>/dev/null || true
msg_ok "Template list updated"

msg_info "Finding Debian $OS_VERSION template"
TEMPLATE=$(pveam available --section system 2>/dev/null | awk '{print $2}' | grep "^debian-${OS_VERSION}" | head -1)
if [[ -z "$TEMPLATE" ]]; then
  msg_warn "Debian $OS_VERSION not found, falling back to Debian 12"
  OS_VERSION=12
  TEMPLATE=$(pveam available --section system 2>/dev/null | awk '{print $2}' | grep "^debian-12" | head -1)
fi
[[ -z "$TEMPLATE" ]] && msg_error "No Debian template found. Try: pveam update"
msg_ok "Using template: $TEMPLATE"

msg_info "Downloading template"
pveam download "$TEMPLATE_STORAGE" "$TEMPLATE" 2>/dev/null || true
msg_ok "Template ready"

# ── Create container ──────────────────────────────────────────────────────────
msg_info "Creating LXC container (CT $CTID)"
pct create "$CTID" "$TEMPLATE_STORAGE:vztmpl/$TEMPLATE" \
  --hostname "$HOSTNAME" \
  --memory   "$MEMORY" \
  --cores    "$CORES" \
  --rootfs   "$DISK_STORAGE:$DISK" \
  --net0     "name=eth0,bridge=$BRIDGE,ip=dhcp" \
  --unprivileged 1 \
  --features "nesting=1" \
  --onboot   1
msg_ok "Container created"

msg_info "Starting container"
pct start "$CTID"
sleep 8
msg_ok "Container started"

# ── Install app inside container ──────────────────────────────────────────────
msg_info "Downloading install script"
INSTALL_SCRIPT=$(curl -fsSL "$INSTALL_URL") || msg_error "Failed to download install script from $INSTALL_URL"
msg_ok "Install script downloaded"

msg_info "Running installer inside container (this takes a few minutes)"
echo "$INSTALL_SCRIPT" | pct exec "$CTID" -- bash
msg_ok "Installation complete"

# ── Done ──────────────────────────────────────────────────────────────────────
IP=$(pct exec "$CTID" -- hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo -e "  ${GN}${BOLD}Trip Computer is ready!${CL}"
echo -e "  ${INFO} Access it at: ${BGN}http://${IP}${CL}"
echo ""
echo -e "  ${DIM}To update the app:${CL}"
echo -e "    pct exec $CTID -- bash -c 'cd /opt/trip-computer && git pull && npm ci && cd backend && npm run build && cd ../frontend && npm run build && cp -r dist/frontend/browser/. /var/www/trip-computer/ && systemctl restart trip-computer'"
echo ""
