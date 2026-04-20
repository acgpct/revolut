"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartTooltipRoot,
  ChartTooltipTitle,
  ChartTooltipRows,
  ChartTooltipRow,
  ChartTooltipFromPayload,
} from "@/components/ui/ChartTooltip";
import Panel from "@/components/ui/Panel";
import type { Fraudster } from "@/lib/types";
import { fmtFiatGbpMajor, fmtGbpFromAmount, fmtRawAmountMajor } from "@/lib/gbpMinor";

const fmt = (n: number) => n.toLocaleString();

function fmtAxisRaw(n: number) {
  return fmtRawAmountMajor(n);
}

function FraudsterDossierTable({
  rows,
  title,
  ink,
  muted,
  rule,
  subtle,
  compact,
  dense,
  /** Larger type, roomier cells, full user id — dashboard page dossier only. */
  comfortable,
  /** Show Σ raw AMOUNT and fiat GBP (embedded FX, ex crypto) side by side — dashboard page and print. */
  dualGbpColumns,
}: {
  rows: Fraudster[];
  title: string;
  ink: string;
  muted: string;
  rule: string;
  subtle: string;
  compact?: boolean;
  dense?: boolean;
  comfortable?: boolean;
  dualGbpColumns?: boolean;
}) {
  const th = dense ? 8 : comfortable ? 12 : compact ? 10 : 11;
  const td = dense ? 10 : comfortable ? 14 : compact ? 12 : 13;
  const pad = dense ? "5px 6px" : comfortable ? "14px 16px" : compact ? "8px 10px" : "10px 12px";
  const headerColor = comfortable ? "#737373" : subtle;
  const titleColor = comfortable ? "#525252" : subtle;
  const userFont = comfortable ? 12 : dense ? 9 : compact ? 11 : 12;
  const headers = dualGbpColumns
    ? (["#", "User ID", "Fraud txns", "Raw (Σ AMOUNT)", "Fiat GBP", "Types", "Countries", "KYC", "Score"] as const)
    : (["#", "User ID", "Fraud txns", "Fraud (raw)", "Types", "Countries", "KYC", "Score"] as const);

  return (
    <div>
      <p
        style={{
          fontSize: dense ? 8.5 : comfortable ? 12 : compact ? 10 : 11,
          fontWeight: 700,
          letterSpacing: comfortable ? "0.06em" : "0.08em",
          textTransform: "uppercase",
          color: titleColor,
          marginBottom: dense ? 6 : comfortable ? 12 : compact ? 8 : 10,
        }}
      >
        {title}
      </p>
      <div
        style={{
          border: `1px solid ${rule}`,
          borderRadius: compact ? 10 : 12,
          overflow: "hidden",
          background: "#ffffff",
        }}
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              minWidth: comfortable ? (dualGbpColumns ? 820 : 720) : 0,
              borderCollapse: "collapse",
              fontSize: td,
              tableLayout: comfortable ? "fixed" : "auto",
            }}
          >
            {comfortable ? (
              <colgroup>
                <col style={{ width: 48 }} />
                <col style={{ width: dualGbpColumns ? "28%" : "32%" }} />
                <col style={{ width: 88 }} />
                {dualGbpColumns ? (
                  <>
                    <col style={{ width: 88 }} />
                    <col style={{ width: 88 }} />
                  </>
                ) : (
                  <col style={{ width: 100 }} />
                )}
                <col style={{ width: 72 }} />
                <col style={{ width: 88 }} />
                <col style={{ width: 72 }} />
                <col style={{ width: 72 }} />
              </colgroup>
            ) : null}
            <thead>
              <tr style={{ background: "#fafafa", borderBottom: `1px solid ${rule}` }}>
                {headers.map((h) => (
                  <th
                    key={h}
                    style={{
                      padding: pad,
                      textAlign: h === "Score" || h === "Raw (Σ AMOUNT)" || h === "Fiat GBP" || h === "Fraud (raw)" ? "right" : "left",
                      fontSize: th,
                      fontWeight: 700,
                      color: headerColor,
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      whiteSpace: h === "User ID" ? "normal" : "nowrap",
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((f, i) => (
                <tr key={f.full_id} style={{ borderTop: `1px solid ${rule}` }}>
                  <td style={{ padding: pad, fontWeight: 800, color: ink, verticalAlign: "top" }}>{i + 1}</td>
                  <td
                    title={f.full_id}
                    style={{
                      padding: pad,
                      fontFamily: "ui-monospace, monospace",
                      fontSize: userFont,
                      color: muted,
                      wordBreak: "break-all",
                      lineHeight: 1.45,
                      verticalAlign: "top",
                    }}
                  >
                    {comfortable ? f.full_id : f.id}
                  </td>
                  <td style={{ padding: pad, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>{fmt(f.txns)}</td>
                  {dualGbpColumns ? (
                    <>
                      <td style={{ padding: pad, fontWeight: 600, color: "#cf1322", verticalAlign: "top", whiteSpace: "nowrap", textAlign: "right" }}>{fmtGbpFromAmount(f.amount)}</td>
                      <td style={{ padding: pad, fontWeight: 600, color: "#cf1322", verticalAlign: "top", whiteSpace: "nowrap", textAlign: "right" }}>
                        {f.amount_gbp_fiat != null ? fmtFiatGbpMajor(f.amount_gbp_fiat) : "—"}
                      </td>
                    </>
                  ) : (
                    <td style={{ padding: pad, fontWeight: 600, color: "#cf1322", verticalAlign: "top", whiteSpace: "nowrap", textAlign: "right" }}>{fmtGbpFromAmount(f.amount)}</td>
                  )}
                  <td style={{ padding: pad, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {f.types_used}/5
                  </td>
                  <td style={{ padding: pad, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>{f.countries_hit}</td>
                  <td style={{ padding: pad, fontWeight: 600, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>
                    {f.kyc === "PASSED" ? "Passed" : f.kyc || "—"}
                  </td>
                  <td style={{ padding: pad, textAlign: "right", fontWeight: 800, color: ink, verticalAlign: "top", whiteSpace: "nowrap" }}>{f.score.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function FraudstersAuditBlock({
  composite,
  byAmount,
  variant,
  totalFraudsters,
}: {
  composite: Fraudster[];
  byAmount?: Fraudster[];
  variant: "page" | "section" | "print";
  totalFraudsters: number;
}) {
  const ink = "#0f0f0f";
  const muted = "#525252";
  const rule = variant === "page" ? "#ebebeb" : "#e8e8ed";
  const subtle = variant === "page" ? "#a3a3a3" : "#9898ac";
  const compact = variant === "section" || variant === "print";
  const isPage = variant === "page";

  const compositeIds = new Set(composite.map((f) => f.full_id));
  const naiveIds = new Set((byAmount ?? []).map((f) => f.full_id));
  const overlap = [...compositeIds].filter((id) => naiveIds.has(id)).length;

  const volByComposite = composite.map((f, i) => ({
    label: `#${i + 1}  ${f.id}`,
    gbp: f.amount,
  }));
  const scoreByComposite = composite.map((f, i) => ({
    label: `#${i + 1}  ${f.id}`,
    score: Number(f.score.toFixed(1)),
  }));
  const rankCompare =
    byAmount?.length && byAmount.length === composite.length
      ? composite.map((_, i) => ({
          rank: `#${i + 1}`,
          naiveGbp: byAmount[i]?.amount ?? 0,
          compositeGbp: composite[i]?.amount ?? 0,
        }))
      : null;
  const top1 = composite[0];
  const top1Channels = top1
    ? Object.entries(top1.type_breakdown)
        .map(([k, v]) => ({ name: k.replace(/_/g, " "), txns: v }))
        .sort((a, b) => b.txns - a.txns)
    : [];

  const scoringMethodology = (
    <>
      <p style={{ fontWeight: 700, color: ink, marginBottom: 8 }}>Scoring method</p>
      <p style={{ margin: 0, lineHeight: 1.65 }}>
        Each fraudster is scored on five dimensions, each scaled to [0, 1] via division by the dimension maximum (max-normalisation) across all {fmt(totalFraudsters)} fraud actors:{" "}
        <strong style={{ color: ink }}>0.35</strong> fraud value + <strong style={{ color: ink }}>0.30</strong> fraud txn count +{" "}
        <strong style={{ color: ink }}>0.15</strong> fraud rate (fraud txns ÷ all user txns) + <strong style={{ color: ink }}>0.10</strong> type diversity +{" "}
        <strong style={{ color: ink }}>0.10</strong> country diversity. Weights mirror risk-team priorities. The fraud-value term uses <strong>Σ raw <code>AMOUNT</code></strong> (same as the raw Σ <code>AMOUNT</code> dossier column — naive mixed-currency sum), not fiat GBP. Displayed score is 0–100 (weighted sum × 100).
      </p>
    </>
  );

  const scoringBlock = (
    <div
      style={{
        background: variant === "page" ? "#fafafa" : variant === "print" ? "#fafafa" : "#fff1f1",
        border: variant === "page" || variant === "print" ? `1px solid ${rule}` : "1px solid #fecaca",
        borderRadius: 12,
        padding: variant === "print" ? "10px 12px" : compact ? "16px 18px" : "20px 24px",
      }}
    >
      <p style={{ fontSize: variant === "print" ? 10 : compact ? 12 : 13, fontWeight: 700, color: variant === "section" ? "#7f1d1d" : ink, marginBottom: 6 }}>
        Scoring method
      </p>
      <p style={{ fontSize: variant === "print" ? 9.5 : compact ? 12 : 13, color: variant === "section" ? "#7f1d1d" : "#737373", lineHeight: 1.65, margin: 0 }}>
        Each fraudster is scored on five dimensions, each scaled to [0, 1] via division by the dimension maximum (max-normalisation) across all {fmt(totalFraudsters)} fraud actors:{" "}
        <strong style={{ color: ink }}>0.35</strong> fraud value + <strong style={{ color: ink }}>0.30</strong> fraud txn count +{" "}
        <strong style={{ color: ink }}>0.15</strong> fraud rate (fraud txns ÷ all user txns) + <strong style={{ color: ink }}>0.10</strong> type diversity +{" "}
        <strong style={{ color: ink }}>0.10</strong> country diversity. Weights mirror risk-team priorities. Fraud value = Σ raw <code>AMOUNT</code> (raw dossier column). Fiat GBP is row-wise conversion with embedded FX (ex crypto) for context only; it does not feed the score. Displayed score is 0–100 (weighted sum × 100).
      </p>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: compact ? 20 : 28 }}>
      {isPage ? (
        <Panel
          title="Composite model"
          description="Composite ranks persistent, cross-rail actors; naive-by-amount ranks headline loss—use both for triage."
          methodology={scoringMethodology}
          noPad
        >
          {null}
        </Panel>
      ) : (
        scoringBlock
      )}

      {isPage && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <Panel
            title="Fraud volume by composite rank"
            description="Naive Σ AMOUNT on fraud rows for each of the top 5 composite-ranked users (K/M/B formatting, no currency symbol)."
            methodology="Same raw `AMOUNT` aggregate as the dossier and `overview.fraud_amount` (mixed-currency naive sum — not row-wise fiat GBP). Bars follow composite order (#1 highest composite score), not naive amount order."
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={volByComposite} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                    tickFormatter={(v) => fmtAxisRaw(v)}
                    axisLine={{ stroke: "#ebebeb" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={132}
                    tick={{ fill: "#525252", fontSize: 11, fontFamily: "inherit" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#fafafa" }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <ChartTooltipRoot>
                          <ChartTooltipTitle>{payload[0].payload.label}</ChartTooltipTitle>
                          <ChartTooltipRows>
                            <ChartTooltipRow
                              label="Fraud (raw)"
                              value={fmtGbpFromAmount(Math.round(payload[0].payload.gbp))}
                              valueColor="#cf1322"
                            />
                          </ChartTooltipRows>
                        </ChartTooltipRoot>
                      ) : null
                    }
                  />
                  <Bar dataKey="gbp" name="Fraud (raw)" fill="#cf1322" radius={[0, 3, 3, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <Panel
            title="Composite score by rank"
            description="Final 0–100 score for the same five users (composite ordering)."
            methodology="Score is the weighted sum defined in the Composite model panel (same weights; each dimension max-normalised 0–1 via division by that dimension's maximum across all fraud actors)."
          >
            <div style={{ width: "100%", height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={scoreByComposite} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                    axisLine={{ stroke: "#ebebeb" }}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={132}
                    tick={{ fill: "#525252", fontSize: 11, fontFamily: "inherit" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    cursor={{ fill: "#fafafa" }}
                    content={({ active, payload }) =>
                      active && payload?.[0] ? (
                        <ChartTooltipRoot>
                          <ChartTooltipTitle>{payload[0].payload.label}</ChartTooltipTitle>
                          <ChartTooltipRows>
                            <ChartTooltipRow label="Composite score" value={payload[0].payload.score} />
                          </ChartTooltipRows>
                        </ChartTooltipRoot>
                      ) : null
                    }
                  />
                  <Bar dataKey="score" name="Score" fill="#0f0f0f" radius={[0, 3, 3, 0]} maxBarSize={22} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
      )}

      {isPage && rankCompare && (
        <Panel
          title="Fraud amount at each rank (raw) — naive vs composite"
          description="Same rank position (#1–#5): naive list vs composite list — often different users at the same slot."
          methodology="Naive: i-th bar is raw fraud AMOUNT for the user ranked i by naive amount. Composite: i-th bar is raw fraud AMOUNT for the user ranked i by composite score. Compares ‘who sits at each rank’ not cumulative curves."
        >
          <div style={{ width: "100%", height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rankCompare} margin={{ top: 8, right: 8, left: 4, bottom: 8 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                <XAxis dataKey="rank" tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }} axisLine={{ stroke: "#ebebeb" }} tickLine={false} />
                <YAxis
                  tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                  tickFormatter={(v) => fmtAxisRaw(v)}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#fafafa" }}
                  content={(props) =>
                    props.active && props.payload?.length ? (
                      <ChartTooltipFromPayload
                        {...props}
                        formatValue={(v) => fmtAxisRaw(Number(v))}
                      />
                    ) : null
                  }
                />
                <Legend wrapperStyle={{ fontSize: 11, color: "#a3a3a3" }} />
                <Bar dataKey="naiveGbp" name="Naive list (raw)" fill="#a3a3a3" radius={[3, 3, 0, 0]} maxBarSize={36} />
                <Bar dataKey="compositeGbp" name="Composite list (raw)" fill="#cf1322" radius={[3, 3, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {isPage && top1Channels.length > 0 && (
        <Panel
          title="#1 composite — fraud transactions by type"
          description={`Channel mix for ${top1?.id}: fraud-labelled txn counts only.`}
          methodology="Counts come from type_breakdown on the top composite-ranked user — fraud-labelled transactions per channel in the extract."
        >
          <div style={{ width: "100%", height: Math.max(200, 44 * top1Channels.length + 48) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={top1Channels} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: "#a3a3a3", fontSize: 11, fontFamily: "inherit" }}
                  axisLine={{ stroke: "#ebebeb" }}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={112}
                  tick={{ fill: "#525252", fontSize: 11, fontFamily: "inherit" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#fafafa" }}
                  content={({ active, payload }) =>
                    active && payload?.[0] ? (
                      <ChartTooltipRoot>
                        <ChartTooltipTitle>{payload[0].payload.name}</ChartTooltipTitle>
                        <ChartTooltipRows>
                          <ChartTooltipRow label="Fraud txns" value={fmt(payload[0].payload.txns)} />
                        </ChartTooltipRows>
                      </ChartTooltipRoot>
                    ) : null
                  }
                />
                <Bar dataKey="txns" name="Fraud txns" fill="#0f0f0f" radius={[0, 3, 3, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      )}

      {byAmount && byAmount.length > 0 && (
        isPage ? (
          <Panel
            title="Dossier tables"
            description="Raw Σ AMOUNT on fraud rows and Fiat GBP (row-wise FX, ex crypto) — same columns on both lists; tables stack when the viewport is narrow."
            methodology="User ID is the full UUID from the extract (hover still shows it in the cell title). KYC = worst snapshot seen for that user in the fraud-labelled rows. Types = distinct fraud channel count of 5. Fiat GBP uses the same embedded snapshot as executive overview totals when a row converts."
          >
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(640px, 1fr))", gap: 24 }}>
              <FraudsterDossierTable rows={byAmount} title="Naive — top 5 by raw amount / fiat GBP" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={false} comfortable dualGbpColumns />
              <FraudsterDossierTable rows={composite} title="Composite — top 5 by score" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={false} comfortable dualGbpColumns />
            </div>
          </Panel>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: variant === "print" ? "1fr" : "1fr 1fr", gap: compact ? 12 : 16 }}>
            <FraudsterDossierTable rows={byAmount} title="Naive — top 5 by raw amount / fiat GBP" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={variant === "print"} dualGbpColumns={variant === "print"} />
            <FraudsterDossierTable rows={composite} title="Composite — top 5 by score" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={variant === "print"} dualGbpColumns={variant === "print"} />
          </div>
        )
      )}

      {(!byAmount || byAmount.length === 0) && (
        isPage ? (
          <Panel title="Top-5 dossier" description="Composite-ranked users only (naive-by-amount list not in this extract).">
            <FraudsterDossierTable rows={composite} title="Composite ranking" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={false} comfortable dualGbpColumns />
          </Panel>
        ) : (
          <FraudsterDossierTable rows={composite} title="Top-5 dossier (composite)" ink={ink} muted={muted} rule={rule} subtle={subtle} compact={compact} dense={variant === "print"} dualGbpColumns={variant === "print"} />
        )
      )}

      {byAmount && byAmount.length > 0 && (
        <p style={{ fontSize: isPage ? 14 : compact ? 11 : 12, color: isPage ? "#525252" : muted, lineHeight: 1.6, margin: 0, maxWidth: isPage ? 900 : undefined }}>
          <strong style={{ color: ink }}>Overlap.</strong> {overlap} of 5 user{overlap === 1 ? "" : "s"} appear on both lists. Naive amount ranking favours one-shot high-loss events; composite favours serial, multi-rail actors (forward risk).{" "}
          <strong style={{ color: ink }}>Spreadsheet check:</strong> fraud column = sum of <code>AMOUNT</code> where <code>IS_FRAUD</code> is True, grouped by <code>USER_ID</code>. If you instead convert each row to GBP with FX first, totals will differ whenever currencies mix (e.g. USD card tickets summed as face value inflate vs fiat GBP).
        </p>
      )}
    </div>
  );
}
