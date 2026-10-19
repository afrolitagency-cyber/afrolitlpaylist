import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "AfroLitPlaylist — Afro music, artists and events";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/afrolit-logo.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#000",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 999,
              overflow: "hidden",
              background: "#fff",
              display: "flex",
            }}
          >
            <img src={src} alt="" width={120} height={120} style={{ objectFit: "contain" }} />
          </div>
          <div style={{ display: "flex", fontSize: 64, fontWeight: 900, letterSpacing: -1.5 }}>
            <span style={{ color: "#fff" }}>AFRO</span>
            <span style={{ color: "#E50914" }}>LIT</span>
            <span style={{ color: "#fff", fontWeight: 400 }}>PLAYLIST</span>
          </div>
        </div>
        <div style={{ marginTop: 36, fontSize: 26, color: "#b3b3b3" }}>
          Afro music — new releases, artists, events and episodes
        </div>
      </div>
    ),
    size,
  );
}
