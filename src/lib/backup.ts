import { api } from '@/lib/http';
import { exportDeviceKeyPair, restoreDeviceKeyPair } from '@/lib/e2ee';
import { isNative } from '@/lib/native';

const BACKUP_FORMAT = 'chatimall-encrypted-backup';
const BACKUP_VERSION = 1;
const PBKDF2_ITERATIONS = 310_000;
const MAX_BACKUP_BYTES = 500 * 1024 * 1024;
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

interface BackupData {
  version: number;
  exported_at: string;
  conversations: Array<Record<string, unknown>>;
  messages: Array<Record<string, unknown>>;
}

interface BackupEnvelope {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  kdf: 'PBKDF2-SHA-256';
  iterations: typeof PBKDF2_ITERATIONS;
  cipher: 'AES-256-GCM';
  salt: string;
  iv: string;
  ciphertext: string;
}

export interface GoogleDriveBackup {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

interface GoogleIdentityTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleIdentityTokenClient {
  requestAccessToken: (options?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: GoogleIdentityTokenResponse) => void;
            error_callback: (error: { type?: string; message?: string }) => void;
          }) => GoogleIdentityTokenClient;
        };
      };
    };
  }
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
};

const asArrayBuffer = (bytes: Uint8Array): ArrayBuffer => bytes.slice().buffer as ArrayBuffer;

async function encryptionKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: asArrayBuffer(salt), iterations: PBKDF2_ITERATIONS },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

function validatePassword(password: string): void {
  if (password.length < 12) throw new Error('Use a backup password with at least 12 characters.');
}

function googleClientId(): string {
  const clientId = (import.meta.env as ImportMetaEnv & { VITE_GOOGLE_CLIENT_ID?: string }).VITE_GOOGLE_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error('Google Drive is not configured. Add VITE_GOOGLE_CLIENT_ID to the frontend deployment settings.');
  }
  return clientId;
}

function getDriveAccessToken(): Promise<string> {
  if (isNative()) {
    throw new Error('Google Drive sign-in in the Android app needs a native Google OAuth client. Use the web app for backups for now.');
  }
  const clientId = googleClientId();
  const tokenClientFactory = window.google?.accounts?.oauth2?.initTokenClient;
  if (!tokenClientFactory) {
    throw new Error('Google sign-in did not load. Check your connection and try again.');
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const client = tokenClientFactory({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: (response) => {
        if (settled) return;
        settled = true;
        if (response.access_token) resolve(response.access_token);
        else reject(new Error(response.error_description || response.error || 'Google Drive authorization was not completed.'));
      },
      error_callback: (error) => {
        if (settled) return;
        settled = true;
        reject(new Error(error.message || 'Google Drive authorization was closed or blocked.'));
      },
    });
    client.requestAccessToken();
  });
}

async function createEncryptedBackup(password: string, userId: string): Promise<Blob> {
  validatePassword(password);
  const chatData = await api<BackupData>('/api/me/backup/data');
  if (chatData.version !== 1 || !Array.isArray(chatData.conversations) || !Array.isArray(chatData.messages)) {
    throw new Error('The server returned invalid backup data.');
  }

  const payload = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    user_id: userId,
    created_at: new Date().toISOString(),
    key_pair: await exportDeviceKeyPair(),
    chat_data: chatData,
  };
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: asArrayBuffer(iv) },
    key,
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const envelope: BackupEnvelope = {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations: PBKDF2_ITERATIONS,
    cipher: 'AES-256-GCM',
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  };
  const backup = new Blob([JSON.stringify(envelope)], { type: 'application/octet-stream' });
  if (backup.size > MAX_BACKUP_BYTES) throw new Error('This backup is larger than the supported 500 MB limit.');
  return backup;
}

async function driveRequest<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...init.headers },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    throw new Error(error?.error?.message || `Google Drive request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

export async function listDriveBackups(): Promise<GoogleDriveBackup[]> {
  const token = await getDriveAccessToken();
  const query = new URLSearchParams({
    q: "appProperties has { key='chatimallBackup' and value='true' } and trashed=false",
    orderBy: 'modifiedTime desc',
    pageSize: '100',
    fields: 'files(id,name,modifiedTime,size)',
  });
  const result = await driveRequest<{ files?: GoogleDriveBackup[] }>(`${DRIVE_FILES_URL}?${query}`, token);
  return result.files ?? [];
}

export async function uploadDriveBackup(password: string, userId: string): Promise<GoogleDriveBackup> {
  const [token, backup] = await Promise.all([
    getDriveAccessToken(),
    createEncryptedBackup(password, userId),
  ]);
  const metadata = {
    name: `Chatimall backup ${new Date().toISOString().slice(0, 10)}.chatimall`,
    mimeType: 'application/octet-stream',
    appProperties: { chatimallBackup: 'true' },
  };
  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', backup);
  const result = await driveRequest<GoogleDriveBackup>(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size',
    token,
    { method: 'POST', body: form }
  );
  return result;
}

export async function restoreDriveBackup(fileId: string, password: string, userId: string): Promise<void> {
  validatePassword(password);
  const token = await getDriveAccessToken();
  const backup = await fetch(`${DRIVE_FILES_URL}/${encodeURIComponent(fileId)}?alt=media`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!backup.ok) throw new Error(`Could not download the Google Drive backup (${backup.status}).`);
  const backupBlob = await backup.blob();
  if (backupBlob.size > MAX_BACKUP_BYTES) throw new Error('This backup file is larger than the supported 500 MB limit.');
  await restoreEncryptedBackup(backupBlob, password, userId);
}

export async function restoreEncryptedBackup(file: Blob, password: string, userId: string): Promise<void> {
  validatePassword(password);
  if (file.size > MAX_BACKUP_BYTES) throw new Error('This backup file is larger than the supported 500 MB limit.');

  let envelope: BackupEnvelope;
  try {
    envelope = JSON.parse(await file.text()) as BackupEnvelope;
  } catch {
    throw new Error('This is not a valid Chatimall backup file.');
  }
  if (
    envelope.format !== BACKUP_FORMAT
    || envelope.version !== BACKUP_VERSION
    || envelope.kdf !== 'PBKDF2-SHA-256'
    || envelope.iterations !== PBKDF2_ITERATIONS
    || envelope.cipher !== 'AES-256-GCM'
    || typeof envelope.salt !== 'string'
    || typeof envelope.iv !== 'string'
    || typeof envelope.ciphertext !== 'string'
  ) {
    throw new Error('This backup file is invalid or not supported.');
  }

  let payload: {
    format?: string;
    version?: number;
    user_id?: string;
    key_pair?: { privateKeyJwk: JsonWebKey; publicKeyJwk: JsonWebKey };
    chat_data?: BackupData;
  };
  try {
    const key = await encryptionKey(password, fromBase64(envelope.salt));
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: asArrayBuffer(fromBase64(envelope.iv)) },
      key,
      asArrayBuffer(fromBase64(envelope.ciphertext))
    );
    payload = JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error('Could not decrypt this backup. Check the password and try again.');
  }
  if (
    payload.format !== BACKUP_FORMAT
    || payload.version !== BACKUP_VERSION
    || payload.user_id !== userId
    || !payload.key_pair
    || payload.chat_data?.version !== 1
  ) {
    throw new Error('This backup is not valid for the signed-in account.');
  }

  await restoreDeviceKeyPair(payload.key_pair);
}
