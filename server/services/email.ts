import { Visitor } from '@shared/schema';
import sgMail from '@sendgrid/mail';
import QRCode from 'qrcode';

// Initialize Brevo/SendGrid client
const BREVO_API_KEY = process.env.BREVO_API_KEY;
if (!BREVO_API_KEY) {
  console.error('BREVO_API_KEY environment variable is not set');
} else {
  console.log('Brevo API key configured successfully');
}

// Set API key
sgMail.setApiKey(BREVO_API_KEY || 'dummy-key');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    content: string;
    filename: string;
    type: string;
    disposition: string;
  }>;
}

/**
 * Sends an email using Brevo (via SendGrid compatible API)
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Log the email details for debugging
    console.log('------------------------------------------------');
    console.log('Sending email via Brevo:');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('HTML Content:', options.html.substring(0, 150) + '...');
    if (options.attachments) {
      console.log('Attachments:', options.attachments.length);
    }
    console.log('------------------------------------------------');
    
    // Create email data
    const msg = {
      to: options.to,
      from: 'noreply@sukhaseniorresort.com', // Use your verified sender
      subject: options.subject,
      html: options.html,
      attachments: options.attachments || [],
    };
    
    // Send email
    await sgMail.send(msg);
    
    console.log(`Email successfully sent to ${options.to}`);
    return true;
  } catch (error) {
    const err = error as Error;
    console.error('Error sending email via Brevo:', err.message);
    console.error(error);
    return false;
  }
}

/**
 * Sends a visitor approval notification with QR code
 */
export async function sendVisitorApprovalEmail(visitor: Visitor, qrCodeUrl: string): Promise<boolean> {
  try {
    const visitDate = new Date(visitor.visitDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    
    // Generate QR code as a data URL for embedding in the email directly
    // This ensures the QR code is visible even without external image loading
    const qrCodeDataUrl = await QRCode.toDataURL(qrCodeUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      scale: 8,
      color: {
        dark: '#004c4c',
        light: '#ffffff'
      }
    });
    
    // Also generate a PNG buffer for attachment
    const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, {
      errorCorrectionLevel: 'H',
      type: 'png',
      margin: 1,
      scale: 8,
      color: {
        dark: '#004c4c',
        light: '#ffffff'
      }
    });
    
    // Convert buffer to base64 for email attachment
    const qrCodeBase64 = qrCodeBuffer.toString('base64');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
        <div style="text-align: center; padding-bottom: 20px;">
          <h1 style="color: #004c4c; margin-bottom: 5px;">Visit Approval Confirmation</h1>
          <p style="color: #666; font-size: 16px;">Sukha Senior Resort</p>
        </div>
        
        <p>Dear ${visitor.fullName},</p>
        
        <p>Your visit request to Sukha Senior Resort has been <strong style="color: #004c4c;">APPROVED</strong>.</p>
        
        <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #004c4c; margin-top: 0;">Visit Details</h3>
          <p><strong>Date:</strong> ${visitDate}</p>
          <p><strong>Time:</strong> ${visitor.visitTime}</p>
          <p><strong>Purpose:</strong> ${visitor.purpose}</p>
          ${visitor.residentName ? `<p><strong>Resident:</strong> ${visitor.residentName}</p>` : ''}
          ${visitor.roomNumber ? `<p><strong>Room:</strong> ${visitor.roomNumber}</p>` : ''}
          <p><strong>Number of Visitors:</strong> ${visitor.numberOfVisitors}</p>
          <p><strong>Visit ID:</strong> ${visitor.id}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p><strong>IMPORTANT: Please present this QR code at the reception upon arrival</strong></p>
          <p>The QR code is also attached to this email for easy access.</p>
          <img src="${qrCodeDataUrl}" alt="QR Code" style="max-width: 200px; height: auto;" />
        </div>
        
        <div style="background-color: #eef7f7; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <h3 style="color: #004c4c; margin-top: 0;">Visitor Guidelines</h3>
          <ul style="padding-left: 20px; line-height: 1.5;">
            <li>Please arrive at your scheduled time</li>
            <li>Bring a valid ID for security check-in</li>
            <li>Respect the privacy and rest times of all residents</li>
            <li>Children must be supervised at all times</li>
            <li>Follow all health and safety protocols</li>
          </ul>
        </div>
        
        <p>If you need to cancel or reschedule your visit, please contact us as soon as possible.</p>
        
        <p>Thank you for your cooperation.</p>
        
        <p style="margin-top: 30px;">Best regards,<br>The Sukha Senior Resort Team</p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    `;

    // Send the email with the QR code as both embedded image and attachment
    return sendEmail({
      to: visitor.email,
      subject: 'Your Visit to Sukha Senior Resort is Approved',
      html,
      attachments: [
        {
          content: qrCodeBase64,
          filename: `QR_Code_Visit_${visitor.id}.png`,
          type: 'image/png',
          disposition: 'attachment'
        }
      ]
    });
  } catch (error) {
    console.error('Error generating QR code for email:', error);
    return false;
  }
}

/**
 * Sends a visitor rejection notification
 */
export async function sendVisitorRejectionEmail(visitor: Visitor, reason: string = ''): Promise<boolean> {
  const visitDate = new Date(visitor.visitDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
      <div style="text-align: center; padding-bottom: 20px;">
        <h1 style="color: #004c4c; margin-bottom: 5px;">Visit Request Update</h1>
        <p style="color: #666; font-size: 16px;">Sukha Senior Resort</p>
      </div>
      
      <p>Dear ${visitor.fullName},</p>
      
      <p>We regret to inform you that your visit request to Sukha Senior Resort could not be accommodated at this time.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #004c4c; margin-top: 0;">Visit Details</h3>
        <p><strong>Date requested:</strong> ${visitDate}</p>
        <p><strong>Time requested:</strong> ${visitor.visitTime}</p>
        <p><strong>Purpose:</strong> ${visitor.purpose}</p>
      </div>
      
      ${reason ? `
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="color: #004c4c; margin-top: 0;">Reason</h3>
        <p>${reason}</p>
      </div>
      ` : ''}
      
      <p>If you would like to reschedule your visit for another time, please submit a new visit request or contact our administration office directly.</p>
      
      <p>We appreciate your understanding.</p>
      
      <p style="margin-top: 30px;">Best regards,<br>The Sukha Senior Resort Team</p>
      
      <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #777; font-size: 12px;">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: visitor.email,
    subject: 'Your Visit Request to Sukha Senior Resort',
    html,
  });
}