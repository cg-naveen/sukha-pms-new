/**
 * Wabot WhatsApp Integration Service
 * Handles sending WhatsApp messages via Wabot API
 */

interface WabotSendMessageParams {
  phone: string;
  message: string;
}

interface WabotResponse {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Send a WhatsApp message via Wabot API
 */
export async function sendWabotMessage(
  phone: string,
  message: string,
  apiBaseUrl?: string,
  instanceId?: string,
  accessToken?: string
): Promise<WabotResponse> {
  try {
    const baseUrl = apiBaseUrl || process.env.WABOT_API_BASE_URL || 'https://app.wabot.my/api';
    const instance = instanceId || process.env.WABOT_INSTANCE_ID;
    const token = accessToken || process.env.WABOT_ACCESS_TOKEN;

    if (!instance || !token) {
      console.error('Wabot credentials not configured');
      return {
        success: false,
        error: 'Wabot credentials not configured. Please set WABOT_INSTANCE_ID and WABOT_ACCESS_TOKEN in environment variables.',
      };
    }

    // Format phone number (remove + and spaces, ensure it starts with country code)
    const formattedPhone = formatPhoneNumber(phone);

    // Wabot API endpoint for sending messages
    const url = `${baseUrl}/send-message`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        instance_id: instance,
        phone: formattedPhone,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Wabot API error:', errorData);
      return {
        success: false,
        error: errorData.message || `Wabot API returned status ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      message: 'Message sent successfully',
    };
  } catch (error: any) {
    console.error('Error sending Wabot message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send WhatsApp message',
    };
  }
}

/**
 * Format phone number for Wabot API
 * Removes +, spaces, and ensures proper format
 */
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters except leading +
  let formatted = phone.replace(/\s+/g, '').replace(/-/g, '');
  
  // If it starts with +, keep it, otherwise assume it's a local number
  if (formatted.startsWith('+')) {
    return formatted.substring(1); // Remove + as Wabot might not need it
  }
  
  // If it doesn't start with country code, assume Malaysia (+60)
  if (formatted.startsWith('60')) {
    return formatted;
  } else if (formatted.startsWith('0')) {
    // Convert 0XXXXXXXX to 60XXXXXXXX
    return '60' + formatted.substring(1);
  } else {
    // Assume it's already in international format without +
    return formatted;
  }
}

/**
 * Replace template variables in message
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string>
): string {
  let message = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    message = message.replace(regex, value || '');
  }
  return message;
}

