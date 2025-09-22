import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Visitor } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Loader2, MessageCircle } from "lucide-react";
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
      if (!visitor.qrCode) {
        setIsLoading(false);
        return;
      }

      if (!canvasRef.current) {
        // Retry after a short delay if canvas ref not available
        setTimeout(() => generateQRCode(), 100);
        return;
      }
      
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

  const shareViaWhatsApp = () => {
    // Create visitor information message
    const message = `🏢 *Visitor Pass Approved*

👤 *Visitor:* ${visitor.fullName}
📧 *Email:* ${visitor.email}
📞 *Phone:* ${visitor.phone}
🆔 *NRIC/Passport:* ${visitor.nricPassport || 'Not provided'}
📅 *Visit Date:* ${format(new Date(visitor.visitDate), "MMMM d, yyyy")}
⏰ *Visit Time:* ${visitor.visitTime || 'Not specified'}
👥 *Visiting:* ${(visitor as any).resident?.fullName || 'Unknown'}
🏠 *Room:* ${(visitor as any).resident?.occupancy?.[0]?.room?.unitNumber || 'N/A'}
🎯 *Purpose:* ${visitor.purposeOfVisit || 'Not specified'}
${visitor.details ? `📝 *Details:* ${visitor.details}` : ''}
👥 *Group Size:* ${visitor.numberOfVisitors || 1} ${visitor.numberOfVisitors === 1 ? 'person' : 'people'}

✅ *Status:* APPROVED
🔗 *QR Code:* Present this QR code at the entrance for verification.

Please save this information and present the QR code when arriving.`;

    // Create WhatsApp URL with pre-filled message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    // Open WhatsApp in a new window/tab
    window.open(whatsappUrl, '_blank');
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
        {/* Canvas is always rendered so ref is available */}
        <div className="mb-4 p-2 bg-white rounded-lg shadow-sm">
          <canvas ref={canvasRef} className={`mx-auto ${isLoading ? 'hidden' : ''}`} />
          {isLoading && (
            <div className="p-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </div>
        
        {!isLoading && (
          <>
            <div className="text-center mb-4">
              <p className="font-medium">{visitor.fullName}</p>
              <p className="text-sm text-gray-500">Visit purpose: {visitor.purposeOfVisit || 'Not specified'}</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button 
                className="flex-1"
                onClick={downloadQRCode}
                variant="outline"
              >
                <Download className="h-4 w-4 mr-2" /> Download QR
              </Button>
              <Button 
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                onClick={shareViaWhatsApp}
              >
                <MessageCircle className="h-4 w-4 mr-2" /> Share via WhatsApp
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
