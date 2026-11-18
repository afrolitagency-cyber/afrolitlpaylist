import { cloudinaryTarget } from "@/lib/cloudinary";

/** An https address with no username or password. Empty and anything else return null. */
export function httpsUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.username || url.password) return null;
  return url.toString();
}

/** A Cloudinary image from this site's upload. A pasted address on another host returns null. */
export function cloudinaryImageUrl(raw: string | null | undefined): string | null {
  const safe = httpsUrl(raw);
  if (!safe) return null;
  const url = new URL(safe);
  if (url.hostname !== "res.cloudinary.com") return null;
  const cloud = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const marker = cloud ? `/${cloud}/image/upload/` : "/image/upload/";
  if (!url.pathname.includes(marker)) return null;
  const target = cloudinaryTarget(safe, "image", null);
  if (!target || target.resource !== "image") return null;
  return safe;
}
