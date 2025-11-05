#!/bin/bash

# ===========================================
# VulHub API Health Check Script
# ===========================================
# Comprehensive health validation for production deployments

set -euo pipefail

# Configuration
API_BASE_URL="${API_BASE_URL:-http://localhost:4000}"
TIMEOUT="${TIMEOUT:-30}"
RETRIES="${RETRIES:-3}"
VERBOSE="${VERBOSE:-false}"

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

# HTTP request function with timeout and retries
http_request() {
    local url="$1"
    local method="${2:-GET}"
    local data="${3:-}"

    local attempt=1
    while [[ $attempt -le $RETRIES ]]; do
        log_info "HTTP Request: $method $url (attempt $attempt/$RETRIES)"

        if [[ "$method" == "GET" ]]; then
            if response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                --max-time "$TIMEOUT" \
                -H "Content-Type: application/json" \
                -H "User-Agent: Health-Check/1.0" \
                "$url" 2>/dev/null); then
                break
            fi
        else
            if response=$(curl -s -w "HTTPSTATUS:%{http_code};TIME:%{time_total}" \
                --max-time "$TIMEOUT" \
                -X "$method" \
                -H "Content-Type: application/json" \
                -H "User-Agent: Health-Check/1.0" \
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

    # Extract HTTP status and response time
    http_status=$(echo "$response" | tr -d '\n' | sed -e 's/.*HTTPSTATUS://' | sed -e 's/;TIME.*//')
    response_time=$(echo "$response" | tr -d '\n' | sed -e 's/.*TIME://')

    # Extract JSON response body
    response_body=$(echo "$response" | sed -e 's/HTTPSTATUS.*//')

    # Export variables for calling function
    HTTP_STATUS="$http_status"
    RESPONSE_TIME="$response_time"
    RESPONSE_BODY="$response_body"
}

# Validate HTTP response
validate_response() {
    local expected_status="${1:-200}"
    local max_response_time="${2:-5.0}"

    if [[ "$HTTP_STATUS" != "$expected_status" ]]; then
        log_error "Expected HTTP $expected_status, got $HTTP_STATUS"
        if [[ "$VERBOSE" == "true" ]]; then
            log_error "Response: $RESPONSE_BODY"
        fi
        return 1
    fi

    # Check response time
    if (( $(echo "$RESPONSE_TIME > $max_response_time" | bc -l 2>/dev/null || echo "1") )); then
        log_warning "Response time ${RESPONSE_TIME}s exceeds threshold ${max_response_time}s"
    else
        log_info "Response time: ${RESPONSE_TIME}s"
    fi

    return 0
}

# Test basic health endpoint
test_basic_health() {
    log_info "Testing basic health check..."

    if http_request "$API_BASE_URL/health"; then
        if validate_response 200 2.0; then
            log_success "Basic health check passed"
            return 0
        fi
    fi

    log_error "Basic health check failed"
    return 1
}

# Test readiness endpoint
test_readiness() {
    log_info "Testing readiness check..."

    if http_request "$API_BASE_URL/ready"; then
        if validate_response 200 1.0; then
            log_success "Readiness check passed"
            return 0
        fi
    fi

    log_error "Readiness check failed"
    return 1
}

# Test liveness endpoint
test_liveness() {
    log_info "Testing liveness check..."

    if http_request "$API_BASE_URL/api/v1/health/live"; then
        if validate_response 200 1.0; then
            log_success "Liveness check passed"
            return 0
        fi
    fi

    log_error "Liveness check failed"
    return 1
}

# Test detailed health endpoint
test_detailed_health() {
    log_info "Testing detailed health check..."

    if http_request "$API_BASE_URL/api/v1/health/detailed"; then
        if validate_response 200 3.0; then
            # Validate response structure
            if echo "$RESPONSE_BODY" | jq -e '.status and .checks and .metrics' >/dev/null 2>&1; then
                log_success "Detailed health check passed"

                # Check overall status
                overall_status=$(echo "$RESPONSE_BODY" | jq -r '.status')
                if [[ "$overall_status" == "healthy" ]]; then
                    log_success "Overall system status: healthy"
                else
                    log_warning "Overall system status: $overall_status"
                fi

                if [[ "$VERBOSE" == "true" ]]; then
                    echo "$RESPONSE_BODY" | jq '.'
                fi

                return 0
            else
                log_error "Invalid detailed health response structure"
            fi
        fi
    fi

    log_error "Detailed health check failed"
    return 1
}

# Test configuration validation
test_config_validation() {
    log_info "Testing configuration validation..."

    if http_request "$API_BASE_URL/api/v1/health/config"; then
        if validate_response 200 2.0; then
            # Check if configuration is valid
            is_valid=$(echo "$RESPONSE_BODY" | jq -r '.isValid')
            if [[ "$is_valid" == "true" ]]; then
                log_success "Configuration validation passed"
                return 0
            else
                log_error "Configuration validation failed"
                errors=$(echo "$RESPONSE_BODY" | jq -r '.errors[]?.message' 2>/dev/null || echo "Unknown errors")
                log_error "Errors: $errors"
            fi
        fi
    fi

    log_error "Configuration validation check failed"
    return 1
}

# Test metrics endpoint
test_metrics() {
    log_info "Testing metrics endpoint..."

    if http_request "$API_BASE_URL/api/v1/health/metrics"; then
        if validate_response 200 2.0; then
            # Validate response structure
            if echo "$RESPONSE_BODY" | jq -e '.memory and .uptime and .pid' >/dev/null 2>&1; then
                log_success "Metrics check passed"

                if [[ "$VERBOSE" == "true" ]]; then
                    memory_usage=$(echo "$RESPONSE_BODY" | jq -r '.memory.usagePercentage')
                    log_info "Memory usage: ${memory_usage}%"
                fi

                return 0
            else
                log_error "Invalid metrics response structure"
            fi
        fi
    fi

    log_error "Metrics check failed"
    return 1
}

# Test API functionality
test_api_functionality() {
    log_info "Testing basic API functionality..."

    # Test API docs endpoint
    if http_request "$API_BASE_URL/api/docs"; then
        if validate_response 200 3.0; then
            log_success "API documentation accessible"
        else
            log_warning "API documentation not accessible"
        fi
    fi

    # Test test endpoint
    if http_request "$API_BASE_URL/test"; then
        if validate_response 200 1.0; then
            log_success "Test endpoint functional"
            return 0
        fi
    fi

    log_error "API functionality test failed"
    return 1
}

# Test authentication endpoints (basic smoke test)
test_auth_endpoints() {
    log_info "Testing authentication endpoints..."

    # Test login endpoint (should return 400 for invalid data)
    login_data='{"email":"invalid","password":""}'
    if http_request "$API_BASE_URL/api/v1/auth/login" "POST" "$login_data"; then
        if validate_response 400 2.0; then
            log_success "Authentication validation working"
            return 0
        fi
    fi

    log_error "Authentication endpoint test failed"
    return 1
}

# Comprehensive health check
run_comprehensive_check() {
    local failed_checks=0
    local total_checks=0

    log_info "Running comprehensive health checks for $API_BASE_URL"

    # Basic connectivity
    ((total_checks++))
    if ! test_basic_health; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! test_readiness; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! test_liveness; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! test_detailed_health; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! test_config_validation; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! test_metrics; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! test_api_functionality; then
        ((failed_checks++))
    fi

    ((total_checks++))
    if ! test_auth_endpoints; then
        ((failed_checks++))
    fi

    # Summary
    log_info "Health check summary: $((total_checks - failed_checks))/$total_checks checks passed"

    if [[ $failed_checks -eq 0 ]]; then
        log_success "🎉 All health checks passed!"
        return 0
    else
        log_error "❌ $failed_checks out of $total_checks health checks failed"
        return 1
    fi
}

# Quick health check (for load balancers)
run_quick_check() {
    log_info "Running quick health check..."

    if test_basic_health && test_liveness; then
        log_success "✅ Service is healthy"
        return 0
    else
        log_error "❌ Service is unhealthy"
        return 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --url|-u)
            API_BASE_URL="$2"
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
        --verbose|-v)
            VERBOSE="true"
            shift
            ;;
        --quick)
            QUICK_CHECK="true"
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  -u, --url URL          API base URL (default: $API_BASE_URL)"
            echo "  -t, --timeout SEC      Request timeout in seconds (default: $TIMEOUT)"
            echo "  -r, --retries NUM      Number of retries (default: $RETRIES)"
            echo "  -v, --verbose          Enable verbose output"
            echo "  --quick                Run quick health check only"
            echo "  -h, --help             Show this help message"
            echo ""
            echo "Exit codes:"
            echo "  0 - All checks passed"
            echo "  1 - One or more checks failed"
            echo "  2 - Invalid arguments or configuration"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 2
            ;;
    esac
done

# Check if jq is available
if ! command -v jq &> /dev/null; then
    log_error "jq is required for JSON parsing. Please install jq."
    exit 2
fi

# Run appropriate check
if [[ "${QUICK_CHECK:-false}" == "true" ]]; then
    run_quick_check
else
    run_comprehensive_check
fi
