import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Visitor } from "@shared/schema";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Download, Loader2, MessageCircle, Copy } from "lucide-react";
import QRCode from "qrcode";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QRCodeGeneratorProps {
  visitor: Visitor;
}

export default function QRCodeGenerator({ visitor }: QRCodeGeneratorProps) {
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

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

  const getVisitorMessage = () => {
    return `🏢 *Visitor Pass Approved*

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
🔗 *QR Code:* Please see the attached QR code image.

Please save this information and present the QR code when arriving.`;
  };

  const copyToClipboard = async () => {
    if (!qrCodeDataUrl) {
      toast({
        title: "Error",
        description: "QR code image is not available. Please try again.",
        variant: "destructive",
      });
      return;
    }

    const message = getVisitorMessage();
    let imageCopied = false;

    // First, try to copy the image
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        const response = await fetch(qrCodeDataUrl);
        const blob = await response.blob();
        const clipboardItem = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([clipboardItem]);
        imageCopied = true;
        
        // Show initial toast for image
        toast({
          title: "QR Image Copied!",
          description: "Image copied. Copying text message next...",
        });
      } catch (error) {
        console.error("Failed to copy image:", error);
      }
    }

    // Wait a moment, then copy the text
    setTimeout(async () => {
      try {
        await navigator.clipboard.writeText(message);
        
        if (imageCopied) {
          toast({
            title: "Both Copied!",
            description: "Text is now in clipboard. To paste both in WhatsApp: 1) Paste the text first, 2) Click Copy button again to get the image, then paste it.",
          });
        } else {
          toast({
            title: "Text Copied!",
            description: "Text message copied to clipboard. Please use the Download button to get the QR code image.",
          });
        }
      } catch (error) {
        console.error("Failed to copy text:", error);
        if (imageCopied) {
          toast({
            title: "Image Copied",
            description: "QR image copied. Text copy failed. Please copy the text manually.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Copy Failed",
            description: "Unable to copy to clipboard. Please try again or use the download button.",
            variant: "destructive",
          });
        }
      }
    }, imageCopied ? 1000 : 0);
  };

  const shareViaWhatsApp = async () => {
    if (!qrCodeDataUrl) {
      console.error("QR code image not available");
      toast({
        title: "Error",
        description: "QR code image is not available. Please try again.",
        variant: "destructive",
      });
      return;
    }

    // Format phone number for WhatsApp
    const formatPhoneForWhatsApp = (phone: string, countryCode: string = '+60'): string => {
      // Remove all spaces, dashes, parentheses, and + signs
      let cleaned = phone.replace(/[\s\-+()]/g, '');
      const countryCodeDigits = countryCode.replace(/\+/g, '');
      
      // Check if phone already starts with country code
      if (cleaned.startsWith(countryCodeDigits)) {
        return cleaned;
      }
      
      // For Malaysian numbers: if starts with 0, replace with country code
      if (countryCodeDigits === '60' && cleaned.startsWith('0')) {
        return countryCodeDigits + cleaned.substring(1);
      }
      
      // Otherwise, prepend country code
      return countryCodeDigits + cleaned;
    };

    const formattedPhone = formatPhoneForWhatsApp(visitor.phone, visitor.countryCode || '+60');

    // Check if Clipboard API is available and supports images
    let clipboardSuccess = false;
    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      try {
        // Convert data URL to Blob
        const response = await fetch(qrCodeDataUrl);
        const blob = await response.blob();
        
        // Copy image to clipboard
        const clipboardItem = new ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([clipboardItem]);
        clipboardSuccess = true;
      } catch (error) {
        console.error("Failed to copy QR code to clipboard:", error);
      }
    }

    // Show toast notification
    if (clipboardSuccess) {
      toast({
        title: "QR Code Copied!",
        description: "The QR code image has been copied to your clipboard. You can paste it in the WhatsApp message.",
      });
    } else {
      toast({
        title: "Opening WhatsApp",
        description: "Please download and attach the QR code image manually.",
      });
    }

    // Create visitor information message
    const message = getVisitorMessage();

    // Create WhatsApp URL with visitor's phone number and pre-filled message
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
    
    // Small delay to ensure toast is visible before opening WhatsApp
    setTimeout(() => {
      // Open WhatsApp in a new window/tab
      window.open(whatsappUrl, '_blank');
    }, 500);
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
    <Card className="w-full max-w-full">
      <CardHeader>
        <CardTitle>Visitor QR Code</CardTitle>
        <CardDescription>
          Present this QR code when you arrive on {format(new Date(visitor.visitDate), "MMMM d, yyyy")}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center w-full max-w-full">
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
            <TooltipProvider>
              <div className="flex flex-row gap-2 w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={downloadQRCode}
                      variant="outline"
                      className="flex-1 aspect-square"
                    >
                      <Download className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Download QR</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={copyToClipboard}
                      variant="outline"
                      className="flex-1 aspect-square"
                    >
                      <Copy className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Copy</p>
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={shareViaWhatsApp}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white aspect-square"
                    >
                      <MessageCircle className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Share via WhatsApp</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </>
        )}
      </CardContent>
    </Card>
  );
}
