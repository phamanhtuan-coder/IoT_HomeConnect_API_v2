# IoT Device Simulator Test Runner (PowerShell)
# Script để chạy các test giả lập thiết bị IoT

param(
    [Parameter(Position=0)]
    [string]$Command = "help"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"
$White = "White"

# Function to print colored output
function Write-Status {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# Main header
Write-Host "🚀 IoT Device Simulator Test Runner" -ForegroundColor $White
Write-Host "==================================" -ForegroundColor $White

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Success "Node.js version: $nodeVersion"
} catch {
    Write-Error "Node.js is not installed. Please install Node.js first."
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Success "npm version: $npmVersion"
} catch {
    Write-Error "npm is not installed. Please install npm first."
    exit 1
}

# Check if dependencies are installed
if (-not (Test-Path "node_modules")) {
    Write-Status "Installing dependencies..."
    npm install
}

# Function to run unit tests
function Run-UnitTests {
    Write-Status "Running unit tests..."
    npm test -- --testPathPattern="hourly-value.service.test.ts"
}

# Function to run device simulator tests
function Run-SimulatorTests {
    Write-Status "Running device simulator tests..."
    npm test -- --testPathPattern="device-simulator.test.ts"
}

# Function to run integration tests
function Run-IntegrationTests {
    Write-Status "Running integration tests..."
    npm test -- --testPathPattern="integration.test.ts"
}

# Function to run all tests
function Run-AllTests {
    Write-Status "Running all tests..."
    npm test
}

# Function to run tests with coverage
function Run-CoverageTests {
    Write-Status "Running tests with coverage..."
    npm run test:coverage
}

# Function to run device simulator script
function Run-SimulatorScript {
    Write-Status "Running device simulator script..."
    Write-Warning "This will run for 2 hours. Press Ctrl+C to stop early."
    
    # Check if ts-node is available
    try {
        npx ts-node --version | Out-Null
    } catch {
        Write-Error "ts-node is not available. Installing..."
        npm install -g ts-node
    }
    
    npx ts-node src/__tests__/device-simulator-script.ts
}

# Function to run quick demo (5 minutes)
function Run-QuickDemo {
    Write-Status "Running quick demo (5 minutes)..."
    
    # Create a temporary script for quick demo
    $quickDemoScript = @"
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
"@

    $quickDemoScript | Out-File -FilePath "temp-quick-demo.ts" -Encoding UTF8
    
    try {
        npx ts-node temp-quick-demo.ts
    } finally {
        # Cleanup
        if (Test-Path "temp-quick-demo.ts") {
            Remove-Item "temp-quick-demo.ts"
        }
    }
}

# Function to check system requirements
function Check-Requirements {
    Write-Status "Checking system requirements..."
    
    # Check Node.js version
    $nodeVersion = node --version
    $nodeMajor = $nodeVersion -replace 'v', '' -split '\.' | Select-Object -First 1
    if ([int]$nodeMajor -lt 16) {
        Write-Warning "Node.js version 16 or higher is recommended. Current version: $nodeVersion"
    } else {
        Write-Success "Node.js version: $nodeVersion"
    }
    
    # Check npm version
    $npmVersion = npm --version
    Write-Success "npm version: $npmVersion"
    
    # Check available memory
    $memory = Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty TotalPhysicalMemory
    $memoryGB = [math]::Round($memory / 1GB, 1)
    if ($memoryGB -lt 2) {
        Write-Warning "Less than 2GB RAM available. Performance may be affected."
    } else {
        Write-Success "Available memory: ${memoryGB}GB"
    }
    
    # Check if Redis is running (optional)
    try {
        $redisProcess = Get-Process redis-server -ErrorAction SilentlyContinue
        if ($redisProcess) {
            Write-Success "Redis is running"
        } else {
            Write-Warning "Redis is not running (tests will use mocks)"
        }
    } catch {
        Write-Warning "Redis not found (tests will use mocks)"
    }
}

# Function to show help
function Show-Help {
    Write-Host "Usage: .\run-tests.ps1 [OPTION]" -ForegroundColor $White
    Write-Host ""
    Write-Host "Options:" -ForegroundColor $White
    Write-Host "  unit          Run unit tests only" -ForegroundColor $White
    Write-Host "  simulator     Run device simulator tests only" -ForegroundColor $White
    Write-Host "  integration   Run integration tests only" -ForegroundColor $White
    Write-Host "  all           Run all tests" -ForegroundColor $White
    Write-Host "  coverage      Run tests with coverage report" -ForegroundColor $White
    Write-Host "  script        Run device simulator script (2 hours)" -ForegroundColor $White
    Write-Host "  demo          Run quick demo (5 minutes)" -ForegroundColor $White
    Write-Host "  check         Check system requirements" -ForegroundColor $White
    Write-Host "  help          Show this help message" -ForegroundColor $White
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor $White
    Write-Host "  .\run-tests.ps1 unit       # Run unit tests" -ForegroundColor $White
    Write-Host "  .\run-tests.ps1 demo       # Run quick demo" -ForegroundColor $White
    Write-Host "  .\run-tests.ps1 all        # Run all tests" -ForegroundColor $White
}

# Main script logic
switch ($Command.ToLower()) {
    "unit" {
        Run-UnitTests
    }
    "simulator" {
        Run-SimulatorTests
    }
    "integration" {
        Run-IntegrationTests
    }
    "all" {
        Run-AllTests
    }
    "coverage" {
        Run-CoverageTests
    }
    "script" {
        Run-SimulatorScript
    }
    "demo" {
        Run-QuickDemo
    }
    "check" {
        Check-Requirements
    }
    "help" {
        Show-Help
    }
    default {
        Write-Error "Unknown command: $Command"
        Show-Help
    }
}

Write-Success "Test runner completed!" 