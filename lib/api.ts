export type JobStatus = "pending" | "running" | "succeeded" | "failed";

export type ImageRef = {
  url: string;
};

export type JobAccepted = {
  job_id: string;
  feature: "upload" | "generate_image" | "custom_text";
  status: JobStatus;
};

export type JobResponse = JobAccepted & {
  images: ImageRef[];
  error: string | null;
  usage?: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  } | null;
};

export type UploadResponse = {
  remove_background: boolean;
  items: Array<{
    job_id: string;
    filename: string;
    status: JobStatus;
    image: ImageRef | null;
  }>;
};

export type UsageSummary = {
  date_from: string;
  date_to: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  by_model: UsageBucket[];
  by_feature: UsageBucket[];
};

export type UsageBucket = {
  key: string;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
};

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { detail?: string };
      detail = body.detail ?? detail;
    } catch {
      // Keep the HTTP status when an upstream error is not JSON.
    }
    throw new Error(detail);
  }
  return (await response.json()) as T;
}

export async function getHealth() {
  return parseResponse<{ status: string; app: string }>(await fetch("/health", { cache: "no-store" }));
}

export async function getUsage(dateFrom?: string, dateTo?: string) {
  const params = new URLSearchParams();
  if (dateFrom) params.set("date_from", dateFrom);
  if (dateTo) params.set("date_to", dateTo);
  const query = params.size ? `?${params}` : "";
  return parseResponse<UsageSummary>(await fetch(`/api/v1/usage${query}`, { cache: "no-store" }));
}

export async function getTextStyles() {
  return parseResponse<string[]>(
    await fetch("/api/v1/custom-text/styles", { cache: "no-store" }),
  );
}

export async function uploadImages(files: File[], removeBackground: boolean) {
  const form = new FormData();
  for (const file of files) form.append("files", file);
  form.append("remove_background", String(removeBackground));
  return parseResponse<UploadResponse>(
    await fetch("/api/v1/upload", { method: "POST", body: form }),
  );
}

export async function generateImage(prompt: string) {
  return parseResponse<JobAccepted>(
    await fetch("/api/v1/generate-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, size: "1024x1024", quality: "low" }),
    }),
  );
}

export async function generateText(text: string, stylePreset: string) {
  return parseResponse<JobAccepted>(
    await fetch("/api/v1/custom-text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        style_preset: stylePreset,
        size: "1024x1024",
        quality: "low",
      }),
    }),
  );
}

export async function getJob(jobId: string) {
  return parseResponse<JobResponse>(
    await fetch(`/api/v1/jobs/${encodeURIComponent(jobId)}`, { cache: "no-store" }),
  );
}

export async function pollJob(jobId: string, onStatus?: (status: JobStatus) => void) {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const job = await getJob(jobId);
    onStatus?.(job.status);
    if (job.status === "succeeded") return job;
    if (job.status === "failed") throw new Error(job.error ?? "AI job failed");
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
  }
  throw new Error("Job timed out after 2 minutes");
}
