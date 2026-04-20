"use client";

import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

const TOOLTIP_W = 368;
const HOVER_CLOSE_MS = 140;

type Props = {
  children: ReactNode;
  /** Short label for the trigger (aria + visible). */
  label?: string;
  /**
   * `icon` — small circle with “i” (dashboard).
   * `text` — discrete “Method” chip (print/PDF reports: avoids odd italic glyph next to titles).
   */
  trigger?: "icon" | "text";
};

/**
 * Compact “method” trigger: full methodology lives in a hover/focus portal tooltip
 * so section bodies can stay context + recommendations only.
 */
export default function MethodHint({ children, label = "Method", trigger = "icon" }: Props) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);

  const clearClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), HOVER_CLOSE_MS);
  };

  const updatePos = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const left = Math.max(12, Math.min(r.left, window.innerWidth - TOOLTIP_W - 12));
    setPos({ top: r.bottom + 8, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    const onScroll = () => updatePos();
    const onResize = () => updatePos();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, updatePos]);

  const tip =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            role="tooltip"
            onMouseEnter={clearClose}
            onMouseLeave={scheduleClose}
            style={{
              position: "fixed",
              top: pos.top,
              left: pos.left,
              width: TOOLTIP_W,
              maxHeight: "min(72vh, 480px)",
              overflowY: "auto",
              padding: "16px 18px",
              background: "#ffffff",
              border: "1px solid #ebebeb",
              borderRadius: 12,
              boxShadow: "0 12px 40px rgba(15, 15, 15, 0.14)",
              zIndex: 10000,
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Helvetica, Arial, sans-serif',
              WebkitFontSmoothing: "antialiased",
            }}
          >
            <p
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#a3a3a3",
                margin: "0 0 12px",
                paddingBottom: 10,
                borderBottom: "1px solid #f0f0f0",
              }}
            >
              {label}
            </p>
            <div className="method-hint-rich" style={{ fontSize: 13, lineHeight: 1.62, color: "#404040" }}>
              {children}
            </div>
          </div>,
          document.body,
        )
      : null;

  const isText = trigger === "text";

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={`${label} (tooltip)`}
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          if (!open) requestAnimationFrame(updatePos);
        }}
        onMouseEnter={() => {
          clearClose();
          setOpen(true);
          requestAnimationFrame(updatePos);
        }}
        onMouseLeave={scheduleClose}
        style={
          isText
            ? {
                height: 22,
                minWidth: 52,
                padding: "0 10px",
                borderRadius: 4,
                border: "1px solid #e5e5e5",
                background: "#ffffff",
                color: "#525252",
                fontSize: 8,
                fontWeight: 600,
                fontStyle: "normal",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontFamily: "inherit",
                cursor: "pointer",
                lineHeight: 1,
                flexShrink: 0,
                verticalAlign: "middle",
                boxSizing: "border-box",
              }
            : {
                width: 22,
                height: 22,
                borderRadius: 9999,
                border: "1px solid #e5e5e5",
                background: "#fafafa",
                color: "#737373",
                fontSize: 11,
                fontWeight: 700,
                fontStyle: "italic",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0,
                flexShrink: 0,
                verticalAlign: "middle",
              }
        }
      >
        {isText ? label : "i"}
      </button>
      {tip}
    </>
  );
}
