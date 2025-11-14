#!/usr/bin/env bash

# Universal Setup Launcher
# Detects OS and runs the appropriate setup script

set -e

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

echo -e "${BLUE}"
cat << "EOF"
  ____       _            _   _   _      _           _           _    
 / __ \     (_)          | | | | | |    | |         | |         | |   
| |  | |_ __ _  ___ ___ | | | |_| | ___| |_ __   __| | ___  ___| | __
| |  | | '__| |/ __/ _ \| | |  _  |/ _ \ | '_ \ / _` |/ _ \/ __| |/ /
| |__| | |  | | (_| (_) | | | | | |  __/ | |_) | (_| |  __/\__ \   < 
 \____/|_|  |_|\___\___/|_| \_| |_/\___|_| .__/ \__,_|\___||___/_|\_\
                                          | |                         
                                          |_|                         
EOF
echo -e "${NC}"
echo -e "${GREEN}Automated Local Setup${NC}"
echo ""

# Detect OS
OS="unknown"
case "$(uname -s)" in
    Linux*)     OS="Linux";;
    Darwin*)    OS="macOS";;
    CYGWIN*)    OS="Windows";;
    MINGW*)     OS="Windows";;
    MSYS*)      OS="Windows";;
esac

echo "Detected OS: $OS"
echo ""

# Run appropriate script
if [ "$OS" = "Windows" ]; then
    echo "Launching Windows setup script..."
    cmd.exe /c setup-local.bat
elif [ "$OS" = "Linux" ] || [ "$OS" = "macOS" ]; then
    echo "Launching Unix setup script..."
    chmod +x setup-local.sh
    ./setup-local.sh
else
    echo "Unknown operating system. Please run setup-local.sh (Unix) or setup-local.bat (Windows) directly."
    exit 1
fi
