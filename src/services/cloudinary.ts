import {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_UPLOAD_FOLDER,
  CLOUDINARY_UPLOAD_PRESET,
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
 * Uploads an image to Cloudinary using an unsigned upload preset.
 * https://cloudinary.com/documentation/upload_images#unsigned_upload
 */
export async function uploadImageToCloudinary(
  params: UploadParams,
): Promise<CloudinaryUploadResult> {
  const { imageUri, latitude, longitude, placeLabel, title } = params;

  const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

  const form = new FormData();
  form.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  form.append("folder", CLOUDINARY_UPLOAD_FOLDER);

  const contextParts: string[] = [];
  if (title) contextParts.push(`caption=${sanitizeContext(title)}`);
  if (placeLabel) contextParts.push(`place=${sanitizeContext(placeLabel)}`);
  if (typeof latitude === "number" && typeof longitude === "number") {
    contextParts.push(`lat=${latitude}`);
    contextParts.push(`lng=${longitude}`);
  }
  if (contextParts.length > 0) {
    form.append("context", contextParts.join("|"));
  }

  const tagParts = ["travel-journal"];
  if (placeLabel) tagParts.push(slugify(placeLabel));
  form.append("tags", tagParts.join(","));

  // React Native FormData file shape.
  form.append("file", {
    uri: imageUri,
    name: `journal-${Date.now()}.jpg`,
    type: "image/jpeg",
  } as unknown as Blob);

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
