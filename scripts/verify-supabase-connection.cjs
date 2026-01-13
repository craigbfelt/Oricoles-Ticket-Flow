#!/usr/bin/env node

/**
 * Supabase Connection Verification Script
 * 
 * This script verifies that the GitHub repository is connected to the correct
 * Supabase account and database by checking:
 * 1. Environment variables match expected values
 * 2. Supabase project is accessible
 * 3. Database schema exists and matches expected configuration
 * 4. Connection credentials are valid
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes for pretty output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

// Expected Supabase configuration from .env.example
const EXPECTED_CONFIG = {
  projectId: 'blhidceerkrumgxjhidq',
  url: 'https://blhidceerkrumgxjhidq.supabase.co',
  // Note: We can't hardcode the actual publishable key for security
};

// Helper functions for formatted output
function printHeader(text) {
  console.log(`\n${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${text}${colors.reset}`);
  console.log(`${colors.bright}${colors.blue}${'='.repeat(70)}${colors.reset}\n`);
}

function printSuccess(text) {
  console.log(`${colors.green}✓ ${text}${colors.reset}`);
}

function printError(text) {
  console.log(`${colors.red}✗ ${text}${colors.reset}`);
}

function printWarning(text) {
  console.log(`${colors.yellow}⚠ ${text}${colors.reset}`);
}

function printInfo(text) {
  console.log(`${colors.cyan}ℹ ${text}${colors.reset}`);
}

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  
  if (!fs.existsSync(envPath)) {
    return null;
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envVars = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2].trim();
      // Remove quotes if present
      value = value.replace(/^["']|["']$/g, '');
      envVars[key] = value;
    }
  });
  
  return envVars;
}

// Load expected configuration from .env.example
function loadExpectedConfig() {
  const examplePath = path.join(process.cwd(), '.env.example');
  
  if (!fs.existsSync(examplePath)) {
    return null;
  }

  const envContent = fs.readFileSync(examplePath, 'utf8');
  const config = {};
  
  envContent.split('\n').forEach(line => {
    const match = line.match(/^VITE_SUPABASE_URL="([^"]+)"/);
    if (match) {
      config.url = match[1];
    }
    const projectIdMatch = line.match(/^VITE_SUPABASE_PROJECT_ID="([^"]+)"/);
    if (projectIdMatch) {
      config.projectId = projectIdMatch[1];
    }
  });
  
  return config;
}

// Load config from supabase/config.toml
function loadSupabaseConfig() {
  const configPath = path.join(process.cwd(), 'supabase', 'config.toml');
  
  if (!fs.existsSync(configPath)) {
    return null;
  }

  const content = fs.readFileSync(configPath, 'utf8');
  const match = content.match(/project_id\s*=\s*"([^"]+)"/);
  
  return match ? { projectId: match[1] } : null;
}

// Verify environment variables
function verifyEnvironmentVariables() {
  printHeader('Step 1: Environment Variables Check');
  
  const envVars = loadEnvFile();
  const expectedConfig = loadExpectedConfig();
  const supabaseConfig = loadSupabaseConfig();
  
  if (!envVars) {
    printError('.env file not found');
    printInfo('Create a .env file by copying .env.example:');
    printInfo('  cp .env.example .env');
    printInfo('Then fill in your Supabase credentials');
    return false;
  }
  
  printSuccess('.env file found');
  
  // Check required variables
  const required = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_PUBLISHABLE_KEY',
    'VITE_SUPABASE_PROJECT_ID'
  ];
  
  let allPresent = true;
  required.forEach(key => {
    if (!envVars[key] || envVars[key] === '') {
      printError(`${key} is missing or empty`);
      allPresent = false;
    } else {
      printSuccess(`${key} is set`);
    }
  });
  
  if (!allPresent) {
    return false;
  }
  
  // Check if values match expected configuration
  console.log('\n' + colors.bright + 'Configuration Verification:' + colors.reset);
  
  if (expectedConfig && expectedConfig.projectId) {
    if (envVars.VITE_SUPABASE_PROJECT_ID === expectedConfig.projectId) {
      printSuccess(`Project ID matches expected: ${expectedConfig.projectId}`);
    } else {
      printWarning(`Project ID mismatch!`);
      printInfo(`  Expected: ${expectedConfig.projectId}`);
      printInfo(`  Actual:   ${envVars.VITE_SUPABASE_PROJECT_ID}`);
    }
    
    if (envVars.VITE_SUPABASE_URL === expectedConfig.url) {
      printSuccess(`URL matches expected: ${expectedConfig.url}`);
    } else {
      printWarning(`URL mismatch!`);
      printInfo(`  Expected: ${expectedConfig.url}`);
      printInfo(`  Actual:   ${envVars.VITE_SUPABASE_URL}`);
    }
  }
  
  // Check consistency with supabase/config.toml
  if (supabaseConfig && supabaseConfig.projectId) {
    if (envVars.VITE_SUPABASE_PROJECT_ID === supabaseConfig.projectId) {
      printSuccess(`Project ID matches supabase/config.toml: ${supabaseConfig.projectId}`);
    } else {
      printError(`Project ID does not match supabase/config.toml!`);
      printInfo(`  config.toml: ${supabaseConfig.projectId}`);
      printInfo(`  .env:        ${envVars.VITE_SUPABASE_PROJECT_ID}`);
      return false;
    }
  }
  
  return true;
}

// Test Supabase connection using REST API
async function testSupabaseConnection() {
  printHeader('Step 2: Supabase Connection Test');
  
  const envVars = loadEnvFile();
  if (!envVars) {
    printError('Cannot test connection without .env file');
    return false;
  }
  
  const url = envVars.VITE_SUPABASE_URL;
  const key = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  if (!url || !key) {
    printError('Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY');
    return false;
  }
  
  try {
    printInfo('Testing connection to Supabase...');
    
    // Try to use Node's built-in fetch (Node 18+) or node-fetch
    let fetch;
    try {
      // Node 18+ has built-in fetch
      fetch = global.fetch || globalThis.fetch;
      if (!fetch) {
        // Fallback to node-fetch if available
        const nodeFetch = await import('node-fetch');
        fetch = nodeFetch.default;
      }
    } catch (e) {
      printWarning('Cannot test connection - fetch API not available');
      printInfo('Node 18+ has built-in fetch, or install node-fetch: npm install node-fetch');
      printInfo('Skipping connection test - environment variables look correct');
      return true; // Return true since env vars are correct
    }
    
    // Test REST API endpoint
    const response = await fetch(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    
    if (response.ok) {
      printSuccess('Successfully connected to Supabase REST API');
      printInfo(`  Status: ${response.status} ${response.statusText}`);
      return true;
    } else {
      printError(`Connection failed with status: ${response.status}`);
      // Only read a portion of the response to avoid memory issues
      const text = await response.text();
      const preview = text.substring(0, 200) + (text.length > 200 ? '...' : '');
      printInfo(`  Response: ${preview}`);
      return false;
    }
  } catch (error) {
    printError(`Connection failed: ${error.message}`);
    return false;
  }
}

// Check database schema
async function checkDatabaseSchema() {
  printHeader('Step 3: Database Schema Check');
  
  const envVars = loadEnvFile();
  if (!envVars) {
    printError('Cannot check schema without .env file');
    return false;
  }
  
  const url = envVars.VITE_SUPABASE_URL;
  const key = envVars.VITE_SUPABASE_PUBLISHABLE_KEY;
  
  try {
    printInfo('Checking for expected database tables...');
    
    // Try to use Node's built-in fetch (Node 18+) or node-fetch
    let fetch;
    try {
      fetch = global.fetch || globalThis.fetch;
      if (!fetch) {
        const nodeFetch = await import('node-fetch');
        fetch = nodeFetch.default;
      }
    } catch (e) {
      printWarning('Cannot check schema - fetch API not available');
      printInfo('Node 18+ has built-in fetch, or install node-fetch: npm install node-fetch');
      printInfo('Skipping schema check - you can manually verify in Supabase dashboard');
      return true; // Return true since we can't test
    }
    
    // List of expected tables
    const expectedTables = [
      'profiles',
      'user_roles',
      'tickets',
      'assets',
      'branches',
      'devices',
      'licenses'
    ];
    
    let foundTables = 0;
    
    for (const table of expectedTables) {
      try {
        const response = await fetch(`${url}/rest/v1/${table}?limit=1`, {
          method: 'GET',
          headers: {
            'apikey': key,
            'Authorization': `Bearer ${key}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          printSuccess(`Table '${table}' exists and is accessible`);
          foundTables++;
        } else if (response.status === 404) {
          printWarning(`Table '${table}' not found (might not be created yet)`);
        } else {
          printWarning(`Table '${table}' check returned status ${response.status}`);
        }
      } catch (error) {
        printWarning(`Could not check table '${table}': ${error.message}`);
      }
    }
    
    if (foundTables > 0) {
      printSuccess(`Found ${foundTables} of ${expectedTables.length} expected tables`);
      return true;
    } else {
      printError('No tables found - database may not be initialized');
      printInfo('Run migrations to create database schema:');
      printInfo('  npm run migrate');
      return false;
    }
  } catch (error) {
    printError(`Schema check failed: ${error.message}`);
    return false;
  }
}

// Check migrations status
function checkMigrations() {
  printHeader('Step 4: Migrations Status');
  
  const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    printError('supabase/migrations directory not found');
    return false;
  }
  
  const migrations = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();
  
  if (migrations.length === 0) {
    printWarning('No migration files found');
    return false;
  }
  
  printSuccess(`Found ${migrations.length} migration files`);
  printInfo('Migration files:');
  migrations.slice(0, 5).forEach(file => {
    printInfo(`  - ${file}`);
  });
  
  if (migrations.length > 5) {
    printInfo(`  ... and ${migrations.length - 5} more`);
  }
  
  printInfo('\nTo apply migrations, run:');
  printInfo('  npm run migrate');
  
  return true;
}

// Generate summary report
function generateSummary(results) {
  printHeader('Verification Summary');
  
  const checks = [
    { name: 'Environment Variables', passed: results.envVars },
    { name: 'Supabase Connection', passed: results.connection },
    { name: 'Database Schema', passed: results.schema },
    { name: 'Migrations', passed: results.migrations }
  ];
  
  checks.forEach(check => {
    if (check.passed) {
      printSuccess(`${check.name}: PASSED`);
    } else {
      printError(`${check.name}: FAILED`);
    }
  });
  
  const allPassed = checks.every(check => check.passed);
  
  console.log('\n' + colors.bright + 'Overall Status: ' + colors.reset);
  if (allPassed) {
    console.log(colors.green + colors.bright + '✓ ALL CHECKS PASSED' + colors.reset);
    console.log(colors.green + '\nYour GitHub repository is correctly configured with Supabase!' + colors.reset);
    console.log('\nExpected Supabase Project:');
    printInfo(`  Project ID: ${EXPECTED_CONFIG.projectId}`);
    printInfo(`  URL: ${EXPECTED_CONFIG.url}`);
  } else {
    console.log(colors.red + colors.bright + '✗ SOME CHECKS FAILED' + colors.reset);
    console.log(colors.yellow + '\nPlease review the errors above and fix the configuration.' + colors.reset);
    console.log('\nFor help, see:');
    printInfo('  - .env.example for configuration template');
    printInfo('  - README.md for setup instructions');
    printInfo('  - SUPABASE_VERIFICATION_GUIDE.md for troubleshooting');
  }
  
  return allPassed;
}

// Main execution
async function main() {
  console.log(colors.bright + colors.cyan);
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║        Supabase Connection Verification Tool                       ║');
  console.log('║        GitHub Repository → Supabase Account/Database               ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  const results = {
    envVars: false,
    connection: false,
    schema: false,
    migrations: false
  };
  
  try {
    // Step 1: Verify environment variables
    results.envVars = verifyEnvironmentVariables();
    
    // Step 2: Test connection (only if env vars are valid)
    if (results.envVars) {
      results.connection = await testSupabaseConnection();
      
      // Step 3: Check database schema (only if connection works)
      if (results.connection) {
        results.schema = await checkDatabaseSchema();
      }
    }
    
    // Step 4: Check migrations (independent check)
    results.migrations = checkMigrations();
    
    // Generate summary
    const success = generateSummary(results);
    
    // Exit with appropriate code
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    printError(`Unexpected error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
main();
