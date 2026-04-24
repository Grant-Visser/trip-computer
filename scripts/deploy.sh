#!/bin/bash
# Deploy Trip Computer to LXC
# Run this from the LXC container after cloning the repo
set -e

echo "Installing backend deps..."
cd /opt/trip-computer/backend && npm install --production

echo "Building backend..."
npm run build

echo "Installing frontend deps..."
cd /opt/trip-computer/frontend && npm install

echo "Building frontend..."
npm run build:prod

echo "Restarting service..."
systemctl restart trip-computer

echo "Done!"
