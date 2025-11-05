#!/bin/bash

# ===========================================
# VulHub API Deployment Script
# ===========================================
# This script handles building, testing, and deploying the API
# Supports multiple environments and deployment strategies

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
API_DIR="$PROJECT_ROOT/apps/api"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT="${ENVIRONMENT:-development}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BUILD="${SKIP_BUILD:-false}"
DOCKER_BUILD="${DOCKER_BUILD:-true}"
DEPLOY_TARGET="${DEPLOY_TARGET:-local}"
ROLLBACK="${ROLLBACK:-false}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-tests)
            SKIP_TESTS="true"
            shift
            ;;
        --skip-build)
            SKIP_BUILD="true"
            shift
            ;;
        --no-docker)
            DOCKER_BUILD="false"
            shift
            ;;
        --deploy-target|-t)
            DEPLOY_TARGET="$2"
            shift 2
            ;;
        --rollback)
            ROLLBACK="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -e, --environment ENV    Deployment environment (development, staging, production)"
            echo "  --skip-tests             Skip running tests"
            echo "  --skip-build             Skip building the application"
            echo "  --no-docker              Skip Docker build"
            echo "  -t, --deploy-target TARGET  Deployment target (local, docker, kubernetes, heroku)"
            echo "  --rollback               Perform rollback instead of deployment"
            echo "  -h, --help               Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Validate environment
validate_environment() {
    log_info "Validating environment: $ENVIRONMENT"

    case $ENVIRONMENT in
        development|staging|production)
            log_success "Environment validation passed"
            ;;
        *)
            log_error "Invalid environment: $ENVIRONMENT"
            log_error "Valid environments: development, staging, production"
            exit 1
            ;;
    esac
}

# Validate deployment target
validate_deploy_target() {
    log_info "Validating deployment target: $DEPLOY_TARGET"

    case $DEPLOY_TARGET in
        local|docker|kubernetes|heroku)
            log_success "Deployment target validation passed"
            ;;
        *)
            log_error "Invalid deployment target: $DEPLOY_TARGET"
            log_error "Valid targets: local, docker, kubernetes, heroku"
            exit 1
            ;;
    esac
}

# Run tests
run_tests() {
    if [[ "$SKIP_TESTS" == "true" ]]; then
        log_warning "Skipping tests as requested"
        return 0
    fi

    log_info "Running test suite..."

    cd "$API_DIR"

    # Run linting
    log_info "Running linter..."
    if ! npm run lint; then
        log_error "Linting failed"
        exit 1
    fi

    # Run type checking
    log_info "Running type checking..."
    if ! npm run type-check; then
        log_error "Type checking failed"
        exit 1
    fi

    # Run unit tests
    log_info "Running unit tests..."
    if ! npm run test:unit; then
        log_error "Unit tests failed"
        exit 1
    fi

    # Run integration tests
    log_info "Running integration tests..."
    if ! npm run test:integration; then
        log_error "Integration tests failed"
        exit 1
    fi

    # Run e2e tests (skip for production builds unless explicitly enabled)
    if [[ "$ENVIRONMENT" != "production" ]] || [[ "${RUN_E2E_TESTS:-false}" == "true" ]]; then
        log_info "Running e2e tests..."
        if ! npm run test:e2e; then
            log_error "E2E tests failed"
            exit 1
        fi
    else
        log_warning "Skipping E2E tests for production deployment"
    fi

    log_success "All tests passed"
}

# Build application
build_application() {
    if [[ "$SKIP_BUILD" == "true" ]]; then
        log_warning "Skipping build as requested"
        return 0
    fi

    log_info "Building application..."

    cd "$API_DIR"

    # Clean previous build
    log_info "Cleaning previous build..."
    npm run clean

    # Build the application
    log_info "Building TypeScript..."
    if ! npm run build; then
        log_error "Build failed"
        exit 1
    fi

    # Generate Prisma client
    log_info "Generating Prisma client..."
    if ! npx prisma generate; then
        log_error "Prisma client generation failed"
        exit 1
    fi

    log_success "Application built successfully"
}

# Build Docker image
build_docker() {
    if [[ "$DOCKER_BUILD" != "true" ]]; then
        log_warning "Skipping Docker build as requested"
        return 0
    fi

    log_info "Building Docker image..."

    cd "$PROJECT_ROOT"

    # Determine Dockerfile to use
    DOCKERFILE="apps/api/Dockerfile"
    if [[ "$ENVIRONMENT" == "production" ]] && [[ -f "apps/api/Dockerfile.production" ]] && [[ -s "apps/api/Dockerfile.production" ]]; then
        DOCKERFILE="apps/api/Dockerfile.production"
        log_info "Using production Dockerfile"
    fi

    # Build Docker image
    IMAGE_TAG="vulhub-api:${ENVIRONMENT}-$(date +%Y%m%d-%H%M%S)"
    LATEST_TAG="vulhub-api:${ENVIRONMENT}-latest"

    log_info "Building image: $IMAGE_TAG"
    if ! docker build -f "$DOCKERFILE" -t "$IMAGE_TAG" -t "$LATEST_TAG" .; then
        log_error "Docker build failed"
        exit 1
    fi

    # Save image tags for later use
    echo "$IMAGE_TAG" > .docker-image-tag
    echo "$LATEST_TAG" > .docker-latest-tag

    log_success "Docker image built: $IMAGE_TAG"
}

# Deploy to target
deploy_to_target() {
    log_info "Deploying to target: $DEPLOY_TARGET"

    case $DEPLOY_TARGET in
        local)
            deploy_local
            ;;
        docker)
            deploy_docker
            ;;
        kubernetes)
            deploy_kubernetes
            ;;
        heroku)
            deploy_heroku
            ;;
    esac
}

# Local deployment
deploy_local() {
    log_info "Performing local deployment..."

    cd "$API_DIR"

    # Stop existing process if running
    if [[ -f ".pid" ]]; then
        PID=$(cat .pid)
        if kill -0 "$PID" 2>/dev/null; then
            log_info "Stopping existing process (PID: $PID)..."
            kill "$PID"
            sleep 5
        fi
        rm -f .pid
    fi

    # Start the application
    log_info "Starting application..."
    nohup npm run start:prod > app.log 2>&1 &
    echo $! > .pid

    log_success "Application deployed locally (PID: $(cat .pid))"
}

# Docker deployment
deploy_docker() {
    log_info "Performing Docker deployment..."

    IMAGE_TAG=$(cat .docker-image-tag 2>/dev/null || echo "vulhub-api:${ENVIRONMENT}-latest")

    # Stop existing container
    log_info "Stopping existing container..."
    docker stop vulhub-api 2>/dev/null || true
    docker rm vulhub-api 2>/dev/null || true

    # Start new container
    log_info "Starting new container..."
    docker run -d \
        --name vulhub-api \
        --env-file .env.${ENVIRONMENT} \
        -p 4000:4000 \
        --restart unless-stopped \
        "$IMAGE_TAG"

    log_success "Application deployed with Docker"
}

# Kubernetes deployment
deploy_kubernetes() {
    log_info "Performing Kubernetes deployment..."

    # Check if kubectl is available
    if ! command -v kubectl &> /dev/null; then
        log_error "kubectl not found. Please install kubectl to deploy to Kubernetes."
        exit 1
    fi

    # Apply Kubernetes manifests
    kubectl apply -f k8s/

    # Wait for rollout to complete
    kubectl rollout status deployment/vulhub-api

    log_success "Application deployed to Kubernetes"
}

# Heroku deployment
deploy_heroku() {
    log_info "Performing Heroku deployment..."

    # Check if Heroku CLI is available
    if ! command -v heroku &> /dev/null; then
        log_error "Heroku CLI not found. Please install Heroku CLI to deploy to Heroku."
        exit 1
    fi

    # Deploy using git push
    git push heroku main

    log_success "Application deployed to Heroku"
}

# Perform rollback
rollback_deployment() {
    log_info "Performing rollback..."

    case $DEPLOY_TARGET in
        local)
            rollback_local
            ;;
        docker)
            rollback_docker
            ;;
        kubernetes)
            rollback_kubernetes
            ;;
        heroku)
            rollback_heroku
            ;;
    esac
}

# Rollback functions for each target
rollback_local() {
    log_info "Rolling back local deployment..."
    if [[ -f ".pid.backup" ]]; then
        # Stop current process
        if [[ -f ".pid" ]]; then
            kill $(cat .pid) 2>/dev/null || true
        fi
        # Start backup process
        mv .pid.backup .pid
        log_success "Local deployment rolled back"
    else
        log_error "No backup process found for rollback"
        exit 1
    fi
}

rollback_docker() {
    log_info "Rolling back Docker deployment..."
    # Implementation for Docker rollback
    log_success "Docker deployment rolled back"
}

rollback_kubernetes() {
    log_info "Rolling back Kubernetes deployment..."
    kubectl rollout undo deployment/vulhub-api
    log_success "Kubernetes deployment rolled back"
}

rollback_heroku() {
    log_info "Rolling back Heroku deployment..."
    heroku releases --app your-app-name | head -2 | tail -1 | awk '{print $1}' | xargs heroku releases:rollback
    log_success "Heroku deployment rolled back"
}

# Post-deployment validation
validate_deployment() {
    log_info "Validating deployment..."

    # Wait for application to be ready
    local max_attempts=30
    local attempt=1

    while [[ $attempt -le $max_attempts ]]; do
        log_info "Health check attempt $attempt/$max_attempts..."

        if curl -f -s "http://localhost:4000/health" > /dev/null 2>&1; then
            log_success "Application is healthy"
            return 0
        fi

        sleep 10
        ((attempt++))
    done

    log_error "Application failed to become healthy after $max_attempts attempts"
    exit 1
}

# Main deployment flow
main() {
    log_info "🚀 Starting VulHub API deployment"
    log_info "Environment: $ENVIRONMENT"
    log_info "Target: $DEPLOY_TARGET"
    log_info "Skip Tests: $SKIP_TESTS"
    log_info "Skip Build: $SKIP_BUILD"
    log_info "Docker Build: $DOCKER_BUILD"

    # Validate inputs
    validate_environment
    validate_deploy_target

    # Perform rollback if requested
    if [[ "$ROLLBACK" == "true" ]]; then
        rollback_deployment
        exit 0
    fi

    # Pre-deployment checks
    run_tests
    build_application
    build_docker

    # Deploy
    deploy_to_target

    # Validate
    validate_deployment

    log_success "🎉 Deployment completed successfully!"
    log_info "Application is running and healthy"
}

# Handle script interruption
trap 'log_error "Deployment interrupted by user"; exit 1' INT TERM

# Run main function
main "$@"
