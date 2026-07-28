#!/bin/bash
# ─────────────────────────────────────────────────────────
# InternHub — Web Server Deploy Script (Web01 & Web02)
# Run this on EACH web server
# Usage: bash deploy-webserver.sh <your-github-username>
# ─────────────────────────────────────────────────────────

set -e

GITHUB_USER=${1:-"your-github-username"}
REPO="Internhub-"
DEPLOY_DIR="/var/www/internhub"
APP_DIR="$DEPLOY_DIR/Internhub-"

echo "==> Installing Nginx..."
sudo apt update -y
sudo apt install -y nginx

echo "==> Cloning repo..."
sudo rm -rf $DEPLOY_DIR
sudo git clone https://github.com/$GITHUB_USER/$REPO.git $DEPLOY_DIR

echo "==> Writing Nginx config..."
sudo tee /etc/nginx/sites-available/internhub > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    root $APP_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ =404;
    }
}
EOF

echo "==> Enabling site..."
sudo ln -sf /etc/nginx/sites-available/internhub /etc/nginx/sites-enabled/internhub
sudo rm -f /etc/nginx/sites-enabled/default

echo "==> Testing and reloading Nginx..."
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

echo ""
echo "✅ InternHub deployed successfully on this server!"
echo "   Visit: http://$(curl -s ifconfig.me)"
