import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { requireRole, requireSession, AuthError } from "@/lib/rbac";
import { can } from "@/lib/rbac";

export const runtime = "nodejs";

const IMAGE = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
const AUDIO = ["audio/mpeg", "audio/mp4", "audio/aac", "audio/wav", "audio/ogg"];
const MAX_BYTES = { image: 10 * 1024 * 1024, audio: 120 * 1024 * 1024 };

/**
 * Signs a direct-to-Cloudinary upload so files never pass through the server.
 *
 * Signing is an authenticated action: artists may upload (their own profile
 * media) but into a fixed folder they don't choose, and MIME type and size are
 * validated here rather than trusted from the browser. An upload endpoint open
 * to any logged-in user is a common way to end up hosting arbitrary files.
 */
export async function POST(req: Request) {
  try {
    const session = await requireSession();
    const { kind, mimeType, bytes } = (await req.json()) as {
      kind?: "image" | "audio";
      mimeType?: string;
      bytes?: number;
    };

    const type = kind === "audio" ? "audio" : "image";
    const allowed = type === "audio" ? AUDIO : IMAGE;

    if (!mimeType || !allowed.includes(mimeType)) {
      return NextResponse.json({ error: `Unsupported ${type} type.` }, { status: 415 });
    }
    if (typeof bytes !== "number" || bytes <= 0 || bytes > MAX_BYTES[type]) {
      return NextResponse.json({ error: "File is too large." }, { status: 413 });
    }
    // only editors may upload audio; artists are limited to profile imagery
    if (type === "audio") await requireRole(...can.manageContent);

    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (!cloud || !apiKey || !secret) {
      return NextResponse.json({ error: "Uploads are not configured." }, { status: 503 });
    }

    // folder is server-chosen: a client cannot write outside its own area
    const folder =
      session.role === "ARTIST" ? `afrolit/artists/${session.id}` : `afrolit/${type}s`;
    const timestamp = Math.floor(Date.now() / 1000);

    const toSign = `folder=${folder}&timestamp=${timestamp}`;
    const signature = crypto.createHash("sha1").update(`${toSign}${secret}`).digest("hex");

    return NextResponse.json({
      cloudName: cloud,
      apiKey,
      timestamp,
      folder,
      signature,
      endpoint: `https://api.cloudinary.com/v1_1/${cloud}/${type === "audio" ? "video" : "image"}/upload`,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: "Not allowed." }, { status: err.code === "UNAUTHENTICATED" ? 401 : 403 });
    }
    console.error("[uploads/sign]", err);
    return NextResponse.json({ error: "Could not sign upload." }, { status: 500 });
  }
}
