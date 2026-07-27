#!/bin/bash
# ─────────────────────────────────────────────────────────
# InternHub — Load Balancer Setup Script (Lb01)
# Usage: bash setup-loadbalancer.sh <web01-ip> <web02-ip>
# Example: bash setup-loadbalancer.sh 192.168.1.10 192.168.1.11
# ─────────────────────────────────────────────────────────

set -e

WEB01_IP=${1:?"Error: provide Web01 IP as first argument"}
WEB02_IP=${2:?"Error: provide Web02 IP as second argument"}

echo "==> Installing Nginx..."
sudo apt update -y
sudo apt install -y nginx

echo "==> Writing load balancer config..."
sudo tee /etc/nginx/sites-available/internhub-lb > /dev/null <<EOF
upstream internhub_backend {
    server $WEB01_IP;
    server $WEB02_IP;
}

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass         http://internhub_backend;
        proxy_set_header   Host              \$host;
        proxy_set_header   X-Real-IP         \$remote_addr;
        proxy_set_header   X-Forwarded-For   \$proxy_add_x_forwarded_for;
    }
}
EOF

echo "==> Enabling load balancer site..."
sudo ln -sf /etc/nginx/sites-available/internhub-lb /etc/nginx/sites-enabled/internhub-lb
sudo rm -f /etc/nginx/sites-enabled/default

echo "==> Testing and reloading Nginx..."
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl reload nginx

echo ""
echo "✅ Load balancer configured!"
echo "   Balancing between: $WEB01_IP and $WEB02_IP"
echo "   Load balancer IP: http://$(curl -s ifconfig.me)"
echo ""
echo "   Test it by running this multiple times:"
echo "   curl -I http://$(curl -s ifconfig.me)"
