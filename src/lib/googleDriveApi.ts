export interface GoogleDriveRealFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  owners?: { displayName: string; emailAddress: string }[];
  webViewLink?: string;
}

/**
 * Fetch files directly from Google Drive REST API v3 using user's OAuth Access Token
 */
export async function fetchRealGoogleDriveFiles(accessToken: string): Promise<GoogleDriveRealFile[]> {
  try {
    const url = 'https://www.googleapis.com/drive/v3/files?' + new URLSearchParams({
      pageSize: '20',
      fields: 'files(id, name, mimeType, size, modifiedTime, owners, webViewLink)',
      orderBy: 'modifiedTime desc',
      q: "trashed = false",
    });

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Google Drive API error (${response.status})`);
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Failed to fetch Google Drive files:', error);
    throw error;
  }
}
