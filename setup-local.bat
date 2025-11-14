@echo off
REM Oricol Helpdesk - Comprehensive Local Setup Automation (Windows)
REM This script automates the complete setup process for running the app locally

setlocal enabledelayedexpansion

:MAIN_MENU
cls
echo ==========================================
echo    Oricol Helpdesk - Local Setup
echo ==========================================
echo.
echo [!] Docker Desktop is FREE for local development
echo     No account, profile, or payment needed!
echo.
echo Choose your setup method:
echo.
echo   1) Docker Compose (Recommended - FREE)
echo      - Complete stack with PostgreSQL, Supabase, and all services
echo      - Production-like environment
echo      - Requires: Docker Desktop (100%% free, no login required)
echo.
echo   2) Local Supabase CLI (FREE)
echo      - Lightweight development setup
echo      - Full Supabase features
echo      - Requires: Docker (for Supabase containers, no login needed)
echo.
echo   3) Native Node.js (No Docker at all)
echo      - Minimal setup
echo      - Uses free cloud Supabase or local PostgreSQL
echo      - Requires: Node.js only (+ optional PostgreSQL)
echo.
echo   4) Check prerequisites only
echo.
echo   5) Exit
echo.

set /p CHOICE="Enter your choice (1-5): "
echo.

if "%CHOICE%"=="1" goto DOCKER_COMPOSE
if "%CHOICE%"=="2" goto LOCAL_SUPABASE
if "%CHOICE%"=="3" goto NATIVE_NODE
if "%CHOICE%"=="4" goto CHECK_PREREQ
if "%CHOICE%"=="5" goto EXIT
goto INVALID_CHOICE

:CHECK_PREREQ
echo.
echo ==========================================
echo   Checking Prerequisites
echo ==========================================
echo.

REM Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] Node.js is not installed
    echo     Install from: https://nodejs.org/
    set HAS_ERRORS=1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo [OK] Node.js !NODE_VERSION! found
    
    REM Check Node version (should be 18+)
    for /f "tokens=1,2 delims=.v" %%a in ("!NODE_VERSION!") do (
        if %%a LSS 18 (
            echo [X] Node.js version 18 or higher is required
            set HAS_ERRORS=1
        )
    )
)

REM Check npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] npm is not installed
    set HAS_ERRORS=1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo [OK] npm !NPM_VERSION! found
)

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] Docker is not installed
    echo     Download FREE from: https://www.docker.com/products/docker-desktop
    echo     NOTE: Docker Desktop is 100%% FREE for local development
    echo           No account, profile, or payment needed!
) else (
    echo [OK] Docker found
    
    REM Check if Docker daemon is running
    docker info >nul 2>nul
    if %ERRORLEVEL% neq 0 (
        echo [!] Docker daemon is not running
        echo     Please start Docker Desktop
        echo     If prompted to login, you can skip it - no account needed!
    ) else (
        echo [OK] Docker daemon is running
    )
)

REM Check Git
where git >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Git is not installed
) else (
    echo [OK] Git found
)

echo.
if defined HAS_ERRORS (
    echo [X] Please install missing prerequisites and try again
    pause
    goto EXIT
)

echo [OK] Prerequisites check complete!
echo.
pause
goto MAIN_MENU

:DOCKER_COMPOSE
cls
echo ==========================================
echo   Docker Compose Setup
echo ==========================================
echo.

REM Check Docker
where docker >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] Docker is not installed
    echo     Download FREE from: https://www.docker.com/products/docker-desktop
    echo     NOTE: Docker Desktop is 100%% FREE - no account needed!
    pause
    goto MAIN_MENU
)

docker info >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [X] Docker daemon is not running
    echo     Please start Docker Desktop and try again
    echo     TIP: If prompted to login, you can skip it!
    pause
    goto MAIN_MENU
)

echo [OK] Docker is ready
echo.

REM Setup environment file
echo Checking environment configuration...
if not exist ".env" (
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo [OK] Created .env
    echo.
    echo [!] IMPORTANT: Please review and update the following in .env:
    echo     - POSTGRES_PASSWORD (use a strong password)
    echo     - JWT_SECRET (at least 32 characters)
    echo     - DASHBOARD_PASSWORD (change default password)
    echo.
    pause
) else (
    echo [OK] .env already exists
)

echo.
echo Starting Docker Compose services...
echo.

set /p DETACHED="Start in background (detached mode)? (Y/n): "
if /i "%DETACHED%"=="n" (
    echo Starting in foreground mode (press Ctrl+C to stop)...
    docker-compose up --build
) else (
    echo Starting in background mode...
    docker-compose up -d --build
    
    echo.
    echo Waiting for services to start...
    timeout /t 10 /nobreak >nul
    
    echo.
    echo Service Status:
    docker-compose ps
    
    echo.
    echo ==========================================
    echo   Setup Complete!
    echo ==========================================
    echo.
    echo Access the application at:
    echo.
    echo   App:              http://localhost:8080
    echo   Supabase Studio:  http://localhost:3000
    echo   API Gateway:      http://localhost:8000
    echo   Mail Server UI:   http://localhost:9000
    echo.
    echo Useful commands:
    echo   View logs:        docker-compose logs -f
    echo   Stop services:    docker-compose down
    echo   Restart:          docker-compose restart
    echo   Check status:     docker-compose ps
    echo.
    pause
)
goto EXIT

:LOCAL_SUPABASE
cls
echo ==========================================
echo   Local Supabase Setup
echo ==========================================
echo.

REM Install dependencies
echo Installing dependencies...
if not exist "node_modules" (
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [X] Failed to install dependencies
        pause
        goto MAIN_MENU
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

echo.
echo Starting Supabase...

REM Check if Supabase is already running
docker ps 2>nul | findstr "supabase" >nul
if %ERRORLEVEL% equ 0 (
    echo [OK] Supabase is already running
) else (
    echo Starting Supabase (this may take a few minutes)...
    call npx supabase start
    if %ERRORLEVEL% neq 0 (
        echo [X] Failed to start Supabase
        echo     Make sure Docker Desktop is running
        pause
        goto MAIN_MENU
    )
)

echo.
echo Creating .env.local configuration...

REM Create .env.local with default local values
(
    echo # Local Supabase Configuration
    echo VITE_SUPABASE_URL=http://localhost:54321
    echo VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
) > .env.local

echo [OK] Created .env.local
echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo Supabase URLs:
echo   API:           http://localhost:54321
echo   Studio:        http://localhost:54323
echo   Inbucket:      http://localhost:54324
echo   PostgreSQL:    postgresql://postgres:postgres@localhost:54322/postgres
echo.
echo To start the development server:
echo   npm run dev
echo.
echo Useful commands:
echo   Stop Supabase:  npx supabase stop
echo   View status:    npx supabase status
echo   View logs:      npx supabase logs -f
echo   Reset DB:       npx supabase db reset
echo.
pause
goto EXIT

:NATIVE_NODE
cls
echo ==========================================
echo   Native Node.js Setup
echo ==========================================
echo.

REM Install dependencies
echo Installing dependencies...
if not exist "node_modules" (
    call npm install
    if %ERRORLEVEL% neq 0 (
        echo [X] Failed to install dependencies
        pause
        goto MAIN_MENU
    )
    echo [OK] Dependencies installed
) else (
    echo [OK] Dependencies already installed
)

echo.
echo Configuring environment...

if exist ".env" (
    echo [OK] Using existing .env configuration
) else (
    echo [!] No .env file found
    echo.
    echo You need to configure your Supabase connection.
    echo Options:
    echo   1. Use cloud Supabase (supabase.com)
    echo   2. Run local PostgreSQL with Docker
    echo   3. Use existing PostgreSQL instance
    echo.
    set /p DB_CHOICE="Enter your choice (1-3): "
    
    if "!DB_CHOICE!"=="1" (
        echo [!] Please create .env with your cloud Supabase credentials
        echo     Copy .env.example to .env and update the values
    ) else if "!DB_CHOICE!"=="2" (
        echo Starting PostgreSQL with Docker...
        docker run --name oricol-db ^
            -e POSTGRES_PASSWORD=postgres ^
            -e POSTGRES_DB=oricol ^
            -p 5432:5432 ^
            -d postgres:15
        
        if %ERRORLEVEL% equ 0 (
            echo [OK] PostgreSQL started
            echo.
            echo Database URL: postgresql://postgres:postgres@localhost:5432/oricol
            echo.
            echo [!] Please create .env with your Supabase credentials
        )
    ) else (
        echo [!] Please create .env manually with your PostgreSQL connection
    )
)

echo.
echo ==========================================
echo   Setup Complete!
echo ==========================================
echo.
echo To start the development server:
echo   npm run dev
echo.
pause
goto EXIT

:INVALID_CHOICE
echo [X] Invalid choice
pause
goto MAIN_MENU

:EXIT
endlocal
exit /b 0
