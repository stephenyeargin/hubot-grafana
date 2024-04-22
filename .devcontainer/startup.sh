#!/bin/sh

# trust the repo
# fixes:
# - fatal: detected dubious ownership in repository at '/workspaces/bot-zero'.
git config --global --add safe.directory "$PWD"

# install NPM packages
echo ""
echo "Installing packages..."
npm install --no-audit --no-fund
