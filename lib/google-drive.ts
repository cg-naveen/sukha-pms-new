/**
 * Google Drive Integration Service
 * 
 * This service handles file uploads, downloads, and deletions to/from Google Drive.
 * 
 * Required Environment Variables:
 * Option 1 - OAuth 2.0 (Recommended – uses your Drive, no storage quota issues):
 * - GOOGLE_CLIENT_ID: Google OAuth Client ID
 * - GOOGLE_CLIENT_SECRET: Google OAuth Client Secret
 * - GOOGLE_REFRESH_TOKEN: OAuth refresh token (one-time setup)
 * 
 * Option 2 - Service Account (requires folder in your Drive shared with SA):
 * - GOOGLE_SERVICE_ACCOUNT_KEY: JSON string of service account credentials
 * - GOOGLE_DRIVE_ROOT_FOLDER_ID: Folder in your Drive shared with the service account
 * 
 * Optional:
 * - GOOGLE_DRIVE_ROOT_FOLDER_ID: Root folder ID (for OAuth: optional; for Service Account: required)
 */

import { google } from 'googleapis';
import { Readable } from 'stream';

interface GoogleDriveUploadOptions {
  folder: string;
  fileName?: string;
}

interface GoogleDriveFileResult {
  id: string;
  name: string;
  webViewLink: string;
  webContentLink?: string;
  size?: number;
}

let driveClient: any = null;
let usingOAuth = false;
/** Cache folder path -> folder ID so we reuse "residents", "residents/7", etc. and don't create duplicates */
const folderIdCache = new Map<string, string>();

/**
 * Get authenticated Google Drive client.
 * Prefers OAuth when OAuth credentials are set (uses your Drive – no storage quota issues).
 */
function getDriveClient() {
  if (driveClient) {
    return driveClient;
  }

  try {
    // Prefer OAuth 2.0 – uses your Google account's Drive (has storage quota)
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim().replace(/^["']|["']$/g, '');
    const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim().replace(/^["']|["']$/g, '');
    const refreshToken = (process.env.GOOGLE_REFRESH_TOKEN || '').trim().replace(/^["']|["']$/g, '');

    if (clientId && clientSecret && refreshToken) {
      const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        (process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback').trim().replace(/^["']|["']$/g, '')
      );

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      usingOAuth = true;
      driveClient = google.drive({ version: 'v3', auth: oauth2Client });
      return driveClient;
    }

    // Fallback to Service Account (must use a folder shared with the SA)
    if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
      const serviceAccountKey = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);

      const auth = new google.auth.GoogleAuth({
        credentials: serviceAccountKey,
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      usingOAuth = false;
      driveClient = google.drive({ version: 'v3', auth });
      return driveClient;
    }

    throw new Error('Google Drive credentials not configured. Set OAuth (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN) or Service Account (GOOGLE_SERVICE_ACCOUNT_KEY + GOOGLE_DRIVE_ROOT_FOLDER_ID).');
  } catch (error: any) {
    console.error('Error initializing Google Drive client:', error);
    throw new Error(`Google Drive authentication failed: ${error.message}`);
  }
}

/**
 * Ensure folder exists in Google Drive, create if it doesn't
 */
async function ensureFolder(folderPath: string): Promise<string> {
  const drive = getDriveClient();

  // OAuth: user's Drive has storage – use root or optional folder. Service Account: must use shared folder.
  const rootFolderId = usingOAuth
    ? (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim() || 'root'
    : (process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID || '').trim() || '1HiGAaY6aQuE-WOODAjMSg6A7c16peU05';
  const parts = folderPath.split('/').filter(p => p);

  let currentFolderId = rootFolderId;

  for (const folderName of parts) {
    const cacheKey = `${currentFolderId}|${folderName}`;
    try {
      // Reuse folder ID from cache so we don't create duplicate "residents" etc.
      const cached = folderIdCache.get(cacheKey);
      if (cached) {
        currentFolderId = cached;
        continue;
      }

      // Check if folder exists
      const response = await drive.files.list({
        q: `name='${folderName.replace(/'/g, "\\'")}' and '${currentFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
        fields: 'files(id, name)',
        spaces: 'drive',
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
      });

      if (response.data.files && response.data.files.length > 0) {
        currentFolderId = response.data.files[0].id;
        folderIdCache.set(cacheKey, currentFolderId);
      } else {
        const folderMetadata = {
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [currentFolderId],
        };

        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id',
          supportsAllDrives: true,
        });

        currentFolderId = folder.data.id;
        folderIdCache.set(cacheKey, currentFolderId);
      }
    } catch (error: any) {
      console.error(`Error ensuring folder ${folderName}:`, error);
      throw new Error(`Failed to create folder structure: ${error.message}`);
    }
  }

  return currentFolderId;
}

/**
 * Upload file to Google Drive
 */
export async function uploadToGoogleDrive(
  file: Buffer | File,
  fileName: string,
  mimeType: string,
  options: GoogleDriveUploadOptions
): Promise<GoogleDriveFileResult> {
  try {
    const drive = getDriveClient();

    // Ensure folder exists
    const folderId = await ensureFolder(options.folder);

    // Convert File to Buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    // Create readable stream from buffer
    const stream = Readable.from(buffer);

    const finalFileName = options.fileName || fileName;

    // Upload file
    const fileMetadata = {
      name: finalFileName,
      parents: [folderId],
    };

    const media = {
      mimeType: mimeType,
      body: stream,
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, name, webViewLink, webContentLink, size',
      supportsAllDrives: true,
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      size: response.data.size ? parseInt(response.data.size) : undefined,
    };
  } catch (error: any) {
    console.error('Error uploading to Google Drive:', error);
    throw new Error(`Google Drive upload failed: ${error.message}`);
  }
}

/**
 * Download file from Google Drive
 */
export async function downloadFromGoogleDrive(fileId: string): Promise<Buffer> {
  try {
    const drive = getDriveClient();

    const response = await drive.files.get(
      {
        fileId: fileId,
        alt: 'media',
      },
      { responseType: 'arraybuffer' }
    );

    return Buffer.from(response.data);
  } catch (error: any) {
    console.error('Error downloading from Google Drive:', error);
    throw new Error(`Google Drive download failed: ${error.message}`);
  }
}

/**
 * Delete file from Google Drive
 */
export async function deleteFromGoogleDrive(fileId: string): Promise<void> {
  try {
    const drive = getDriveClient();

    await drive.files.delete({
      fileId: fileId,
    });
  } catch (error: any) {
    // If file not found, consider it already deleted
    if (error.code === 404) {
      console.log('File not found in Google Drive, already deleted');
      return;
    }
    console.error('Error deleting from Google Drive:', error);
    throw new Error(`Google Drive deletion failed: ${error.message}`);
  }
}

/**
 * Get file info from Google Drive
 */
export async function getGoogleDriveFileInfo(fileId: string): Promise<GoogleDriveFileResult> {
  try {
    const drive = getDriveClient();

    const response = await drive.files.get({
      fileId: fileId,
      fields: 'id, name, webViewLink, webContentLink, size',
    });

    return {
      id: response.data.id,
      name: response.data.name,
      webViewLink: response.data.webViewLink,
      webContentLink: response.data.webContentLink,
      size: response.data.size ? parseInt(response.data.size) : undefined,
    };
  } catch (error: any) {
    console.error('Error getting Google Drive file info:', error);
    throw new Error(`Failed to get file info: ${error.message}`);
  }
}
