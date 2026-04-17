"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Analytics } from "@/lib/types";
import OverviewPage   from "@/components/pages/OverviewPage";
import ConversionPage from "@/components/pages/ConversionPage";
import GeographicPage from "@/components/pages/GeographicPage";
import KYCPage        from "@/components/pages/KYCPage";
import FraudstersPage from "@/components/pages/FraudstersPage";
import UploadPage     from "@/components/pages/UploadPage";

const NAV_WIDTH_KEY     = "fc-nav-width";
const NAV_COLLAPSED_KEY = "fc-nav-collapsed";
const DEFAULT_WIDTH     = 224;
const MIN_WIDTH         = 180;
const MAX_WIDTH         = 320;
const COLLAPSED_WIDTH   = 56;

type PageId = "overview" | "brief1" | "brief2a" | "brief2b" | "bonus" | "upload";

const NAV_ITEMS: { id: PageId; label: string; tag?: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "brief1",   label: "Conversion Rate", tag: "B1" },
  { id: "brief2a",  label: "Geographic Risk", tag: "B2A" },
  { id: "brief2b",  label: "KYC Patterns",    tag: "B2B" },
  { id: "bonus",    label: "Top Fraudsters",  tag: "★" },
];

const PAGE_TITLES: Record<PageId, string> = {
  overview: "Overview",
  brief1:   "Conversion Rate",
  brief2a:  "Geographic Risk",
  brief2b:  "KYC Patterns",
  bonus:    "Top Fraudsters",
  upload:   "Upload Data",
};

export default function Dashboard() {
  const [analytics,  setAnalytics]  = useState<Analytics | null>(null);
  const [isLoading,  setIsLoading]  = useState(true);
  const [activePage, setActivePage] = useState<PageId>("overview");
  const [dataSource, setDataSource] = useState<"default" | "uploaded">("default");
  const [collapsed,  setCollapsed]  = useState(false);
  const [navWidth,   setNavWidth]   = useState(DEFAULT_WIDTH);

  const isResizing = useRef(false);
  const startX     = useRef(0);
  const startW     = useRef(DEFAULT_WIDTH);

  useEffect(() => {
    const w = localStorage.getItem(NAV_WIDTH_KEY);
    const c = localStorage.getItem(NAV_COLLAPSED_KEY);
    if (w) setNavWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(w))));
    if (c) setCollapsed(c === "true");
  }, []);

  useEffect(() => {
    fetch("/analytics.json")
      .then(r => r.json())
      .then((d: Analytics) => { setAnalytics(d); setIsLoading(false); })
      .catch(() => setIsLoading(false));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    startX.current = e.clientX;
    startW.current = navWidth;
    document.body.classList.add("resizing");
  }, [navWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isResizing.current) return;
      setNavWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startW.current + e.clientX - startX.current)));
    };
    const onUp = () => {
      if (!isResizing.current) return;
      isResizing.current = false;
      document.body.classList.remove("resizing");
      localStorage.setItem(NAV_WIDTH_KEY, String(navWidth));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [navWidth]);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    localStorage.setItem(NAV_COLLAPSED_KEY, String(next));
  };

  const handleNewData = (d: Analytics) => {
    setAnalytics(d);
    setDataSource("uploaded");
    setActivePage("overview");
  };

  const sidebarW = collapsed ? COLLAPSED_WIDTH : navWidth;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", background: "#ffffff" }}>

      {/* ── Sidebar ─────────────────────────────────── */}
      <aside
        style={{
          width: sidebarW,
          minWidth: sidebarW,
          transition: "width 150ms ease",
          background: "#ffffff",
          borderRight: "1px solid #f0f0f0",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          flexShrink: 0,
        }}
      >
        {/* Logo / toggle */}
        <div style={{
          height: 60,
          display: "flex",
          alignItems: "center",
          padding: collapsed ? "0 14px" : "0 20px",
          borderBottom: "1px solid #f5f5f5",
          gap: 10,
          flexShrink: 0,
        }}>
          <button
            onClick={toggle}
            title={collapsed ? "Expand" : "Collapse"}
            style={{
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 6,
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#a3a3a3",
              flexShrink: 0,
              transition: "background 150ms",
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "#f5f5f5")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {!collapsed && (
            <span style={{ fontSize: 13, fontWeight: 600, color: "#171717", letterSpacing: "-0.01em" }}>
              FC Intelligence
            </span>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: "12px 8px" }}>
          {NAV_ITEMS.map((item) => {
            const active = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                title={collapsed ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: collapsed ? "8px 0" : "8px 12px",
                  justifyContent: collapsed ? "center" : "flex-start",
                  borderRadius: 8,
                  border: "none",
                  marginBottom: 2,
                  cursor: "pointer",
                  background: active ? "#0f0f0f" : "transparent",
                  color: active ? "#ffffff" : "#737373",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  letterSpacing: "-0.01em",
                  transition: "all 120ms",
                  textAlign: "left",
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f5f5f5"; if (!active) e.currentTarget.style.color = "#171717"; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; if (!active) e.currentTarget.style.color = "#737373"; }}
              >
                {collapsed ? (
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.04em" }}>
                    {item.tag || item.label.slice(0, 2).toUpperCase()}
                  </span>
                ) : (
                  item.label
                )}
              </button>
            );
          })}

          {/* Report link */}
          <a
            href="/report"
            title={collapsed ? "Report" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: collapsed ? "8px 0" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 8,
              border: "none",
              marginBottom: 2,
              cursor: "pointer",
              background: "transparent",
              color: "#737373",
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              transition: "all 120ms",
              textDecoration: "none",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#171717"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#737373"; }}
          >
            {collapsed ? (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            ) : "PDF Report"}
          </a>

          {/* Slides link */}
          <a
            href="/slides"
            title={collapsed ? "Slides" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: collapsed ? "8px 0" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 8,
              border: "none",
              marginBottom: 2,
              cursor: "pointer",
              background: "transparent",
              color: "#737373",
              fontSize: 13,
              fontWeight: 400,
              letterSpacing: "-0.01em",
              transition: "all 120ms",
              textDecoration: "none",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#171717"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#737373"; }}
          >
            {collapsed ? (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <rect x="2" y="3" width="20" height="14" rx="2" />
                <path d="M8 21h8M12 17v4" />
              </svg>
            ) : "Slides"}
          </a>

          {/* Upload separator */}
          <div style={{ margin: "12px 4px", height: 1, background: "#f5f5f5" }} />
          <button
            onClick={() => setActivePage("upload")}
            title={collapsed ? "Upload" : undefined}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              width: "100%",
              padding: collapsed ? "8px 0" : "8px 12px",
              justifyContent: collapsed ? "center" : "flex-start",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: activePage === "upload" ? "#0f0f0f" : "transparent",
              color: activePage === "upload" ? "#ffffff" : "#737373",
              fontSize: 13,
              fontWeight: activePage === "upload" ? 600 : 400,
              letterSpacing: "-0.01em",
              transition: "all 120ms",
              textAlign: "left",
            }}
            onMouseEnter={e => { if (activePage !== "upload") { e.currentTarget.style.background = "#f5f5f5"; e.currentTarget.style.color = "#171717"; } }}
            onMouseLeave={e => { if (activePage !== "upload") { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#737373"; } }}
          >
            {collapsed ? (
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            ) : "Upload Data"}
          </button>
        </nav>

        {/* Resize handle */}
        {!collapsed && (
          <div
            onMouseDown={onMouseDown}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: 4,
              height: "100%",
              cursor: "col-resize",
              zIndex: 10,
            }}
            onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.06)")}
            onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
          />
        )}
      </aside>

      {/* ── Main ────────────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#ffffff" }}>

        {/* Top bar */}
        <header style={{
          height: 60,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          borderBottom: "1px solid #f0f0f0",
          background: "#ffffff",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 13, color: "#a3a3a3", fontWeight: 400 }}>Financial Crime</span>
            <span style={{ color: "#e5e5e5" }}>›</span>
            <span style={{ fontSize: 13, color: "#171717", fontWeight: 600 }}>
              {PAGE_TITLES[activePage]}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {dataSource === "uploaded" && (
              <span style={{
                fontSize: 11,
                fontWeight: 500,
                padding: "3px 10px",
                borderRadius: 99,
                background: "#f5f5f5",
                color: "#737373",
                letterSpacing: "0.01em",
              }}>
                Custom dataset
              </span>
            )}
            <button
              onClick={() => setActivePage("upload")}
              style={{
                fontSize: 12,
                fontWeight: 600,
                padding: "7px 16px",
                borderRadius: 8,
                border: "1px solid #e5e5e5",
                background: "#ffffff",
                color: "#171717",
                cursor: "pointer",
                letterSpacing: "-0.01em",
                transition: "all 120ms",
              }}
              onMouseEnter={e => { e.currentTarget.style.background = "#f9f9f9"; e.currentTarget.style.borderColor = "#d4d4d4"; }}
              onMouseLeave={e => { e.currentTarget.style.background = "#ffffff"; e.currentTarget.style.borderColor = "#e5e5e5"; }}
            >
              Upload data
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "#ffffff" }}>
          {isLoading ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <div className="w-6 h-6 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin" />
              <p style={{ fontSize: 13, color: "#a3a3a3" }}>Loading analytics…</p>
            </div>
          ) : !analytics ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12 }}>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#171717" }}>No data available</p>
              <p style={{ fontSize: 13, color: "#a3a3a3" }}>Upload a dataset to get started</p>
              <button
                onClick={() => setActivePage("upload")}
                style={{ marginTop: 8, padding: "8px 20px", borderRadius: 8, border: "none", background: "#0f0f0f", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
              >
                Upload data
              </button>
            </div>
          ) : (
            <>
              {activePage === "overview"  && <OverviewPage   data={analytics} />}
              {activePage === "brief1"    && <ConversionPage data={analytics.brief1} />}
              {activePage === "brief2a"   && <GeographicPage data={analytics.brief2a.geo_risk} />}
              {activePage === "brief2b"   && <KYCPage        data={analytics.brief2b} fraudByType={analytics.fraud_by_type} kycStatus={analytics.kyc_status} kycFraudStatus={analytics.kyc_fraud_status} />}
              {activePage === "bonus"     && <FraudstersPage fraudsters={analytics.bonus.top_fraudsters} totalFraudsters={analytics.bonus.total_fraudsters} />}
              {activePage === "upload"    && <UploadPage     onAnalytics={handleNewData} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
