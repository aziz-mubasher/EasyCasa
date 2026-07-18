import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { EasyCasaMeApi } from '@easycasa/api-client';

import { config } from '../config';

/**
 * Picks a document (PDF/image) and uploads it to object storage, returning the
 * stored URL to hand to `addDocument`. Uses a presigned-URL flow via EasyCasaMeApi.
 * Returns null if the user cancels.
 */
export async function pickAndUploadDocument(
  getAccessToken: () => Promise<string | null> | string | null,
): Promise<{ url: string; name: string } | null> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;
  const asset = picked.assets[0];
  const contentType = asset.mimeType ?? 'application/pdf';

  const api = new EasyCasaMeApi({ baseUrl: config.apiBaseUrl, getAccessToken });
  const { uploadUrl, fileUrl } = await api.presignUpload({
    filename: asset.name,
    contentType,
  });

  const blob =
    Platform.OS === 'web'
      ? await (await fetch(asset.uri)).blob()
      : ({ uri: asset.uri, name: asset.name, type: contentType } as unknown as Blob);

  const putRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': contentType },
    body: blob,
  });
  if (!putRes.ok) throw new Error(`Upload failed (${putRes.status})`);

  return { url: fileUrl, name: asset.name };
}
