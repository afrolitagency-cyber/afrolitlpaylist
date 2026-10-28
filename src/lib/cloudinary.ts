/** Cloudinary id and resource type for a library file. Audio is stored as video. */
export function cloudinaryTarget(
  url: string,
  kind: string,
  storedPublicId: string | null,
): { publicId: string; resource: "image" | "video" } | null {
  const resource: "image" | "video" = kind === "audio" || kind === "video" ? "video" : "image";
  if (storedPublicId?.trim()) return { publicId: storedPublicId.trim(), resource };

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!parsed.hostname.endsWith("cloudinary.com")) return null;

  const parts = parsed.pathname.split("/").filter(Boolean);
  const uploadAt = parts.indexOf("upload");
  if (uploadAt < 0) return null;
  const fromUrl = parts[1] === "video" ? "video" : "image";
  const rest = parts.slice(uploadAt + 1);
  while (rest.length > 1) {
    const head = rest[0];
    if (!head || (!isVersion(head) && !isTransform(head))) break;
    rest.shift();
  }
  if (!rest.length) return null;

  const publicId = decodeURIComponent(rest.join("/")).replace(/\.[a-z0-9]{2,5}$/i, "");
  if (!publicId) return null;
  return { publicId, resource: fromUrl === "video" ? "video" : resource };
}

function isVersion(segment: string) {
  return /^v\d+$/.test(segment);
}

function isTransform(segment: string) {
  return segment.includes(",") || /^(c|w|h|q|f|g|e|l|o|b|a|t|r|d|x|y|z|fl|bo|ar|so|eo|du|ac|vs|pg|dn)_/.test(segment);
}

/** Removes the file from Cloudinary. A missing file counts as already freed. */
export async function destroyCloudinaryAsset(
  publicId: string,
  resource: "image" | "video",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return { ok: false, error: "Uploads are not configured." };

  const first = await destroy(cloud, key, secret, publicId, resource);
  if (first === "ok" || first === "not found") {
    if (first === "not found") {
      const other = resource === "image" ? "video" : "image";
      const second = await destroy(cloud, key, secret, publicId, other);
      if (second === "error") return { ok: false, error: "Cloudinary did not delete the file." };
    }
    return { ok: true };
  }
  return { ok: false, error: "Cloudinary did not delete the file." };
}

async function destroy(
  cloud: string,
  key: string,
  secret: string,
  publicId: string,
  resource: "image" | "video",
): Promise<"ok" | "not found" | "error"> {
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${resource}/destroy`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ public_id: publicId }),
  });
  const data = (await res.json().catch(() => null)) as { result?: string } | null;
  if (!res.ok) return "error";
  if (data?.result === "ok") return "ok";
  if (data?.result === "not found") return "not found";
  return "error";
}
