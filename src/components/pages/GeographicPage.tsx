"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import {
  ChartTooltipRoot,
  ChartTooltipTitle,
  ChartTooltipRows,
  ChartTooltipRow,
} from "@/components/ui/ChartTooltip";
import GeographicRiskBubbleChart from "@/components/GeographicRiskBubbleChart";
import Panel from "@/components/ui/Panel";
import PageHeader from "@/components/ui/PageHeader";
import type { Brief2a } from "@/lib/types";

const fmt  = (n: number) => n.toLocaleString();
const fmtM = (n: number) => {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `£${(n / 1_000).toFixed(0)}K`;
  return `£${n}`;
};

/** ISO 3166-1 alpha-3 → alpha-2 mapping (covers all codes seen in this dataset) */
const ALPHA3_TO_2: Record<string, string> = {
  ABW:"AW",AFG:"AF",AGO:"AO",AIA:"AI",ALA:"AX",ALB:"AL",AND:"AD",ANT:"AN",
  ARE:"AE",ARG:"AR",ARM:"AM",ATG:"AG",AUS:"AU",AUT:"AT",AZE:"AZ",
  BEL:"BE",BEN:"BJ",BGD:"BD",BGR:"BG",BHR:"BH",BHS:"BS",BIH:"BA",
  BLR:"BY",BLZ:"BZ",BMU:"BM",BOL:"BO",BRA:"BR",BRB:"BB",BRN:"BN",BWA:"BW",
  CAN:"CA",CHE:"CH",CHL:"CL",CHN:"CN",CIV:"CI",COK:"CK",COL:"CO",CPV:"CV",
  CRI:"CR",CUB:"CU",CUW:"CW",CYM:"KY",CYP:"CY",CZE:"CZ",
  DEU:"DE",DJI:"DJ",DNK:"DK",DOM:"DO",DZA:"DZ",
  ECU:"EC",EGY:"EG",ESP:"ES",EST:"EE",ETH:"ET",
  FIN:"FI",FJI:"FJ",FRA:"FR",
  GBR:"GB",GEO:"GE",GGY:"GG",GHA:"GH",GIB:"GI",GLP:"GP",GMB:"GM",
  GRC:"GR",GRD:"GD",GRL:"GL",GTM:"GT",GUY:"GY",
  HKG:"HK",HND:"HN",HRV:"HR",HTI:"HT",HUN:"HU",
  IDN:"ID",IMN:"IM",IND:"IN",IRL:"IE",ISL:"IS",ISR:"IL",ITA:"IT",
  JAM:"JM",JEY:"JE",JOR:"JO",JPN:"JP",
  KAZ:"KZ",KEN:"KE",KGZ:"KG",KHM:"KH",KNA:"KN",KOR:"KR",KWT:"KW",
  LAO:"LA",LBN:"LB",LCA:"LC",LIE:"LI",LKA:"LK",LTU:"LT",LUX:"LU",LVA:"LV",
  MAC:"MO",MAR:"MA",MCO:"MC",MDA:"MD",MDG:"MG",MDV:"MV",MEX:"MX",
  MKD:"MK",MLT:"MT",MMR:"MM",MNE:"ME",MNG:"MN",MOZ:"MZ",MTQ:"MQ",MUS:"MU",MYS:"MY",
  NAM:"NA",NCL:"NC",NGA:"NG",NIC:"NI",NLD:"NL",NOR:"NO",NPL:"NP",NZL:"NZ",
  OMN:"OM",PAK:"PK",PAN:"PA",PER:"PE",PHL:"PH",POL:"PL",PRI:"PR",PRT:"PT",
  PRY:"PY",PSE:"PS",PYF:"PF",QAT:"QA",REU:"RE",ROU:"RO",RUS:"RU",RWA:"RW",
  SAU:"SA",SEN:"SN",SGP:"SG",SLV:"SV",SMR:"SM",SRB:"RS",SUR:"SR",
  SVK:"SK",SVN:"SI",SWE:"SE",SXM:"SX",SYC:"SC",
  THA:"TH",TJK:"TJ",TTO:"TT",TUN:"TN",TUR:"TR",TWN:"TW",TZA:"TZ",
  UGA:"UG",UKR:"UA",URY:"UY",USA:"US",UZB:"UZ",
  VAT:"VA",VCT:"VC",VEN:"VE",VGB:"VG",VIR:"VI",VNM:"VN",
  ZAF:"ZA",ZMB:"ZM",ZWE:"ZW",
};

const COUNTRY_NAMES: Record<string, string> = {
  GBR:"United Kingdom", DEU:"Germany",     POL:"Poland",       FRA:"France",
  ESP:"Spain",          LTU:"Lithuania",   ROU:"Romania",      CZE:"Czech Republic",
  NLD:"Netherlands",    BEL:"Belgium",     GRC:"Greece",       ITA:"Italy",
  JEY:"Jersey",         RUS:"Russia",      USA:"United States",MDV:"Maldives",
  CHE:"Switzerland",    LVA:"Latvia",      IRL:"Ireland",      SVK:"Slovakia",
  GIB:"Gibraltar",      AUS:"Australia",   CAN:"Canada",       SGP:"Singapore",
  HKG:"Hong Kong",      JPN:"Japan",       ARE:"UAE",          SAU:"Saudi Arabia",
  IND:"India",          ZAF:"South Africa",BRA:"Brazil",       MEX:"Mexico",
  TUR:"Turkey",         UKR:"Ukraine",     SWE:"Sweden",       NOR:"Norway",
  DNK:"Denmark",        FIN:"Finland",     AUT:"Austria",      PRT:"Portugal",
  GGY:"Guernsey",       IMN:"Isle of Man", CYP:"Cyprus",       MLT:"Malta",
  NZL:"New Zealand",    KOR:"South Korea", TWN:"Taiwan",       THA:"Thailand",
};

/** Convert a country code (alpha-2 or alpha-3) → flag emoji. Returns "" for unknown codes. */
const flag = (code: string): string => {
  if (!code || code.length < 2) return "";
  // Normalise alpha-3 → alpha-2
  const alpha2 = code.length === 3 ? (ALPHA3_TO_2[code.toUpperCase()] ?? "") : code.toUpperCase();
  if (alpha2.length !== 2) return "";
  return alpha2.split("").map(c => String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)).join("");
};

const name = (code: string) => COUNTRY_NAMES[code.toUpperCase()] ?? code;

/* ── Custom Y-axis tick with flag ─────────────────────── */
const FlagTick = ({ x, y, payload }: any) => (
  <text x={x} y={y} dy={4} textAnchor="end" fontSize={13} fill="#404040">
    {flag(payload.value)} {payload.value}
  </text>
);

const ChartTip = ({ active, payload }: { active?: boolean; payload?: { payload: { country: string; fraud: number; rate: number; fraud_amount: number } }[] }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <ChartTooltipRoot style={{ minWidth: 196 }}>
      <ChartTooltipTitle>
        {flag(d.country)} {name(d.country)}
      </ChartTooltipTitle>
      <ChartTooltipRows>
        <ChartTooltipRow label="Fraud txns" value={fmt(d.fraud)} valueColor="#cf1322" />
        <ChartTooltipRow label="Fraud rate" value={`${d.rate}%`} />
        <ChartTooltipRow label="Fraud loss" value={fmtM(d.fraud_amount)} valueColor="#cf1322" />
      </ChartTooltipRows>
    </ChartTooltipRoot>
  );
};

export default function GeographicPage({ data }: { data: Brief2a }) {
  const geo    = data.geo_risk;
  const mfLoss = data.fraud_amount_merchant_facing ?? 0;
  const pfLoss = data.fraud_amount_platform ?? 0;
  const top10  = geo.slice(0, 10);
  const byRate = [...geo].sort((a, b) => b.rate - a.rate).slice(0, 10);

  return (
    <div style={{ padding: "48px 56px", maxWidth: 1100, margin: "0 auto" }}>
      <PageHeader
        overline="Brief 2A"
        title="Geographic Risk Exposure"
        description="High fraud volume and high fraud rate are different control problems; merchant-facing loss (card + ATM) and platform loss (top-up, P2P, transfer) need different owners so geography tiles are not mistaken for the right lever on bank rails."
        recommendation="Keep two live country views—fraud count vs fraud rate—with separate owners and escalation paths. Route merchant-facing cuts (card + ATM) to acquiring and card risk; route platform loss to TM rule tuning with Brief 2B. Review the ≥50-transactions-per-country floor at least quarterly as volumes grow."
        methodology={
          <>
            <p style={{ fontWeight: 600, marginBottom: 8 }}>Geography & filters</p>
            <p style={{ margin: 0, lineHeight: 1.6 }}>
              Charts and tables use <code>MERCHANT_COUNTRY</code> on each row where present. Countries with fewer than 50 transactions are excluded so small-sample noise does not drive policy.{" "}
              Merchant-facing fraud £ sums card + ATM; platform fraud £ sums top-up, P2P, and bank transfer — aligned to where velocity vs terminal controls apply.
            </p>
          </>
        }
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
        <div style={{ border: "1px solid #0f0f0f", borderRadius: 12, padding: "22px 24px", background: "#fafafa" }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#737373", marginBottom: 10 }}>
            Merchant-facing fraud · CARD + ATM
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", color: "#0f0f0f", lineHeight: 1 }}>{fmtM(mfLoss)}</p>
          <p style={{ fontSize: 13, color: "#737373", marginTop: 10, lineHeight: 1.55 }}>
            Fraud <code>AMOUNT</code> on card and ATM tickets — geographic and terminal controls apply.
          </p>
        </div>
        <div style={{ border: "1px solid #cf1322", borderRadius: 12, padding: "22px 24px", background: "#fffafa" }}>
          <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const, letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 10 }}>
            Platform fraud · TOPUP + P2P + bank transfer
          </p>
          <p style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-0.03em", color: "#cf1322", lineHeight: 1 }}>{fmtM(pfLoss)}</p>
          <p style={{ fontSize: 13, color: "#737373", marginTop: 10, lineHeight: 1.55 }}>
            On-rail fund movement — velocity and behavioural controls apply. Brief 2B bank-transfer signals sit in this bucket, not merchant-country tiles alone.
          </p>
        </div>
      </div>

      {/* Callout pair */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        {[
          {
            label: "Highest Volume",
            country: top10[0]?.country,
            detail: `${fmt(top10[0]?.fraud)} fraud transactions · ${top10[0]?.rate}% rate`,
          },
          {
            label: "Highest Rate (≥50 txns)",
            country: byRate[0]?.country,
            detail: `${byRate[0]?.rate}% fraud rate · ${fmt(byRate[0]?.fraud)} total cases`,
          },
        ].map((c) => (
          <div key={c.label} style={{
            background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12, padding: "32px 32px",
          }}>
            <p style={{
              fontSize: 11, fontWeight: 600, textTransform: "uppercase" as const,
              letterSpacing: "0.08em", color: "#a3a3a3", marginBottom: 16,
            }}>
              {c.label}
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
              <span style={{ fontSize: 44, lineHeight: 1 }}>{flag(c.country ?? "")}</span>
              <div>
                <p style={{ fontSize: 28, fontWeight: 700, color: "#0f0f0f", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 4 }}>
                  {c.country}
                </p>
                <p style={{ fontSize: 13, color: "#a3a3a3", fontWeight: 400 }}>{name(c.country ?? "")}</p>
              </div>
            </div>
            <p style={{ fontSize: 13, color: "#a3a3a3" }}>{c.detail}</p>
          </div>
        ))}
      </div>

      {/* Insight */}
      <div style={{
        background: "#ffffff", border: "1px solid #ebebeb", borderRadius: 12,
        padding: "24px 28px", marginBottom: 40, display: "flex", gap: 16, alignItems: "flex-start",
      }}>
        <div style={{ width: 3, flexShrink: 0, borderRadius: 99, background: "#e5e5e5", alignSelf: "stretch" }} />
        <p style={{ fontSize: 13, color: "#737373", lineHeight: 1.6 }}>
          <span style={{ fontWeight: 600, color: "#171717" }}>{flag(top10[0]?.country ?? "")} {name(top10[0]?.country ?? "")}</span>{" "}
          dominates by raw fraud volume ({fmt(top10[0]?.fraud)} cases) due to its large user base. But{" "}
          <span style={{ fontWeight: 600, color: "#171717" }}>{flag(byRate[0]?.country ?? "")} {name(byRate[0]?.country ?? "")}</span>{" "}
          is the highest-risk country by rate ({byRate[0]?.rate}%) — 1 in every{" "}
          {Math.round(100 / (byRate[0]?.rate || 1))} transactions is fraudulent.
          A global strategy must monitor both dimensions independently.
        </p>
      </div>

      <div
        style={{
          background: "#ffffff",
          border: "1px solid #ebebeb",
          borderRadius: 12,
          padding: "24px 28px 20px",
          marginBottom: 32,
        }}
      >
        <GeographicRiskBubbleChart geo={geo} height={400} compact />
      </div>

      {/* Charts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 32 }}>
        <Panel
          title="Top 10 by Fraud Volume"
          description="Operational load: where fraud-labelled transaction counts concentrate."
          methodology="Countries below the ≥50 transaction threshold in the extract are omitted from this view. Country = MERCHANT_COUNTRY on each row where present."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={top10} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} />
              <YAxis
                type="category"
                dataKey="country"
                interval={0}
                axisLine={false}
                tickLine={false}
                width={76}
                tick={<FlagTick />}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill: "#fafafa" }} />
              <Bar dataKey="fraud" radius={[0, 3, 3, 0]}>
                {top10.map((e, i) => (
                  <Cell key={e.country} fill={`rgba(15,15,15,${1 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel
          title="Top 10 by Fraud Rate (%)"
          description="Structural risk: where a random transaction is most likely to be fraud-labelled."
          methodology="Sorted by fraud rate among countries meeting the same ≥50 txn minimum. Independent from the volume ranking."
        >
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byRate} layout="vertical" margin={{ top: 0, right: 16, left: 8, bottom: 0 }}>
              <XAxis type="number" tick={{ fill: "#a3a3a3", fontSize: 10, fontFamily: "inherit" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <YAxis
                type="category"
                dataKey="country"
                interval={0}
                axisLine={false}
                tickLine={false}
                width={76}
                tick={<FlagTick />}
              />
              <Tooltip content={<ChartTip />} cursor={{ fill: "#fafafa" }} />
              <Bar dataKey="rate" radius={[0, 3, 3, 0]}>
                {byRate.map((e, i) => (
                  <Cell key={e.country} fill={`rgba(207,19,34,${1 - i * 0.08})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* Table */}
      <Panel
        title="Country Breakdown"
        description="Top markets by fraud volume in this filtered set."
        methodology="Columns follow geo_risk rows: totals and fraud counts use the same MERCHANT_COUNTRY grain and filters as the charts above."
        noPad
      >
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #f5f5f5" }}>
              {["Country", "Total Txns", "Fraud Txns", "Fraud Rate", "Fraud Loss"].map((h) => (
                <th key={h} style={{
                  padding: "12px 24px", textAlign: "left", fontSize: 11,
                  fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em", color: "#a3a3a3",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {top10.map((row, i) => (
              <tr key={row.country} style={{ borderBottom: i < top10.length - 1 ? "1px solid #fafafa" : "none" }}>
                <td style={{ padding: "14px 24px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 20, lineHeight: 1 }}>{flag(row.country)}</span>
                    <div>
                      <p style={{ fontWeight: 600, color: "#0f0f0f", lineHeight: 1, marginBottom: 2 }}>{row.country}</p>
                      <p style={{ fontSize: 11, color: "#a3a3a3" }}>{name(row.country)}</p>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "14px 24px", color: "#737373" }}>{fmt(row.total)}</td>
                <td style={{ padding: "14px 24px", color: "#404040", fontWeight: 500 }}>{fmt(row.fraud)}</td>
                <td style={{ padding: "14px 24px" }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: 6,
                    background: row.rate > 4 ? "#fff1f0" : row.rate > 1 ? "#fffbe6" : "#f5f5f5",
                    color: row.rate > 4 ? "#cf1322" : row.rate > 1 ? "#ad6800" : "#595959",
                  }}>
                    {row.rate}%
                  </span>
                </td>
                <td style={{ padding: "14px 24px", color: "#404040", fontWeight: 500 }}>{fmtM(row.fraud_amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}
