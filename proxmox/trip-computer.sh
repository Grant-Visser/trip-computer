#!/usr/bin/env bash
source <(curl -fsSL https://raw.githubusercontent.com/community-scripts/ProxmoxVE/main/misc/build.func)
# Author: Grant Visser / Ben (OpenClaw)
# Source: https://github.com/Grant-Visser/trip-computer

APP="Trip Computer"
var_tags="${var_tags:-utilities}"
var_cpu="${var_cpu:-1}"
var_ram="${var_ram:-512}"
var_disk="${var_disk:-4}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
  header_info
  check_container_storage
  check_container_resources

  if [[ ! -d /opt/trip-computer ]]; then
    msg_error "No ${APP} Installation Found!"
    exit
  fi

  msg_info "Stopping Service"
  systemctl stop trip-computer
  msg_ok "Stopped Service"

  msg_info "Pulling latest changes"
  cd /opt/trip-computer
  $STD git pull origin main
  msg_ok "Pulled latest changes"

  msg_info "Rebuilding backend"
  cd /opt/trip-computer
  $STD npm ci
  cd /opt/trip-computer/backend
  $STD npm run build
  msg_ok "Rebuilt backend"

  msg_info "Rebuilding frontend"
  cd /opt/trip-computer/frontend
  $STD npm run build
  $STD cp -r dist/frontend/browser/. /var/www/trip-computer/
  msg_ok "Rebuilt frontend"

  msg_info "Starting Service"
  systemctl start trip-computer
  msg_ok "Started Service"

  msg_ok "Updated successfully!"
  exit
}

start
build_container
description

msg_ok "Completed successfully!\n"
echo -e "${CREATING}${GN}${APP} setup has been successfully initialized!${CL}"
echo -e "${INFO}${YW} Access it using the following URL:${CL}"
echo -e "${TAB}${GATEWAY}${BGN}http://${IP}:80${CL}"
