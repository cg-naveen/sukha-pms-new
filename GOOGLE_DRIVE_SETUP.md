# Google Drive Integration Setup Guide

This project supports storing resident documents in Google Drive.

## Quick start: OAuth (recommended – no storage quota issues)

OAuth uses **your** Google account’s Drive, so you don’t hit “Service Accounts do not have storage quota.”

1. **Google Cloud Console**: Create a project → enable **Google Drive API** → **Credentials** → **Create Credentials** → **OAuth client ID** (Web application). Add redirect URI: `http://localhost:3000/auth/google/callback`.
2. **Copy Client ID and Client Secret** into `.env.local`:
   ```env
   GOOGLE_CLIENT_ID="xxx.apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="xxx"
   ```
3. **Get a refresh token**: run  
   `GOOGLE_CLIENT_ID=xxx GOOGLE_CLIENT_SECRET=xxx node scripts/get-google-drive-refresh-token.js`  
   (or set the vars in `.env.local` and run `node scripts/get-google-drive-refresh-token.js`).  
   Open the URL it prints, sign in, then paste the `code` from the redirect URL.
4. **Add the refresh token** to `.env.local`:
   ```env
   GOOGLE_REFRESH_TOKEN="xxx"
   ```
5. **Use OAuth only**: remove or comment out `GOOGLE_SERVICE_ACCOUNT_KEY` so the app uses OAuth.
6. Restart the app and upload a document – it will go to your Drive under `residents/{id}/documents/`.

---

## Prerequisites

1. Google Account
2. Google Cloud Project
3. Google Drive API enabled

## Setup Options

- **Option 1: OAuth 2.0** (Recommended – uses your Drive, no storage quota issues)
- **Option 2: Service Account** (requires a folder in your Drive shared with the service account)

---

## Option 2: Service Account Setup

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Click **Select a project** → **New Project**
3. Enter project name: `Sukha PMS`
4. Click **Create**

### Step 2: Enable Google Drive API

1. In your project, go to **APIs & Services** → **Library**
2. Search for "Google Drive API"
3. Click on it and press **Enable**

### Step 3: Create Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in:
   - **Service account name**: `sukha-pms-drive`
   - **Service account ID**: (auto-generated)
   - **Description**: "Service account for Sukha PMS file storage"
4. Click **Create and Continue**
5. Skip the optional steps (roles and user access)
6. Click **Done**

### Step 4: Create Service Account Key

1. In **Credentials**, find your service account
2. Click on the service account email
3. Go to **Keys** tab
4. Click **Add Key** → **Create new key**
5. Choose **JSON** format
6. Click **Create**
7. A JSON file will be downloaded - **keep this secure!**

### Step 5: Configure Environment Variables

1. Open the downloaded JSON file
2. Copy the entire JSON content
3. Add to your `.env` file (as a single line):

```env
GOOGLE_SERVICE_ACCOUNT_KEY='{"type":"service_account","project_id":"your-project-id","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"sukha-pms-drive@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Important**: Make sure the entire JSON is on one line and wrapped in single quotes.

### Step 6: Create Root Folder (Required for Service Account)

Service accounts have **no Drive storage**. You must use a folder in your own Google Drive and share it with the service account.

1. Go to [Google Drive](https://drive.google.com)
2. Create a folder named `SukhaPMS` (or any name)
3. Right-click the folder → **Share**
4. Add your service account email (from the JSON file: `client_email`, e.g. `xxx@your-project.iam.gserviceaccount.com`)
5. Give it **Editor** access
6. Copy the folder ID from the URL (the part after `/folders/`)
7. Add to `.env`:

```env
GOOGLE_DRIVE_ROOT_FOLDER_ID="your_folder_id_here"
```

Without this, uploads will fail with "Service Accounts do not have storage quota".

### Step 7: Test the Integration

1. Restart your application
2. Upload a document for a resident
3. Check Google Drive - you should see:
   ```
   SukhaPMS/
   └── residents/
       └── {residentId}/
           └── documents/
               └── {filename}
   ```

---

## Option 1: OAuth 2.0 Setup (Recommended – no storage quota)

### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (if you haven't already)
3. Enable Google Drive API
4. Go to **APIs & Services** → **Credentials**
5. Click **Create Credentials** → **OAuth client ID**
6. If prompted, configure the OAuth consent screen:
   - User Type: **External**
   - App name: `Sukha PMS`
   - User support email: Your email
   - Developer contact: Your email
   - Add scope: `https://www.googleapis.com/auth/drive.file`
7. Application type: **Web application**
8. Name: `Sukha PMS Web`
9. Authorized redirect URIs: `http://localhost:3000/auth/google/callback`
10. Click **Create**
11. Copy the **Client ID** and **Client Secret**

### Step 2: Get Refresh Token

Run the project script (set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env.local` first, or pass them):

```bash
node scripts/get-google-drive-refresh-token.js
```

Open the URL it prints, sign in with the Google account you want to use for Drive, then paste the `code` from the redirect URL. Copy the printed `GOOGLE_REFRESH_TOKEN` into `.env.local`.

### Step 3: Configure Environment Variables

Add to your `.env` file:

```env
GOOGLE_CLIENT_ID="your_client_id_here"
GOOGLE_CLIENT_SECRET="your_client_secret_here"
GOOGLE_REFRESH_TOKEN="your_refresh_token_here"
GOOGLE_DRIVE_ROOT_FOLDER_ID="optional_folder_id"
```

---

## File Storage Structure

Files are organized in Google Drive as follows:

```
Google Drive/
└── [Root Folder] (required for Service Account; set GOOGLE_DRIVE_ROOT_FOLDER_ID)
    └── residents/
        └── {residentId}/
            └── documents/
                ├── document1.pdf
                ├── document2.jpg
                └── ...
```

---

## Fallback Behavior

If Google Drive is not configured (environment variables missing), the system will automatically fall back to local file storage in the `uploads/documents/` directory.

---

## Troubleshooting

### "Google Drive credentials not configured"
- Make sure you've set either `GOOGLE_SERVICE_ACCOUNT_KEY` or all OAuth variables
- Check that the JSON is properly formatted (single line, wrapped in single quotes)

### "Failed to get access token"
- For service account: Verify the JSON key is correct
- For OAuth: Check your client ID, secret, and refresh token

### "Permission denied"
- For service account: Make sure you've shared the root folder with the service account email
- For OAuth: Ensure you've granted the correct scopes during authorization

### "File not found in Google Drive"
- The file might have been moved or deleted manually
- Check that the file ID is correct in the database

### "Quota exceeded"
- Google Drive API has usage limits
- Free tier: 1 billion queries per day
- If exceeded, wait 24 hours or upgrade to paid plan

---

## Security Best Practices

1. **Never commit credentials to git**
   - Add `.env` to `.gitignore`
   - Use environment variables in production

2. **Restrict service account permissions**
   - Only share necessary folders
   - Use least privilege principle

3. **Rotate keys regularly**
   - Create new service account keys periodically
   - Delete old keys

4. **Monitor API usage**
   - Check Google Cloud Console for unusual activity
   - Set up billing alerts

---

## Comparison: Service Account vs OAuth 2.0

| Feature | Service Account | OAuth 2.0 |
|---------|----------------|-----------|
| **Setup Complexity** | Simple | Complex |
| **User Authentication** | Not needed | Required |
| **File Ownership** | Service account | User account |
| **Token Management** | Automatic | Manual refresh |
| **Best For** | Backend automation | User-facing apps |
| **Recommended** | ✅ Yes | For specific use cases |

---

## Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [Service Account Guide](https://cloud.google.com/iam/docs/service-accounts)
- [OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [googleapis npm package](https://www.npmjs.com/package/googleapis)

---

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review application logs for error messages
3. Verify your credentials are correct
4. Ensure Google Drive API is enabled in your project
