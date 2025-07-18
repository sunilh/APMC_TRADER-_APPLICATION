@echo off
echo Setting up Git push to GitHub...
echo.

REM Configure Git user
git config --global user.name "sunilh"
git config --global user.email "sunilh@example.com"

REM Remove any existing credential helpers
git config --global --unset credential.helper

REM Set credential helper to prompt for password
git config --global credential.helper manager-core

REM Check current remote
echo Current remote configuration:
git remote -v
echo.

REM Ensure correct remote URL
git remote set-url origin https://github.com/sunilh/TRADERAPP.git

REM Verify remote URL
echo Updated remote configuration:
git remote -v
echo.

REM Try to push
echo Attempting to push to GitHub...
echo Username: sunilh
echo Password: [Use your Personal Access Token]
echo.
git push -u origin main

pause