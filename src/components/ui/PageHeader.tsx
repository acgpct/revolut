"use client";

interface Props {
  overline?: string;
  title: string;
  description?: string;
}

export default function PageHeader({ overline, title, description }: Props) {
  return (
    <div style={{ marginBottom: 40 }}>
      {overline && (
        <p style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#a3a3a3",
          marginBottom: 8,
        }}>
          {overline}
        </p>
      )}
      <h1 style={{
        fontSize: 26,
        fontWeight: 700,
        color: "#0f0f0f",
        letterSpacing: "-0.03em",
        lineHeight: 1.2,
        marginBottom: description ? 10 : 0,
      }}>
        {title}
      </h1>
      {description && (
        <p style={{
          fontSize: 14,
          color: "#737373",
          lineHeight: 1.6,
          maxWidth: 600,
          fontWeight: 400,
        }}>
          {description}
        </p>
      )}
    </div>
  );
}
