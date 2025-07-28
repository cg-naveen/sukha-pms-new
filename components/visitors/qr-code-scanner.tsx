import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useMutation } from '@tanstack/react-query';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface QrScannerProps {
  onClose: () => void;
}

export default function QrCodeScanner({ onClose }: QrScannerProps) {
  const [qrCode, setQrCode] = useState('');
  const [manualEntry, setManualEntry] = useState(false);

  const verifyMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest('GET', `/api/public/visitors/verify/${code}`);
      return await res.json();
    },
    onError: (error: Error) => {
      console.error('QR verification error:', error);
    }
  });

  const handleScan = async () => {
    if (!qrCode.trim()) return;
    verifyMutation.mutate(qrCode);
  };

  const handleManualEntry = (e: React.FormEvent) => {
    e.preventDefault();
    handleScan();
  };

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
      const data = verifyMutation.data;
      
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
              <div>{visitor.purpose}</div>
              
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
          Scan or enter a visitor's QR code to verify their visit details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!manualEntry ? (
          <>
            <div className="bg-gray-100 p-8 rounded-lg mb-4 flex items-center justify-center">
              <p className="text-gray-500 text-center">
                Please use a QR code scanner app on your phone to scan the visitor's QR code, 
                then enter the code manually below.
              </p>
            </div>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => setManualEntry(true)}
            >
              Enter QR Code Manually
            </Button>
          </>
        ) : (
          <form onSubmit={handleManualEntry} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="qrCode" className="text-sm font-medium">
                QR Code
              </label>
              <Input
                id="qrCode"
                value={qrCode}
                onChange={(e) => setQrCode(e.target.value)}
                placeholder="Enter the QR code"
                required
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setManualEntry(false)}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={verifyMutation.isPending || !qrCode.trim()}
              >
                Verify
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