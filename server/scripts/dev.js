#!/usr/bin/env node

/**
 * Development startup script for the chess game server
 * This script provides additional development features like:
 * - Environment validation
 * - Dependency checking
 * - Development server startup with enhanced logging
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ES6 module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkEnvironment() {
  log('🔍 Checking environment...', 'cyan');
  
  // Check if .env file exists
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) {
    log('⚠️  .env file not found. Creating default .env file...', 'yellow');
    
    const defaultEnv = `PORT=3001
CLIENT_URL=http://localhost:5173
NODE_ENV=development`;
    
    fs.writeFileSync(envPath, defaultEnv);
    log('✅ Default .env file created', 'green');
  }
  
  // Load environment variables
  const dotenv = await import('dotenv');
  dotenv.config({ path: envPath });
  
  // Validate required environment variables
  const required = ['PORT'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    log(`❌ Missing required environment variables: ${missing.join(', ')}`, 'red');
    process.exit(1);
  }
  
  log('✅ Environment configuration valid', 'green');
}

function checkDependencies() {
  log('📦 Checking dependencies...', 'cyan');
  
  const packagePath = path.join(__dirname, '..', 'package.json');
  if (!fs.existsSync(packagePath)) {
    log('❌ package.json not found', 'red');
    process.exit(1);
  }
  
  const nodeModulesPath = path.join(__dirname, '..', 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    log('❌ node_modules not found. Please run: npm install', 'red');
    process.exit(1);
  }
  
  log('✅ Dependencies check passed', 'green');
}

function displayServerInfo() {
  log('\n🚀 Starting Chess Game Server', 'bright');
  log('================================', 'bright');
  log(`📍 Port: ${process.env.PORT}`, 'blue');
  log(`🌐 Client URL: ${process.env.CLIENT_URL}`, 'blue');
  log(`🔧 Environment: ${process.env.NODE_ENV}`, 'blue');
  log(`💾 Storage: In-Memory`, 'blue');
  log('================================\n', 'bright');
}

async function startServer() {
  log('🎯 Starting server...', 'cyan');

  // Start the main server
  await import('../server.js');
}

// Main execution
async function main() {
  try {
    await checkEnvironment();
    checkDependencies();
    displayServerInfo();
    await startServer();
  } catch (error) {
    log(`❌ Startup failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  log(`❌ Uncaught Exception: ${error.message}`, 'red');
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  log(`❌ Unhandled Rejection at: ${promise}, reason: ${reason}`, 'red');
  process.exit(1);
});

// Run the script
if (require.main === module) {
  main();
}

export { main };
