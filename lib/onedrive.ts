/**
 * OneDrive Integration Service
 * 
 * This service handles file uploads, downloads, and deletions to/from Microsoft OneDrive.
 * 
 * Required Environment Variables:
 * - ONEDRIVE_CLIENT_ID: Microsoft Azure App Client ID
 * - ONEDRIVE_CLIENT_SECRET: Microsoft Azure App Client Secret
 * - ONEDRIVE_TENANT_ID: Azure AD Tenant ID (optional, defaults to 'common')
 * - ONEDRIVE_REFRESH_TOKEN: OAuth refresh token for accessing OneDrive
 * - ONEDRIVE_ROOT_FOLDER: Root folder path in OneDrive (e.g., 'SukhaPMS/Documents')
 */

interface OneDriveUploadOptions {
  folder: string;
  fileName?: string;
}

interface OneDriveFileResult {
  id: string;
  name: string;
  webUrl: string;
  downloadUrl?: string;
  size?: number;
}

let accessToken: string | null = null;
let tokenExpiry: number = 0;

/**
 * Get access token from Microsoft Graph API
 */
async function getAccessToken(): Promise<string> {
  // If we have a valid token, return it
  if (accessToken && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const clientId = process.env.ONEDRIVE_CLIENT_ID;
  const clientSecret = process.env.ONEDRIVE_CLIENT_SECRET;
  const tenantId = process.env.ONEDRIVE_TENANT_ID || 'common';
  const refreshToken = process.env.ONEDRIVE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('OneDrive credentials not configured. Please set ONEDRIVE_CLIENT_ID, ONEDRIVE_CLIENT_SECRET, and ONEDRIVE_REFRESH_TOKEN in environment variables.');
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
    
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      scope: 'https://graph.microsoft.com/.default offline_access',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    // Set expiry to 5 minutes before actual expiry for safety
    tokenExpiry = Date.now() + (data.expires_in - 300) * 1000;

    return accessToken;
  } catch (error: any) {
    console.error('Error getting OneDrive access token:', error);
    throw new Error(`OneDrive authentication failed: ${error.message}`);
  }
}

/**
 * Ensure folder exists in OneDrive, create if it doesn't
 */
async function ensureFolder(folderPath: string): Promise<string> {
  const rootFolder = process.env.ONEDRIVE_ROOT_FOLDER || 'SukhaPMS/Documents';
  const fullPath = `${rootFolder}/${folderPath}`;
  const parts = fullPath.split('/').filter(p => p);

  let currentFolderId = 'root'; // Start from root

  for (const part of parts) {
    try {
      // Check if folder exists
      const checkUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${currentFolderId}/children?$filter=name eq '${encodeURIComponent(part)}' and folder ne null`;
      const token = await getAccessToken();
      
      const checkResponse = await fetch(checkUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        if (checkData.value && checkData.value.length > 0) {
          currentFolderId = checkData.value[0].id;
          continue;
        }
      }

      // Folder doesn't exist, create it
      const createUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${currentFolderId}/children`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: part,
          folder: {},
          '@microsoft.graph.conflictBehavior': 'rename',
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`Failed to create folder: ${error}`);
      }

      const createData = await createResponse.json();
      currentFolderId = createData.id;
    } catch (error: any) {
      console.error(`Error ensuring folder ${part}:`, error);
      throw error;
    }
  }

  return currentFolderId;
}

/**
 * Upload file to OneDrive
 */
export async function uploadToOneDrive(
  file: Buffer | File,
  fileName: string,
  mimeType: string,
  options: OneDriveUploadOptions
): Promise<OneDriveFileResult> {
  try {
    // Ensure folder exists
    const folderId = await ensureFolder(options.folder);

    // Get upload session URL
    const finalFileName = options.fileName || fileName;
    const token = await getAccessToken();
    
    const uploadUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}:/${encodeURIComponent(finalFileName)}:/createUploadSession`;
    
    const sessionResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        '@microsoft.graph.conflictBehavior': 'rename',
      }),
    });

    if (!sessionResponse.ok) {
      const error = await sessionResponse.text();
      throw new Error(`Failed to create upload session: ${error}`);
    }

    const sessionData = await sessionResponse.json();
    const uploadUrl_session = sessionData.uploadUrl;

    // Convert File to Buffer if needed
    let buffer: Buffer;
    if (file instanceof File) {
      const arrayBuffer = await file.arrayBuffer();
      buffer = Buffer.from(arrayBuffer);
    } else {
      buffer = file;
    }

    // Upload file in chunks (for files > 4MB, Graph API requires chunked upload)
    const chunkSize = 4 * 1024 * 1024; // 4MB chunks
    const totalSize = buffer.length;

    if (totalSize <= chunkSize) {
      // Small file, upload in one go
      const uploadResponse = await fetch(uploadUrl_session, {
        method: 'PUT',
        headers: {
          'Content-Length': totalSize.toString(),
          'Content-Range': `bytes 0-${totalSize - 1}/${totalSize}`,
        },
        body: buffer,
      });

      if (!uploadResponse.ok) {
        const error = await uploadResponse.text();
        throw new Error(`Upload failed: ${error}`);
      }

      const uploadData = await uploadResponse.json();
      return {
        id: uploadData.id,
        name: uploadData.name,
        webUrl: uploadData.webUrl,
        downloadUrl: uploadData['@microsoft.graph.downloadUrl'],
        size: uploadData.size,
      };
    } else {
      // Large file, upload in chunks
      let uploadedBytes = 0;
      let fileId: string | null = null;

      while (uploadedBytes < totalSize) {
        const chunkEnd = Math.min(uploadedBytes + chunkSize - 1, totalSize - 1);
        const chunk = buffer.slice(uploadedBytes, chunkEnd + 1);

        const chunkResponse = await fetch(uploadUrl_session, {
          method: 'PUT',
          headers: {
            'Content-Length': (chunkEnd - uploadedBytes + 1).toString(),
            'Content-Range': `bytes ${uploadedBytes}-${chunkEnd}/${totalSize}`,
          },
          body: chunk,
        });

        if (!chunkResponse.ok) {
          const error = await chunkResponse.text();
          throw new Error(`Chunk upload failed: ${error}`);
        }

        const chunkData = await chunkResponse.json();
        if (chunkData.id) {
          fileId = chunkData.id;
        }

        uploadedBytes = chunkEnd + 1;
      }

      // Get final file info
      if (!fileId) {
        throw new Error('File ID not returned after upload');
      }

      const fileInfoUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`;
      const fileInfoResponse = await fetch(fileInfoUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!fileInfoResponse.ok) {
        throw new Error('Failed to get file info after upload');
      }

      const fileInfo = await fileInfoResponse.json();
      return {
        id: fileInfo.id,
        name: fileInfo.name,
        webUrl: fileInfo.webUrl,
        downloadUrl: fileInfo['@microsoft.graph.downloadUrl'],
        size: fileInfo.size,
      };
    }
  } catch (error: any) {
    console.error('Error uploading to OneDrive:', error);
    throw error;
  }
}

/**
 * Download file from OneDrive
 */
export async function downloadFromOneDrive(fileIdOrPath: string): Promise<Buffer> {
  try {
    const token = await getAccessToken();
    
    // If it's a file ID, use it directly; otherwise, it might be a path
    let downloadUrl: string;
    
    if (fileIdOrPath.startsWith('http')) {
      // It's already a URL
      downloadUrl = fileIdOrPath;
    } else {
      // Get download URL from file ID
      const fileUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileIdOrPath}`;
      const fileResponse = await fetch(fileUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!fileResponse.ok) {
        throw new Error('File not found in OneDrive');
      }

      const fileData = await fileResponse.json();
      downloadUrl = fileData['@microsoft.graph.downloadUrl'] || fileData.webUrl;
    }

    // Download the file
    const downloadResponse = await fetch(downloadUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!downloadResponse.ok) {
      throw new Error('Failed to download file from OneDrive');
    }

    const arrayBuffer = await downloadResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error: any) {
    console.error('Error downloading from OneDrive:', error);
    throw error;
  }
}

/**
 * Delete file from OneDrive
 */
export async function deleteFromOneDrive(fileIdOrPath: string): Promise<void> {
  try {
    const token = await getAccessToken();
    
    // If it's a URL, extract the file ID; otherwise use it as ID
    let fileId = fileIdOrPath;
    if (fileIdOrPath.startsWith('http')) {
      // Extract ID from URL (this is a simplified approach)
      const match = fileIdOrPath.match(/\/items\/([^\/\?]+)/);
      if (match) {
        fileId = match[1];
      }
    }

    const deleteUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`;
    const deleteResponse = await fetch(deleteUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!deleteResponse.ok && deleteResponse.status !== 404) {
      const error = await deleteResponse.text();
      throw new Error(`Failed to delete file from OneDrive: ${error}`);
    }
  } catch (error: any) {
    console.error('Error deleting from OneDrive:', error);
    throw error;
  }
}

/**
 * Get file info from OneDrive
 */
export async function getOneDriveFileInfo(fileId: string): Promise<OneDriveFileResult> {
  try {
    const token = await getAccessToken();
    
    const fileUrl = `https://graph.microsoft.com/v1.0/me/drive/items/${fileId}`;
    const fileResponse = await fetch(fileUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!fileResponse.ok) {
      throw new Error('File not found in OneDrive');
    }

    const fileData = await fileResponse.json();
    return {
      id: fileData.id,
      name: fileData.name,
      webUrl: fileData.webUrl,
      downloadUrl: fileData['@microsoft.graph.downloadUrl'],
      size: fileData.size,
    };
  } catch (error: any) {
    console.error('Error getting OneDrive file info:', error);
    throw error;
  }
}

