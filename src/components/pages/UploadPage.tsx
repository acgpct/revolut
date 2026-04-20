"use client";

import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useState, useRef, DragEvent } from "react";
import type { Analytics } from "@/lib/types";
import { computeAnalytics } from "@/lib/analytics";
import PageHeader from "@/components/ui/PageHeader";

export default function UploadPage({ onAnalytics }: { onAnalytics: (d: Analytics) => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [success,  setSuccess]  = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const process = (file: File) => {
    setError(null); setSuccess(false);
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Unsupported file type. Please upload a .csv or .xlsx file."); return;
    }
    setLoading(true);
    if (name.endsWith(".csv")) {
      setProgress("Parsing CSV…");
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: (res) => {
          setProgress("Computing analytics…");
          try { onAnalytics(computeAnalytics(res.data as Record<string, string>[])); setSuccess(true); }
          catch { setError("Failed to compute analytics. Check column names match the required schema."); }
          finally { setLoading(false); setProgress(null); }
        },
        error: (e) => { setError(`Parse error: ${e.message}`); setLoading(false); setProgress(null); },
      });
    } else {
      setProgress("Parsing Excel…");
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(new Uint8Array(e.target!.result as ArrayBuffer), { type: "array" });
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(wb.Sheets[wb.SheetNames[0]], { defval: "" });
          setProgress("Computing analytics…");
          onAnalytics(computeAnalytics(rows)); setSuccess(true);
        } catch { setError("Failed to parse Excel file."); }
        finally { setLoading(false); setProgress(null); }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        title="Upload Dataset"
        description="Upload a CSV or Excel file to refresh all dashboard sections. Processing runs entirely in your browser — no data is uploaded to any server."
      />

      {/* Drop zone */}
      <div
        style={{
          border: `2px dashed ${dragOver ? "#0f0f0f" : "#e5e5e5"}`,
          borderRadius: 12,
          background: dragOver ? "#fafafa" : "#ffffff",
          cursor: loading ? "default" : "pointer",
          transition: "all 150ms",
          marginBottom: 24,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) process(f); }}
        onClick={() => !loading && inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) process(f); }} />

        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 40px", textAlign: "center" }}>
          {loading ? (
            <>
              <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-700 rounded-full animate-spin" style={{ marginBottom: 16 }} />
              <p style={{ fontSize: 14, fontWeight: 600, color: "#171717", marginBottom: 4 }}>{progress || "Processing…"}</p>
              <p style={{ fontSize: 13, color: "#a3a3a3" }}>Large files may take a moment</p>
            </>
          ) : success ? (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: "50%", background: "#0f0f0f",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 700, color: "#0f0f0f", marginBottom: 6 }}>Dataset loaded</p>
              <p style={{ fontSize: 13, color: "#a3a3a3" }}>Navigate to any section to see updated results</p>
            </>
          ) : (
            <>
              <div style={{
                width: 48, height: 48, borderRadius: 12, background: "#f5f5f5",
                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16,
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#a3a3a3" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p style={{ fontSize: 15, fontWeight: 600, color: "#171717", marginBottom: 6 }}>
                {dragOver ? "Drop to upload" : "Drag & drop or click to browse"}
              </p>
              <p style={{ fontSize: 13, color: "#a3a3a3" }}>CSV or Excel (.xlsx / .xls)</p>
            </>
          )}
        </div>
      </div>

      {/* Schema */}
      <div style={{
        background: "#ffffff",
        border: "1px solid #ebebeb",
        borderRadius: 12,
        padding: "24px 28px",
      }}>
        <p style={{
          fontSize: 11, fontWeight: 600, textTransform: "uppercase",
          letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 16,
        }}>
          Required Columns
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {["USER_ID", "TYPE", "AMOUNT", "CURRENCY", "MERCHANT_COUNTRY", "KYC", "BIRTH_YEAR", "COUNTRY", "IS_FRAUD"].map((col) => (
            <code key={col} style={{
              fontSize: 11,
              fontWeight: 500,
              padding: "5px 10px",
              borderRadius: 6,
              background: "#f5f5f5",
              color: "#404040",
              fontFamily: "monospace",
              letterSpacing: "0.02em",
            }}>
              {col}
            </code>
          ))}
        </div>
      </div>

      {error && (
        <div style={{
          marginTop: 16, borderRadius: 10, border: "1px solid #fde8e8",
          background: "#fff8f8", padding: "14px 20px", fontSize: 13, color: "#cf1322",
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
