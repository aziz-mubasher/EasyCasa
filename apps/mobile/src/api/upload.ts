import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

import { config } from '../config';

/**
 * Picks a document (PDF/image) and uploads it to object storage, returning the
 * stored URL to hand to `addDocument`. Uses a presigned-URL flow:
 *   1. POST /uploads/presign  → { uploadUrl, fileUrl }
 *   2. PUT the bytes to uploadUrl
 *
 * The presign endpoint is an assumed backend dependency (MinIO from earlier
 * phases). Returns null if the user cancels.
 */
export async function pickAndUploadDocument(
  getAccessToken: () => Promise<string | null> | string | null,
): Promise<{ url: string; name: string } | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/*'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const asset = picked.assets[0];

  const token = await getAccessToken();
  const authHeaders: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

  // 1) presign
  const presignRes = await fetch(`${config.apiBaseUrl}/uploads/presign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders },
    body: JSON.stringify({
      filename: asset.name,
      contentType: asset.mimeType ?? 'application/octet-stream',
    }),
  });
  if (!presignRes.ok) throw new Error(`Presign failed (${presignRes.status})`);
  const { uploadUrl, fileUrl } = (await presignRes.json()) as {
    uploadUrl: string;
    fileUrl: string;
  };

  // 2) upload bytes
  const blob =
    Platform.OS === 'web'
      ? await (await fetch(asset.uri)).blob()
      : ({ uri: asset.uri, name: asset.name, type: asset.mimeType } as unknown as Blob);

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': asset.mimeType ?? 'application/octet-stream' },
    body: blob,
  });
  if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

  return { url: fileUrl, name: asset.name };
}
