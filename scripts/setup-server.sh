#!/bin/bash

# Server Setup Script for Ubuntu/Debian
# This script prepares a fresh Ubuntu/Debian server for Docker deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Update system packages
update_system() {
    print_status "Updating system packages..."
    sudo apt-get update
    sudo apt-get upgrade -y
}

# Install required packages
install_packages() {
    print_status "Installing required packages..."
    sudo apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gnupg \
        lsb-release \
        ufw \
        fail2ban
}

# Install Docker
install_docker() {
    print_status "Installing Docker..."
    
    # Add Docker's official GPG key
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    
    # Add Docker repository
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    # Update package index and install Docker
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    
    # Enable Docker service
    sudo systemctl enable docker
    sudo systemctl start docker
    
    print_status "Docker installed successfully"
}

# Configure firewall
configure_firewall() {
    print_status "Configuring firewall..."
    
    # Reset firewall to defaults
    sudo ufw --force reset
    
    # Default policies
    sudo ufw default deny incoming
    sudo ufw default allow outgoing
    
    # Allow SSH
    sudo ufw allow ssh
    
    # Allow HTTP and HTTPS
    sudo ufw allow 80/tcp
    sudo ufw allow 443/tcp
    
    # Enable firewall
    sudo ufw --force enable
    
    print_status "Firewall configured"
}

# Configure fail2ban for SSH protection
configure_fail2ban() {
    print_status "Configuring fail2ban..."
    
    sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
    
    # Enable SSH protection
    sudo systemctl enable fail2ban
    sudo systemctl start fail2ban
    
    print_status "Fail2ban configured"
}

# Create deployment user
create_deploy_user() {
    if [ "$EUID" -eq 0 ]; then
        print_status "Creating deployment user..."
        
        # Create user if it doesn't exist
        if ! id "deploy" &>/dev/null; then
            useradd -m -s /bin/bash deploy
            usermod -aG docker deploy
            usermod -aG sudo deploy
            
            # Set up SSH directory
            mkdir -p /home/deploy/.ssh
            chown deploy:deploy /home/deploy/.ssh
            chmod 700 /home/deploy/.ssh
            
            print_status "Deploy user created"
            print_warning "Remember to set up SSH keys for the deploy user"
        else
            print_warning "Deploy user already exists"
        fi
    else
        print_warning "Not running as root, skipping user creation"
    fi
}

# Setup log rotation for Docker
setup_log_rotation() {
    print_status "Setting up Docker log rotation..."
    
    sudo tee /etc/docker/daemon.json > /dev/null <<EOF
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
EOF

    sudo systemctl restart docker
    print_status "Docker log rotation configured"
}

# Main setup function
main() {
    print_status "Starting server setup..."
    
    update_system
    install_packages
    install_docker
    configure_firewall
    configure_fail2ban
    create_deploy_user
    setup_log_rotation
    
    print_status "Server setup completed!"
    print_status "Please log out and log back in for Docker group changes to take effect"
    print_warning "Don't forget to:"
    print_warning "1. Set up SSH keys for authentication"
    print_warning "2. Configure GitHub Actions secrets"
    print_warning "3. Test the deployment process"
}

# Check if running on supported OS
if [[ ! -f /etc/debian_version ]]; then
    print_error "This script is designed for Ubuntu/Debian systems"
    exit 1
fi

# Run main setup
main