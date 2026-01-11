#!/bin/bash

# OKRfy Setup Script
# Usage: ./setup.sh [options]

set -e

DOMAIN="okrfy.it"
EMAIL="admin@okrfy.it"
APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")" && pwd)}"
APP_NAME="OKRfy"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_title() { echo -e "\n${BLUE}=== $1 ===${NC}\n"; }

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

    if [ -d ".git" ]; then
        log_info "Updating repository..."
        git pull
        git submodule update --init --recursive
    else
        log_info "Cloning repository..."
        git clone --recurse-submodules https://github.com/alexcasu73/okr_manager.git .
    fi

    mkdir -p certbot/conf certbot/www
    log_info "Application setup complete"
}

# Create .env file
create_env() {
    if [ -f "$APP_DIR/.env" ]; then
        log_warn ".env file already exists. Skipping..."
        return
    fi

    log_info "Creating .env file..."
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

# Email (optional)
#GMAIL_USER=
#GMAIL_REFRESH_TOKEN=
#GOOGLE_CLIENT_ID=
#GOOGLE_CLIENT_SECRET=

# Stripe (optional)
#STRIPE_SECRET_KEY=
#STRIPE_WEBHOOK_SECRET=
EOF

    chmod 600 $APP_DIR/.env
    log_info ".env file created"
}

# Configure network/domain
configure_network() {
    log_title "Network Configuration"

    read -p "Enter domain (default: $DOMAIN): " input_domain
    DOMAIN=${input_domain:-$DOMAIN}

    read -p "Enter email for SSL certificates (default: $EMAIL): " input_email
    EMAIL=${input_email:-$EMAIL}

    # Update .env
    if [ -f "$APP_DIR/.env" ]; then
        sed -i "s|FRONTEND_URL=.*|FRONTEND_URL=https://$DOMAIN|" $APP_DIR/.env
    fi

    # Update nginx config
    if [ -f "$APP_DIR/nginx/conf.d/okrfy.conf" ]; then
        sed -i "s/okrfy.it/$DOMAIN/g" $APP_DIR/nginx/conf.d/okrfy.conf
        sed -i "s/okrfy.it/$DOMAIN/g" $APP_DIR/nginx/conf.d/okrfy-initial.conf
    fi

    log_info "Network configured for $DOMAIN"
}

# Configure Google OAuth/Email
configure_google() {
    log_title "Google Configuration"

    read -p "Gmail user: " gmail_user
    read -p "Gmail refresh token: " gmail_token
    read -p "Google Client ID: " google_id
    read -p "Google Client Secret: " google_secret

    if [ -f "$APP_DIR/.env" ]; then
        sed -i "s|#GMAIL_USER=.*|GMAIL_USER=$gmail_user|" $APP_DIR/.env
        sed -i "s|#GMAIL_REFRESH_TOKEN=.*|GMAIL_REFRESH_TOKEN=$gmail_token|" $APP_DIR/.env
        sed -i "s|#GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$google_id|" $APP_DIR/.env
        sed -i "s|#GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$google_secret|" $APP_DIR/.env
    fi

    log_info "Google configuration saved"
}

# Configure Stripe
configure_stripe() {
    log_title "Stripe Configuration"

    read -p "Stripe Secret Key: " stripe_key
    read -p "Stripe Webhook Secret: " stripe_webhook

    if [ -f "$APP_DIR/.env" ]; then
        sed -i "s|#STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$stripe_key|" $APP_DIR/.env
        sed -i "s|#STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$stripe_webhook|" $APP_DIR/.env
    fi

    log_info "Stripe configuration saved"
}

# Get SSL certificate
get_ssl() {
    log_title "SSL Certificate"
    cd $APP_DIR

    # Use initial config (without SSL)
    cp nginx/conf.d/okrfy-initial.conf nginx/conf.d/default.conf 2>/dev/null || true

    # Restart nginx with initial config
    docker compose up -d nginx
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
    cp nginx/conf.d/okrfy.conf nginx/conf.d/default.conf

    # Reload nginx
    docker compose exec nginx nginx -s reload

    log_info "SSL certificate installed"
}

# Start application
do_start() {
    log_info "Starting $APP_NAME..."
    cd $APP_DIR
    docker compose up -d
    log_info "$APP_NAME started"
    docker compose ps
}

# Stop application
do_stop() {
    log_info "Stopping $APP_NAME..."
    cd $APP_DIR
    docker compose down
    log_info "$APP_NAME stopped"
}

# Restart application
do_restart() {
    log_info "Restarting $APP_NAME..."
    cd $APP_DIR
    docker compose restart
    log_info "$APP_NAME restarted"
}

# Show status
do_status() {
    cd $APP_DIR
    docker compose ps
}

# Show logs
do_logs() {
    cd $APP_DIR
    docker compose logs -f $2
}

# Update application
do_update() {
    log_title "Updating $APP_NAME"
    cd $APP_DIR

    log_info "Pulling latest changes..."
    git pull

    log_info "Updating submodules..."
    git submodule update --init --recursive

    log_info "Building containers..."
    docker compose build

    log_info "Restarting services..."
    docker compose up -d

    log_info "Cleaning old images..."
    docker image prune -f

    echo ""
    log_info "$APP_NAME updated successfully!"
    docker compose ps
}

# Reset database
do_reset() {
    log_title "Reset Database"
    log_warn "This will DELETE all data!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        cd $APP_DIR
        docker compose down -v
        docker compose up -d
        log_info "Database reset complete"
    else
        log_info "Reset cancelled"
    fi
}

# Reset Stripe data only
do_reset_stripe() {
    log_title "Reset Stripe Data"
    log_warn "This will reset Stripe-related data in the database"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        cd $APP_DIR
        docker compose exec postgres psql -U okrfy -d okrfy -c "UPDATE companies SET stripe_customer_id = NULL, stripe_subscription_id = NULL, subscription_status = 'free';"
        log_info "Stripe data reset"
    else
        log_info "Reset cancelled"
    fi
}

# Enable autostart
do_autostart() {
    check_root
    log_info "Configuring autostart..."

    systemctl enable docker

    cat > /etc/systemd/system/okrfy.service << EOF
[Unit]
Description=$APP_NAME Application
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

    systemctl daemon-reload
    systemctl enable okrfy.service

    log_info "Autostart enabled"
}

# Disable autostart
do_no_autostart() {
    check_root
    systemctl disable okrfy.service 2>/dev/null || true
    rm -f /etc/systemd/system/okrfy.service
    systemctl daemon-reload
    log_info "Autostart disabled"
}

# Uninstall
do_uninstall() {
    log_title "Uninstall $APP_NAME"
    log_warn "This will remove $APP_NAME and all its data!"
    read -p "Are you sure? (yes/no): " confirm

    if [ "$confirm" = "yes" ]; then
        check_root
        cd $APP_DIR
        docker compose down -v
        do_no_autostart
        rm -rf $APP_DIR
        log_info "$APP_NAME uninstalled"
    else
        log_info "Uninstall cancelled"
    fi
}

# Full installation
do_install() {
    check_root
    install_docker
    setup_app
    create_env

    log_title "Installation Complete!"
    echo ""
    log_info "Next steps:"
    log_info "1. Configure network: ./setup.sh --network"
    log_info "2. Get SSL certificate: ./setup.sh --ssl"
    log_info "3. Start application: ./setup.sh --start"
    log_info "4. Enable autostart: ./setup.sh --autostart"
    echo ""
}

# Print usage
usage() {
    echo ""
    echo "  $APP_NAME Setup Script"
    echo ""
    echo "  Usage: $0 [option]"
    echo ""
    echo "  Installation:"
    echo "    --install        Full installation (Docker, app, config)"
    echo "    --uninstall      Remove application and data"
    echo ""
    echo "  Configuration:"
    echo "    --network        Configure domain and SSL email"
    echo "    --google         Configure Google OAuth/Email"
    echo "    --stripe         Configure Stripe payments"
    echo "    --ssl            Get/renew SSL certificate"
    echo ""
    echo "  Service Control:"
    echo "    --start          Start the application"
    echo "    --stop           Stop the application"
    echo "    --restart        Restart the application"
    echo "    --status         Show container status"
    echo "    --logs [service] Show logs"
    echo "    --update         Update and rebuild"
    echo ""
    echo "  System:"
    echo "    --autostart      Enable autostart on boot"
    echo "    --no-autostart   Disable autostart on boot"
    echo ""
    echo "  Maintenance:"
    echo "    --reset          Reset database (deletes all data)"
    echo "    --reset-stripe   Reset Stripe data only"
    echo ""
}

# Main
case "${1:-}" in
    --install)
        do_install
        ;;
    --uninstall)
        do_uninstall
        ;;
    --network)
        configure_network
        ;;
    --google)
        configure_google
        ;;
    --stripe)
        configure_stripe
        ;;
    --ssl)
        get_ssl
        ;;
    --start)
        do_start
        ;;
    --stop)
        do_stop
        ;;
    --restart)
        do_restart
        ;;
    --status)
        do_status
        ;;
    --logs)
        do_logs "$@"
        ;;
    --update)
        do_update
        ;;
    --autostart)
        do_autostart
        ;;
    --no-autostart)
        do_no_autostart
        ;;
    --reset)
        do_reset
        ;;
    --reset-stripe)
        do_reset_stripe
        ;;
    *)
        usage
        ;;
esac
