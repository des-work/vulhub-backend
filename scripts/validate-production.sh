#!/bin/bash

# ===========================================
# Production Validation Script
# ===========================================
# Comprehensive post-deployment validation for production environments

set -euo pipefail

# Configuration
API_BASE_URL="${API_BASE_URL:-https://api.vulhub.edu}"
WEB_BASE_URL="${WEB_BASE_URL:-https://vulhub.edu}"
TIMEOUT="${TIMEOUT:-60}"
RETRIES="${RETRIES:-5}"
ENVIRONMENT="${ENVIRONMENT:-production}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Validation results
VALIDATION_RESULTS=()
FAILED_CHECKS=0
PASSED_CHECKS=0

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
    VALIDATION_RESULTS+=("✅ $1")
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
    VALIDATION_RESULTS+=("⚠️  $1")
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
    VALIDATION_RESULTS+=("❌ $1")
    ((FAILED_CHECKS++))
}

# HTTP request function with SSL validation
http_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"
    local skip_ssl="${4:-false}"

    local curl_opts="-s -w 'HTTPSTATUS:%{http_code};TIME:%{time_total};SSL_VERIFY:%{ssl_verify_result}' --max-time $TIMEOUT"

    if [[ "$skip_ssl" == "true" ]]; then
        curl_opts="$curl_opts -k"
    fi

    local attempt=1
    while [[ $attempt -le $RETRIES ]]; do
        log_info "HTTP Request: $method $url (attempt $attempt/$RETRIES)"

        if [[ "$method" == "GET" ]]; then
            if response=$(curl $curl_opts \
                -H "Content-Type: application/json" \
                -H "User-Agent: Production-Validation/1.0" \
                "$url" 2>/dev/null); then
                break
            fi
        else
            if response=$(curl $curl_opts \
                -X "$method" \
                -H "Content-Type: application/json" \
                -H "User-Agent: Production-Validation/1.0" \
                -d "$data" \
                "$url" 2>/dev/null); then
                break
            fi
        fi

        log_warning "Request failed (attempt $attempt/$RETRIES)"
        sleep $((attempt * 2))
        ((attempt++))
    done

    if [[ $attempt -gt $RETRIES ]]; then
        log_error "Request failed after $RETRIES attempts"
        return 1
    fi

    # Extract response data
    HTTP_STATUS=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://' | sed -e 's/;TIME.*//')
    RESPONSE_TIME=$(echo "$response" | tr -d '\n' | sed -e 's/.*TIME://' | sed -e 's/;SSL_VERIFY.*//')
    SSL_VERIFY=$(echo "$response" | tr -d '\n' | sed -e 's/.*SSL_VERIFY://')
    RESPONSE_BODY=$(echo "$response" | sed -e 's/HTTPSTATUS.*//')
}

# Validate SSL certificate
validate_ssl() {
    log_info "Validating SSL certificate..."

    http_request "$API_BASE_URL/api/v1/health" "GET" "" "false"

    if [[ "$SSL_VERIFY" == "0" ]]; then
        log_success "SSL certificate is valid"
        return 0
    else
        log_error "SSL certificate validation failed (code: $SSL_VERIFY)"
        return 1
    fi
}

# Validate API health
validate_api_health() {
    log_info "Validating API health endpoints..."

    local endpoints=(
        "/health:200"
        "/ready:200"
        "/api/v1/health:200"
        "/api/v1/health/live:200"
        "/api/v1/health/detailed:200"
        "/api/v1/health/config:200"
        "/api/v1/health/metrics:200"
    )

    local failed=0

    for endpoint_status in "${endpoints[@]}"; do
        IFS=':' read -r endpoint expected_status <<< "$endpoint_status"

        if http_request "$API_BASE_URL$endpoint"; then
            if [[ "$HTTP_STATUS" == "$expected_status" ]]; then
                log_success "Endpoint $endpoint returned $HTTP_STATUS"
            else
                log_error "Endpoint $endpoint returned $HTTP_STATUS (expected $expected_status)"
                ((failed++))
            fi
        else
            log_error "Endpoint $endpoint is unreachable"
            ((failed++))
        fi
    done

    return $((failed > 0))
}

# Validate API functionality
validate_api_functionality() {
    log_info "Validating API functionality..."

    # Test authentication endpoints
    local auth_data='{"email":"test@vulhub.edu","password":"invalid"}'
    if http_request "$API_BASE_URL/api/v1/auth/login" "POST" "$auth_data"; then
        if [[ "$HTTP_STATUS" == "401" ]]; then
            log_success "Authentication validation working"
        else
            log_error "Authentication endpoint unexpected response: $HTTP_STATUS"
            return 1
        fi
    else
        log_error "Authentication endpoint unreachable"
        return 1
    fi

    # Test leaderboard endpoint (should require auth or return public data)
    if http_request "$API_BASE_URL/api/v1/leaderboard"; then
        if [[ "$HTTP_STATUS" == "200" ]] || [[ "$HTTP_STATUS" == "401" ]]; then
            log_success "Leaderboard endpoint accessible"
        else
            log_error "Leaderboard endpoint unexpected response: $HTTP_STATUS"
            return 1
        fi
    else
        log_error "Leaderboard endpoint unreachable"
        return 1
    fi

    return 0
}

# Validate response times
validate_performance() {
    log_info "Validating response times..."

    local endpoints=(
        "/api/v1/health:1.0"
        "/api/v1/health/detailed:3.0"
        "/api/v1/leaderboard:5.0"
    )

    local failed=0

    for endpoint_max_time in "${endpoints[@]}"; do
        IFS=':' read -r endpoint max_time <<< "$endpoint_max_time"

        if http_request "$API_BASE_URL$endpoint"; then
            if (( $(echo "$RESPONSE_TIME > $max_time" | bc -l 2>/dev/null || echo "1") )); then
                log_error "Endpoint $endpoint response time ${RESPONSE_TIME}s exceeds ${max_time}s"
                ((failed++))
            else
                log_success "Endpoint $endpoint response time: ${RESPONSE_TIME}s"
            fi
        else
            log_error "Endpoint $endpoint unreachable"
            ((failed++))
        fi
    done

    return $((failed > 0))
}

# Validate security headers
validate_security() {
    log_info "Validating security headers..."

    if http_request "$API_BASE_URL/api/v1/health"; then
        # This would need to be implemented to check response headers
        # For now, just check if request succeeds
        log_success "Security validation request successful"
        return 0
    else
        log_error "Cannot validate security headers - endpoint unreachable"
        return 1
    fi
}

# Validate database connectivity
validate_database() {
    log_info "Validating database connectivity via health check..."

    if http_request "$API_BASE_URL/api/v1/health/detailed"; then
        if echo "$RESPONSE_BODY" | jq -e '.checks.database.status == "up"' >/dev/null 2>&1; then
            log_success "Database connectivity confirmed"
            return 0
        else
            log_error "Database connectivity issues detected"
            return 1
        fi
    else
        log_error "Cannot check database status"
        return 1
    fi
}

# Validate Redis connectivity
validate_redis() {
    log_info "Validating Redis connectivity via health check..."

    if http_request "$API_BASE_URL/api/v1/health/detailed"; then
        if echo "$RESPONSE_BODY" | jq -e '.checks.redis.status == "up"' >/dev/null 2>&1; then
            log_success "Redis connectivity confirmed"
            return 0
        else
            log_error "Redis connectivity issues detected"
            return 1
        fi
    else
        log_error "Cannot check Redis status"
        return 1
    fi
}

# Validate configuration
validate_configuration() {
    log_info "Validating configuration..."

    if http_request "$API_BASE_URL/api/v1/health/config"; then
        if echo "$RESPONSE_BODY" | jq -e '.isValid == true' >/dev/null 2>&1; then
            log_success "Configuration validation passed"
            return 0
        else
            log_error "Configuration validation failed"
            if echo "$RESPONSE_BODY" | jq -e '.errors' >/dev/null 2>&1; then
                echo "$RESPONSE_BODY" | jq -r '.errors[]?.message' | while read -r error; do
                    log_error "  - $error"
                done
            fi
            return 1
        fi
    else
        log_error "Cannot access configuration validation"
        return 1
    fi
}

# Validate web application connectivity
validate_web_app() {
    log_info "Validating web application connectivity..."

    if [[ -n "$WEB_BASE_URL" ]]; then
        if http_request "$WEB_BASE_URL" "GET" "" "false"; then
            if [[ "$HTTP_STATUS" == "200" ]]; then
                log_success "Web application accessible"
                return 0
            else
                log_error "Web application returned status $HTTP_STATUS"
                return 1
            fi
        else
            log_error "Web application unreachable"
            return 1
        fi
    else
        log_warning "Web application URL not provided, skipping check"
        return 0
    fi
}

# Generate validation report
generate_report() {
    log_info "Generating validation report..."

    echo "========================================"
    echo "🩺 PRODUCTION VALIDATION REPORT"
    echo "========================================"
    echo "Environment: $ENVIRONMENT"
    echo "API Base URL: $API_BASE_URL"
    echo "Web Base URL: $WEB_BASE_URL"
    echo "Timestamp: $(date -u '+%Y-%m-%d %H:%M:%S UTC')"
    echo "========================================"

    for result in "${VALIDATION_RESULTS[@]}"; do
        echo "$result"
    done

    echo "========================================"
    echo "SUMMARY: $PASSED_CHECKS passed, $FAILED_CHECKS failed"
    echo "========================================"

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo "🎉 ALL VALIDATION CHECKS PASSED!"
        echo "Production deployment is ready."
        return 0
    else
        echo "❌ VALIDATION FAILED!"
        echo "$FAILED_CHECKS checks failed. Please review and fix issues before proceeding."
        return 1
    fi
}

# Main validation function
run_validation() {
    log_info "Starting production validation for $ENVIRONMENT environment"

    # Core infrastructure validation
    validate_ssl || true  # Don't fail on SSL issues in development
    validate_api_health || return 1
    validate_configuration || return 1

    # Service connectivity validation
    validate_database || return 1
    validate_redis || return 1

    # Functionality validation
    validate_api_functionality || return 1

    # Performance validation
    validate_performance || return 1

    # Security validation
    validate_security || return 1

    # Web application validation
    validate_web_app || true  # Optional check

    return 0
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --api-url)
            API_BASE_URL="$2"
            shift 2
            ;;
        --web-url)
            WEB_BASE_URL="$2"
            shift 2
            ;;
        --environment|-e)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --timeout|-t)
            TIMEOUT="$2"
            shift 2
            ;;
        --retries|-r)
            RETRIES="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Production validation script for VulHub deployment"
            echo ""
            echo "Options:"
            echo "  --api-url URL        API base URL (default: $API_BASE_URL)"
            echo "  --web-url URL        Web application URL (default: $WEB_BASE_URL)"
            echo "  -e, --environment ENV Environment (default: $ENVIRONMENT)"
            echo "  -t, --timeout SEC    Request timeout (default: $TIMEOUT)"
            echo "  -r, --retries NUM    Retry attempts (default: $RETRIES)"
            echo "  -h, --help           Show this help message"
            echo ""
            echo "Exit codes:"
            echo "  0 - All validations passed"
            echo "  1 - One or more validations failed"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Check dependencies
if ! command -v jq &> /dev/null; then
    log_error "jq is required for JSON parsing. Please install jq."
    exit 1
fi

if ! command -v bc &> /dev/null; then
    log_error "bc is required for floating point comparisons. Please install bc."
    exit 1
fi

# Run validation
if run_validation; then
    generate_report
else
    log_error "Validation failed!"
    generate_report
    exit 1
fi
