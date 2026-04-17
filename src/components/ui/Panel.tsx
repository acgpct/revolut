"use client";

import { ReactNode } from "react";

interface Props {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
  noPad?: boolean;
}

export default function Panel({ title, description, children, noPad }: Props) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #ebebeb",
      borderRadius: 12,
      overflow: "hidden",
    }}>
      {(title || description) && (
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid #f5f5f5",
        }}>
          {title && (
            <p style={{ fontSize: 13, fontWeight: 600, color: "#171717", letterSpacing: "-0.01em" }}>
              {title}
            </p>
          )}
          {description && (
            <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: 2 }}>
              {description}
            </p>
          )}
        </div>
      )}
      <div style={noPad ? {} : { padding: "24px" }}>
        {children}
      </div>
    </div>
  );
}
