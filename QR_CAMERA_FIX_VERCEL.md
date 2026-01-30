# QR Camera Access Fix for Vercel Production

## Problem Summary
QR scanner works on localhost but fails to access camera on Vercel production deployment.

**Root Causes Identified:**
1. Missing HTTPS secure context check
2. Unstable DOM element ID generation causing scanner lookup failures
3. Premature `innerHTML` clearing blocking scanner initialization
4. Missing Permissions-Policy header for camera in production
5. Dialog portal container restricting camera video element visibility
6. Race condition between DOM element mounting and scanner creation

---

## Implemented Fixes

### 1. ✅ Secure Context Validation
**File:** `client/src/components/visitors/qr-code-scanner.tsx`

**Why:** Camera API requires HTTPS in production. localhost exception exists for development, but Vercel deployments need explicit HTTPS.

```typescript
// Check secure context on mount
const [isSecureContext, setIsSecureContext] = useState(false);

useEffect(() => {
  const isSecure = window.isSecureContext || 
                  window.location.hostname === 'localhost' || 
                  window.location.hostname === '127.0.0.1';
  setIsSecureContext(isSecure);
  
  if (!isSecure) {
    setCameraError('Camera access requires HTTPS in production...');
  }
}, []);
```

**User Benefit:** Clear error message when HTTPS is missing instead of silent failure.

---

### 2. ✅ Stable DOM Element ID
**File:** `client/src/components/visitors/qr-code-scanner.tsx`

**Before:**
```typescript
const uniqueId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`).current;
```
❌ Random ID regenerates on re-renders → scanner can't find element

**After:**
```typescript
const uniqueId = useMemo(() => 'qr-reader-' + Math.random().toString(36).substr(2, 9), []);
```
✅ ID generated once and memoized → consistent across renders

---

### 3. ✅ Safe DOM Initialization
**File:** `client/src/components/visitors/qr-code-scanner.tsx`

**Before:**
```typescript
containerRef.current.innerHTML = ''; // Clears DOM before scanner can mount
scannerRef.current = new Html5QrcodeScanner(...);
await scannerRef.current.render(...);
```
❌ Clears element while scanner is initializing → race condition

**After:**
```typescript
// Stop any existing scanner first
if (scannerRef.current) {
  try {
    await scannerRef.current.clear();
    scannerRef.current = null;
  } catch (e) {
    console.warn('Error clearing old scanner:', e);
  }
}

// Verify element exists in DOM BEFORE creating scanner
const element = document.getElementById(uniqueId);
if (!element) {
  throw new Error(`DOM element with ID ${uniqueId} not found in document`);
}

// Create scanner with optimized config
scannerRef.current = new Html5QrcodeScanner(uniqueId, {
  fps: 10,
  qrbox: { width: 250, height: 250 },
  aspectRatio: 1.33,  // Better for Vercel deployment
  showTorchButtonIfSupported: true,
  rememberLastUsedCamera: true,
  supportedScanTypes: [],  // Empty = auto-detect
}, false);

await scannerRef.current.render(onScanSuccess, onScanError);
```
✅ Proper cleanup, DOM verification, optimized config

---

### 4. ✅ Camera Permissions Header
**File:** `next.config.js`

**Added:**
```javascript
headers: async () => [
  {
    source: '/:path*',
    headers: [
      {
        key: 'Permissions-Policy',
        value: 'camera=(self "https://sukha-pms.vercel.app"), microphone=()'
      },
      {
        key: 'Feature-Policy',
        value: 'camera \'self\' https://sukha-pms.vercel.app'
      }
    ]
  }
]
```

**Why:** Vercel requires explicit Permissions-Policy headers. Browsers otherwise block camera access.

**ACTION REQUIRED:** Update `sukha-pms.vercel.app` to your actual production domain.

---

### 5. ✅ Dialog Container CSS Fix
**File:** `client/src/components/visitors/qr-code-scanner.tsx`

**Before:**
```tsx
<div
  ref={containerRef}
  className={`overflow-hidden bg-black ...`}
/>
```
❌ `overflow-hidden` clips video element from portal

**After:**
```tsx
<div
  ref={containerRef}
  className={`overflow-visible bg-black ...`}
  style={{ 
    minHeight: isCameraActive ? '350px' : '0px',
    position: 'relative',
    zIndex: 1,
  }}
/>
```
✅ Allows video element to render through Dialog portal

---

### 6. ✅ User Feedback for HTTPS
**File:** `client/src/components/visitors/qr-code-scanner.tsx`

Added visual warnings:
- Alert in `renderResult()` when HTTPS is missing
- Warning text in camera prompt
- Disabled button when not in secure context

```typescript
{!isSecureContext && (
  <p className="text-xs text-red-600 mt-2 font-semibold">
    ⚠️ HTTPS connection required for camera access in production
  </p>
)}

<Button disabled={isScanning || !isSecureContext}>
  Start Camera Scan
</Button>
```

---

## Testing Checklist

### Local Testing (localhost:3001)
- [ ] Navigate to Visitor Management → Verify Visitor
- [ ] Click "Start Camera Scan"
- [ ] Camera permission popup appears
- [ ] Camera video stream shows
- [ ] QR code scans successfully
- [ ] Check browser console - should see logs like:
  ```
  Secure context check: { isSecureContext: true, hostname: "localhost", protocol: "http:" }
  Testing camera access...
  Available cameras: 1
  Creating Html5QrcodeScanner with ID: qr-reader-xxxxx
  Scanner rendered successfully
  ```

### Production Testing (Vercel)
- [ ] Domain must use HTTPS (automatic on Vercel)
- [ ] Navigate to Visitor Management → Verify Visitor
- [ ] Click "Start Camera Scan"
- [ ] Camera permission popup appears
- [ ] Camera video stream shows
- [ ] QR code scans successfully
- [ ] Check browser DevTools → Network → Response headers contain:
  ```
  Permissions-Policy: camera=(self "https://sukha-pms.vercel.app")
  ```

### Error Scenarios
- [ ] On non-HTTPS (if testing locally): Error message shown, button disabled
- [ ] No camera attached: ⚠️ No camera found message appears
- [ ] Camera in use: NotReadableError handled gracefully
- [ ] Permission denied: Clear error with instructions

---

## Deployment Steps

1. **Update Domain in next.config.js:**
   ```javascript
   value: 'camera=(self "https://YOUR-DOMAIN.vercel.app")'
   ```

2. **Verify HTTPS:**
   - Vercel auto-enables HTTPS for *.vercel.app
   - Custom domains need SSL certificate (Vercel handles automatically)

3. **Test Before Merging:**
   ```bash
   npm run build  # Must succeed
   ```

4. **Merge & Deploy:**
   - Changes are in `qr-code-scanner.tsx` and `next.config.js`
   - Push to `fix-frontend-kishant` branch
   - Vercel auto-deploys on push

---

## Browser Compatibility

Camera API works on:
- ✅ Chrome/Chromium 64+
- ✅ Firefox 55+
- ✅ Safari 14.1+
- ✅ Edge 79+

**Requires:**
- HTTPS or localhost
- User permission grant
- Available camera device

---

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| Camera doesn't open on Vercel | HTTPS not working | Check browser address bar for 🔒 |
| "HTTPS connection required" message | `isSecureContext` false | Verify site uses `https://` |
| "DOM element not found" error | Portal rendering timing | Refresh page, check React DevTools |
| Camera opens but no QR detection | html5-qrcode config | Check console logs for initialization errors |
| Permission denied popup doesn't appear | Browser blocked camera | Check Settings → Privacy → Camera |

---

## Next Steps if Still Failing

1. **Check Browser Console:**
   ```
   F12 → Console → Look for error messages
   ```

2. **Verify Permissions-Policy Header:**
   ```
   F12 → Network → Click page request → Response Headers
   Look for: Permissions-Policy: camera=...
   ```

3. **Test Secure Context:**
   ```javascript
   // In browser console:
   console.log(window.isSecureContext)  // Should be true
   console.log(window.location.protocol) // Should be "https:"
   ```

4. **Check Browser Camera Access:**
   - Chrome: Settings → Privacy → Camera
   - Firefox: Preferences → Privacy & Security → Permissions
   - Safari: System Preferences → Security & Privacy

---

## Files Modified

1. `client/src/components/visitors/qr-code-scanner.tsx`
   - Added `isSecureContext` state
   - Stable ID with `useMemo`
   - Safe DOM initialization
   - HTTPS warnings
   - Optimized scanner config

2. `next.config.js`
   - Added Permissions-Policy header
   - Added Feature-Policy header

---

## References

- [MDN: getUserMedia API](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [MDN: SecureContext](https://developer.mozilla.org/en-US/docs/Web/Security/Secure_Contexts)
- [html5-qrcode Documentation](https://github.com/mebjas/html5-qrcode)
- [Vercel Security Headers](https://vercel.com/docs/concepts/functions/serverless-functions/security)
