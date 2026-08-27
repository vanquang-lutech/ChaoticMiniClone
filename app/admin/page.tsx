import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_SESSION_COOKIE, isValidAdminSession } from "@/lib/admin-auth";
import type { UsageBucket, UsageSummary } from "@/lib/api";

export const metadata: Metadata = { title: "Admin | Chaotic Custom Studio" };

type AdminPageProps = { searchParams: Promise<{ date_from?: string; date_to?: string }> };

const featureLabels: Record<string, string> = {
  upload: "Background removal",
  generate_image: "Image generation",
  custom_text: "Custom text",
};

function isDate(value: string | undefined): value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function asDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatFeature(value: string) {
  return featureLabels[value] ?? value.replaceAll("_", " ");
}

async function getUsage(dateFrom: string, dateTo: string): Promise<{ data: UsageSummary | null; error: string | null }> {
  const backendUrl = (process.env.CHAOTIC_CUSTOM_AI_URL ?? "http://localhost:8000").replace(/\/$/, "");
  const url = new URL("/api/v1/usage", backendUrl);
  url.searchParams.set("date_from", dateFrom);
  url.searchParams.set("date_to", dateTo);

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return { data: null, error: `Backend returned ${response.status}.` };
    return { data: (await response.json()) as UsageSummary, error: null };
  } catch {
    return { data: null, error: "Unable to connect to the ChaoticCustomAI backend." };
  }
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!isValidAdminSession(session)) redirect("/admin/login");

  const params = await searchParams;
  const today = new Date();
  const maxDate = asDateInput(today);
  const defaultDateFrom = asDateInput(new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000));
  const dateFrom = isDate(params.date_from) ? params.date_from : defaultDateFrom;
  const dateTo = isDate(params.date_to) ? params.date_to : maxDate;
  const { data: usage, error } = await getUsage(dateFrom, dateTo);

  return (
    <main className="adminPage adminV2">
      <header className="adminTopbar">
        <Link href="/" className="adminBrand" aria-label="Back to Chaotic Custom Studio"><span>CC</span> CHAOTIC CUSTOM</Link>
        <div className="adminTopbarActions">
          <span className="adminLive"><i /> API usage live</span>
          <form action="/api/admin/logout" method="post"><button className="adminLogout" type="submit">Sign out</button></form>
        </div>
      </header>

      <div className="adminMain">
        <section className="adminHero">
          <div>
            <p className="adminKicker">Operations console</p>
            <h1>Usage at a glance.</h1>
            <p>Follow image workload, token consumption and job activity from one private workspace.</p>
          </div>
          <form className="adminDateFilter adminDateFilterV2" method="get">
            <label><span>From</span><input type="date" name="date_from" defaultValue={dateFrom} max={dateTo} /></label>
            <label><span>To</span><input type="date" name="date_to" defaultValue={dateTo} min={dateFrom} max={maxDate} /></label>
            <button type="submit">Update view <span aria-hidden="true">→</span></button>
          </form>
        </section>

        {usage ? <Dashboard usage={usage} /> : <section className="adminFetchError" role="alert"><strong>Usage data is unavailable.</strong><span>{error}</span></section>}
      </div>
    </main>
  );
}

function Dashboard({ usage }: { usage: UsageSummary }) {
  const model = usage.by_model[0];
  const featureBuckets = usage.by_feature.slice(0, 3);
  const gradient = buildGradient(featureBuckets, usage.total_tokens);

  return <>
    <section className="adminOverview" aria-label="Usage summary">
      <article className="adminPrimaryMetric">
        <span className="adminMetricLabel">Tokens consumed</span>
        <strong>{formatCompact(usage.total_tokens)}</strong>
        <span className="adminMetricDetail">{formatNumber(usage.total_tokens)} tokens in selected period</span>
        <div className="adminMetricLine" />
      </article>
      <article className="adminSmallMetric"><span className="adminMetricIcon">✦</span><span className="adminMetricLabel">AI requests</span><strong>{formatNumber(usage.calls)}</strong><small>Completed calls recorded</small></article>
      <article className="adminSmallMetric"><span className="adminMetricIcon adminMetricIconOrange">↗</span><span className="adminMetricLabel">Output share</span><strong>{usage.total_tokens ? `${Math.round((usage.output_tokens / usage.total_tokens) * 100)}%` : "—"}</strong><small>{formatCompact(usage.output_tokens)} output tokens</small></article>
      <article className="adminSmallMetric"><span className="adminMetricIcon adminMetricIconBlue">◈</span><span className="adminMetricLabel">Primary model</span><strong className="adminModelName">{model?.key ?? "—"}</strong><small>{model ? `${formatCompact(model.total_tokens)} tokens` : "No model data"}</small></article>
    </section>

    <section className="adminDataGrid">
      <article className="adminPanel adminFeaturePanel">
        <div className="adminPanelHeader"><div><p className="adminKicker">Token composition</p><h2>Where tokens go</h2></div><span className="adminPeriod">{formatDate(usage.date_from)} — {formatDate(usage.date_to)}</span></div>
        {usage.total_tokens ? <div className="adminComposition">
          <div className="adminDonut" style={{ background: gradient }}><div><strong>{formatCompact(usage.total_tokens)}</strong><span>tokens</span></div></div>
          <div className="adminLegend">{featureBuckets.length ? featureBuckets.map((bucket, index) => <FeatureLegend key={bucket.key} bucket={bucket} total={usage.total_tokens} index={index} />) : <p>No usage has been recorded for this period.</p>}</div>
        </div> : <EmptyState text="No token usage has been recorded in this period." />}
      </article>

      <article className="adminPanel adminModelPanel">
        <div className="adminPanelHeader"><div><p className="adminKicker">Model consumption</p><h2>Usage by model</h2></div></div>
        {usage.by_model.length ? <div className="adminModelBars">{usage.by_model.map((bucket) => <div className="adminModelRow" key={bucket.key}>
          <div><strong>{bucket.key}</strong><span>{formatNumber(bucket.calls)} calls</span></div>
          <div className="adminBarTrack"><i style={{ width: `${Math.max(4, Math.round((bucket.total_tokens / usage.total_tokens) * 100))}%` }} /></div>
          <b>{formatCompact(bucket.total_tokens)}</b>
        </div>)}</div> : <EmptyState text="No model data has been recorded yet." />}
      </article>
    </section>

    <section className="adminJobsPanel">
      <div className="adminPanelHeader"><div><p className="adminKicker">Job queue</p><h2>Recent jobs</h2><p className="adminPanelSubtext">Review the latest image work, its status and the output file.</p></div><span className="adminJobCount">0 visible</span></div>
      <div className="adminJobsUnavailable">
        <div className="adminJobsIcon" aria-hidden="true">⌁</div>
        <div><strong>Job listing needs one backend endpoint</strong><p>The current API can retrieve an individual job only when its ID is known, but cannot return a recent-job index. This dashboard is ready for <code>GET /api/v1/admin/jobs</code> to populate this table.</p></div>
        <div className="adminEndpoint"><span>Required endpoint</span><code>GET /api/v1/admin/jobs</code></div>
      </div>
      <div className="adminJobTable" aria-hidden="true"><span>Job</span><span>Feature</span><span>Created</span><span>Status</span><span>Tokens</span></div>
    </section>

    <section className="adminStoragePanel">
      <div className="adminStorageIcon" aria-hidden="true">▱</div>
      <div><p className="adminKicker">Storage visibility</p><h2>Storage browser is next</h2><p>Files are safely written by the backend, but it does not currently provide folder or storage-size metadata for the UI.</p></div>
      <span className="adminStorageBadge">Waiting for storage API</span>
    </section>
  </>;
}

function buildGradient(buckets: UsageBucket[], total: number) {
  const colors = ["#7658ef", "#ef9463", "#42b3a4"];
  let progress = 0;
  const stops = buckets.map((bucket, index) => {
    const start = progress;
    progress += total ? (bucket.total_tokens / total) * 100 : 0;
    return `${colors[index]} ${start}% ${progress}%`;
  });
  if (progress < 100) stops.push(`#e8ebf3 ${progress}% 100%`);
  return `conic-gradient(${stops.join(", ")})`;
}

function FeatureLegend({ bucket, total, index }: { bucket: UsageBucket; total: number; index: number }) {
  return <div className="adminLegendRow"><span className={`adminLegendDot dot${index}`} /><div><strong>{formatFeature(bucket.key)}</strong><span>{formatNumber(bucket.calls)} calls</span></div><b>{total ? Math.round((bucket.total_tokens / total) * 100) : 0}%</b></div>;
}

function EmptyState({ text }: { text: string }) {
  return <div className="adminEmpty"><span>—</span>{text}</div>;
}
