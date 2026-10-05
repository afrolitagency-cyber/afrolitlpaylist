import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon: the red mark on black, legible at 32px. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", alignItems: "center",
          justifyContent: "center", background: "#000", borderRadius: 6,
          color: "#E50914", fontSize: 20, fontWeight: 900,
          fontFamily: "Helvetica, Arial, sans-serif",
        }}
      >
        A
      </div>
    ),
    size,
  );
}
