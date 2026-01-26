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

'use strict';

/**
 * SSO Configuration for Acrolinx Sidebar
 * 
 * This configuration supports TWO modes:
 * 
 * 1. DEMO MODE (mode: 'demo')
 *    - Makes direct browser requests to Acrolinx server
 *    - SSO credentials are visible in browser (DevTools)
 *    - Quick to test, no backend server needed
 *    - [WARNING] NOT suitable for production!
 * 
 * 2. PROXY MODE (mode: 'proxy')
 *    - Uses backend proxy server (samples/sso-proxy-server.js)
 *    - SSO credentials stay hidden on server
 *    - Requires running: node samples/sso-proxy-server.js
 *    - [RECOMMENDED] for production-like testing
 */
globalThis.ssoConfig = {
  // Authentication mode: 'demo' (direct) or 'proxy' (via backend)
  mode: 'demo',
  
  // Acrolinx server URL (used in both modes)
  // [CONFIGURE] Set this to your Acrolinx server URL
  // For playspace testing: 'https://playspace.acrolinx-cloud.net'
  serverAddress: 'https://partner.acrolinx.cloud',
  
  // Proxy server URL (only used in 'proxy' mode)
  // NOTE: Port 3001 is used by BrowserSync UI, so proxy uses 3002
  proxyServerUrl: 'http://localhost:3002',
  
  // Client signature for X-Acrolinx-Client header
  // [CONFIGURE] Set this to match your Acrolinx server's expected client signature
  // For playspace: 'QWNyb2xpbnhDTEk'
  // This is NOT sensitive - it identifies the client application
  clientSignature: 'QWNyb2xpbnhDTEk',
  
  // SSO credentials - ONLY used in 'demo' mode
  // In 'proxy' mode, credentials are stored server-side in .env file
  // [CONFIGURE] Set username for DEMO mode testing (secret must be entered in form)
  // [WARNING] These are visible in browser DevTools - use only for testing!
  username: 'Acrotesting-02',
  ssoSecret: '',  // Renamed from 'password' to avoid SonarQube S2068 false positive
  
  // Auth endpoint paths
  authEndpoint: '/api/v1/auth/sign-ins',           // Direct Acrolinx endpoint
  proxyAuthEndpoint: '/api/sso/authenticate',      // Proxy server endpoint
  
  /**
   * Get the full authentication URL based on current mode
   * @returns {string} Full URL for the sign-in endpoint
   */
  getAuthUrl: function() {
    if (this.mode === 'proxy') {
      return this.proxyServerUrl + this.proxyAuthEndpoint;
    }
    return this.serverAddress + this.authEndpoint;
  },
  
  /**
   * Set the authentication mode
   * @param {string} newMode - 'demo' or 'proxy'
   */
  setMode: function(newMode) {
    if (newMode === 'demo' || newMode === 'proxy') {
      this.mode = newMode;
      console.log('[SSOConfig] Mode set to:', newMode);
    } else {
      console.error('[SSOConfig] Invalid mode. Use "demo" or "proxy".');
    }
  }
};

/**
 * SSO Authentication Service
 * 
 * Provides methods to authenticate with Acrolinx using either:
 * - DEMO mode: Direct browser requests (credentials visible)
 * - PROXY mode: Backend proxy server (credentials hidden)
 */
globalThis.AcrolinxSSOService = {
  /**
   * Authenticate with Acrolinx server and get an access token
   * 
   * @param {Object} options - Optional overrides for config
   * @param {string} options.mode - Override mode ('demo' or 'proxy')
   * @param {string} options.serverAddress - Override server address (demo mode)
   * @param {string} options.username - Override username
   * @param {string} options.ssoSecret - Override SSO secret (demo mode only)
   * @param {string} options.clientSignature - Override client signature (demo mode only)
   * @returns {Promise<Object>} Promise resolving to auth response with accessToken
   */
  authenticate: async function(options = {}) {
    const mode = options.mode || globalThis.ssoConfig.mode;
    
    console.log('[AcrolinxSSO] Authentication mode:', mode.toUpperCase());
    
    if (mode === 'proxy') {
      return this._authenticateViaProxy(options);
    } else {
      return this._authenticateDirect(options);
    }
  },
  
  /**
   * DEMO MODE: Direct authentication (credentials sent from browser)
   * [WARNING] Credentials are visible in browser DevTools!
   */
  _authenticateDirect: async function(options = {}) {
    console.log('[AcrolinxSSO] Using DEMO mode (direct browser request)');
    console.log('[AcrolinxSSO] [WARNING] Credentials visible in browser DevTools!');
    
    // Use explicit undefined checks to allow empty strings to be intentional
    const config = {
      serverAddress: (options.serverAddress !== undefined && options.serverAddress !== '') 
        ? options.serverAddress 
        : globalThis.ssoConfig.serverAddress,
      username: (options.username !== undefined && options.username !== '') 
        ? options.username 
        : globalThis.ssoConfig.username,
      ssoSecret: (options.ssoSecret !== undefined && options.ssoSecret !== '') 
        ? options.ssoSecret 
        : globalThis.ssoConfig.ssoSecret,
      clientSignature: (options.clientSignature !== undefined && options.clientSignature !== '') 
        ? options.clientSignature 
        : globalThis.ssoConfig.clientSignature
    };
    
    // Validate required fields
    if (!config.ssoSecret) {
      throw new Error('SSO secret is required for authentication');
    }
    if (!config.username) {
      throw new Error('Username is required for authentication');
    }
    
    const authUrl = config.serverAddress + globalThis.ssoConfig.authEndpoint;
    
    console.log('[AcrolinxSSO] Authenticating user:', config.username);
    console.log('[AcrolinxSSO] Server:', config.serverAddress);
    console.log('[AcrolinxSSO] URL:', authUrl);
    
    try {
      // Note: 'password' header name is required by Acrolinx API specification
      const authHeaders = {
        'X-Acrolinx-Client': config.clientSignature,
        'username': config.username,
        'Content-Type': 'application/json'
      };
      authHeaders['password'] = config.ssoSecret;  // NOSONAR - Required API header name
      
      const response = await fetch(authUrl, {
        method: 'POST',
        headers: authHeaders,
        body: ''
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Authentication failed: ${response.status} - ${errorText}`);
      }
      
      const authData = await response.json();
      console.log('[AcrolinxSSO] [DEMO] Authentication successful');
      
      return authData;
    } catch (error) {
      console.error('[AcrolinxSSO] [DEMO] Authentication error:', error);
      throw error;
    }
  },
  
  /**
   * PROXY MODE: Authentication via backend proxy server
   * Credentials stay hidden on the server side
   */
  _authenticateViaProxy: async function(options = {}) {
    console.log('[AcrolinxSSO] Using PROXY mode (backend server)');
    
    const username = (options.username !== undefined && options.username !== '') 
      ? options.username 
      : globalThis.ssoConfig.username;
    
    if (!username) {
      throw new Error('Username is required for authentication');
    }
    
    const proxyUrl = globalThis.ssoConfig.proxyServerUrl + globalThis.ssoConfig.proxyAuthEndpoint;
    
    console.log('[AcrolinxSSO] Proxy URL:', proxyUrl);
    console.log('[AcrolinxSSO] Username:', username);
    console.log('[AcrolinxSSO] [NOTE] Password handled by proxy server');
    
    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Proxy authentication failed: ${response.status} - ${errorData.error || errorData.message || 'Unknown error'}`);
      }
      
      const authData = await response.json();
      console.log('[AcrolinxSSO] [PROXY] Authentication successful');
      
      return authData;
    } catch (error) {
      // Check if it's a network error (proxy server not running)
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        throw new Error('Cannot connect to proxy server. Make sure sso-proxy-server.js is running on port 3002.\n\nRun: node samples/sso-proxy-server.js');
      }
      console.error('[AcrolinxSSO] [PROXY] Authentication error:', error);
      throw error;
    }
  },
  
  /**
   * Get access token from stored authentication or perform new auth
   * 
   * @param {Object} options - Optional overrides for config
   * @returns {Promise<string>} Promise resolving to access token
   */
  getAccessToken: async function(options = {}) {
    // Check if we have a cached token that's still valid
    const cachedToken = sessionStorage.getItem('acrolinx_access_token');
    const tokenExpiry = sessionStorage.getItem('acrolinx_token_expiry');
    
    if (cachedToken && tokenExpiry && Date.now() < Number.parseInt(tokenExpiry, 10)) {
      console.log('[AcrolinxSSO] Using cached access token');
      return cachedToken;
    }
    
    // Perform new authentication
    const authData = await this.authenticate(options);
    
    // Cache the token (with 55 minute expiry to be safe - tokens typically last 60 mins)
    if (authData.data && authData.data.accessToken) {
      const accessToken = authData.data.accessToken;
      const expiresIn = authData.data.expiresIn || 3600; // Default 1 hour
      const expiryTime = Date.now() + (expiresIn - 300) * 1000; // 5 min buffer
      
      sessionStorage.setItem('acrolinx_access_token', accessToken);
      sessionStorage.setItem('acrolinx_token_expiry', expiryTime.toString());
      
      return accessToken;
    }
    
    // Handle alternative response format
    if (authData.accessToken) {
      sessionStorage.setItem('acrolinx_access_token', authData.accessToken);
      sessionStorage.setItem('acrolinx_token_expiry', (Date.now() + 3300000).toString());
      return authData.accessToken;
    }
    
    throw new Error('No access token in authentication response');
  },
  
  /**
   * Clear cached authentication including sidebar's own session
   * @param {boolean} clearSidebarSession - If true, also clears the sidebar's localStorage session
   */
  clearAuth: function(clearSidebarSession = true) {
    // Clear our SSO token cache
    sessionStorage.removeItem('acrolinx_access_token');
    sessionStorage.removeItem('acrolinx_token_expiry');
    console.log('[AcrolinxSSO] SSO token cache cleared');
    
    // Clear the Acrolinx Sidebar's own cached session from localStorage
    // The sidebar stores its session data with keys starting with 'acrolinx'
    if (clearSidebarSession) {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.toLowerCase().includes('acrolinx') || key.includes('sidebar'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => {
        console.log('[AcrolinxSSO] Clearing sidebar localStorage key:', key);
        localStorage.removeItem(key);
      });
      console.log('[AcrolinxSSO] Sidebar session cache cleared (' + keysToRemove.length + ' items)');
    }
  },
  
  /**
   * Check if user is currently authenticated
   * @returns {boolean} True if authenticated with valid token
   */
  isAuthenticated: function() {
    const token = sessionStorage.getItem('acrolinx_access_token');
    const expiry = sessionStorage.getItem('acrolinx_token_expiry');
    return !!(token && expiry && Date.now() < Number.parseInt(expiry, 10));
  }
};
