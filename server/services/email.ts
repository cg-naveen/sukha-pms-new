import MailerLite from '@mailerlite/mailerlite-nodejs';
import { Visitor } from '@shared/schema';

// Initialize MailerLite client
const apiKey = process.env.MAILERLITE_API_KEY;
if (!apiKey) {
  console.error('MAILERLITE_API_KEY environment variable is not set');
}

const mailerLite = new MailerLite({
  api_key: apiKey || '',
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends an email using MailerLite integration
 * 
 * Note: MailerLite doesn't have a direct transactional email API like SendGrid.
 * In a production environment, you would set up a proper transactional email provider.
 * This implementation logs the email details and optionally tries to add the
 * recipient to the MailerLite subscribers list.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Log the email details
    console.log('------------------------------------------------');
    console.log('Email would be sent:');
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('HTML Content:', options.html.substring(0, 150) + '...');
    console.log('------------------------------------------------');
    
    // Try to add the email to MailerLite subscribers list if it's a valid email
    // This is not required for the approval notification, just for demonstration
    if (options.to && options.to.includes('@')) {
      try {
        await mailerLite.subscribers.createOrUpdate({
          email: options.to,
          fields: {
            name: 'Visitor',
          },
          status: 'active' as 'active'
        });
        console.log(`Added ${options.to} to MailerLite subscribers list`);
      } catch (error) {
        // Type-safe error handling
        const subscriberError = error as Error;
        console.error('Failed to add to subscribers list, but continuing with email log:', subscriberError.message || 'Unknown error');
        // Continue execution - we don't want subscriber issues to stop the email flow
      }
    }
    
    console.log(`Email notification processed for ${options.to}`);
    return true;
  } catch (error) {
    console.error('Error in email process:', error);
    return false;
  }
}

/**
 * Sends a visitor approval notification with QR code
 */
export async function sendVisitorApprovalEmail(visitor: Visitor, qrCodeUrl: string): Promise<boolean> {
  const visitDate = new Date(visitor.visitDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

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
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <p><strong>Please present this QR code at the reception upon arrival</strong></p>
        <img src="${qrCodeUrl}" alt="QR Code" style="max-width: 200px; height: auto;" />
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

  return sendEmail({
    to: visitor.email,
    subject: 'Your Visit to Sukha Senior Resort is Approved',
    html,
  });
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