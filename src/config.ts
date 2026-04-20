/**
 * Cloudinary configuration.
 *
 * SECURITY NOTE
 * -------------
 * Never ship an API secret inside a mobile app. Any secret bundled into the JS
 * or native binary can be extracted by a determined user. This app uses an
 * UNSIGNED upload preset instead, which is the recommended approach for
 * client-side uploads.
 *
 * Setup:
 *  1. Cloudinary Console -> Settings -> Upload -> Upload presets -> Add upload preset
 *  2. Signing Mode: Unsigned
 *  3. (Optional) Restrict to an upload folder like "travel-journal"
 *  4. Copy the preset name into CLOUDINARY_UPLOAD_PRESET below
 *
 * The cloud name is public; keeping it in source is fine.
 */
export const CLOUDINARY_CLOUD_NAME = "dbafya383";
export const CLOUDINARY_UPLOAD_PRESET = "travel_journal";
export const CLOUDINARY_UPLOAD_FOLDER = "travel-journal";
