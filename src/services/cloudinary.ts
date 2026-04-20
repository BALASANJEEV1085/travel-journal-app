import { Platform } from "react-native";
import * as Crypto from "expo-crypto";

import {
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_FOLDER,
} from "../config";

export interface CloudinaryUploadResult {
  secureUrl: string;
  publicId: string;
}

export interface UploadParams {
  imageUri: string;
  latitude?: number | null;
  longitude?: number | null;
  placeLabel?: string | null;
  title?: string | null;
}

/**
 * Generate a Cloudinary-compatible signature.
 *
 * Cloudinary expects: SHA1(alphabetically-sorted-params + api_secret)
 * where params are joined as "key=value&key=value".
 */
async function generateSignature(
  params: Record<string, string>,
): Promise<string> {
  // Sort keys alphabetically and build the string to sign.
  const sortedKeys = Object.keys(params).sort();
  const stringToSign = sortedKeys
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA1,
    stringToSign + CLOUDINARY_API_SECRET,
  );

  return digest;
}

/**
 * Convert a local file URI to a Blob for web uploads.
 * On web, image URIs from expo-image-picker are blob: or data: URLs.
 */
async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return response.blob();
}

/**
 * Uploads an image to Cloudinary using signed upload.
 * https://cloudinary.com/documentation/upload_images#generating_authentication_signatures
 */
export async function uploadImageToCloudinary(
  params: UploadParams,
): Promise<CloudinaryUploadResult> {
  const { imageUri, latitude, longitude, placeLabel, title } = params;

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const timestamp = Math.round(Date.now() / 1000).toString();

  // Build the context string for metadata.
  const contextParts: string[] = [];
  if (title) contextParts.push(`caption=${sanitizeContext(title)}`);
  if (placeLabel) contextParts.push(`place=${sanitizeContext(placeLabel)}`);
  if (typeof latitude === "number" && typeof longitude === "number") {
    contextParts.push(`lat=${latitude}`);
    contextParts.push(`lng=${longitude}`);
  }
  const contextString =
    contextParts.length > 0 ? contextParts.join("|") : undefined;

  // Build the tags string.
  const tagParts = ["travel-journal"];
  if (placeLabel) tagParts.push(slugify(placeLabel));
  const tagsString = tagParts.join(",");

  // Parameters that need to be signed (must match what's sent in the form).
  const signableParams: Record<string, string> = {
    folder: CLOUDINARY_UPLOAD_FOLDER,
    tags: tagsString,
    timestamp,
  };
  if (contextString) {
    signableParams.context = contextString;
  }

  const signature = await generateSignature(signableParams);

  // Build the FormData.
  const form = new FormData();
  form.append("folder", CLOUDINARY_UPLOAD_FOLDER);
  form.append("tags", tagsString);
  form.append("timestamp", timestamp);
  form.append("api_key", CLOUDINARY_API_KEY);
  form.append("signature", signature);
  if (contextString) {
    form.append("context", contextString);
  }

  // File handling differs between web and native.
  if (Platform.OS === "web") {
    // On web, convert the blob:/data: URI to a real Blob.
    const blob = await uriToBlob(imageUri);
    form.append("file", blob, `journal-${Date.now()}.jpg`);
  } else {
    // React Native FormData file shape (native only).
    form.append("file", {
      uri: imageUri,
      name: `journal-${Date.now()}.jpg`,
      type: "image/jpeg",
    } as unknown as Blob);
  }

  const response = await fetch(uploadUrl, {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `Cloudinary upload failed (${response.status}): ${text || response.statusText}`,
    );
  }

  const json = (await response.json()) as {
    secure_url?: string;
    public_id?: string;
    error?: { message?: string };
  };

  if (!json.secure_url || !json.public_id) {
    throw new Error(
      json.error?.message ?? "Cloudinary response missing secure_url/public_id",
    );
  }

  return { secureUrl: json.secure_url, publicId: json.public_id };
}

function sanitizeContext(value: string): string {
  // Cloudinary context values cannot contain "=" or "|" unescaped.
  return value.replace(/[=|]/g, " ").slice(0, 256);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}
