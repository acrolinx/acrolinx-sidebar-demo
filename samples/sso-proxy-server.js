/*
 *
 * * Copyright 2015-present Acrolinx GmbH
 * *
 * * Licensed under the Apache License, Version 2.0 (the "License");
 * * you may not use this file except in compliance with the License.
 * * You may obtain a copy of the License at
 * *
 * * http://www.apache.org/licenses/LICENSE-2.0
 * *
 * * Unless required by applicable law or agreed to in writing, software
 * * distributed under the License is distributed on an "AS IS" BASIS,
 * * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * * See the License for the specific language governing permissions and
 * * limitations under the License.
 * *
 * * For more information visit: https://www.acrolinx.com
 *
 */

/**
 * Acrolinx SSO Proxy Server
 * 
 * This is a simple Node.js server that acts as a reverse proxy for
 * SSO authentication with Acrolinx. It handles the authentication
 * request securely on the server side, keeping the SSO_SECRET hidden
 * from client-side code.
 * 
 * [RECOMMENDED] For production use:
 * - Use environment variables for all credentials
 * - Implement proper CORS restrictions
 * - Add rate limiting
 * - Use HTTPS
 * - Implement proper logging
 * - Add request validation
 * 
 * Usage:
 *   1. Set environment variables (or use .env file with dotenv):
 *      - ACROLINX_SERVER_URL
 *      - ACROLINX_SSO_USERNAME
 *      - ACROLINX_SSO_PASSWORD
 *      - ACROLINX_CLIENT_SIGNATURE
 *      - LOG_LEVEL (optional: DEBUG, INFO, WARN, ERROR - default: INFO)
 *   2. Run: node samples/sso-proxy-server.js
 *   3. Server will listen on port 3002 by default
 * 
 * Log Levels:
 *   - DEBUG: Verbose output including request/response details
 *   - INFO:  Standard operational messages (default)
 *   - WARN:  Warning messages
 *   - ERROR: Error messages only
 */

'use strict';

const http = require('http');
const https = require('https');
const url = require('url');

// Load environment variables from .env file if available
try {
  require('dotenv').config();
} catch {
  // dotenv not available, will use environment variables directly
}

// =============================================================================
// LOGGING SYSTEM
// =============================================================================

/**
 * Log levels with numeric priority (lower = more verbose)
 */
const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Get current log level from environment
 */
const currentLogLevel = LOG_LEVELS[process.env.LOG_LEVEL?.toUpperCase()] ?? LOG_LEVELS.INFO;

/**
 * Logger utility with configurable log levels
 */
const logger = {
  /**
   * Format timestamp for log output
   */
  _timestamp() {
    return new Date().toISOString();
  },

  /**
   * Check if a log level should be output
   */
  _shouldLog(level) {
    return LOG_LEVELS[level] >= currentLogLevel;
  },

  /**
   * Format and output a log message
   */
  _log(level, color, ...args) {
    if (!this._shouldLog(level)) return;
    
    const timestamp = `${COLORS.dim}[${this._timestamp()}]${COLORS.reset}`;
    const levelTag = `${color}[${level}]${COLORS.reset}`;
    console.log(timestamp, levelTag, ...args);
  },

  /**
   * DEBUG level - verbose details for troubleshooting
   */
  debug(...args) {
    this._log('DEBUG', COLORS.cyan, ...args);
  },

  /**
   * INFO level - standard operational messages
   */
  info(...args) {
    this._log('INFO', COLORS.green, ...args);
  },

  /**
   * WARN level - warning messages
   */
  warn(...args) {
    this._log('WARN', COLORS.yellow, ...args);
  },

  /**
   * ERROR level - error messages
   */
  error(...args) {
    this._log('ERROR', COLORS.red, ...args);
  },

  /**
   * SUCCESS - special info-level message for successful operations
   */
  success(...args) {
    if (!this._shouldLog('INFO')) return;
    const timestamp = `${COLORS.dim}[${this._timestamp()}]${COLORS.reset}`;
    const levelTag = `${COLORS.green}[SUCCESS]${COLORS.reset}`;
    console.log(timestamp, levelTag, ...args);
  },

  /**
   * Raw output without formatting (for banners, etc.)
   */
  raw(...args) {
    console.log(...args);
  }
};

// =============================================================================
// CONFIGURATION
// =============================================================================

// =============================================================================
// CONFIGURATION
// =============================================================================
// NOTE: Port 3001 is used by BrowserSync UI when running `npm start`
// So we use 3002 as the default for the proxy server
//
// [SECURITY] Sensitive values MUST be set via environment variables or .env file
// See .env.example for required variables

// Validate required environment variables
const requiredEnvVars = ['ACROLINX_SERVER_URL', 'ACROLINX_SSO_PASSWORD'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('\x1b[31m[ERROR] Missing required environment variables:\x1b[0m');
  missingEnvVars.forEach(varName => console.error(`  - ${varName}`));
  console.error('\nCreate a .env file based on .env.example or set these variables in your environment.');
  console.error('See SSO_AUTHENTICATION.md for setup instructions.\n');
  process.exit(1);
}

const config = {
  port: process.env.SSO_PROXY_PORT || 3002,
  acrolinxServer: process.env.ACROLINX_SERVER_URL,                              // Required
  ssoUsername: process.env.ACROLINX_SSO_USERNAME || 'default-user',             // Optional with generic default
  ssoPassword: process.env.ACROLINX_SSO_PASSWORD,                               // Required - no default!
  clientSignature: process.env.ACROLINX_CLIENT_SIGNATURE || '',                 // Optional - JWT or base64 client ID
  allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(o => o.trim()),
  logLevel: process.env.LOG_LEVEL || 'INFO'
};

/**
 * Make an HTTPS request to the Acrolinx server
 * @param {Object} options - Request options
 * @param {string} body - Request body
 * @returns {Promise<Object>} Response data
 */
function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ statusCode: res.statusCode, headers: res.headers, data: jsonData });
        } catch {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (body) {
      req.write(body);
    }
    
    req.end();
  });
}

/**
 * Handle SSO authentication request
 * @param {http.IncomingMessage} req - Incoming request
 * @param {http.ServerResponse} res - Server response
 */
async function handleAuth(req, res) {
  logger.info('SSO Auth request received');
  logger.debug('Request method:', req.method);
  logger.debug('Request URL:', req.url);
  logger.debug('Request headers:', JSON.stringify(req.headers, null, 2));
  
  // Parse request body if any
  let requestBody = '';
  req.on('data', (chunk) => {
    requestBody += chunk;
  });
  
  req.on('end', async () => {
    try {
      // Parse optional override parameters from request
      let overrides = {};
      if (requestBody) {
        logger.debug('Request body:', requestBody);
        try {
          overrides = JSON.parse(requestBody);
        } catch {
          logger.warn('Failed to parse request body as JSON, using defaults');
        }
      }
      
      // Use URL params for username if provided
      const parsedUrl = url.parse(req.url, true);
      const username = parsedUrl.query.username || overrides.username || config.ssoUsername;
      
      // Construct Acrolinx auth URL
      const acrolinxUrl = new URL('/api/v1/auth/sign-ins', config.acrolinxServer);
      
      const options = {
        hostname: acrolinxUrl.hostname,
        port: 443,
        path: acrolinxUrl.pathname,
        method: 'POST',
        headers: {
          'X-Acrolinx-Client': config.clientSignature,
          'username': username,
          'password': config.ssoPassword,
          'Content-Type': 'application/json',
          'Content-Length': 0
        }
      };
      
      logger.info(`Authenticating user: ${username}`);
      logger.debug(`Target server: ${config.acrolinxServer}`);
      logger.debug('Request options:', JSON.stringify({ ...options, headers: { ...options.headers, password: '***REDACTED***' } }, null, 2));
      
      const response = await makeRequest(options, '');
      
      logger.debug('Response status:', response.statusCode);
      logger.debug('Response headers:', JSON.stringify(response.headers, null, 2));
      
      if (response.statusCode === 200 || response.statusCode === 201) {
        logger.success(`Authentication successful for user: ${username}`);
        logger.debug('Response data:', JSON.stringify(response.data, null, 2));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(response.data));
      } else {
        logger.error(`Authentication failed: ${response.statusCode}`);
        logger.debug('Error response:', JSON.stringify(response.data, null, 2));
        res.writeHead(response.statusCode, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          error: 'Authentication failed',
          statusCode: response.statusCode,
          details: response.data
        }));
      }
    } catch (error) {
      logger.error('Server error:', error.message);
      logger.debug('Error stack:', error.stack);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error', message: error.message }));
    }
  });
}

/**
 * Handle CORS preflight requests
 * @param {http.IncomingMessage} req - Incoming request
 * @param {http.ServerResponse} res - Server response
 */
function handleCors(req, res) {
  const origin = req.headers.origin;
  
  logger.debug('CORS check - Origin:', origin);
  logger.debug('CORS check - Allowed origins:', config.allowedOrigins);
  
  // Check if origin is allowed
  if (config.allowedOrigins.includes(origin) || config.allowedOrigins.includes('*')) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
    logger.debug('CORS allowed for origin:', origin);
  } else if (origin) {
    logger.warn('CORS blocked for origin:', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Acrolinx-Client');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Main request handler
 */
const server = http.createServer(async (req, res) => {
  logger.debug(`Incoming request: ${req.method} ${req.url}`);
  
  // Handle CORS
  handleCors(req, res);
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    logger.debug('Handling CORS preflight request');
    res.writeHead(204);
    res.end();
    return;
  }
  
  const parsedUrl = url.parse(req.url, true);
  
  // Route handlers
  if (parsedUrl.pathname === '/api/sso/authenticate' && req.method === 'POST') {
    await handleAuth(req, res);
  } else if (parsedUrl.pathname === '/api/sso/status' && req.method === 'GET') {
    // Health check and config endpoint (returns non-sensitive config for client pre-fill)
    logger.debug('Status/config request');
    
    // Add CORS headers for browser access
    const origin = req.headers.origin;
    if (origin && config.allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      server: config.acrolinxServer,           // Acrolinx server URL
      defaultUsername: config.ssoUsername,      // Default username (not sensitive)
      clientSignature: config.clientSignature,  // Client signature (not sensitive)
      logLevel: config.logLevel,
      timestamp: new Date().toISOString()
    }));
  } else if (parsedUrl.pathname === '/' && req.method === 'GET') {
    // Root endpoint with usage info
    logger.debug('Root endpoint request');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      name: 'Acrolinx SSO Proxy Server',
      version: '1.0.0',
      logLevel: config.logLevel,
      endpoints: {
        'POST /api/sso/authenticate': 'Authenticate with Acrolinx and get access token',
        'GET /api/sso/status': 'Check server status'
      },
      usage: {
        authenticate: {
          method: 'POST',
          url: '/api/sso/authenticate',
          query: {
            username: '(optional) Override the default username'
          },
          body: '(optional) JSON with username override',
          response: {
            accessToken: 'The access token to use with Acrolinx Sidebar'
          }
        }
      }
    }));
  } else {
    logger.warn(`404 Not found: ${req.method} ${parsedUrl.pathname}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  }
});

// Start server
server.listen(config.port, () => {
  const separator = '='.repeat(60);
  logger.raw(separator);
  logger.raw(`${COLORS.cyan}Acrolinx SSO Proxy Server${COLORS.reset}`);
  logger.raw(separator);
  logger.raw(`Server running at: ${COLORS.green}http://localhost:${config.port}${COLORS.reset}`);
  logger.raw(`Acrolinx Server:   ${config.acrolinxServer}`);
  logger.raw(`Default Username:  ${config.ssoUsername}`);
  logger.raw(`Allowed Origins:   ${config.allowedOrigins.join(', ')}`);
  logger.raw(`Log Level:         ${COLORS.yellow}${config.logLevel}${COLORS.reset}`);
  logger.raw(separator);
  logger.raw('Endpoints:');
  logger.raw(`  POST http://localhost:${config.port}/api/sso/authenticate`);
  logger.raw(`  GET  http://localhost:${config.port}/api/sso/status`);
  logger.raw(separator);
  logger.raw(`${COLORS.dim}Tip: Set LOG_LEVEL=DEBUG for verbose output${COLORS.reset}`);
  logger.raw(separator);
});
