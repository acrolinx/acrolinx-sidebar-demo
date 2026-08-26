# Full API Proxy Troubleshooting Case Study

> **Related Documentation:** [SSO Authentication Guide](SSO_AUTHENTICATION.md) - See "Architecture Option 2: Full API Proxy"

This document serves as a troubleshooting guide and case study for organizations implementing a **Full API Proxy** architecture with the Acrolinx Sidebar. If you're experiencing issues where checks "almost complete but fail," this guide will help diagnose the problem.

---

## Table of Contents

- [Overview](#overview)
- [Common Symptom: "Reconnecting" Then Failing](#common-symptom-reconnecting-then-failing)
- [Architecture Comparison](#architecture-comparison)
- [Root Causes and Solutions](#root-causes-and-solutions)
- [Diagnostic Checklist](#diagnostic-checklist)
- [Working Check Flow Reference](#working-check-flow-reference)
- [Real-World Case Study](#real-world-case-study)

---

## Overview

### What is a Full API Proxy?

A **Full API Proxy** architecture routes ALL Acrolinx API traffic through your backend server, not just SSO authentication. While this may be required for security/compliance reasons, it introduces complexity that can break the sidebar if not implemented correctly.

```
┌─────────────────┐    ALL API calls       ┌─────────────────┐
│                 │ ─────────────────────► │                 │
│  Browser/       │                        │  Your Proxy     │
│  Sidebar        │ ◄───────────────────── │  Server         │
│                 │                        │                 │
└─────────────────┘                        └────────┬────────┘
                                                    │
                                                    │ Forwards to
                                                    ▼
                                           ┌─────────────────┐
                                           │                 │
                                           │  Acrolinx       │
                                           │  Platform       │
                                           │                 │
                                           └─────────────────┘
```

### Why This Architecture is Challenging

Unlike the recommended **SSO-Only Proxy** approach, a Full API Proxy must:

- Forward **all** request headers correctly
- Return **all** response headers unchanged (especially `Link` headers)
- Preserve the **exact** JSON response body structure
- Handle **polling** requests efficiently
- Support appropriate **timeouts** for check completion
- Maintain **CORS** headers correctly

**If any of these requirements are not met, the sidebar will fail.**

---

## Common Symptom: "Reconnecting" Then Failing

### What Users See

- Check appears to start normally
- Progress indicator may show some movement
- Sidebar suddenly shows "reconnecting" message
- Results never appear
- Sidebar may "vanish" or reset

### What This Means

The sidebar successfully:
1. Submitted the check request
2. Received a check ID
3. Started polling for results

But then something went wrong during:
- The polling phase (malformed responses)
- The final result fetch (timeout or missing data)
- Header processing (missing `Link` headers)

---

## Architecture Comparison

| Aspect | SSO-Only Proxy (Recommended) | Full API Proxy |
|--------|------------------------------|----------------|
| SSO Authentication | Proxied | Proxied |
| Sidebar Loading | Direct from Acrolinx | Direct from Acrolinx |
| Check API Calls | **Direct to Acrolinx** | **Proxied through backend** |
| Config/Broadcast calls | Direct | Proxied |
| Complexity | Low | **High** |
| Risk of Breaking | Low | **High** |

### SSO-Only Proxy (Recommended)

```
┌─────────────────┐     SSO Auth Only      ┌─────────────────┐
│                 │ ─────────────────────► │                 │
│  Browser/       │                        │  SSO Proxy      │
│  Sidebar        │ ◄───────────────────── │  Server         │
│                 │     Access Token       │                 │
└────────┬────────┘                        └─────────────────┘
         │
         │  All Check API calls
         │  go DIRECT to Acrolinx
         ▼
┌─────────────────┐
│                 │
│  Acrolinx       │
│  Platform       │
│                 │
└─────────────────┘
```

---

## Root Causes and Solutions

### 1. Missing or Stripped Response Headers

**Problem:** The Acrolinx API returns important headers that the sidebar needs, particularly `Link` headers for result URLs.

**Symptoms:**
- Check submits successfully
- Polling appears to work
- Final results never load

**Solution:**
```
Your proxy MUST forward these headers:
- Link (critical for result URLs)
- Content-Type: application/json
- X-Acrolinx-* headers (any custom Acrolinx headers)
```

### 2. Response Body Transformation

**Problem:** The proxy modifies, truncates, or re-encodes the JSON response.

**Symptoms:**
- Sidebar shows parsing errors in console
- Unexpected behavior during check

**Solution:**
- Forward the response body **exactly as received**
- Do not pretty-print, minify, or transform JSON
- Ensure UTF-8 encoding is preserved

### 3. Timeout During Result Fetch

**Problem:** Proxy timeout is shorter than check completion time.

**Symptoms:**
- Small documents work, large documents fail
- Timeout errors in proxy logs

**Solution:**
- Set proxy timeout to at least 120 seconds
- Consider longer timeouts for large document checks

### 4. CORS Issues on Specific Responses

**Problem:** CORS headers not consistent across all response types.

**Symptoms:**
- Some requests work, others fail
- Browser console shows CORS errors

**Solution:**
```
Ensure ALL responses include:
- Access-Control-Allow-Origin
- Access-Control-Allow-Headers
- Access-Control-Allow-Methods
```

### 5. Check Status Response Format Issues

**Problem:** Required fields missing or malformed in polling responses.

**Required fields:**
```json
{
  "data": {
    "progress": { "percent": 50 },
    "state": "checking"
  },
  "links": {
    "result": "...",
    "cancel": "..."
  }
}
```

### 6. WebSocket vs HTTP Polling Mismatch

**Problem:** Proxy doesn't support WebSocket connections.

**Symptoms:**
- "Reconnecting" message appears repeatedly
- Connection drops frequently

**Solution:**
- Ensure WebSocket passthrough is configured
- Or configure sidebar to use HTTP polling only

---

## Diagnostic Checklist

Use this checklist when troubleshooting Full API Proxy issues:

### Proxy Response Verification

- [ ] Capture the actual HTTP response your proxy returns for polling requests
- [ ] Compare with the direct Acrolinx API response
- [ ] Verify all headers are forwarded (especially `Link`)
- [ ] Verify response body is unchanged

### Proxy Configuration Review

- [ ] Check timeout settings (should be > 120 seconds)
- [ ] Verify CORS headers are set on all responses
- [ ] Check for any response transformation middleware
- [ ] Verify no request/response size limits

### Browser Console Analysis

- [ ] Check for JavaScript errors
- [ ] Look for failed network requests
- [ ] Note any CORS errors
- [ ] Capture the exact error message shown

### Network Request Analysis

- [ ] Identify which request fails (status code, response)
- [ ] Verify the check ID is being passed correctly
- [ ] Check if final result fetch is attempted
- [ ] Look for timeout patterns

---

## Working Check Flow Reference

A successful check follows this flow. Your proxy must support each step:

```
1. POST /api/v1/checking/checks
   Request: { "content": "...", "contentFormat": "...", ... }
   Response: { 
     "data": { "id": "check-uuid-here" }, 
     "links": { "result": "/api/v1/checking/checks/xxx", "cancel": "..." } 
   }

2. GET /api/v1/checking/checks/{id}  (polling - repeats)
   Response: { 
     "data": { "progress": { "percent": 50 }, "state": "checking" }
   }

3. GET /api/v1/checking/checks/{id}  (final poll - state is "done")
   Response: { 
     "data": { "progress": { "percent": 100 }, "state": "done" }, 
     "links": { "result": "/api/v1/checking/checks/xxx/result" } 
   }

4. GET /api/v1/checking/checks/{id}/result  (fetch results)
   Response: Full check results with score, issues, etc.
```

**If any step fails or returns malformed data, the sidebar shows "reconnecting" and fails.**

---

## Real-World Case Study

### Scenario

An organization implemented a Full API Proxy for all Acrolinx traffic. Users reported that checks would "almost finish but fail with a 'reconnecting' message, then vanish without showing results."

### Investigation

Server logs showed the following request pattern:

| Time | Request | Status |
|------|---------|--------|
| 15:28:15 | `/api/v1/broadcasts/platform-notifications/0` | OK |
| 15:28:15 | `/int-service/api/v1/config` | OK |
| **15:28:17** | **`/api/v1/checking/checks`** | **OK - Check submitted** |
| 15:28:17 | `/api/v1/checking/checks/{id}` | Poll #1 |
| 15:28:17 | `/api/v1/checking/checks/{id}` | Poll #2 |
| 15:28:18 | `/api/v1/checking/checks/{id}` | Poll #3 |
| 15:28:20 | `/api/v1/checking/checks/{id}` | Poll #4 |
| 15:28:20 | `/int-service/api/v1/logs` | Error logged |

**Key Observations:**
- Check was submitted successfully (check ID received)
- Polling was happening (4 poll requests observed)
- Requests were reaching the proxy server
- But results never displayed

### Diagnosis Questions Asked

1. **Proxy Response Details:**
   - What HTTP status codes are returned for polling requests?
   - Are all response headers forwarded (especially `Link`)?
   - Is the response body unchanged?

2. **Proxy Implementation:**
   - Does the proxy forward ALL headers?
   - Is there any response transformation?
   - What timeout is configured?

3. **Final Result Fetch:**
   - Is there a request to fetch `/api/v1/checking/checks/{id}/result`?
   - If not, the `Link` header may be stripped

4. **Error Details:**
   - Browser console errors when "reconnecting" appears?
   - Which specific request fails in Network tab?

### Resolution

_(This section documents the resolution once the root cause is identified. Common resolutions include: ensuring all headers are forwarded, increasing proxy timeouts, or fixing response body transformations.)_

---

## Related Documentation

- [SSO Authentication Guide](SSO_AUTHENTICATION.md) - Complete SSO setup guide
- [Full API Proxy Requirements](SSO_AUTHENTICATION.md#full-api-proxy-requirements) - Detailed requirements for full proxy implementations

---

## Version History

| Version | Description |
|---------|-------------|
| 1.0 | Initial case study and troubleshooting guide |
