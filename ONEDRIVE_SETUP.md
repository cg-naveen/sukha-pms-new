# OneDrive Integration Setup Guide

This project supports storing files in Microsoft OneDrive. Follow these steps to configure it.

## Prerequisites

1. Microsoft Azure Account
2. Azure App Registration with OneDrive API permissions

## Step 1: Create Azure App Registration

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** > **App registrations**
3. Click **New registration**
4. Fill in:
   - **Name**: Sukha PMS OneDrive
   - **Supported account types**: Accounts in this organizational directory only
   - **Redirect URI**: `http://localhost:3000/auth/onedrive/callback` (for local dev)
5. Click **Register**

## Step 2: Configure API Permissions

1. In your app registration, go to **API permissions**
2. Click **Add a permission**
3. Select **Microsoft Graph**
4. Choose **Delegated permissions**
5. Add these permissions:
   - `Files.ReadWrite` - Read and write files in OneDrive
   - `offline_access` - Maintain access to data you have given it access to
6. Click **Add permissions**
7. Click **Grant admin consent** (if you're an admin)

## Step 3: Create Client Secret

1. Go to **Certificates & secrets**
2. Click **New client secret**
3. Add description and set expiration
4. Click **Add**
5. **Copy the secret value immediately** (you won't see it again)

## Step 4: Get Refresh Token

You need to get an OAuth refresh token. You can use this script or the Microsoft Graph Explorer:

### Option 1: Using OAuth Flow Script

Create a temporary script to get the refresh token:

```javascript
// get-onedrive-token.js
const https = require('https');
const readline = require('readline');

const CLIENT_ID = 'YOUR_CLIENT_ID';
const CLIENT_SECRET = 'YOUR_CLIENT_SECRET';
const TENANT_ID = 'YOUR_TENANT_ID';
const REDIRECT_URI = 'http://localhost:3000/auth/onedrive/callback';

// Step 1: Get authorization URL
const authUrl = `https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize?` +
  `client_id=${CLIENT_ID}&` +
  `response_type=code&` +
  `redirect_uri=${encodeURIComponent(REDIRECT_URI)}&` +
  `response_mode=query&` +
  `scope=https://graph.microsoft.com/Files.ReadWrite offline_access`;

console.log('Visit this URL and authorize:');
console.log(authUrl);
console.log('\nAfter authorization, paste the code from the redirect URL:');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question('Authorization code: ', (code) => {
  // Step 2: Exchange code for tokens
  const tokenData = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    scope: 'https://graph.microsoft.com/Files.ReadWrite offline_access'
  });

  const options = {
    hostname: 'login.microsoftonline.com',
    path: `/${TENANT_ID}/oauth2/v2.0/token`,
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': tokenData.toString().length
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      const tokens = JSON.parse(data);
      console.log('\n✅ Refresh Token:');
      console.log(tokens.refresh_token);
      console.log('\nAdd this to your .env file as ONEDRIVE_REFRESH_TOKEN');
    });
  });

  req.on('error', (e) => {
    console.error(`Problem: ${e.message}`);
  });

  req.write(tokenData.toString());
  req.end();
  
  rl.close();
});
```

### Option 2: Use Postman or Similar Tool

1. Make a POST request to:
   ```
   https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token
   ```
2. Body (x-www-form-urlencoded):
   - `client_id`: Your client ID
   - `client_secret`: Your client secret
   - `code`: Authorization code from OAuth flow
   - `redirect_uri`: Your redirect URI
   - `grant_type`: `authorization_code`
   - `scope`: `https://graph.microsoft.com/Files.ReadWrite offline_access`

## Step 5: Configure Environment Variables

Add these to your `.env.local` file:

```env
# OneDrive Configuration
ONEDRIVE_CLIENT_ID=your_client_id_here
ONEDRIVE_CLIENT_SECRET=your_client_secret_here
ONEDRIVE_TENANT_ID=your_tenant_id_here
ONEDRIVE_REFRESH_TOKEN=your_refresh_token_here
ONEDRIVE_ROOT_FOLDER=SukhaPMS/Documents
```

## Step 6: Test the Integration

Once configured, files uploaded through the documents feature will be stored in OneDrive at:
```
OneDrive/SukhaPMS/Documents/residents/{residentId}/documents/{filename}
```

## Fallback Behavior

If OneDrive is not configured (env variables missing), the system will automatically fall back to local file storage in the `uploads/documents/` directory.

## Troubleshooting

- **"OneDrive credentials not configured"**: Make sure all required env variables are set
- **"Failed to get access token"**: Check your client ID, secret, and refresh token
- **"File not found in OneDrive"**: The file might have been moved or deleted manually

