"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Analytics } from "@/lib/types";
import { computeAnalytics } from "@/lib/analytics";

interface Props {
  onAnalytics: (data: Analytics) => void;
  isLoading: boolean;
  setIsLoading: (v: boolean) => void;
}

export default function FileUpload({ onAnalytics, isLoading, setIsLoading }: Props) {
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFile = (file: File) => {
    setError(null);
    const name = file.name.toLowerCase();
    if (!name.endsWith(".csv") && !name.endsWith(".xlsx") && !name.endsWith(".xls")) {
      setError("Please upload a CSV or Excel (.xlsx / .xls) file.");
      return;
    }
    setIsLoading(true);

    if (name.endsWith(".csv")) {
      setProgress("Parsing CSV…");
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          setProgress("Computing analytics…");
          try {
            onAnalytics(computeAnalytics(result.data as Record<string, string>[]));
            setProgress(null);
          } catch (e) {
            setError("Failed to compute analytics. Check column names match the required schema.");
            console.error(e);
          } finally {
            setIsLoading(false);
          }
        },
        error: (err) => {
          setError(`CSV parse error: ${err.message}`);
          setIsLoading(false);
          setProgress(null);
        },
      });
    } else {
      setProgress("Parsing Excel…");
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target!.result as ArrayBuffer);
          const wb   = XLSX.read(data, { type: "array" });
          const ws   = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
          setProgress("Computing analytics…");
          onAnalytics(computeAnalytics(rows));
          setProgress(null);
        } catch (e) {
          setError("Failed to parse Excel file. Ensure it matches the expected schema.");
          console.error(e);
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  };

  return (
    <div
      style={{
        background: dragOver ? "#f9fafb" : "#fff",
        border: `2px dashed ${dragOver ? "#000" : "#e0e0e0"}`,
        borderRadius: 16,
        padding: "36px 32px",
        cursor: isLoading ? "default" : "pointer",
        transition: "all 0.2s",
        textAlign: "center",
      }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={() => !isLoading && inputRef.current?.click()}
    >
      <input ref={inputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
      }} />

      {isLoading ? (
        <>
          <div style={{
            width: 40, height: 40, border: "3px solid #f0f0f0", borderTop: "3px solid #000",
            borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px",
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ fontWeight: 600, fontSize: 15, color: "#0a0a0f" }}>{progress || "Processing…"}</p>
          <p style={{ fontSize: 13, color: "#9898ac", marginTop: 4 }}>This may take a moment for large files</p>
        </>
      ) : (
        <>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: dragOver ? "#f0f0f0" : "#f9fafb",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 16px",
            transition: "all 0.2s",
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragOver ? "#000" : "#9ca3af"} strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <p style={{ fontWeight: 700, fontSize: 15, color: "#0a0a0f", marginBottom: 4 }}>
            {dragOver ? "Drop to upload" : "Upload a new dataset"}
          </p>
          <p style={{ fontSize: 13, color: "#9898ac", marginBottom: 10 }}>
            Drag & drop or click to select · CSV or Excel (.xlsx / .xls)
          </p>
          <p style={{ fontSize: 11, color: "#9ca3af", fontWeight: 500 }}>
            Required columns: USER_ID · TYPE · AMOUNT · CURRENCY · MERCHANT_COUNTRY · KYC · BIRTH_YEAR · COUNTRY · IS_FRAUD
          </p>
        </>
      )}

      {error && (
        <div style={{
          marginTop: 16, background: "#fff1f1", border: "1px solid #fecaca",
          borderRadius: 10, padding: "10px 14px", color: "#dc2626", fontSize: 13,
        }}>
          {error}
        </div>
      )}
    </div>
  );
}
