#!/bin/bash
# Update Trip Computer from git
set -e

cd /opt/trip-computer
git pull origin main
./scripts/deploy.sh
