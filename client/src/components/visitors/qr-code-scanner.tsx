'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, Camera } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onClose: () => void;
}

interface ScanResult {
  success: boolean;
  message: string;
  visitor?: any;
}

export default function QrCodeScanner({ onClose }: QrScannerProps) {
  const [qrCode, setQrCode] = useState('');
  const [manualEntry, setManualEntry] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [isSecureContext, setIsSecureContext] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // Generate stable ID once
  const uniqueId = useMemo(() => 'qr-reader-' + Math.random().toString(36).substr(2, 9), []);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest('POST', '/api/public/visitors/verify', { qrCode: code });
      return await res.json();
    },
    onError: (error: Error) => {
      console.error('QR verification error:', error);
    }
  });

  // Start camera scanning
  const startCamera = async () => {
    console.log('startCamera called');
    console.log('containerRef.current:', containerRef.current);
    
    if (!isSecureContext) {
      setCameraError('Camera access requires HTTPS in production. Please access this page over a secure connection.');
      setIsScanning(false);
      return;
    }
    
    if (!containerRef.current) {
      console.error('Container ref is null');
      setCameraError('Container not found. Please try refreshing the page.');
      setIsScanning(false);
      return;
    }

    try {
      console.log('Starting camera initialization...');
      setCameraError(null);
      setDebugInfo('Requesting camera permission...');
      setIsScanning(true);
      setIsCameraActive(true);

      // Ensure container has the correct ID
      if (containerRef.current.id !== uniqueId) {
        console.log('Setting container ID to:', uniqueId);
        containerRef.current.id = uniqueId;
      }

      // IMPORTANT: Do NOT clear innerHTML before creating scanner
      // html5-qrcode will handle DOM manipulation
      
      // Verify element exists in DOM
      const element = document.getElementById(uniqueId);
      if (!element) {
        throw new Error(`DOM element with ID ${uniqueId} not found in document`);
      }

      console.log('Creating Html5QrcodeScanner with ID:', uniqueId);
      
      // Stop any existing scanner first
      if (scannerRef.current) {
        try {
          await scannerRef.current.clear();
          scannerRef.current = null;
        } catch (e) {
          console.warn('Error clearing old scanner:', e);
        }
      }

      // Create scanner with optimized config for Vercel
      scannerRef.current = new Html5QrcodeScanner(
        uniqueId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.33,
          showTorchButtonIfSupported: true,
          rememberLastUsedCamera: true,
          supportedScanTypes: [],
        },
        /* useBarCodeDetectorIfAvailable= */ false
      );

      setDebugInfo('Camera initializing...');

      // Handle successful scan
      const onScanSuccess = (decodedText: string) => {
        console.log('QR Code detected:', decodedText);
        setDebugInfo('QR Code detected! Verifying...');
        onScanSuccessCallback(decodedText);
      };

      // Handle scan errors
      const onScanError = (error: string) => {
        // Ignore "QR code not detected" errors - these are normal during scanning
        if (!error.includes('QR code not detected') && !error.includes('NotFoundException')) {
          console.warn('Scan error:', error);
        }
      };

      // Render and start scanner
      console.log('Rendering scanner...');
      await scannerRef.current.render(onScanSuccess, onScanError);
      console.log('Scanner rendered successfully');
      setDebugInfo('Camera active - scanning for QR codes...');
      setIsScanning(false);
    } catch (error) {
      console.error('Camera error caught:', error);
      handleCameraError(error);
    }
  };

  // Handle successful QR code scan
  const onScanSuccessCallback = (decodedText: string) => {
    setQrCode(decodedText);
    setIsScanning(false);
    stopCamera();
    verifyMutation.mutate(decodedText);
  };

  // Handle camera errors
  const handleCameraError = (error: any) => {
    let errorMessage = 'Unable to access camera';

    console.error('Full error object:', error);

    if (error?.name === 'NotAllowedError' || error?.message?.includes('permission')) {
      errorMessage = 'Camera permission was denied. Please allow camera access in your browser settings and try again.';
    } else if (error?.name === 'NotFoundError' || error?.message?.includes('no camera') || error?.message?.includes('No cameras')) {
      errorMessage = 'No camera device found on this device. Please ensure your device has a camera.';
    } else if (error?.name === 'NotReadableError' || error?.message?.includes('in use')) {
      errorMessage = 'Camera is already being used by another application. Please close it and try again.';
    } else if (error?.name === 'SecurityError') {
      errorMessage = 'Camera access is blocked due to browser security settings. Please check your browser permissions.';
    } else if (error?.message) {
      errorMessage = `Camera error: ${error.message}`;
    }

    setDebugInfo(`Error: ${errorMessage}`);
    setCameraError(errorMessage);
    setIsScanning(false);
    setIsCameraActive(false);
  };

  // Stop camera and cleanup
  const stopCamera = async () => {
    setIsScanning(false);
    setIsCameraActive(false);
    setDebugInfo('');

    if (scannerRef.current) {
      try {
        await scannerRef.current.clear();
        scannerRef.current = null;
      } catch (e) {
        console.error('Error stopping scanner:', e);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Check secure context on mount
  useEffect(() => {
    // Camera API requires HTTPS in production
    const isSecure = window.isSecureContext || 
                    window.location.hostname === 'localhost' || 
                    window.location.hostname === '127.0.0.1';
    setIsSecureContext(isSecure);
    
    if (!isSecure) {
      setCameraError('Camera access requires HTTPS in production. Please access this page over a secure connection.');
    }

    console.log('Secure context check:', {
      isSecureContext: isSecure,
      hostname: window.location.hostname,
      protocol: window.location.protocol,
    });
  }, []);

  // Test camera access immediately
  useEffect(() => {
    const testCamera = async () => {
      try {
        console.log('Testing camera access...');
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        console.log('Available cameras:', videoDevices.length);
        if (videoDevices.length === 0) {
          setDebugInfo('⚠️ No camera found on this device');
        }
      } catch (error) {
        console.error('Error checking cameras:', error);
        setDebugInfo('⚠️ Unable to detect cameras');
      }
    };
    
    if (isSecureContext) {
      testCamera();
    }
  }, [isSecureContext]);

  const renderResult = () => {
    if (!isSecureContext) {
      return (
        <Alert variant="destructive" className="mb-4">
          <XCircle className="h-5 w-5" />
          <AlertTitle>HTTPS Required</AlertTitle>
          <AlertDescription>
            Camera access requires a secure HTTPS connection in production. 
            This feature works on localhost but needs HTTPS when deployed.
          </AlertDescription>
        </Alert>
      );
    }

    if (verifyMutation.isPending) {
      return (
        <div className="flex flex-col items-center justify-center p-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Verifying QR code...</p>
        </div>
      );
    }

    if (verifyMutation.isError) {
      return (
        <Alert variant="destructive" className="mt-4">
          <XCircle className="h-5 w-5" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to verify QR code. Please try again.
          </AlertDescription>
        </Alert>
      );
    }

    if (verifyMutation.isSuccess) {
      const data = verifyMutation.data as ScanResult;

      if (!data.success) {
        return (
          <Alert variant="destructive" className="mt-4">
            <XCircle className="h-5 w-5" />
            <AlertTitle>Invalid QR Code</AlertTitle>
            <AlertDescription>
              {data.message}
            </AlertDescription>
          </Alert>
        );
      }

      const visitor = data.visitor;
      return (
        <div className="mt-4">
          <Alert variant="default" className="bg-green-50 border-green-200 mb-4">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            <AlertTitle className="text-green-800">Visitor Verified</AlertTitle>
            <AlertDescription className="text-green-700">
              QR code verified successfully
            </AlertDescription>
          </Alert>

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h3 className="font-medium text-lg mb-2">Visitor Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="font-medium">Name:</div>
              <div>{visitor.fullName}</div>

              <div className="font-medium">Visit Date:</div>
              <div>{new Date(visitor.visitDate).toLocaleDateString()}</div>

              <div className="font-medium">Visit Time:</div>
              <div>{visitor.visitTime}</div>

              <div className="font-medium">Purpose:</div>
              <div>{visitor.purposeOfVisit || visitor.purpose || 'Not specified'}</div>

              {visitor.residentName && (
                <>
                  <div className="font-medium">Resident:</div>
                  <div>{visitor.residentName}</div>
                </>
              )}

              {visitor.roomNumber && (
                <>
                  <div className="font-medium">Room:</div>
                  <div>{visitor.roomNumber}</div>
                </>
              )}

              <div className="font-medium">Visitors:</div>
              <div>{visitor.numberOfVisitors}</div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Verify Visitor QR Code</CardTitle>
        <CardDescription>
          Scan a visitor's QR code or enter it manually
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* QR Scanner Container - Always rendered, shown/hidden with CSS */}
        {/* CRITICAL: No display:none - use visibility to keep element in DOM */}
        <div
          ref={containerRef}
          id={uniqueId}
          className={`w-full rounded-lg overflow-visible bg-black transition-all ${
            isCameraActive ? 'block' : 'hidden'
          }`}
          style={{ 
            minHeight: isCameraActive ? '350px' : '0px',
            // Ensure camera video element can be seen through portal
            position: 'relative',
            zIndex: 1,
          }}
        />

        {isCameraActive && (
          <div className="space-y-4 mt-4">
            {debugInfo && (
              <Alert className="bg-blue-50 border-blue-200">
                <Camera className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-700">{debugInfo}</AlertDescription>
              </Alert>
            )}

            {cameraError && (
              <Alert variant="destructive">
                <XCircle className="h-5 w-5" />
                <AlertTitle>Camera Error</AlertTitle>
                <AlertDescription>{cameraError}</AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={async () => {
                  await stopCamera();
                  setManualEntry(true);
                }}
              >
                Manual Entry
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={stopCamera}
              >
                Stop Scanning
              </Button>
            </div>
          </div>
        )}

        {!isCameraActive && !manualEntry && (
          <div className="space-y-4">
            <div className="bg-blue-50 p-6 rounded-lg flex flex-col items-center">
              <Camera className="h-12 w-12 text-blue-600 mb-2" />
              <p className="text-sm text-center text-gray-700">
                Click below to scan a visitor's QR code using your device camera
              </p>
              {!isSecureContext && (
                <p className="text-xs text-red-600 mt-2 font-semibold">
                  ⚠️ HTTPS connection required for camera access in production
                </p>
              )}
            </div>
            <Button
              onClick={() => {
                console.log('Start Camera button clicked');
                startCamera();
              }}
              className="w-full"
              disabled={isScanning || !isSecureContext}
            >
              {isScanning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting Camera...
                </>
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  Start Camera Scan
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setManualEntry(true)}
            >
              Enter QR Code Manually
            </Button>
          </div>
        )}

        {!isCameraActive && manualEntry && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (qrCode.trim()) {
                verifyMutation.mutate(qrCode);
              }
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label htmlFor="qrCode" className="text-sm font-medium">
                QR Code
              </label>
              <Input
                id="qrCode"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Enter the QR code"
                autoFocus
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setManualEntry(false);
                  setQrCode('');
                  verifyMutation.reset();
                }}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={verifyMutation.isPending || !qrCode.trim()}
              >
                {verifyMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
            </div>
          </form>
        )}

        {renderResult()}
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </CardFooter>
    </Card>
  );
}