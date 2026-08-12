import firebaseConfig from '../../firebase-applet-config.json';

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

export interface GoogleDriveRealFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  owners?: { displayName: string; emailAddress: string }[];
  webViewLink?: string;
}

export interface PickedPickerFile {
  id: string;
  name: string;
  mimeType: string;
  url?: string;
  sizeBytes?: number;
}

/**
 * Dynamically loads Google Identity Services (GIS) SDK (https://accounts.google.com/gsi/client)
 */
export function loadGoogleGsiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const scriptId = 'google-gsi-client';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google Identity Services SDK'));
    document.body.appendChild(script);
  });
}

/**
 * Request Google OAuth Authorization Code via GIS Code Client (initCodeClient with access_type=offline).
 * This obtains a single-use code that is sent to the backend to exchange for a Refresh Token (FR-9.1 & FR-6.2).
 */
export function requestGoogleAuthCode({
  clientId,
  scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  callback,
}: {
  clientId?: string;
  scope?: string;
  callback: (response: { code?: string; error?: any }) => void;
}) {
  loadGoogleGsiScript()
    .then(() => {
      if (!window.google?.accounts?.oauth2) {
        callback({ error: 'GIS library not loaded' });
        return;
      }

      const effectiveClientId = clientId || firebaseConfig.oAuthClientId || '330547849960-sf6q2k37j7nukb0u5i7b8co97r692pbn.apps.googleusercontent.com';

      const codeClient = window.google.accounts.oauth2.initCodeClient({
        client_id: effectiveClientId,
        scope: scope,
        ux_mode: 'popup',
        access_type: 'offline', // CRITICAL for receiving refresh_token at backend
        callback: (resp: any) => {
          if (resp.error) {
            console.warn('GIS Code Client error:', resp);
          }
          callback(resp);
        },
      });

      codeClient.requestCode();
    })
    .catch((err) => {
      console.error('Failed to load GIS for Code Client:', err);
      callback({ error: err.message });
    });
}

/**
 * Request real Google OAuth Access Token via Google Identity Services popup
 */
export function requestGoogleAccessToken({
  clientId,
  scope = 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
  callback,
}: {
  clientId?: string;
  scope?: string;
  callback: (response: { access_token?: string; error?: any }) => void;
}) {
  loadGoogleGsiScript()
    .then(() => {
      if (!window.google?.accounts?.oauth2) {
        callback({ error: 'GIS library not loaded' });
        return;
      }

      // Default Client ID or passed Client ID
      const effectiveClientId = clientId || firebaseConfig.oAuthClientId || '330547849960-sf6q2k37j7nukb0u5i7b8co97r692pbn.apps.googleusercontent.com';

      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: scope,
        callback: (resp: any) => {
          if (resp.error) {
            console.warn('GIS OAuth Token error:', resp);
          }
          callback(resp);
        },
      });

      tokenClient.requestAccessToken({ prompt: '' });
    })
    .catch((err) => {
      console.error('Failed to load GIS:', err);
      callback({ error: err.message });
    });
}

/**
 * Dynamically loads Google API script (https://apis.google.com/js/api.js) and gapi.load('picker')
 */
export function loadGooglePickerScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.gapi && window.google?.picker) {
      resolve();
      return;
    }

    if (window.gapi) {
      window.gapi.load('picker', () => resolve());
      return;
    }

    const scriptId = 'google-api-js-picker';
    const existingScript = document.getElementById(scriptId) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener('load', () => {
        if (window.gapi) {
          window.gapi.load('picker', () => resolve());
        } else {
          reject(new Error('Google API script loaded but gapi object missing.'));
        }
      });
      return;
    }

    const script = document.createElement('script');
    script.id = scriptId;
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.gapi) {
        window.gapi.load('picker', () => resolve());
      } else {
        reject(new Error('Google API script loaded but gapi object missing.'));
      }
    };
    script.onerror = () => reject(new Error('Failed to load Google API script (https://apis.google.com/js/api.js)'));
    document.body.appendChild(script);
  });
}

/**
 * Removes any orphan Google Picker backdrop or dialog elements inserted into document.body
 */
export function cleanUpGooglePickerDOM() {
  if (typeof document === 'undefined') return;
  try {
    const selector = '.picker-dialog, .picker-dialog-bg, [class*="picker-dialog"], iframe[src*="google.com/picker"]';
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      try {
        el.remove();
      } catch (e) {
        // ignore
      }
    });
  } catch (err) {
    console.warn('Failed to clean up Google Picker DOM:', err);
  }
}

/**
 * Launches the native Google Picker API popup using drive.file scope with cleanup safety
 */
export async function openGooglePickerPopup({
  accessToken,
  onPicked,
  onError,
}: {
  accessToken: string;
  onPicked: (files: PickedPickerFile[]) => void;
  onError?: (err: Error) => void;
}) {
  // Clean up any old picker overlays first
  cleanUpGooglePickerDOM();

  if (!accessToken) {
    if (onError) {
      onError(new Error('Thiếu Google OAuth Access Token. Vui lòng đăng nhập Google.'));
    }
    return;
  }

  // Try requesting Storage Access API to prevent Third-Party Cookie blocking inside iframes
  if (typeof document !== 'undefined' && 'requestStorageAccess' in document) {
    try {
      await (document as any).requestStorageAccess();
    } catch (e) {
      // Storage access request denied or not required, continue
    }
  }

  loadGooglePickerScript()
    .then(() => {
      if (!window.google?.picker) {
        throw new Error('Google Picker API library is not available');
      }

      const docsView = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
        .setMimeTypes('application/vnd.google-apps.spreadsheet,application/vnd.google-apps.document,application/vnd.google-apps.folder,application/pdf,image/png,image/jpeg,text/csv,text/plain')
        .setSelectFolderEnabled(true)
        .setIncludeFolders(true);

      const appId = (firebaseConfig as any).projectId || '330547849960';

      // Safe origin check: Avoid setting origin = 'null' which crashes Google Picker SDK in sandboxed iframes
      let origin = window.location.origin;
      if (!origin || origin === 'null') {
        origin = window.location.protocol + '//' + window.location.host;
      }

      const pickerBuilder = new window.google.picker.PickerBuilder()
        .addView(docsView)
        .addView(new window.google.picker.DocsUploadView())
        .setOAuthToken(accessToken)
        .setAppId(appId);

      // ONLY setOrigin when origin is valid and NOT 'null'
      if (origin && origin !== 'null') {
        pickerBuilder.setOrigin(origin);
      }

      const picker = pickerBuilder
        .setCallback((data: any) => {
          if (data.action === window.google.picker.Action.PICKED) {
            cleanUpGooglePickerDOM();
            const docs = data.docs || [];
            onPicked(
              docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                url: doc.url,
                sizeBytes: doc.sizeBytes,
              }))
            );
          } else if (data.action === window.google.picker.Action.CANCEL) {
            cleanUpGooglePickerDOM();
            console.log('User cancelled Google Picker');
          }
        })
        .build();

      try {
        picker.setVisible(true);
      } catch (visErr: any) {
        cleanUpGooglePickerDOM();
        console.warn('Google Picker setVisible failed in iframe sandbox:', visErr);
        if (onError) onError(visErr instanceof Error ? visErr : new Error('Google Picker popup blocked in iframe sandbox'));
        return;
      }

      // Auto-cleanup timer if frame gets blocked by sandbox
      setTimeout(() => {
        const dialog = document.querySelector('.picker-dialog');
        if (dialog) {
          // If dialog exists but has empty iframe content or is blocked
          const iframe = dialog.querySelector('iframe');
          if (iframe && (!iframe.contentDocument || iframe.contentDocument.body?.children?.length === 0)) {
            cleanUpGooglePickerDOM();
            if (onError) {
              onError(new Error('Giao diện Google Picker Popup bị chặn bởi sandbox. Vui lòng thử lại hoặc cấp quyền Google OAuth.'));
            }
          }
        }
      }, 2000);
    })
    .catch((err) => {
      cleanUpGooglePickerDOM();
      console.error('Error launching Google Picker Popup:', err);
      if (onError) onError(err);
    });
}

export interface DriveFileRestItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  size?: string;
  modifiedTime?: string;
}

/**
 * Direct REST API fallback: Lấy danh sách file mà app có quyền truy cập qua Drive v3 REST API
 */
export async function fetchUserDriveFiles(accessToken: string): Promise<DriveFileRestItem[]> {
  if (!accessToken) {
    throw new Error('Cần có Access Token để gọi Google Drive API');
  }

  const query = "trashed = false and (mimeType = 'application/vnd.google-apps.spreadsheet' or mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or mimeType = 'application/vnd.google-apps.document' or mimeType = 'application/pdf' or mimeType = 'text/csv')";

  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType,webViewLink,size,modifiedTime)&pageSize=30`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Google Drive REST API error (${response.status})`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Create a new sample Google Sheet on the user's Drive using REST API v3 under drive.file scope
 */
export async function createSampleDriveFile(accessToken: string, title = 'EventKnow - Kịch bản sự kiện mẫu'): Promise<DriveFileRestItem> {
  if (!accessToken) {
    throw new Error('Cần có Access Token để tạo tệp trên Google Drive');
  }

  const metadata = {
    name: title,
    mimeType: 'application/vnd.google-apps.spreadsheet',
  };

  const response = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name,mimeType,webViewLink,size,modifiedTime', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });

  if (!response.ok) {
    const errJson = await response.json().catch(() => ({}));
    throw new Error(errJson.error?.message || `Lỗi tạo tệp Google Drive (${response.status})`);
  }

  return await response.json();
}


