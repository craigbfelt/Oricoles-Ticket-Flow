@echo off
REM Oricol Helpdesk - Quick Start Script for Local Development (Windows)
REM This script helps you get the app running locally quickly

setlocal enabledelayedexpansion

echo ==========================================
echo 🎫 Oricol Helpdesk - Quick Start
echo ==========================================
echo.

REM Check if Node.js is installed
echo ▶ Checking prerequisites...
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ✗ Node.js is not installed
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✓ Node.js %NODE_VERSION% found

REM Check if npm is installed
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ✗ npm is not installed
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✓ npm %NPM_VERSION% found

REM Check if Docker is installed
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ⚠ Docker is not installed
    echo Docker is required for local Supabase. Please install from: https://www.docker.com/products/docker-desktop
    echo.
    set /p CONTINUE="Continue without Docker? (y/N): "
    if /i not "!CONTINUE!"=="y" (
        exit /b 1
    )
)

echo.
echo ▶ Installing dependencies...
if not exist "node_modules" (
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo ✗ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✓ Dependencies installed
) else (
    echo ✓ Dependencies already installed
)

echo.
echo ▶ Checking Supabase configuration...

REM Check if .env.local exists
if exist ".env.local" (
    echo ✓ Local environment file (.env.local) exists
    echo.
    echo Using existing .env.local configuration
) else (
    echo ⚠ No .env.local file found
    echo.
    echo Choose your setup option:
    echo   1) Use local Supabase (recommended for development)
    echo   2) Use cloud Supabase (existing .env configuration)
    echo.
    set /p CHOICE="Enter your choice (1 or 2): "
    
    if "!CHOICE!"=="1" (
        echo ▶ Setting up local Supabase...
        
        REM Check if Supabase is already running
        docker ps 2>nul | findstr "supabase" >nul
        if %ERRORLEVEL% equ 0 (
            echo ✓ Supabase is already running
        ) else (
            echo Starting Supabase (this may take a few minutes on first run)...
            call npx supabase start
            if %ERRORLEVEL% neq 0 (
                echo ✗ Failed to start Supabase
                echo Make sure Docker Desktop is running
                pause
                exit /b 1
            )
        )
        
        REM Get the anon key from Supabase status
        echo.
        echo ▶ Getting Supabase credentials...
        
        REM Create .env.local with default local values
        (
            echo VITE_SUPABASE_URL=http://localhost:54321
            echo VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
        ) > .env.local
        
        echo ✓ Created .env.local with local Supabase configuration
        
        echo.
        echo ==========================================
        echo Supabase URLs:
        echo   API: http://localhost:54321
        echo   Studio: http://localhost:54323
        echo   Inbucket (emails): http://localhost:54324
        echo ==========================================
        
    ) else (
        echo ✓ Using cloud Supabase from .env file
    )
)

echo.
echo ▶ Starting development server...
echo.
echo ==========================================
echo 🚀 Application will be available at:
echo    http://localhost:8080
echo ==========================================
echo.
echo Useful URLs:
echo   📱 App:              http://localhost:8080

REM Check if using local Supabase
if exist ".env.local" (
    findstr "localhost:54321" .env.local >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo   🎨 Supabase Studio:  http://localhost:54323
        echo   📧 Email Testing:    http://localhost:54324
    )
)

echo.
echo Press Ctrl+C to stop the server
echo ==========================================
echo.

REM Start the development server
call npm run dev
