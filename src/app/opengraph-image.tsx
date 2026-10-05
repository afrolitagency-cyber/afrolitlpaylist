import { ImageResponse } from "next/og";

export const alt = "AfroLitPlaylist — Afro music, artists and events";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Default social card. Per-post cards fall back to the post's cover image,
 *  which is set in each page's generateMetadata. */
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", background: "#000",
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 92, fontWeight: 900, letterSpacing: -2 }}>
          <span style={{ color: "#fff" }}>AFRO</span>
          <span style={{ color: "#E50914" }}>LIT</span>
          <span style={{ color: "#fff", fontWeight: 400 }}>PLAYLIST</span>
        </div>
        <div style={{ marginTop: 24, fontSize: 30, color: "#b3b3b3" }}>
          Afro music — new releases, artists, events and episodes
        </div>
        <div style={{ marginTop: 40, width: 120, height: 6, background: "#E50914" }} />
      </div>
    ),
    size,
  );
}
