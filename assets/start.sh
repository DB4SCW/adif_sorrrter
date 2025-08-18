#!/bin/bash

#Switch to the script's directory (in case user runs from elsewhere)
cd "$(dirname "$0")"

APP_NAME="adif_sorrrter"

# Suppress Electron security warnings
export ELECTRON_DISABLE_SECURITY_WARNINGS=true

# Ensure app binary is executable
chmod +x "$APP_NAME"

# Start the app
./"$APP_NAME"
