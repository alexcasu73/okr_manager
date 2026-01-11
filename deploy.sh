#!/bin/bash

# OKRfy Deploy Script
# Usage: ./deploy.sh [command]

set -e

DOMAIN="okrfy.it"
EMAIL="admin@okrfy.it"  # Change this to your email for Let's Encrypt notifications
APP_DIR="/opt/okrfy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Please run as root"
        exit 1
    fi
}

# Install Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_info "Docker already installed"
        return
    fi

    log_info "Installing Docker..."

    apt-get update
    apt-get install -y docker.io docker-compose-v2

    systemctl enable docker
    systemctl start docker

    log_info "Docker installed successfully"
}

# Setup application
setup_app() {
    log_info "Setting up application..."

    mkdir -p $APP_DIR
    cd $APP_DIR

    # Clone or update repository
    if [ -d ".git" ]; then
        log_info "Updating repository..."
        git pull
        git submodule update --init --recursive
    else
        log_info "Cloning repository..."
        git clone --recurse-submodules https://github.com/alexcasu73/okr_manager.git .
    fi

    # Create directories
    mkdir -p certbot/conf certbot/www

    log_info "Application setup complete"
}

# Create .env file
create_env() {
    log_info "Creating .env file..."

    if [ -f "$APP_DIR/.env" ]; then
        log_warn ".env file already exists. Skipping..."
        return
    fi

    # Generate random JWT secret
    JWT_SECRET=$(openssl rand -base64 32)
    POSTGRES_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9')

    cat > $APP_DIR/.env << EOF
# Database
POSTGRES_USER=okrfy
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=okrfy

# Security
JWT_SECRET=$JWT_SECRET

# URLs
FRONTEND_URL=https://$DOMAIN

# Email (optional - configure for email notifications)
# GMAIL_USER=your-email@gmail.com
# GMAIL_REFRESH_TOKEN=your-refresh-token
# GOOGLE_CLIENT_ID=your-client-id
# GOOGLE_CLIENT_SECRET=your-client-secret

# Stripe (optional - configure for payments)
# STRIPE_SECRET_KEY=sk_live_xxx
# STRIPE_WEBHOOK_SECRET=whsec_xxx
EOF

    chmod 600 $APP_DIR/.env
    log_info ".env file created. Please edit it to configure email and Stripe if needed."
}

# Get SSL certificate
get_ssl() {
    log_info "Getting SSL certificate..."

    cd $APP_DIR

    # Use initial config (without SSL)
    cp nginx/conf.d/okrfy-initial.conf nginx/conf.d/default.conf
    rm -f nginx/conf.d/okrfy.conf 2>/dev/null || true

    # Start services
    docker compose up -d postgres server frontend nginx

    # Wait for nginx to start
    sleep 5

    # Get certificate
    docker compose run --rm certbot certonly \
        --webroot \
        --webroot-path=/var/www/certbot \
        --email $EMAIL \
        --agree-tos \
        --no-eff-email \
        -d $DOMAIN \
        -d www.$DOMAIN

    # Switch to SSL config
    rm nginx/conf.d/default.conf nginx/conf.d/okrfy-initial.conf 2>/dev/null || true
    cp nginx/conf.d/okrfy.conf nginx/conf.d/default.conf 2>/dev/null || \
        mv nginx/conf.d/okrfy.conf.bak nginx/conf.d/default.conf 2>/dev/null || true

    # Reload nginx
    docker compose exec nginx nginx -s reload

    log_info "SSL certificate installed successfully"
}

# Start application
start() {
    log_info "Starting OKRfy..."
    cd $APP_DIR
    docker compose up -d
    log_info "OKRfy started"
    docker compose ps
}

# Stop application
stop() {
    log_info "Stopping OKRfy..."
    cd $APP_DIR
    docker compose down
    log_info "OKRfy stopped"
}

# Restart application
restart() {
    log_info "Restarting OKRfy..."
    cd $APP_DIR
    docker compose restart
    log_info "OKRfy restarted"
}

# Show logs
logs() {
    cd $APP_DIR
    docker compose logs -f "${@:2}"
}

# Update application
update() {
    log_info "Updating OKRfy..."
    cd $APP_DIR

    git pull
    git submodule update --init --recursive

    docker compose build
    docker compose up -d

    log_info "OKRfy updated"
}

# Show status
status() {
    cd $APP_DIR
    docker compose ps
}

# Full installation
install() {
    check_root
    install_docker
    setup_app
    create_env

    log_info ""
    log_info "=========================================="
    log_info "Installation complete!"
    log_info "=========================================="
    log_info ""
    log_info "Next steps:"
    log_info "1. Edit $APP_DIR/.env with your configuration"
    log_info "2. Configure DNS: A record for $DOMAIN -> $(curl -s ifconfig.me)"
    log_info "3. Run: ./deploy.sh ssl  (to get SSL certificate)"
    log_info "4. Run: ./deploy.sh start (to start the application)"
    log_info ""
}

# SSL setup
ssl() {
    check_root
    get_ssl
}

# Enable autostart on boot
autostart() {
    check_root
    log_info "Configuring autostart..."

    # Ensure Docker starts on boot
    systemctl enable docker

    # Create systemd service
    cat > /etc/systemd/system/okrfy.service << EOF
[Unit]
Description=OKRfy Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/bin/docker compose up -d
ExecStop=/usr/bin/docker compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

    # Enable and start service
    systemctl daemon-reload
    systemctl enable okrfy.service

    log_info "Autostart configured. OKRfy will start automatically on boot."
}

# Disable autostart
autostart_disable() {
    check_root
    log_info "Disabling autostart..."

    systemctl disable okrfy.service 2>/dev/null || true
    rm -f /etc/systemd/system/okrfy.service
    systemctl daemon-reload

    log_info "Autostart disabled."
}

# Print usage
usage() {
    echo "OKRfy Deploy Script"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  install   - Full installation (Docker, app, config)"
    echo "  ssl       - Get/renew SSL certificate"
    echo "  start     - Start the application"
    echo "  stop      - Stop the application"
    echo "  restart   - Restart the application"
    echo "  update    - Update and rebuild"
    echo "  status    - Show container status"
    echo "  logs      - Show logs (optional: service name)"
    echo "  autostart - Enable autostart on boot"
    echo "  no-autostart - Disable autostart on boot"
    echo ""
}

# Main
case "${1:-}" in
    install)
        install
        ;;
    ssl)
        ssl
        ;;
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    update)
        update
        ;;
    status)
        status
        ;;
    logs)
        logs "$@"
        ;;
    autostart)
        autostart
        ;;
    no-autostart)
        autostart_disable
        ;;
    *)
        usage
        ;;
esac
