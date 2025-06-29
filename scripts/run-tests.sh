#!/bin/bash

# IoT Device Simulator Test Runner
# Script để chạy các test giả lập thiết bị IoT

set -e

echo "🚀 IoT Device Simulator Test Runner"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    print_status "Installing dependencies..."
    npm install
fi

# Function to run unit tests
run_unit_tests() {
    print_status "Running unit tests..."
    npm test -- --testPathPattern="hourly-value.service.test.ts"
}

# Function to run device simulator tests
run_simulator_tests() {
    print_status "Running device simulator tests..."
    npm test -- --testPathPattern="device-simulator.test.ts"
}

# Function to run integration tests
run_integration_tests() {
    print_status "Running integration tests..."
    npm test -- --testPathPattern="integration.test.ts"
}

# Function to run all tests
run_all_tests() {
    print_status "Running all tests..."
    npm test
}

# Function to run tests with coverage
run_coverage_tests() {
    print_status "Running tests with coverage..."
    npm run test:coverage
}

# Function to run device simulator script
run_simulator_script() {
    print_status "Running device simulator script..."
    print_warning "This will run for 2 hours. Press Ctrl+C to stop early."
    
    # Check if ts-node is available
    if ! npx ts-node --version &> /dev/null; then
        print_error "ts-node is not available. Installing..."
        npm install -g ts-node
    fi
    
    npx ts-node src/__tests__/device-simulator-script.ts
}

# Function to run quick demo (5 minutes)
run_quick_demo() {
    print_status "Running quick demo (5 minutes)..."
    
    # Create a temporary script for quick demo
    cat > temp-quick-demo.ts << 'EOF'
import { DeviceSimulator } from './src/__tests__/device-simulator-script';

const simulator = new DeviceSimulator();

// Create devices
simulator.createDevice('QUICK_DEVICE_001', 1);
simulator.createDevice('QUICK_DEVICE_002', 2);

// Start devices with faster intervals
simulator.startDevice('QUICK_DEVICE_001', 2000); // 2 seconds
simulator.startDevice('QUICK_DEVICE_002', 3000); // 3 seconds

// Show status every 30 seconds
const statusInterval = setInterval(() => {
    simulator.getStatus();
}, 30000);

// Stop after 5 minutes
setTimeout(() => {
    console.log('\n🛑 Stopping quick demo...');
    clearInterval(statusInterval);
    simulator.stopAllDevices();
    console.log('✅ Quick demo completed!');
    process.exit(0);
}, 300000); // 5 minutes

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    clearInterval(statusInterval);
    simulator.stopAllDevices();
    process.exit(0);
});
EOF

    npx ts-node temp-quick-demo.ts
    
    # Cleanup
    rm temp-quick-demo.ts
}

# Function to check system requirements
check_requirements() {
    print_status "Checking system requirements..."
    
    # Check Node.js version
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 16 ]; then
        print_warning "Node.js version 16 or higher is recommended. Current version: $(node --version)"
    else
        print_success "Node.js version: $(node --version)"
    fi
    
    # Check npm version
    print_success "npm version: $(npm --version)"
    
    # Check if Redis is running (optional)
    if command -v redis-cli &> /dev/null; then
        if redis-cli ping &> /dev/null; then
            print_success "Redis is running"
        else
            print_warning "Redis is not running (tests will use mocks)"
        fi
    else
        print_warning "Redis CLI not found (tests will use mocks)"
    fi
    
    # Check available memory
    if command -v free &> /dev/null; then
        MEMORY_GB=$(free -g | awk 'NR==2{print $2}')
        if [ "$MEMORY_GB" -lt 2 ]; then
            print_warning "Less than 2GB RAM available. Performance may be affected."
        else
            print_success "Available memory: ${MEMORY_GB}GB"
        fi
    fi
}

# Function to show help
show_help() {
    echo "Usage: $0 [OPTION]"
    echo ""
    echo "Options:"
    echo "  unit          Run unit tests only"
    echo "  simulator     Run device simulator tests only"
    echo "  integration   Run integration tests only"
    echo "  all           Run all tests"
    echo "  coverage      Run tests with coverage report"
    echo "  script        Run device simulator script (2 hours)"
    echo "  demo          Run quick demo (5 minutes)"
    echo "  check         Check system requirements"
    echo "  help          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 unit       # Run unit tests"
    echo "  $0 demo       # Run quick demo"
    echo "  $0 all        # Run all tests"
}

# Main script logic
case "${1:-help}" in
    "unit")
        run_unit_tests
        ;;
    "simulator")
        run_simulator_tests
        ;;
    "integration")
        run_integration_tests
        ;;
    "all")
        run_all_tests
        ;;
    "coverage")
        run_coverage_tests
        ;;
    "script")
        run_simulator_script
        ;;
    "demo")
        run_quick_demo
        ;;
    "check")
        check_requirements
        ;;
    "help"|*)
        show_help
        ;;
esac

print_success "Test runner completed!" 