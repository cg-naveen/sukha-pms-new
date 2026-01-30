'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle, Camera } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

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
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch('/api/public/visitors/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qrCode: code }),
        credentials: 'include',
      });

      const data = await res.json();

      if (!res.ok) {
        // Create error with the API message
        const error = new Error(data.message || res.statusText);
        (error as any).status = res.status;
        (error as any).apiData = data;
        throw error;
      }

      return data;
    },
    onError: (error: Error) => {
      // Suppress console error logging since we handle it gracefully
      // The error message is shown in the UI instead
      
      // Extract user-friendly message
      let errorMessage = error.message;
      
      if (error.message.includes('expired')) {
        errorMessage = '⏰ Your visit has already expired. Please register a new visit to continue.';
      } else if (error.message.includes('invalid') || error.message.includes('not found')) {
        errorMessage = '❌ Invalid QR code. Please try again.';
      }

      setCameraError(errorMessage);
      setIsCameraActive(false);
      setIsScanning(false);
    }
  });

  // Start camera scanning - CALLED DIRECTLY FROM USER CLICK
  // This ensures getUserMedia() is triggered within user gesture context
  const startCamera = async () => {
    console.log('🎬 startCamera called - WITHIN USER GESTURE');
    
    if (!containerRef.current) {
      setCameraError('Container not found. Please try refreshing the page.');
      return;
    }

    try {
      setCameraError(null);
      setDebugInfo('Requesting camera permission...');
      setIsScanning(true);
      setIsCameraActive(true);

      const qrReaderElementId = 'qr-reader';
      
      // Ensure element has correct ID
      containerRef.current.id = qrReaderElementId;

      console.log('Creating Html5Qrcode instance...');
      
      // Stop any existing scanner
      if (html5QrcodeRef.current) {
        try {
          await html5QrcodeRef.current.stop();
          await html5QrcodeRef.current.clear();
        } catch (e) {
          console.warn('Error clearing old scanner:', e);
        }
        html5QrcodeRef.current = null;
      }

      // Create new instance
      html5QrcodeRef.current = new Html5Qrcode(qrReaderElementId);

      console.log('Starting camera with getUserMedia...');
      setDebugInfo('Camera starting...');

      // START CAMERA DIRECTLY - getUserMedia is called here within user gesture
      await html5QrcodeRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: 250,
        },
        (decodedText) => {
          console.log('✅ QR Code detected:', decodedText);
          setDebugInfo('QR Code detected! Verifying...');
          onScanSuccessCallback(decodedText);
        },
        () => {
          // Silent error handling for "QR code not detected"
        }
      );

      console.log('✅ Camera stream started successfully');
      setDebugInfo('✅ Camera active - scanning for QR codes...');
      setIsScanning(false);
    } catch (error) {
      console.error('❌ Camera error:', error);
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
    console.log('Stopping camera...');
    setIsScanning(false);
    setIsCameraActive(false);
    setDebugInfo('');

    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        await html5QrcodeRef.current.clear();
        html5QrcodeRef.current = null;
        console.log('✅ Camera stopped');
      } catch (e) {
        console.error('Error stopping camera:', e);
      }
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Test camera availability on mount
  useEffect(() => {
    const testCamera = async () => {
      try {
        console.log('Testing camera availability...');
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
    testCamera();
  }, []);

  const renderResult = () => {
    if (verifyMutation.isPending) {
      return (
        <div className="flex flex-col items-center justify-center p-6">
          <Loader2 className="h-16 w-16 animate-spin text-primary mb-4" />
          <p className="text-lg font-medium">Verifying QR code...</p>
        </div>
      );
    }

    if (verifyMutation.isError) {
      // Use the error message from cameraError state (set by onError handler)
      const errorMsg = cameraError || 'Failed to verify QR code. Please try again.';
      const isExpired = errorMsg.includes('expired');
      
      return (
        <Alert variant="destructive" className="mt-4">
          <XCircle className="h-5 w-5" />
          <AlertTitle>{isExpired ? '⏰ Visit Expired' : 'Verification Failed'}</AlertTitle>
          <AlertDescription>
            {errorMsg}
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
        {/* QR Scanner Container */}
        <div
          ref={containerRef}
          className={`w-full rounded-lg bg-black transition-all ${
            isCameraActive ? 'block' : 'hidden'
          }`}
          style={{ 
            minHeight: isCameraActive ? '350px' : '0px',
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
            </div>
            <Button
              onClick={startCamera}
              className="w-full"
              disabled={isScanning}
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