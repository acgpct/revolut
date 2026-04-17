"use client";

/**
 * Revolut wordmark — "Revolut" in Inter Black, matching brand style.
 * The real Revolut Sans is proprietary; Inter Black is the closest open-source equivalent.
 */
export default function RevolutLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: 18, md: 22, lg: 28 };
  const px = sizes[size];

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {/* Icon mark: bold geometric R in black pill */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="40" height="40" rx="9" fill="#000000" />
        {/* Stylised R — stem + bowl + leg */}
        <path
          d="M10 30V10H22C25.3 10 27.8 10.8 29.5 12.5C31.2 14.1 32 16.3 32 19C32 21.2 31.4 23.1 30.1 24.6C28.9 26.1 27.1 27.1 24.8 27.6L32 30H26.5L20 27.5H15.5V30H10ZM15.5 23H21.5C23.2 23 24.5 22.6 25.4 21.8C26.3 21 26.7 19.9 26.7 18.5C26.7 17.1 26.2 16 25.3 15.2C24.4 14.4 23.1 14 21.3 14H15.5V23Z"
          fill="white"
        />
      </svg>

      {/* Wordmark: "revolut" in Inter Black */}
      <span style={{
        fontSize: px * 0.85,
        fontWeight: 900,
        color: "#000000",
        letterSpacing: "-0.04em",
        lineHeight: 1,
        fontFamily: "'Inter', sans-serif",
      }}>
        revolut
      </span>
    </div>
  );
}
