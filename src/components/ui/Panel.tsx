"use client";

import { ReactNode } from "react";
import MethodHint from "./MethodHint";

interface Props {
  title?: string;
  /** Short context for the chart or table. */
  description?: string;
  /** Definitions / field rules — hover “i” only. */
  methodology?: ReactNode;
  children: ReactNode;
  className?: string;
  noPad?: boolean;
}

export default function Panel({ title, description, methodology, children, noPad }: Props) {
  return (
    <div style={{
      background: "#ffffff",
      border: "1px solid #ebebeb",
      borderRadius: 12,
      overflow: "visible",
    }}>
      {(title || description || methodology) && (
        <div style={{
          padding: "18px 24px",
          borderBottom: "1px solid #f5f5f5",
          overflow: "hidden",
          borderRadius: "12px 12px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {title && (
                <p style={{ fontSize: 13, fontWeight: 600, color: "#171717", letterSpacing: "-0.01em", margin: 0 }}>
                  {title}
                </p>
              )}
              {description && (
                <p style={{ fontSize: 12, color: "#a3a3a3", marginTop: title ? 4 : 0, marginBottom: 0 }}>
                  {description}
                </p>
              )}
            </div>
            {methodology ? (
              <MethodHint label="Chart method">{methodology}</MethodHint>
            ) : null}
          </div>
        </div>
      )}
      <div style={noPad ? {} : { padding: "24px" }}>
        {children}
      </div>
    </div>
  );
}
