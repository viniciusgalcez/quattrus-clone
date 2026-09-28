import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 6,
          background: "#272b2a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* "G" de Gestiona, na cor brand */}
        <span
          style={{
            fontFamily: "serif",
            fontWeight: 700,
            fontSize: 20,
            color: "#a46b4d",
            lineHeight: 1,
          }}
        >
          G
        </span>
      </div>
    ),
    { ...size }
  );
}
