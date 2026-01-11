#!/bin/bash

# OKRfy Setup Script
# Usage: ./setup.sh [--start | --stop | --help]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        return 1
    else
        return 0
    fi
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Darwin*) echo "macos" ;;
        Linux*)  echo "linux" ;;
        *)       echo "unknown" ;;
    esac
}

OS=$(detect_os)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Show help
show_help() {
    echo "========================================"
    echo "         OKRfy - Setup Script"
    echo "========================================"
    echo ""
    echo "Usage: ./setup.sh [OPTION]"
    echo ""
    echo "Options:"
    echo "  (no option)        Run full setup"
    echo ""
    echo "  Service Control:"
    echo "  --start            Start the application (development)"
    echo "  --stop             Stop the application"
    echo "  --restart          Restart the application"
    echo "  --status           Show application status"
    echo "  --logs             Show application logs (live)"
    echo ""
    echo "  Production (Linux servers):"
    echo "  --prod             Full production setup (nginx + SSL + autostart)"
    echo "  --prod-start       Start production server"
    echo "  --prod-stop        Stop production server"
    echo "  --prod-status      Show production status"
    echo "  --autostart        Configure automatic startup on server boot"
    echo ""
    echo "  Configuration:"
    echo "  --network          Configure network IP/hostname for remote access"
    echo "  --google           Configure Google OAuth (Client ID, Secret, Gmail token)"
    echo "  --stripe           Configure Stripe for premium subscriptions"
    echo ""
    echo "  Maintenance:"
    echo "  --reset            Reset database (clean install with only admin user)"
    echo "  --reset-stripe     Reset Stripe data only (use when switching Stripe accounts)"
    echo ""
    echo "  Uninstall:"
    echo "  --uninstall        Uninstall OKRfy (node_modules, database, .env)"
    echo ""
    echo "  --help             Show this help message"
    echo ""
}

# Install Node.js
install_node() {
    echo -e "${YELLOW}[INFO] Installing Node.js...${NC}"
    if [ "$OS" = "macos" ]; then
        if check_command "brew"; then
            brew install node
        else
            echo -e "${YELLOW}[INFO] Installing Homebrew first...${NC}"
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
            brew install node
        fi
    elif [ "$OS" = "linux" ]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
}

# Service Start
service_start() {
    echo "========================================"
    echo -e "${GREEN}         OKRfy - Starting${NC}"
    echo "========================================"
    echo ""

    cd "$SCRIPT_DIR"

    # Check if already running
    if pgrep -f "vite" > /dev/null || pgrep -f "node.*server" > /dev/null; then
        echo -e "${YELLOW}[INFO] OKRfy appears to be already running.${NC}"
        echo "Use './setup.sh --restart' to restart, or './setup.sh --stop' to stop."
        exit 0
    fi

    echo -e "${YELLOW}[INFO] Starting OKRfy...${NC}"
    npm run dev &

    sleep 3

    echo ""
    echo -e "${GREEN}[OK] OKRfy started!${NC}"
    echo ""
    echo -e "  Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo -e "  Backend:  ${YELLOW}http://localhost:3002${NC}"
    echo ""
    exit 0
}

# Service Stop
service_stop() {
    echo "========================================"
    echo -e "${RED}         OKRfy - Stopping${NC}"
    echo "========================================"
    echo ""

    echo -e "${YELLOW}[INFO] Stopping OKRfy...${NC}"

    # Kill vite and node server processes
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*server/index.js" 2>/dev/null || true

    sleep 1

    echo -e "${GREEN}[OK] OKRfy stopped${NC}"
    exit 0
}

# Service Restart
service_restart() {
    echo "========================================"
    echo -e "${BLUE}         OKRfy - Restarting${NC}"
    echo "========================================"
    echo ""

    echo -e "${YELLOW}[INFO] Stopping OKRfy...${NC}"
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*server/index.js" 2>/dev/null || true
    sleep 2

    echo -e "${YELLOW}[INFO] Starting OKRfy...${NC}"
    cd "$SCRIPT_DIR"
    npm run dev &

    sleep 3

    echo ""
    echo -e "${GREEN}[OK] OKRfy restarted!${NC}"
    echo ""
    echo -e "  Frontend: ${YELLOW}http://localhost:3000${NC}"
    echo -e "  Backend:  ${YELLOW}http://localhost:3002${NC}"
    echo ""
    exit 0
}

# Service Status
service_status() {
    echo "========================================"
    echo -e "${BLUE}         OKRfy - Status${NC}"
    echo "========================================"
    echo ""

    VITE_PID=$(pgrep -f "vite" 2>/dev/null || echo "")
    SERVER_PID=$(pgrep -f "node.*server" 2>/dev/null || echo "")

    if [ -n "$VITE_PID" ]; then
        echo -e "Frontend (Vite):  ${GREEN}Running${NC} (PID: $VITE_PID)"
    else
        echo -e "Frontend (Vite):  ${RED}Stopped${NC}"
    fi

    if [ -n "$SERVER_PID" ]; then
        echo -e "Backend (Server): ${GREEN}Running${NC} (PID: $SERVER_PID)"
    else
        echo -e "Backend (Server): ${RED}Stopped${NC}"
    fi

    echo ""

    # Check if endpoints are responding
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e "Frontend URL:     ${GREEN}http://localhost:3000${NC} (responding)"
    else
        echo -e "Frontend URL:     ${YELLOW}http://localhost:3000${NC} (not responding)"
    fi

    if curl -s http://localhost:3002/api/health > /dev/null 2>&1; then
        echo -e "Backend URL:      ${GREEN}http://localhost:3002${NC} (responding)"
    else
        echo -e "Backend URL:      ${YELLOW}http://localhost:3002${NC} (not responding)"
    fi

    echo ""
    exit 0
}

# Service Logs
service_logs() {
    echo "========================================"
    echo -e "${BLUE}         OKRfy - Logs${NC}"
    echo "========================================"
    echo ""
    echo -e "${YELLOW}Starting OKRfy with live logs...${NC}"
    echo -e "${YELLOW}Press Ctrl+C to exit${NC}"
    echo ""

    cd "$SCRIPT_DIR"
    npm run dev
}

# Configure Stripe
configure_stripe() {
    echo "========================================"
    echo -e "${BLUE}       Stripe Configuration${NC}"
    echo "========================================"
    echo ""

    if [ ! -f .env ]; then
        echo -e "${RED}[ERROR] .env file not found. Run ./setup.sh first.${NC}"
        exit 1
    fi

    echo "This will configure Stripe for premium subscriptions."
    echo ""
    echo -e "${YELLOW}Prerequisites:${NC}"
    echo "1. Create a Stripe account at https://dashboard.stripe.com"
    echo "2. Get your API keys from https://dashboard.stripe.com/apikeys"
    echo "3. Create 2 products with prices:"
    echo "   - Monthly subscription (e.g., €9.99/month)"
    echo "   - Yearly subscription (e.g., €99/year)"
    echo ""

    read -p "Do you have these ready? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "Please complete the prerequisites first:"
        echo "  1. Go to https://dashboard.stripe.com"
        echo "  2. Create products and get API keys"
        echo "  3. Run this script again"
        exit 0
    fi

    echo ""
    echo -e "${BLUE}Enter your Stripe credentials:${NC}"
    echo ""

    read -p "Stripe Secret Key (sk_test_...): " STRIPE_SECRET_KEY
    read -p "Monthly Price ID (price_...): " STRIPE_PRICE_MONTHLY
    read -p "Yearly Price ID (price_...): " STRIPE_PRICE_YEARLY

    echo ""
    echo -e "${YELLOW}[INFO] Updating .env file...${NC}"

    # Update or add Stripe keys in .env
    if grep -q "^STRIPE_SECRET_KEY=" .env; then
        sed -i.bak "s|^STRIPE_SECRET_KEY=.*|STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY|" .env
    else
        echo "STRIPE_SECRET_KEY=$STRIPE_SECRET_KEY" >> .env
    fi

    if grep -q "^STRIPE_PRICE_MONTHLY=" .env; then
        sed -i.bak "s|^STRIPE_PRICE_MONTHLY=.*|STRIPE_PRICE_MONTHLY=$STRIPE_PRICE_MONTHLY|" .env
    else
        echo "STRIPE_PRICE_MONTHLY=$STRIPE_PRICE_MONTHLY" >> .env
    fi

    if grep -q "^STRIPE_PRICE_YEARLY=" .env; then
        sed -i.bak "s|^STRIPE_PRICE_YEARLY=.*|STRIPE_PRICE_YEARLY=$STRIPE_PRICE_YEARLY|" .env
    else
        echo "STRIPE_PRICE_YEARLY=$STRIPE_PRICE_YEARLY" >> .env
    fi

    rm -f .env.bak

    echo -e "${GREEN}[OK] Stripe configuration saved${NC}"
    echo ""

    # Webhook setup
    echo "========================================"
    echo -e "${BLUE}       Webhook Setup${NC}"
    echo "========================================"
    echo ""
    echo "For local development, you need to forward Stripe webhooks."
    echo ""
    echo -e "${YELLOW}Option 1: Stripe CLI (recommended for local dev)${NC}"
    echo "  1. Install: brew install stripe/stripe-cli/stripe"
    echo "  2. Login: stripe login"
    echo "  3. Run: stripe listen --forward-to localhost:3002/api/billing/webhook"
    echo "  4. Copy the webhook secret (whsec_...) to .env as STRIPE_WEBHOOK_SECRET"
    echo ""
    echo -e "${YELLOW}Option 2: Production webhook${NC}"
    echo "  1. Go to https://dashboard.stripe.com/webhooks"
    echo "  2. Add endpoint: https://your-domain.com/api/billing/webhook"
    echo "  3. Select events: checkout.session.completed, customer.subscription.*"
    echo "  4. Copy signing secret to .env as STRIPE_WEBHOOK_SECRET"
    echo ""

    read -p "Do you have a webhook secret to add now? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "Webhook Secret (whsec_...): " STRIPE_WEBHOOK_SECRET
        if grep -q "^STRIPE_WEBHOOK_SECRET=" .env; then
            sed -i.bak "s|^STRIPE_WEBHOOK_SECRET=.*|STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET|" .env
        else
            echo "STRIPE_WEBHOOK_SECRET=$STRIPE_WEBHOOK_SECRET" >> .env
        fi
        rm -f .env.bak
        echo -e "${GREEN}[OK] Webhook secret saved${NC}"
    fi

    echo ""
    echo "========================================"
    echo -e "${GREEN}       Stripe Setup Complete!${NC}"
    echo "========================================"
    echo ""
    echo "Your app now supports premium subscriptions."
    echo ""
    echo "Test cards for sandbox mode:"
    echo "  Success: 4242 4242 4242 4242"
    echo "  Decline: 4000 0000 0000 0002"
    echo ""
    exit 0
}

# Configure Google OAuth
configure_google() {
    echo "========================================"
    echo -e "${BLUE}       Google OAuth Configuration${NC}"
    echo "========================================"
    echo ""

    if [ ! -f .env ]; then
        echo -e "${RED}[ERROR] .env file not found. Run ./setup.sh first.${NC}"
        exit 1
    fi

    # Show current configuration
    CURRENT_CLIENT_ID=$(grep "^GOOGLE_CLIENT_ID=" .env 2>/dev/null | cut -d '=' -f2)
    CURRENT_GMAIL_USER=$(grep "^GMAIL_USER=" .env 2>/dev/null | cut -d '=' -f2)

    echo -e "${YELLOW}Current Configuration:${NC}"
    if [ -n "$CURRENT_CLIENT_ID" ] && [ "$CURRENT_CLIENT_ID" != "your-client-id" ]; then
        echo -e "  Client ID: ${GREEN}${CURRENT_CLIENT_ID:0:30}...${NC}"
    else
        echo -e "  Client ID: ${RED}Not configured${NC}"
    fi
    if [ -n "$CURRENT_GMAIL_USER" ]; then
        echo -e "  Gmail User: ${GREEN}$CURRENT_GMAIL_USER${NC}"
    else
        echo -e "  Gmail User: ${RED}Not configured${NC}"
    fi
    echo ""

    echo "This wizard will help you configure Google OAuth for:"
    echo "  - Gmail API for sending verification/notification emails"
    echo ""
    echo -e "${YELLOW}Prerequisites:${NC}"
    echo "  1. Google Cloud Console project: https://console.cloud.google.com"
    echo "  2. OAuth 2.0 Client ID (Web application type)"
    echo "  3. Gmail API enabled"
    echo ""

    read -p "Continue with configuration? (Y/n): " CONTINUE_CONFIG
    if [[ "$CONTINUE_CONFIG" =~ ^[Nn]$ ]]; then
        echo "Configuration cancelled."
        exit 0
    fi

    echo ""
    echo -e "${YELLOW}Step 1: Google OAuth Credentials${NC}"
    echo ""
    echo "Get your credentials from: https://console.cloud.google.com/apis/credentials"
    echo ""

    read -p "Google Client ID (or press Enter to keep current): " NEW_CLIENT_ID
    if [ -n "$NEW_CLIENT_ID" ]; then
        if grep -q "^GOOGLE_CLIENT_ID=" .env; then
            sed -i.bak "s|^GOOGLE_CLIENT_ID=.*|GOOGLE_CLIENT_ID=$NEW_CLIENT_ID|" .env
        else
            echo "GOOGLE_CLIENT_ID=$NEW_CLIENT_ID" >> .env
        fi
        echo -e "${GREEN}[OK] Client ID updated${NC}"
    fi

    read -p "Google Client Secret (or press Enter to keep current): " NEW_CLIENT_SECRET
    if [ -n "$NEW_CLIENT_SECRET" ]; then
        if grep -q "^GOOGLE_CLIENT_SECRET=" .env; then
            sed -i.bak "s|^GOOGLE_CLIENT_SECRET=.*|GOOGLE_CLIENT_SECRET=$NEW_CLIENT_SECRET|" .env
        else
            echo "GOOGLE_CLIENT_SECRET=$NEW_CLIENT_SECRET" >> .env
        fi
        echo -e "${GREEN}[OK] Client Secret updated${NC}"
    fi
    rm -f .env.bak

    echo ""
    echo -e "${YELLOW}Step 2: Gmail Configuration${NC}"
    echo ""

    read -p "Gmail address for sending emails: " GMAIL_USER
    if [ -n "$GMAIL_USER" ]; then
        if grep -q "^GMAIL_USER=" .env; then
            sed -i.bak "s|^GMAIL_USER=.*|GMAIL_USER=$GMAIL_USER|" .env
        else
            echo "GMAIL_USER=$GMAIL_USER" >> .env
        fi
        rm -f .env.bak
        echo -e "${GREEN}[OK] Gmail user saved${NC}"
    fi

    echo ""
    echo -e "${YELLOW}Step 3: Get Gmail Refresh Token${NC}"
    echo ""
    echo "1. Go to: ${GREEN}https://developers.google.com/oauthplayground${NC}"
    echo "2. Click the gear icon (Settings) in the top right"
    echo "   - Check 'Use your own OAuth credentials'"
    echo "   - Enter your Client ID and Client Secret"
    echo "3. In Step 1, select 'Gmail API v1' > 'https://mail.google.com/'"
    echo "4. Click 'Authorize APIs' and sign in with your Gmail account"
    echo "5. In Step 2, click 'Exchange authorization code for tokens'"
    echo "6. Copy the 'Refresh token'"
    echo ""

    read -p "Gmail Refresh Token (or press Enter to skip): " GMAIL_REFRESH_TOKEN
    if [ -n "$GMAIL_REFRESH_TOKEN" ]; then
        if grep -q "^GMAIL_REFRESH_TOKEN=" .env; then
            sed -i.bak "s|^GMAIL_REFRESH_TOKEN=.*|GMAIL_REFRESH_TOKEN=$GMAIL_REFRESH_TOKEN|" .env
        else
            echo "GMAIL_REFRESH_TOKEN=$GMAIL_REFRESH_TOKEN" >> .env
        fi
        rm -f .env.bak
        echo -e "${GREEN}[OK] Gmail refresh token saved${NC}"
    fi

    echo ""
    echo "========================================"
    echo -e "${GREEN}       Google Setup Complete!${NC}"
    echo "========================================"
    echo ""
    echo "Restart OKRfy to apply changes: ./setup.sh --restart"
    echo ""
    exit 0
}

# Configure network
configure_network() {
    echo "========================================"
    echo -e "${BLUE}       Network Configuration${NC}"
    echo "========================================"
    echo ""

    if [ ! -f .env ]; then
        echo -e "${YELLOW}[INFO] Creating .env from .env.example...${NC}"
        cp .env.example .env
    fi

    CURRENT_FRONTEND=$(grep "^FRONTEND_URL=" .env 2>/dev/null | cut -d '=' -f2 || echo "not set")
    CURRENT_BACKEND=$(grep "^BACKEND_URL=" .env 2>/dev/null | cut -d '=' -f2 || echo "not set")

    echo -e "Current configuration:"
    echo -e "  Frontend URL: ${YELLOW}$CURRENT_FRONTEND${NC}"
    echo -e "  Backend URL:  ${YELLOW}$CURRENT_BACKEND${NC}"
    echo ""

    # Detect local IP
    DETECTED_IP=""
    if [ "$OS" = "macos" ]; then
        DETECTED_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)
    elif [ "$OS" = "linux" ]; then
        DETECTED_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
    fi

    echo "Choose an option:"
    if [ -n "$DETECTED_IP" ]; then
        echo "  1) Use detected IP ($DETECTED_IP)"
    fi
    echo "  2) Use localhost"
    echo "  3) Enter custom IP/hostname"
    echo ""
    read -p "Select: " IP_CHOICE

    case "$IP_CHOICE" in
        1)
            NETWORK_HOST="${DETECTED_IP:-localhost}"
            ;;
        3)
            read -p "Enter IP/hostname: " NETWORK_HOST
            NETWORK_HOST=${NETWORK_HOST:-localhost}
            ;;
        *)
            NETWORK_HOST="localhost"
            ;;
    esac

    NEW_FRONTEND_URL="http://${NETWORK_HOST}:3000"
    NEW_BACKEND_URL="http://${NETWORK_HOST}:3002"

    if grep -q "^FRONTEND_URL=" .env; then
        sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=$NEW_FRONTEND_URL|" .env
    else
        echo "FRONTEND_URL=$NEW_FRONTEND_URL" >> .env
    fi

    if grep -q "^BACKEND_URL=" .env; then
        sed -i.bak "s|^BACKEND_URL=.*|BACKEND_URL=$NEW_BACKEND_URL|" .env
    else
        echo "BACKEND_URL=$NEW_BACKEND_URL" >> .env
    fi

    rm -f .env.bak

    echo ""
    echo -e "${GREEN}[OK] Network configuration:${NC}"
    echo -e "  Frontend: ${YELLOW}$NEW_FRONTEND_URL${NC}"
    echo -e "  Backend:  ${YELLOW}$NEW_BACKEND_URL${NC}"
    echo ""
    echo "Restart OKRfy to apply changes: ./setup.sh --restart"
    echo ""
    exit 0
}

# Reset database
reset_database() {
    echo "========================================"
    echo -e "${YELLOW}         OKRfy - Database Reset${NC}"
    echo "========================================"
    echo ""
    echo -e "${RED}WARNING: This will delete ALL data including:${NC}"
    echo "  - All users (except the superadmin)"
    echo "  - All objectives and key results"
    echo "  - All teams"
    echo "  - All approval history"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " CONFIRM

    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Reset cancelled."
        exit 0
    fi

    echo ""

    # Get database URL from .env
    DB_URL=$(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d '=' -f2)

    if [ -z "$DB_URL" ]; then
        echo -e "${RED}[ERROR] DATABASE_URL not found in .env${NC}"
        exit 1
    fi

    echo -e "${YELLOW}[INFO] Resetting database...${NC}"

    # Extract connection details and run SQL to truncate tables
    psql "$DB_URL" -c "
        TRUNCATE TABLE approval_history CASCADE;
        TRUNCATE TABLE progress_history CASCADE;
        TRUNCATE TABLE objective_contributors CASCADE;
        TRUNCATE TABLE key_results CASCADE;
        TRUNCATE TABLE objectives CASCADE;
        TRUNCATE TABLE team_invitations CASCADE;
        TRUNCATE TABLE team_members CASCADE;
        TRUNCATE TABLE teams CASCADE;
        DELETE FROM users WHERE role != 'superadmin';
        DELETE FROM companies WHERE id NOT IN (SELECT company_id FROM users WHERE role = 'superadmin');
    " 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] Database reset complete!${NC}"
    else
        echo -e "${RED}[ERROR] Failed to reset database. Make sure PostgreSQL is running.${NC}"
        exit 1
    fi

    echo ""
    echo "The database now contains only the superadmin user."
    echo ""
    exit 0
}

# Reset Stripe data
reset_stripe() {
    echo "========================================"
    echo -e "${YELLOW}       Stripe Data Reset${NC}"
    echo "========================================"
    echo ""
    echo "This will reset Stripe-related data in the database:"
    echo "  - Clear stripe_customer_id from all users"
    echo "  - Delete all subscription records"
    echo "  - Reset subscription_tier to 'free'"
    echo ""
    read -p "Continue? (y/N): " CONFIRM

    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Reset cancelled."
        exit 0
    fi

    DB_URL=$(grep "^DATABASE_URL=" .env 2>/dev/null | cut -d '=' -f2)

    if [ -z "$DB_URL" ]; then
        echo -e "${RED}[ERROR] DATABASE_URL not found in .env${NC}"
        exit 1
    fi

    echo ""
    echo -e "${YELLOW}[INFO] Resetting Stripe data...${NC}"

    psql "$DB_URL" -c "
        UPDATE users SET stripe_customer_id = NULL, subscription_tier = 'free', subscription_ends_at = NULL;
        DELETE FROM subscriptions;
    " 2>/dev/null

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}[OK] Stripe data reset complete!${NC}"
        echo ""
        echo "All users are now on the FREE plan."
    else
        echo -e "${YELLOW}[WARNING] Could not reset Stripe data (tables may not exist yet).${NC}"
    fi
    echo ""
    exit 0
}

# Uninstall
uninstall_okrfy() {
    echo "========================================"
    echo -e "${RED}         OKRfy - Uninstall${NC}"
    echo "========================================"
    echo ""
    echo -e "${YELLOW}This will remove:${NC}"
    echo "  - node_modules folder"
    echo "  - server/node_modules folder"
    echo "  - .env file (optional)"
    echo ""
    echo -e "${BLUE}This will NOT remove:${NC}"
    echo "  - PostgreSQL database"
    echo "  - Source code"
    echo ""
    read -p "Are you sure you want to continue? (y/N): " CONFIRM

    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
        echo "Uninstall cancelled."
        exit 0
    fi

    echo ""

    # Stop if running
    echo -e "${YELLOW}[INFO] Stopping OKRfy...${NC}"
    pkill -f "vite" 2>/dev/null || true
    pkill -f "node.*server/index.js" 2>/dev/null || true

    # Remove node_modules
    echo -e "${YELLOW}[INFO] Removing node_modules...${NC}"
    rm -rf node_modules 2>/dev/null || true
    rm -rf server/node_modules 2>/dev/null || true

    # Ask about .env
    read -p "Remove .env file? (y/N): " REMOVE_ENV
    if [[ "$REMOVE_ENV" =~ ^[Yy]$ ]]; then
        echo -e "${YELLOW}[INFO] Removing .env file...${NC}"
        rm -f .env 2>/dev/null || true
    fi

    echo ""
    echo "========================================"
    echo -e "${GREEN}       Uninstall Complete!${NC}"
    echo "========================================"
    echo ""
    echo "OKRfy has been uninstalled."
    echo ""
    echo "To reinstall, run:"
    echo -e "  ${YELLOW}./setup.sh${NC}"
    echo ""
    exit 0
}

# Configure autostart (Linux only)
configure_autostart() {
    if [ "$OS" != "linux" ]; then
        echo -e "${RED}[ERROR] Autostart is only supported on Linux servers.${NC}"
        exit 1
    fi

    echo "========================================"
    echo -e "${BLUE}       Autostart Configuration${NC}"
    echo "========================================"
    echo ""

    # Create systemd service
    sudo tee /etc/systemd/system/okrfy.service > /dev/null << EOF
[Unit]
Description=OKRfy Application
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=${SCRIPT_DIR}
ExecStart=/usr/bin/npm run dev
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

    echo -e "${GREEN}[OK] Service file created${NC}"

    sudo systemctl daemon-reload
    sudo systemctl enable okrfy

    echo ""
    echo "========================================"
    echo -e "${GREEN}       Autostart Configured!${NC}"
    echo "========================================"
    echo ""
    echo "OKRfy will now start automatically when the server boots."
    echo ""
    echo -e "${YELLOW}Service commands:${NC}"
    echo "  sudo systemctl start okrfy    # Start service"
    echo "  sudo systemctl stop okrfy     # Stop service"
    echo "  sudo systemctl restart okrfy  # Restart service"
    echo "  sudo systemctl status okrfy   # Check status"
    echo "  sudo systemctl disable okrfy  # Disable autostart"
    echo ""

    read -p "Start the service now? (Y/n): " START_NOW
    if [[ ! "$START_NOW" =~ ^[Nn]$ ]]; then
        sudo systemctl start okrfy
        echo ""
        sudo systemctl status okrfy --no-pager
    fi

    exit 0
}

# Handle command line arguments
case "$1" in
    --help|-h)
        show_help
        exit 0
        ;;
    --start)
        service_start
        ;;
    --stop)
        service_stop
        ;;
    --restart)
        service_restart
        ;;
    --status)
        service_status
        ;;
    --logs)
        service_logs
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
    --reset)
        reset_database
        ;;
    --reset-stripe)
        reset_stripe
        ;;
    --uninstall)
        uninstall_okrfy
        ;;
    --autostart)
        configure_autostart
        ;;
esac

# Full setup (no arguments)
echo "========================================"
echo "         OKRfy - Setup Script"
echo "========================================"
echo ""

# 1. Check and install prerequisites
echo "Checking prerequisites..."
echo ""

# Check/Install Node.js
if check_command "node"; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}[OK] Node.js found ($NODE_VERSION)${NC}"
else
    echo -e "${YELLOW}[INFO] Node.js not found${NC}"
    read -p "Install Node.js? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        install_node
    else
        echo -e "${RED}Node.js is required. Exiting.${NC}"
        exit 1
    fi
fi

# Check npm
if check_command "npm"; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}[OK] npm found ($NPM_VERSION)${NC}"
else
    echo -e "${RED}[ERROR] npm not found. Please install Node.js properly.${NC}"
    exit 1
fi

echo ""

# 2. Install npm dependencies
echo "Installing npm dependencies..."
npm install
cd server && npm install && cd ..
echo -e "${GREEN}[OK] Dependencies installed${NC}"
echo ""

# 3. Setup .env file
if [ ! -f .env ]; then
    echo -e "${YELLOW}[INFO] .env file not found. Creating from template...${NC}"

    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}[OK] .env created from .env.example${NC}"
        echo ""
        echo -e "${YELLOW}Please configure your .env file with:${NC}"
        echo "  - DATABASE_URL (PostgreSQL connection string)"
        echo "  - Google OAuth credentials (for email)"
        echo "  - Stripe credentials (optional, for billing)"
        echo ""
        echo "Run './setup.sh --google' to configure Google OAuth"
        echo "Run './setup.sh --stripe' to configure Stripe"
    else
        echo -e "${RED}[ERROR] .env.example not found${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}[OK] .env file exists${NC}"
fi
echo ""

# 4. Final instructions
echo "========================================"
echo -e "${GREEN}         Setup Complete!${NC}"
echo "========================================"
echo ""
echo -e "To start OKRfy:"
echo -e "  ${YELLOW}./setup.sh --start${NC}     or     ${YELLOW}npm run dev${NC}"
echo ""
echo -e "Other commands:"
echo -e "  ${YELLOW}./setup.sh --stop${NC}      Stop the application"
echo -e "  ${YELLOW}./setup.sh --status${NC}    Check status"
echo -e "  ${YELLOW}./setup.sh --logs${NC}      View logs"
echo -e "  ${YELLOW}./setup.sh --help${NC}      Show all options"
echo ""
echo -e "Configuration:"
echo -e "  ${YELLOW}./setup.sh --google${NC}    Configure Google OAuth"
echo -e "  ${YELLOW}./setup.sh --stripe${NC}    Configure Stripe"
echo -e "  ${YELLOW}./setup.sh --network${NC}   Configure network"
echo ""
