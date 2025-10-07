# GitHub Actions Configuration Guide

This document outlines the CI/CD setup and deployment configuration.

## Current Workflow Status

### Active Workflows
1. **CI - Build and Test** (`ci.yml`) - Runs on every push and PR
   - Runs automated tests
   - Builds and pushes Docker image to GitHub Container Registry
   - No secrets required for basic CI

2. **Manual Deploy to Production** (`deploy-manual.yml`) - Manual deployment trigger
   - Requires secrets to be configured
   - Can be triggered manually from GitHub Actions tab
   - Deploys to remote server

## Required Repository Secrets (for deployment only)

Navigate to your GitHub repository → Settings → Secrets and variables → Actions to add these secrets:

### Server Connection Secrets
- `SSH_PRIVATE_KEY`: Private SSH key for server access
- `SERVER_HOST`: IP address or domain of your remote server
- `SERVER_USER`: Username for SSH connection (e.g., 'ubuntu', 'root')

### Application Environment Variables
- `APP_USERNAME`: Username for Basic Authentication
- `APP_PASSWORD`: Password for Basic Authentication  
- `SECRET_MESSAGE`: Secret message returned by the /secret endpoint

## Setting up SSH Access

1. Generate an SSH key pair on your local machine:
   ```bash
   ssh-keygen -t rsa -b 4096 -C "github-actions@yourproject.com"
   ```

2. Add the public key to your server's authorized_keys:
   ```bash
   cat ~/.ssh/id_rsa.pub | ssh user@your-server 'cat >> ~/.ssh/authorized_keys'
   ```

3. Add the private key content to GitHub Secrets as `SSH_PRIVATE_KEY`

## Server Requirements

Your remote server should have:
- Docker installed and running
- SSH access enabled
- Port 80 available for the application

## Environment Configuration

The workflow uses GitHub Container Registry (ghcr.io) for storing Docker images.
The GITHUB_TOKEN is automatically provided by GitHub Actions.

## Deployment Process

1. Code is pushed to main branch
2. Tests run automatically
3. Docker image is built and pushed to registry
4. Application is deployed to remote server
5. Health check verifies deployment success

## Security Best Practices

- Use strong passwords for APP_PASSWORD
- Regularly rotate SSH keys
- Limit SSH access to specific IP ranges if possible
- Monitor deployment logs for any security issues