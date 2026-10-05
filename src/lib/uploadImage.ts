import { rememberUpload } from "@/lib/actions/media";

const IMAGE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

function imageMime(file: File) {
  if (file.type.startsWith("image/")) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return IMAGE_MIME[ext] ?? "";
}

/** Signs a direct Cloudinary upload, then keeps the file in the media library. */
export async function uploadEditorImage(file: File) {
  const mimeType = imageMime(file);
  if (!mimeType) throw new Error("This file type is not supported.");

  const signRes = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ kind: "image", mimeType, bytes: file.size }),
  });
  const sign = (await signRes.json()) as {
    error?: string;
    apiKey?: string;
    timestamp?: number;
    folder?: string;
    signature?: string;
    endpoint?: string;
  };
  if (!signRes.ok || !sign.apiKey || !sign.endpoint || !sign.signature || !sign.folder || !sign.timestamp) {
    throw new Error(sign.error ?? "Upload was refused.");
  }

  const body = new FormData();
  body.append("file", file);
  body.append("api_key", sign.apiKey);
  body.append("timestamp", String(sign.timestamp));
  body.append("folder", sign.folder);
  body.append("signature", sign.signature);

  const up = await fetch(sign.endpoint, { method: "POST", body });
  const data = (await up.json()) as {
    secure_url?: string;
    public_id?: string;
    bytes?: number;
    width?: number;
    height?: number;
    error?: { message?: string };
  };
  if (!up.ok || !data.secure_url) throw new Error(data.error?.message ?? "Cloudinary rejected the file.");

  await rememberUpload({
    url: data.secure_url,
    publicId: data.public_id,
    mimeType,
    bytes: data.bytes,
    width: data.width,
    height: data.height,
  });

  return data.secure_url;
}
