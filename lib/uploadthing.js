import { UTApi } from "uploadthing/server";

// Thin adapter around UploadThing's server SDK, isolated here so swapping
// image-storage providers later only touches this one file. Reads its API
// key from UPLOADTHING_TOKEN (the UTApi default), which must be set as an
// environment variable in Vercel's project settings.
let utapi;
function getUtApi() {
  if (!utapi) utapi = new UTApi();
  return utapi;
}

export async function uploadImage(file) {
  const result = await getUtApi().uploadFiles(file);
  if (result.error) {
    throw new Error(result.error.message || "Image upload failed");
  }
  return { url: result.data.ufsUrl };
}
