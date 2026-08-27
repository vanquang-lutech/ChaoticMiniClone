/* eslint-disable @next/next/no-img-element */
"use client";

import {
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { LoaderCircle } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  generateImage,
  generateText,
  getHealth,
  getTextStyles,
  getUsage,
  pollJob,
  uploadImages,
  type JobStatus,
  type UsageSummary,
} from "@/lib/api";

type LayerKind = "upload" | "generated" | "text";
type LayerStatus =
  | "ready"
  | "uploading"
  | "removing-background"
  | "generating-image"
  | "generating-text"
  | "failed";

type DesignLayer = {
  id: string;
  kind: LayerKind;
  name: string;
  url: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  status: LayerStatus;
  error?: string;
};

type ShirtColour = {
  name: string;
  swatch: string;
  image: string;
};

const shirtColours: ShirtColour[] = [
  {
    name: "Black",
    swatch: "#242126",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Black%20Oversize%20Tee%20-%20Front_833f8e03-d0d6-4383-bce9-1b6d9c0cff00.png",
  },
  {
    name: "White",
    swatch: "#f6f5f1",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/White%20Oversize%20Tee%20-%20Front_09a20484-a893-44db-a55c-557e956dae3d.png",
  },
  {
    name: "Black Stone",
    swatch: "#343235",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Black%20Stone%20Oversize%20Tee%20-%20Front_d14d0e8c-bc45-40fc-aad1-42d9ede4fe53.png",
  },
  {
    name: "Natural",
    swatch: "#e6e3db",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Natural%20Oversize%20Tee%20-%20Front_7a2d301c-a6ea-4fee-b285-4edc260ce0e8.png",
  },
  {
    name: "Brown",
    swatch: "#704037",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Brown%20Oversize%20Tee%20-%20Front_c90493e6-481b-4b4e-9f1f-1655e6785f24.png",
  },
  {
    name: "Charcoal",
    swatch: "#424041",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Charcaol%20Oversize%20Tee%20-%20Front_fe8ef9f0-a410-48c7-8ff9-7dd5662f2269.png",
  },
  {
    name: "Lilac",
    swatch: "#c8bad0",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Lilac%20Oversize%20Tee%20-%20Front_72cdc2ac-a1ed-49a9-8f82-93dbe300e5ff.png",
  },
  {
    name: "Powder Blue",
    swatch: "#9eb4d1",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Powder%20Blue%20Oversize%20Tee%20-%20Front_d7e810e7-9d8d-462b-aba3-3454d681b8d0.png",
  },
  {
    name: "Grey Stone",
    swatch: "#746f6b",
    image:
      "https://d1ak85lfl8ys9z.cloudfront.net/threadheads-custom-printing.myshopify.com/variant-images/THR-9el1kx/Brown%20Stone%20Oversize%20Tee%20-%20Front_68743beb-0422-4554-a621-25ebc3008760.png",
  },
];

const fallbackStyles = [
  "collegiate",
  "comic-bold",
  "gold-foil",
  "miami-script",
  "pastel-candy",
  "pixel-block",
  "street-tag",
  "y2k-neon",
];

function Icon({ name, size = 18 }: { name: string; size?: number }) {
  const paths: Record<string, React.ReactNode> = {
    refresh: <><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 9m16 6-2 2.5A7 7 0 0 1 5.5 15"/></>,
    undo: <><path d="M9 7 4 12l5 5"/><path d="M4 12h9a6 6 0 0 1 6 6"/></>,
    redo: <><path d="m15 7 5 5-5 5"/><path d="M20 12h-9a6 6 0 0 0-6 6"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    sparkles: <><path d="m12 3 1.2 3.3L16.5 8l-3.3 1.2L12 12.5l-1.2-3.3L7.5 8l3.3-1.7L12 3Z"/><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14ZM5 13l.7 1.8 1.8.7-1.8.7L5 18l-.7-1.8-1.8-.7 1.8-.7L5 13Z"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8v.01"/></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5"/></>,
    zoom: <><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13M10 11v5m4-5v5"/></>,
    rotate: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
  };
  return (
    <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {paths[name]}
    </svg>
  );
}

function StatusDot({ online }: { online: boolean | null }) {
  return <span className={`statusDot ${online === true ? "online" : online === false ? "offline" : "checking"}`} />;
}

export default function CustomStudio() {
  const [colour, setColour] = useState(shirtColours[0]);
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [past, setPast] = useState<DesignLayer[][]>([]);
  const [future, setFuture] = useState<DesignLayer[][]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [imagePrompt, setImagePrompt] = useState("");
  const [customText, setCustomText] = useState("");
  const [styles, setStyles] = useState(fallbackStyles);
  const [selectedStyle, setSelectedStyle] = useState("collegiate");
  const [online, setOnline] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<UsageSummary>({
    date_from: "",
    date_to: "",
    calls: 0,
    input_tokens: 0,
    output_tokens: 0,
    total_tokens: 0,
    by_model: [],
    by_feature: [],
  });
  const [busy, setBusy] = useState<"upload" | "image" | "text" | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [notice, setNotice] = useState("Connect ChaoticCustomAI at localhost:8000");
  const [showSummary, setShowSummary] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printZoneRef = useRef<HTMLDivElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const dragRef = useRef<{
    id: string;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);

  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;

  const refreshMeta = useCallback(async () => {
    const [health, usageResult, stylesResult] = await Promise.allSettled([
      getHealth(),
      getUsage(),
      getTextStyles(),
    ]);
    setOnline(health.status === "fulfilled");
    if (health.status === "fulfilled") setNotice(`${health.value.app} is ready`);
    if (usageResult.status === "fulfilled") setUsage(usageResult.value);
    if (stylesResult.status === "fulfilled" && stylesResult.value.length) {
      setStyles(stylesResult.value);
      setSelectedStyle((current) => stylesResult.value.includes(current) ? current : stylesResult.value[0]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void refreshMeta(), 0);
    return () => window.clearTimeout(timer);
  }, [refreshMeta]);

  useEffect(() => () => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
  }, []);

  const commitLayers = useCallback((updater: (current: DesignLayer[]) => DesignLayer[]) => {
    setLayers((current) => {
      setPast((entries) => [...entries.slice(-19), current]);
      setFuture([]);
      return updater(current);
    });
  }, []);

  const addLayer = useCallback((
    url: string,
    kind: LayerKind,
    name: string,
    status: LayerStatus = "ready",
  ) => {
    const layer: DesignLayer = {
      id: crypto.randomUUID(),
      kind,
      name,
      url,
      x: 50,
      y: 50,
      scale: kind === "text" ? 0.72 : 0.64,
      rotation: 0,
      status,
    };
    commitLayers((current) => [...current, layer]);
    setSelectedId(layer.id);
    return layer.id;
  }, [commitLayers]);

  const updateJobStatus = (status: JobStatus) => {
    setJobStatus(status);
    setNotice(status === "running" ? "AI is creating your artwork…" : `Job ${status}`);
  };

  const updateLayerState = useCallback((id: string, changes: Partial<DesignLayer>) => {
    setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...changes } : layer));
  }, []);

  const replaceLayerPreview = useCallback(async (id: string, url: string) => {
    await new Promise<void>((resolve) => {
      const image = new window.Image();
      const timeout = window.setTimeout(resolve, 5000);
      const done = () => {
        window.clearTimeout(timeout);
        resolve();
      };
      image.onload = done;
      image.onerror = done;
      image.src = url;
    });
    updateLayerState(id, { url, status: "ready", error: undefined });
  }, [updateLayerState]);

  const completeJob = async (jobId: string, layerId: string) => {
    const job = await pollJob(jobId, updateJobStatus);
    const image = job.images[0];
    if (!image) throw new Error("Job succeeded without an image URL");
    await replaceLayerPreview(layerId, image.url);
    setNotice("Artwork added to the print area");
    await refreshMeta();
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    const available = Math.max(0, 6 - layers.filter((layer) => layer.kind === "upload").length);
    const files = selectedFiles.slice(0, available);
    if (!files.length) {
      setNotice("You can add up to 6 uploaded images");
      return;
    }

    const uploads = files.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return {
        file,
        layer: {
          id: crypto.randomUUID(),
          kind: "upload" as const,
          name: file.name,
          url,
          x: 50,
          y: 50,
          scale: 0.64,
          rotation: 0,
          status: "uploading" as const,
        },
      };
    });

    commitLayers((current) => [...current, ...uploads.map(({ layer }) => layer)]);
    setSelectedId(uploads.at(-1)?.layer.id ?? null);
    setBusy("upload");
    setNotice(removeBackground ? "Uploading original image…" : `Uploading ${files.length} image${files.length > 1 ? "s" : ""}…`);
    try {
      for (let index = 0; index < uploads.length; index += 3) {
        const batch = uploads.slice(index, index + 3);
        const response = await uploadImages(batch.map(({ file }) => file), removeBackground);
        await Promise.all(response.items.map(async (item, itemIndex) => {
          const upload = batch[itemIndex];
          if (!upload) return;
          if (item.status === "succeeded" && item.image) {
            await replaceLayerPreview(upload.layer.id, item.image.url);
            return;
          }
          updateLayerState(upload.layer.id, {
            status: removeBackground ? "removing-background" : "uploading",
          });
          const job = await pollJob(item.job_id, updateJobStatus);
          const image = job.images[0];
          if (!image) throw new Error("Job succeeded without an image URL");
          await replaceLayerPreview(upload.layer.id, image.url);
        }));
      }
      setNotice("Upload complete — drag the artwork to position it");
      await refreshMeta();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      const uploadIds = new Set(uploads.map(({ layer }) => layer.id));
      setLayers((current) => current.map((layer) => (
        uploadIds.has(layer.id) && layer.status !== "ready"
          ? { ...layer, status: "failed", error: message }
          : layer
      )));
      setNotice(message);
    } finally {
      setBusy(null);
      setJobStatus(null);
    }
  };

  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt) return setNotice("Describe the image you want to generate");
    const layerId = addLayer("", "generated", prompt, "generating-image");
    setBusy("image");
    setNotice("Sending prompt to ChaoticCustomAI…");
    try {
      const accepted = await generateImage(prompt);
      await completeJob(accepted.job_id, layerId);
      setImagePrompt("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Image generation failed";
      updateLayerState(layerId, { status: "failed", error: message });
      setNotice(message);
    } finally {
      setBusy(null);
      setJobStatus(null);
    }
  };

  const handleGenerateText = async () => {
    const text = customText.trim();
    if (!text) return setNotice("Enter text before generating a style");
    const layerId = addLayer("", "text", text, "generating-text");
    setBusy("text");
    setNotice("Rendering stylised text…");
    try {
      const accepted = await generateText(text, selectedStyle);
      await completeJob(accepted.job_id, layerId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Text generation failed";
      updateLayerState(layerId, { status: "failed", error: message });
      setNotice(message);
    } finally {
      setBusy(null);
      setJobStatus(null);
    }
  };

  const undo = () => {
    setPast((entries) => {
      const previous = entries.at(-1);
      if (!previous) return entries;
      setFuture((next) => [layers, ...next].slice(0, 20));
      setLayers(previous);
      setSelectedId(null);
      return entries.slice(0, -1);
    });
  };

  const redo = () => {
    setFuture((entries) => {
      const next = entries[0];
      if (!next) return entries;
      setPast((previous) => [...previous, layers].slice(-20));
      setLayers(next);
      setSelectedId(null);
      return entries.slice(1);
    });
  };

  const reset = () => {
    if (!layers.length) return;
    commitLayers(() => []);
    setSelectedId(null);
    setNotice("Canvas reset");
  };

  const updateSelected = (changes: Partial<DesignLayer>) => {
    if (!selectedId) return;
    commitLayers((current) => current.map((layer) => layer.id === selectedId ? { ...layer, ...changes } : layer));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    commitLayers((current) => current.filter((layer) => layer.id !== selectedId));
    setSelectedId(null);
  };

  const onLayerPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, layer: DesignLayer) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      id: layer.id,
      startX: event.clientX,
      startY: event.clientY,
      originX: layer.x,
      originY: layer.y,
    };
    setSelectedId(layer.id);
  };

  const onLayerPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current;
    const zone = printZoneRef.current;
    if (!drag || drag.id !== event.currentTarget.dataset.layerId || !zone) return;
    const rect = zone.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, drag.originX + ((event.clientX - drag.startX) / rect.width) * 100));
    const y = Math.min(96, Math.max(4, drag.originY + ((event.clientY - drag.startY) / rect.height) * 100));
    setLayers((current) => current.map((layer) => layer.id === drag.id ? { ...layer, x, y } : layer));
  };

  const onLayerPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (dragRef.current) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
  };

  const uploadCount = layers.filter((layer) => layer.kind === "upload").length;
  const allBusy = busy !== null;

  return (
    <main className="studioShell">
      <section className="previewPanel" aria-label="Product preview">
        <div className="canvasTools" aria-label="Canvas history controls">
          <button aria-label="Reset canvas" onClick={reset} disabled={!layers.length}><Icon name="refresh" size={16}/></button>
          <button aria-label="Undo" onClick={undo} disabled={!past.length}><Icon name="undo" size={16}/></button>
          <button aria-label="Redo" onClick={redo} disabled={!future.length}><Icon name="redo" size={16}/></button>
          <button aria-label="Clear selection" onClick={() => setSelectedId(null)}><Icon name="close" size={16}/></button>
        </div>

        <div className="shirtFrame" onPointerDown={() => setSelectedId(null)}>
          <img className="shirtImage" src={colour.image} alt={`${colour.name} oversized tee`} />
          <div className={`printZone ${colour.name === "White" || colour.name === "Natural" ? "darkGuide" : ""}`} ref={printZoneRef}>
            {layers.map((layer) => {
              const isUploadProcessing = layer.status === "uploading" || layer.status === "removing-background";
              const isGenerating = layer.status === "generating-image" || layer.status === "generating-text";
              const isProcessing = isUploadProcessing || isGenerating;
              const statusLabel = layer.status === "removing-background"
                ? "Removing background…"
                : layer.status === "generating-image"
                  ? "Generating image…"
                  : layer.status === "generating-text"
                    ? "Styling your text…"
                    : layer.status === "failed"
                      ? "Generation failed"
                      : "Uploading…";
              return (
                <button
                  type="button"
                  className={`designLayer status-${layer.status} ${selectedId === layer.id ? "selected" : ""}`}
                  data-layer-id={layer.id}
                  key={layer.id}
                  aria-label={`Move ${layer.name}`}
                  aria-busy={isProcessing}
                  style={{
                    left: `${layer.x}%`,
                    top: `${layer.y}%`,
                    width: `${layer.scale * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)`,
                  }}
                  onPointerDown={(event) => onLayerPointerDown(event, layer)}
                  onPointerMove={onLayerPointerMove}
                  onPointerUp={onLayerPointerUp}
                  onPointerCancel={onLayerPointerUp}
                >
                  {layer.url ? (
                    <img src={layer.url} alt="" draggable={false} />
                  ) : (
                    <span className={`generationPlaceholder ${layer.kind === "text" ? "textGeneration" : "imageGeneration"}`}>
                      <Skeleton
                        containerClassName="generationSkeleton"
                        height="100%"
                        borderRadius={7}
                        baseColor={layer.status === "failed" ? "#fae5e8" : "#d2cadc"}
                        highlightColor={layer.status === "failed" ? "#fae5e8" : "#faf7fd"}
                        customHighlightBackground={layer.status === "failed"
                          ? undefined
                          : "linear-gradient(90deg, #d2cadc 0%, #d2cadc 28%, #e2d4f2 42%, #faf7fd 50%, #e2d4f2 58%, #d2cadc 72%, #d2cadc 100%)"}
                        duration={1.1}
                        enableAnimation={layer.status !== "failed"}
                      />
                      <span className="generationLoadingContent">
                        {layer.status === "failed"
                          ? <span className="generationError" aria-hidden="true">!</span>
                          : <LoaderCircle className="generationLoader" size={28} strokeWidth={2.25} aria-hidden="true" />}
                        <span>{statusLabel}</span>
                      </span>
                    </span>
                  )}
                  {isUploadProcessing && (
                    <span className="layerProcessingFx" aria-hidden="true">
                      <span className="layerStatusBadge"><span className="spinner dark" />{statusLabel}</span>
                    </span>
                  )}
                  {layer.status === "failed" && (
                    <span className="layerStatusBadge failed" title={layer.error}>Processing failed</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {selectedLayer && (
          <div className="layerTools" aria-label="Selected artwork controls">
            <span title={selectedLayer.name}>{selectedLayer.name}</span>
            <button aria-label="Make smaller" onClick={() => updateSelected({ scale: Math.max(.22, selectedLayer.scale - .08) })}>−</button>
            <button aria-label="Make larger" onClick={() => updateSelected({ scale: Math.min(1.35, selectedLayer.scale + .08) })}>+</button>
            <button aria-label="Rotate artwork" onClick={() => updateSelected({ rotation: (selectedLayer.rotation + 15) % 360 })}><Icon name="rotate" size={16}/></button>
            <button className="danger" aria-label="Delete artwork" onClick={deleteSelected}><Icon name="trash" size={16}/></button>
          </div>
        )}

        <button className="zoomButton" aria-label="Zoom preview"><Icon name="zoom" size={16}/></button>
        <div className="apiPill" title={notice}>
          <StatusDot online={online}/>
          <span>{allBusy ? (jobStatus ? `Job ${jobStatus}` : "Sending…") : notice}</span>
        </div>
      </section>

      <aside className="customisePanel">
        <section className="panelCard colourCard">
          <div className="sectionTitleRow">
            <h2>Colour</h2>
            <span>{colour.name}</span>
          </div>
          <div className="colourGrid" role="radiogroup" aria-label="T-shirt colour">
            {shirtColours.map((item) => (
              <button
                key={item.name}
                className={colour.name === item.name ? "selected" : ""}
                role="radio"
                aria-checked={colour.name === item.name}
                aria-label={item.name}
                title={item.name}
                onClick={() => setColour(item)}
              >
                <img src={item.image} alt="" />
                <span style={{ background: item.swatch }} />
              </button>
            ))}
          </div>
        </section>

        <section className="panelCard uploadCard">
          <div className="sectionTitleRow">
            <h2>Upload Your Images</h2>
            <span>{uploadCount}/6</span>
          </div>
          <label className="switchRow">
            <input type="checkbox" checked={removeBackground} onChange={(event) => setRemoveBackground(event.target.checked)} />
            <span className="switchTrack"><span /></span>
            <span>Remove image background</span>
            <Icon name="info" size={14}/>
          </label>
          <div className="uploadTray">
            <button className="addTile" onClick={() => fileInputRef.current?.click()} disabled={allBusy || uploadCount >= 6} aria-label="Choose images">
              <Icon name="plus" size={22}/>
            </button>
            {layers.filter((layer) => layer.kind === "upload").map((layer) => {
              const isProcessing = layer.status === "uploading" || layer.status === "removing-background";
              return (
                <button key={layer.id} className={`imageTile status-${layer.status} ${selectedId === layer.id ? "selected" : ""}`} onClick={() => setSelectedId(layer.id)} title={layer.error ?? layer.name} aria-busy={isProcessing}>
                  <img src={layer.url} alt={layer.name}/>
                  {isProcessing && <span className="tileProcessing" aria-label={layer.status === "removing-background" ? "Removing background" : "Uploading"}><span className="spinner" /></span>}
                  {layer.status === "failed" && <span className="tileFailed" aria-label="Processing failed">!</span>}
                </button>
              );
            })}
          </div>
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden onChange={handleFiles}/>
          <button className="primaryButton" onClick={() => fileInputRef.current?.click()} disabled={allBusy || uploadCount >= 6}>
            {busy === "upload" ? <span className="spinner"/> : <Icon name="plus" size={15}/>} {busy === "upload" ? "Processing…" : "Upload Image"}
          </button>

          <div className={`aiBox imageAiBox ${busy === "image" ? "generating" : ""}`} aria-busy={busy === "image"}>
            <div className="aiHeader">
              <h3><Icon name="sparkles" size={18}/> Generate an Image <Icon name="info" size={14}/></h3>
              <span>{Math.max(0, 25 - usage.calls)}/25 credits</span>
            </div>
            <div className="promptRow">
              <input value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void handleGenerateImage(); }} placeholder="Describe an image to generate…" maxLength={4000} />
              <button aria-label="Generate image" onClick={() => void handleGenerateImage()} disabled={allBusy || !imagePrompt.trim()}>{busy === "image" ? <LoaderCircle className="buttonLoader" size={17} aria-hidden="true" /> : <Icon name="arrow" size={17}/>}</button>
            </div>
            <p>{busy === "image" ? "Creating your transparent artwork…" : "Takes around 30 seconds — keep designing while it generates ✨"}</p>
          </div>
        </section>

        <section className="panelCard textCard">
          <h2>Add Your Text</h2>
          <label>
            <span><b>YOUR TEXT</b><small>{customText.length}/100</small></span>
            <textarea value={customText} onChange={(event) => setCustomText(event.target.value)} maxLength={100} placeholder="Enter your text…" />
          </label>

          <div className={`aiBox textAiBox ${busy === "text" ? "generating" : ""}`} aria-busy={busy === "text"}>
            <div className="aiHeader">
              <h3><Icon name="sparkles" size={18}/> Generate Stylised Text <Icon name="info" size={14}/></h3>
              <span>{Math.max(0, 25 - usage.calls)}/25 credits</span>
            </div>
            <div className="styleGrid" role="radiogroup" aria-label="Text style">
              {styles.map((style) => (
                <button key={style} className={`styleOption ${selectedStyle === style ? "selected" : ""}`} role="radio" aria-checked={selectedStyle === style} onClick={() => setSelectedStyle(style)}>
                  <img src={`/text-styles/${style}.png`} alt={`${style.replaceAll("-", " ")} style preview`} />
                  <small>{style.replaceAll("-", " ")}</small>
                </button>
              ))}
            </div>
            <button className="generateTextButton" disabled={allBusy || !customText.trim()} onClick={() => void handleGenerateText()}>
              {busy === "text" ? <LoaderCircle className="buttonLoader" size={17} aria-hidden="true" /> : <Icon name="sparkles" size={16}/>} {busy === "text" ? "Generating…" : "Generate text"}
            </button>
            <p>{busy === "text" ? `Styling “${customText.trim()}” with ${selectedStyle.replaceAll("-", " ")}…` : "Takes around 30 seconds — keep designing while it generates ✨"}</p>
          </div>
        </section>

        <section className="panelCard apiCard">
          <div>
            <StatusDot online={online}/>
            <span><b>ChaoticCustomAI</b><small>{online ? "API connected" : online === false ? "Start backend on port 8000" : "Checking connection"}</small></span>
          </div>
          <div className="usageStat"><b>{usage.calls}</b><span>AI calls today</span></div>
          <div className="usageStat"><b>{usage.total_tokens.toLocaleString()}</b><span>tokens</span></div>
          <button onClick={() => void refreshMeta()} aria-label="Refresh API status"><Icon name="refresh" size={16}/></button>
        </section>
      </aside>

      <button className="continueButton" onClick={() => setShowSummary(true)}>
        Continue <Icon name="arrow" size={18}/>
      </button>

      {showSummary && (
        <div className="summaryBackdrop" role="presentation" onMouseDown={() => setShowSummary(false)}>
          <section className="summaryDialog" role="dialog" aria-modal="true" aria-labelledby="summary-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="summaryClose" onClick={() => setShowSummary(false)} aria-label="Close summary"><Icon name="close"/></button>
            <div className="summaryIcon"><Icon name="check" size={30}/></div>
            <h2 id="summary-title">Your custom tee is ready</h2>
            <p>This test build stops before checkout. The design and every API result remain editable.</p>
            <dl>
              <div><dt>Colour</dt><dd>{colour.name}</dd></div>
              <div><dt>Artwork layers</dt><dd>{layers.length}</dd></div>
              <div><dt>Tokens today</dt><dd>{usage.total_tokens.toLocaleString()}</dd></div>
            </dl>
            <button className="primaryButton" onClick={() => setShowSummary(false)}>Keep designing</button>
          </section>
        </div>
      )}
    </main>
  );
}
