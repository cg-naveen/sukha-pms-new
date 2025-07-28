import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Visitor } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeGeneratorProps {
  visitor: Visitor;
}

export default function QRCodeGenerator({ visitor }: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const generateQRCode = async () => {
      if (!visitor.qrCode || !canvasRef.current) return;
      
      try {
        // Generate QR code to canvas
        await QRCode.toCanvas(canvasRef.current, visitor.qrCode, {
          width: 256,
          margin: 2,
          color: {
            dark: '#1D4ED8',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        
        // Convert canvas to data URL for download
        const dataUrl = canvasRef.current.toDataURL('image/png');
        setQrCodeDataUrl(dataUrl);
      } catch (error) {
        console.error("Failed to generate QR code:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    generateQRCode();
  }, [visitor.qrCode]);

  const downloadQRCode = () => {
    if (!qrCodeDataUrl) return;
    
    // Create a temporary link element
    const downloadLink = document.createElement('a');
    downloadLink.href = qrCodeDataUrl;
    downloadLink.download = `visitor-qr-${visitor.id}.png`;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
  };

  if (!visitor.qrCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>QR Code Not Available</CardTitle>
          <CardDescription>
            This visitor request has not been approved yet.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Visitor QR Code</CardTitle>
        <CardDescription>
          Present this QR code when you arrive on {format(new Date(visitor.visitDate), "MMMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mb-4 p-2 bg-white rounded-lg shadow-sm">
              <canvas ref={canvasRef} className="mx-auto" />
            </div>
            <div className="text-center mb-4">
              <p className="font-medium">{visitor.fullName}</p>
              <p className="text-sm text-gray-500">Visit purpose: {visitor.purpose}</p>
            </div>
            <Button 
              className="w-full"
              onClick={downloadQRCode}
            >
              <Download className="h-4 w-4 mr-2" /> Download QR Code
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
