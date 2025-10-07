#!/bin/bash

# Remote Server Deployment Script
# This script deploys the Dockerized Node.js service to a remote server

set -e

# Configuration
REGISTRY="ghcr.io"
IMAGE_NAME="your-username/dockerized-service"
CONTAINER_NAME="nodejs-service"
SERVER_PORT="80"
APP_PORT="3000"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required environment variables are set
check_env_vars() {
    print_status "Checking environment variables..."
    
    if [ -z "$APP_USERNAME" ]; then
        print_error "APP_USERNAME environment variable is not set"
        exit 1
    fi
    
    if [ -z "$APP_PASSWORD" ]; then
        print_error "APP_PASSWORD environment variable is not set"
        exit 1
    fi
    
    if [ -z "$SECRET_MESSAGE" ]; then
        print_error "SECRET_MESSAGE environment variable is not set"
        exit 1
    fi
    
    print_status "Environment variables check passed"
}

# Function to stop and remove existing container
cleanup_existing() {
    print_status "Cleaning up existing container..."
    
    if docker ps -q -f name=${CONTAINER_NAME} > /dev/null 2>&1; then
        print_warning "Stopping existing container: ${CONTAINER_NAME}"
        docker stop ${CONTAINER_NAME} || true
    fi
    
    if docker ps -aq -f name=${CONTAINER_NAME} > /dev/null 2>&1; then
        print_warning "Removing existing container: ${CONTAINER_NAME}"
        docker rm ${CONTAINER_NAME} || true
    fi
}

# Function to pull latest image
pull_image() {
    print_status "Pulling latest Docker image..."
    docker pull ${REGISTRY}/${IMAGE_NAME}:latest
}

# Function to deploy new container
deploy_container() {
    print_status "Deploying new container..."
    
    docker run -d \
        --name ${CONTAINER_NAME} \
        --restart unless-stopped \
        -p ${SERVER_PORT}:${APP_PORT} \
        -e APP_USERNAME="${APP_USERNAME}" \
        -e APP_PASSWORD="${APP_PASSWORD}" \
        -e SECRET_MESSAGE="${SECRET_MESSAGE}" \
        -e NODE_ENV=production \
        ${REGISTRY}/${IMAGE_NAME}:latest
    
    print_status "Container deployed successfully"
}

# Function to perform health check
health_check() {
    print_status "Performing health check..."
    sleep 5
    
    if curl -f http://localhost:${SERVER_PORT}/ > /dev/null 2>&1; then
        print_status "Health check passed! Service is running correctly"
    else
        print_error "Health check failed! Service may not be running correctly"
        docker logs ${CONTAINER_NAME}
        exit 1
    fi
}

# Function to clean up old images
cleanup_images() {
    print_status "Cleaning up old Docker images..."
    docker image prune -f
}

# Main deployment function
deploy() {
    print_status "Starting deployment process..."
    
    check_env_vars
    cleanup_existing
    pull_image
    deploy_container
    health_check
    cleanup_images
    
    print_status "Deployment completed successfully!"
    print_status "Service is available at: http://localhost:${SERVER_PORT}"
    print_status "Secret endpoint: http://localhost:${SERVER_PORT}/secret"
}

# Show usage if no arguments provided
usage() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy    Deploy the application"
    echo "  logs      Show container logs"
    echo "  status    Show container status"
    echo "  stop      Stop the container"
    echo "  restart   Restart the container"
    echo "  cleanup   Remove container and clean up"
    echo ""
    echo "Environment variables required for deployment:"
    echo "  APP_USERNAME    - Username for basic authentication"
    echo "  APP_PASSWORD    - Password for basic authentication"
    echo "  SECRET_MESSAGE  - Secret message to return"
}

# Command handling
case "${1:-}" in
    deploy)
        deploy
        ;;
    logs)
        docker logs -f ${CONTAINER_NAME}
        ;;
    status)
        docker ps -f name=${CONTAINER_NAME}
        ;;
    stop)
        print_status "Stopping container..."
        docker stop ${CONTAINER_NAME}
        ;;
    restart)
        print_status "Restarting container..."
        docker restart ${CONTAINER_NAME}
        ;;
    cleanup)
        print_status "Cleaning up..."
        cleanup_existing
        cleanup_images
        ;;
    *)
        usage
        exit 1
        ;;
esac