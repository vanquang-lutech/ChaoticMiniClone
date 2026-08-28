/* eslint-disable @next/next/no-img-element */
"use client";

import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { Check, Download, LoaderCircle, Maximize2, Minus, Move, Plus, RefreshCcw, Sparkles, WandSparkles, X } from "lucide-react";
import {
  customizeProduct,
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
import type { CustomField, StoreProduct } from "@/lib/products";
import { SiteHeader } from "./site-header";
import css from "./product-customizer.module.css";

type LayerKind = "upload" | "generated" | "text";
type LayerStatus = "ready" | "uploading" | "removing-background" | "generating-image" | "generating-text" | "failed";

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

const fallbackStyles = ["collegiate", "comic-bold", "gold-foil", "miami-script", "pastel-candy", "pixel-block", "street-tag", "y2k-neon"];
const isAnotherOption = (value: string) => /another\s*-?\s*pls\s+note\/dm(?:\s+for)?\s+us/i.test(value);
const customFieldContent = {
  school: { label: "SCHOOL NAME", placeholder: "e.g. HARVARD", apiKey: "school_name" },
  mascot: { label: "MASCOT", placeholder: "e.g. BULLDOGS", apiKey: "mascot" },
  name: { label: "NAME", placeholder: "e.g. SMITH", apiKey: "name" },
  number: { label: "NUMBER", placeholder: "e.g. 10", apiKey: "number" },
  color: { label: "COLOR", placeholder: "e.g. RED / WHITE", apiKey: "color" },
} as const;

const emptyCustomValues: Record<CustomField, string> = { school: "", mascot: "", name: "", number: "", color: "" };

async function imageUrlToFile(url: string, filename: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Không thể tải ảnh mẫu của sản phẩm.");
  const blob = await response.blob();
  const type = blob.type || "image/png";
  const extension = type === "image/jpeg" ? "jpg" : type === "image/webp" ? "webp" : "png";
  return new File([blob], `${filename}.${extension}`, { type });
}

function Icon({ name, size = 18 }: { name: "sparkle" | "plus" | "trash" | "rotate" | "arrow" | "check" | "magic"; size?: number }) {
  const paths = {
    sparkle: <><path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3L12 3Z"/><path d="m19 14 .7 2.3L22 17l-2.3.7L19 20l-.7-2.3L16 17l2.3-.7L19 14ZM5 14l.6 1.6 1.7.6-1.7.6L5 18.5l-.6-1.7-1.7-.6 1.7-.6L5 14Z"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    trash: <><path d="M4 7h16M9 7V4h6v3m-8 0 1 13h8l1-13"/><path d="M10 11v5m4-5v5"/></>,
    rotate: <><path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 5v6h-6"/></>,
    arrow: <path d="M5 12h14m-5-5 5 5-5 5"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    magic: <><path d="m4 20 16-16"/><path d="m7 5 .6 1.7L9.3 7.3l-1.7.6L7 9.6l-.6-1.7-1.7-.6 1.7-.6L7 5Z"/><path d="m17 15 .8 2.2 2.2.8-2.2.8L17 21l-.8-2.2-2.2-.8 2.2-.8L17 15Z"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

export default function ProductCustomizer({ product }: { product: StoreProduct }) {
  const [layers, setLayers] = useState<DesignLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [removeBackground, setRemoveBackground] = useState(true);
  const [imagePrompt, setImagePrompt] = useState("");
  const [customText, setCustomText] = useState("");
  const [textStyles, setTextStyles] = useState(fallbackStyles);
  const [selectedStyle, setSelectedStyle] = useState(fallbackStyles[0]);
  const [selectedOptions, setSelectedOptions] = useState(() => product.options.map((option) => option.values[0] ?? ""));
  const [customValues, setCustomValues] = useState<Record<CustomField, string>>(emptyCustomValues);
  const [orderNote, setOrderNote] = useState("");
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [formError, setFormError] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [busy, setBusy] = useState<"upload" | "image" | "text" | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [notice, setNotice] = useState("Choose a creation tool to start designing.");
  const [online, setOnline] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<UsageSummary>({ date_from: "", date_to: "", calls: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, by_model: [], by_feature: [] });
  const [showDone, setShowDone] = useState(false);
  const [customizing, setCustomizing] = useState(false);
  const [customJobStatus, setCustomJobStatus] = useState<JobStatus | null>(null);
  const [customResultUrl, setCustomResultUrl] = useState<string | null>(null);
  const [resultScale, setResultScale] = useState(1);
  const [resultPosition, setResultPosition] = useState({ x: 0, y: 0 });
  const [resultDragging, setResultDragging] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printZoneRef = useRef<HTMLDivElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const resultDragRef = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);
  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;
  const isBusy = busy !== null || customizing;
  const matchingVariant = product.variants.find((variant) => variant.options.every((value, index) => value === selectedOptions[index]))
    ?? product.variants.find((variant) => variant.available)
    ?? product.variants[0];
  const displayPrice = matchingVariant?.price ?? product.price;
  const displayOriginalPrice = matchingVariant?.compareAtPrice ?? product.originalPrice;
  const needsOrderNote = selectedOptions.some(isAnotherOption);
  const selectedImage = product.images[activeImage]?.src ?? product.image;
  const selectProductImage = useCallback((index: number) => {
    setActiveImage(index);
    setSelectedId(null);
  }, []);

  useEffect(() => {
    const gallery = document.querySelector<HTMLElement>("[data-product-gallery]");
    if (!gallery) return;
    const handleGalleryClick = (event: MouseEvent) => {
      const button = (event.target as Element).closest<HTMLButtonElement>("button[data-image-index]");
      if (!button || !gallery.contains(button)) return;
      const index = Number.parseInt(button.dataset.imageIndex ?? "", 10);
      if (Number.isInteger(index)) selectProductImage(index);
    };
    gallery.addEventListener("click", handleGalleryClick);
    return () => gallery.removeEventListener("click", handleGalleryClick);
  }, [selectProductImage]);

  const refreshMeta = useCallback(async () => {
    const [health, usageResult, stylesResult] = await Promise.allSettled([getHealth(), getUsage(), getTextStyles()]);
    setOnline(health.status === "fulfilled");
    if (usageResult.status === "fulfilled") setUsage(usageResult.value);
    if (stylesResult.status === "fulfilled" && stylesResult.value.length) {
      setTextStyles(stylesResult.value);
      setSelectedStyle((current) => stylesResult.value.includes(current) ? current : stylesResult.value[0]);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshMeta(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshMeta]);
  useEffect(() => () => { objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)); }, []);

  const addLayer = useCallback((url: string, kind: LayerKind, name: string, status: LayerStatus = "ready") => {
    const id = crypto.randomUUID();
    setLayers((current) => [...current, { id, kind, name, url, x: 50, y: 50, scale: kind === "text" ? .72 : .64, rotation: 0, status }]);
    setSelectedId(id);
    return id;
  }, []);

  const updateLayer = useCallback((id: string, changes: Partial<DesignLayer>) => {
    setLayers((current) => current.map((layer) => layer.id === id ? { ...layer, ...changes } : layer));
  }, []);

  const finishJob = async (jobId: string, layerId: string) => {
    const job = await pollJob(jobId, (status) => {
      setJobStatus(status);
      setNotice(status === "running" ? "AI is making your artwork…" : `Job ${status}`);
    });
    const image = job.images[0];
    if (!image) throw new Error("The AI job completed without an image.");
    updateLayer(layerId, { url: image.url, status: "ready", error: undefined });
    setNotice("Artwork added — drag it anywhere on the print zone.");
    await refreshMeta();
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, 3);
    event.target.value = "";
    if (!files.length) return;
    const uploadLayers = files.map((file) => {
      const url = URL.createObjectURL(file);
      objectUrlsRef.current.add(url);
      return { file, id: addLayer(url, "upload", file.name, removeBackground ? "removing-background" : "uploading") };
    });
    setBusy("upload");
    setNotice(removeBackground ? "Removing the background with AI…" : "Uploading artwork…");
    try {
      const response = await uploadImages(uploadLayers.map(({ file }) => file), removeBackground);
      await Promise.all(response.items.map(async (item, index) => {
        const layer = uploadLayers[index];
        if (!layer) return;
        if (item.status === "succeeded" && item.image) updateLayer(layer.id, { url: item.image.url, status: "ready" });
        else await finishJob(item.job_id, layer.id);
      }));
      setNotice("Your image is ready to place on the jersey.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed.";
      uploadLayers.forEach((layer) => updateLayer(layer.id, { status: "failed", error: message }));
      setNotice(message);
    } finally { setBusy(null); setJobStatus(null); }
  };

  const handleGenerateImage = async () => {
    const prompt = imagePrompt.trim();
    if (!prompt) { setNotice("Describe the artwork you want first."); return; }
    const layerId = addLayer("", "generated", prompt, "generating-image");
    setBusy("image"); setNotice("Sending your idea to AI…");
    try { const accepted = await generateImage(prompt); await finishJob(accepted.job_id, layerId); setImagePrompt(""); }
    catch (error) { const message = error instanceof Error ? error.message : "Image generation failed."; updateLayer(layerId, { status: "failed", error: message }); setNotice(message); }
    finally { setBusy(null); setJobStatus(null); }
  };

  const handleGenerateText = async () => {
    const text = customText.trim();
    if (!text) { setNotice("Enter words for your jersey first."); return; }
    const layerId = addLayer("", "text", text, "generating-text");
    setBusy("text"); setNotice("Styling your words with AI…");
    try { const accepted = await generateText(text, selectedStyle); await finishJob(accepted.job_id, layerId); }
    catch (error) { const message = error instanceof Error ? error.message : "Text generation failed."; updateLayer(layerId, { status: "failed", error: message }); setNotice(message); }
    finally { setBusy(null); setJobStatus(null); }
  };

  const onPointerDown = (event: ReactPointerEvent<HTMLButtonElement>, layer: DesignLayer) => {
    event.preventDefault(); event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { id: layer.id, startX: event.clientX, startY: event.clientY, originX: layer.x, originY: layer.y }; setSelectedId(layer.id);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = dragRef.current; const zone = printZoneRef.current;
    if (!drag || drag.id !== event.currentTarget.dataset.layerId || !zone) return;
    const rect = zone.getBoundingClientRect();
    const x = Math.min(96, Math.max(4, drag.originX + ((event.clientX - drag.startX) / rect.width) * 100));
    const y = Math.min(96, Math.max(4, drag.originY + ((event.clientY - drag.startY) / rect.height) * 100));
    updateLayer(drag.id, { x, y });
  };
  const endDrag = (event: ReactPointerEvent<HTMLButtonElement>) => { if (dragRef.current) event.currentTarget.releasePointerCapture(event.pointerId); dragRef.current = null; };
  const scaleSelected = (delta: number) => selectedLayer && updateLayer(selectedLayer.id, { scale: Math.min(1.35, Math.max(.22, selectedLayer.scale + delta)) });
  const processingLabel = (status: LayerStatus) => status === "removing-background" ? "Removing background…" : status === "generating-text" ? "Styling text…" : status === "generating-image" ? "Generating artwork…" : "Processing…";

  const resetResultView = () => {
    setResultScale(1);
    setResultPosition({ x: 0, y: 0 });
  };

  const closeResult = () => {
    setCustomResultUrl(null);
    setCustomJobStatus(null);
    resetResultView();
  };

  const handleCustomProduct = async () => {
    if (customizing) return;
    setFormError("");

    const mode = needsOrderNote ? "note" : "fields";
    const fieldPayload = Object.fromEntries(product.customFields
      .map((field) => [customFieldContent[field].apiKey, customValues[field].trim()] as const)
      .filter(([apiKey, value]) => apiKey !== customFieldContent.color.apiKey || Boolean(value)));
    const missingFields = product.customFields.filter((field) => field !== "color" && !customValues[field].trim());

    if (mode === "fields" && product.customFields.length === 0) {
      setFormError("Sản phẩm này không hỗ trợ tùy chỉnh.");
      return;
    }
    if (mode === "fields" && missingFields.length) {
      setFormError(`Vui lòng nhập ${missingFields.map((field) => customFieldContent[field].label).join(", ")}.`);
      return;
    }
    if (mode === "note" && !orderNote.trim()) {
      setFormError("Vui lòng nhập ORDER NOTE trước khi tạo áo.");
      return;
    }

    setCustomizing(true);
    setCustomJobStatus("pending");
    setNotice("Preparing your jersey mock-up…");
    try {
      const customTemplateImage = needsOrderNote ? product.images[0]?.src ?? product.image : selectedImage;
      const template = await imageUrlToFile(customTemplateImage, `product-${product.id}`);
      const accepted = await customizeProduct({
        template,
        productId: String(product.id),
        mode,
        fields: mode === "fields" ? fieldPayload : undefined,
        note: mode === "note" ? orderNote.trim() : undefined,
        reference: mode === "note" ? referenceFile ?? undefined : undefined,
      });
      setCustomJobStatus(accepted.status);
      setNotice("AI is customizing your jersey…");
      const finished = await pollJob(accepted.job_id, (status) => {
        setCustomJobStatus(status);
        setNotice(status === "running" ? "AI is applying your customization…" : "Your custom job is queued…");
      });
      const result = finished.images[0]?.url;
      if (!result) throw new Error("Backend hoàn tất nhưng không trả về ảnh tùy chỉnh.");
      setCustomResultUrl(result);
      resetResultView();
      setNotice("Custom complete — your jersey preview is ready.");
      setShowDone(true);
      void refreshMeta();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể tùy chỉnh sản phẩm.";
      setFormError(message);
      setNotice(message);
      setCustomJobStatus("failed");
    } finally {
      setCustomizing(false);
    }
  };

  const handleResultPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    resultDragRef.current = { startX: event.clientX, startY: event.clientY, originX: resultPosition.x, originY: resultPosition.y };
    setResultDragging(true);
  };

  const handleResultPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = resultDragRef.current;
    if (!drag) return;
    setResultPosition({ x: drag.originX + event.clientX - drag.startX, y: drag.originY + event.clientY - drag.startY });
  };

  const handleResultPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (resultDragRef.current) event.currentTarget.releasePointerCapture(event.pointerId);
    resultDragRef.current = null;
    setResultDragging(false);
  };

  const downloadResult = async () => {
    if (!customResultUrl) return;
    try {
      const response = await fetch(customResultUrl);
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${product.slug}-custom.png`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setFormError("Không thể tải ảnh xuống. Vui lòng thử lại.");
    }
  };

  return (
    <main className={css.page}>
      <SiteHeader />
      <div className={css.breadcrumb}><Link href="/">HOME</Link><span>/</span><Link href="/products">ALL PRODUCTS</Link><span>/</span><b>{product.shortName.toUpperCase()}</b></div>
      <section className={css.productTop}>
        <div className={css.previewColumn}>
          <div className={css.galleryLayout}>
            <div className={css.thumbnails} data-product-gallery>{product.images.slice(0, 8).map((image, index) => <button type="button" data-image-index={index} key={`${image.src}-${index}`} className={activeImage === index ? css.activeThumbnail : ""} aria-label={`View product image ${index + 1}`} aria-pressed={activeImage === index}><img src={image.src} alt={image.alt || `${product.name} view ${index + 1}`} draggable={false} /></button>)}</div>
            <div>
          <div className={css.previewTag}>LIVE AI PREVIEW <span className={online ? css.online : ""} /></div>
          <div className={css.previewStage}>
            <div className={css.shirtFrame} onPointerDown={() => setSelectedId(null)}>
              <img className={css.shirt} src={selectedImage} alt={product.images[activeImage]?.alt ?? product.name} />
              <div className={`${css.printZone} ${layers.length ? css.hasArtwork : ""}`} ref={printZoneRef}>
                {layers.map((layer) => {
                  const processing = layer.status !== "ready" && layer.status !== "failed";
                  return <button type="button" key={layer.id} data-layer-id={layer.id} className={`${css.layer} ${selectedId === layer.id ? css.selectedLayer : ""}`} style={{ left: `${layer.x}%`, top: `${layer.y}%`, width: `${layer.scale * 100}%`, transform: `translate(-50%, -50%) rotate(${layer.rotation}deg)` }} onPointerDown={(event) => onPointerDown(event, layer)} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag} aria-label={`Move ${layer.name}`}>
                    {layer.url ? <img src={layer.url} alt="" draggable={false} /> : <span className={`${css.loadingArt} ${layer.status === "failed" ? css.failedArt : ""}`}>{layer.status === "failed" ? "!" : <LoaderCircle size={26} />}<small>{layer.status === "failed" ? "Try again" : processingLabel(layer.status)}</small></span>}
                    {processing && <span className={css.layerLabel}><LoaderCircle size={11}/>{processingLabel(layer.status)}</span>}
                  </button>;
                })}
              </div>
            </div>
          </div>
          {selectedLayer && <div className={css.layerTools}><b>{selectedLayer.name}</b><button onClick={() => scaleSelected(-.08)}>−</button><button onClick={() => scaleSelected(.08)}>+</button><button onClick={() => updateLayer(selectedLayer.id, { rotation: (selectedLayer.rotation + 15) % 360 })}><Icon name="rotate" size={15}/></button><button className={css.deleteButton} onClick={() => { setLayers((current) => current.filter((layer) => layer.id !== selectedLayer.id)); setSelectedId(null); }}><Icon name="trash" size={15}/></button></div>}
          <p className={css.statusLine}><span className={isBusy ? css.pulsingDot : css.statusDot} />{isBusy ? (jobStatus ? `AI job: ${jobStatus}` : "Working on your creation…") : notice}</p>
            </div>
          </div>
        </div>
        <div className={css.infoColumn}>
          <p className={css.eyebrow}>CHAOTIC CLUB</p>
          <h1>{product.name}</h1>
          <button className={css.reviewLink}>★★★★★ <u>4.7 (67 reviews)</u></button>
          <p className={css.price}><s>${displayOriginalPrice.toFixed(2)} USD</s><strong>${displayPrice.toFixed(2)} USD</strong><span>{Math.round((1 - displayPrice / displayOriginalPrice) * 100)}% OFF</span></p>
          <p className={css.shipping}>Shipping calculated at checkout.</p>
          {product.options.map((option, optionIndex) => <div className={css.optionGroup} key={option.name}><div className={css.optionName}><b>{option.name}</b><span>{selectedOptions[optionIndex]}</span></div><div className={css.optionValues}>{option.values.map((value) => <button type="button" key={value} className={`${selectedOptions[optionIndex] === value ? css.optionSelected : ""} ${isAnotherOption(value) ? css.anotherOption : ""}`} onClick={() => {
            const nextOptions = selectedOptions.map((choice, index) => index === optionIndex ? value : choice);
            setSelectedOptions(nextOptions);
            if (isAnotherOption(value)) {
              selectProductImage(0);
              return;
            }
            const nextVariant = product.variants.find((variant) => variant.options.every((variantValue, index) => variantValue === nextOptions[index]));
            const nextImageIndex = nextVariant?.image ? product.images.findIndex((image) => image.src === nextVariant.image) : -1;
            if (nextImageIndex >= 0) selectProductImage(nextImageIndex);
          }}>{value}{isAnotherOption(value) && <span className={css.sparkles} aria-hidden="true">✦ ✦</span>}</button>)}</div></div>)}
          <div className={css.protection}><input type="checkbox" id="protection"/><label htmlFor="protection"><b>Shipping Protection Apparel</b><small>Protect your order from loss/damage.</small></label><strong>$1.99</strong></div>
          {needsOrderNote ? <div className={css.orderCustomFields}>
            <label className={css.orderNote}>ORDER NOTE <sup>*</sup><textarea autoFocus value={orderNote} onChange={(event) => setOrderNote(event.target.value)} placeholder="Tell us how you'd like to customize your item (School Name, Mascot, Name, Number, Color, or any special requests)!" maxLength={500} /></label>
            <label className={css.orderUpload}>UPLOAD IMAGE <small>(Optional)</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => setReferenceFile(event.target.files?.[0] ?? null)} /></label>
          </div> : product.customFields.length > 0 && <div className={css.personalisation}>{product.customFields.map((field) => <label key={field}><span>{customFieldContent[field].label} {field === "color" ? <small>(Optional)</small> : <sup>*</sup>}</span><input value={customValues[field]} onChange={(event) => setCustomValues((current) => ({ ...current, [field]: event.target.value }))} placeholder={customFieldContent[field].placeholder} maxLength={120} /></label>)}</div>}
          {formError && <p className={css.formError} role="alert">{formError}</p>}
          <div className={css.quantity}><span>Quantity</span><button>−</button><b>1</b><button>+</button></div>
          <button className={css.addButton} onClick={() => void handleCustomProduct()} disabled={customizing || (!needsOrderNote && product.customFields.length === 0)}>{customizing ? <><LoaderCircle className={css.spin} size={17}/> CUSTOMIZING JERSEY…</> : <>CUSTOM JERSEY <span>→</span></>}</button>
          <p className={css.benefits}>✦ MADE TO ORDER &nbsp;&nbsp; ✦ PREMIUM MESH &nbsp;&nbsp; ✦ PERSONALIZED BY YOU</p>
          <section className={`${css.studio} ${aiOpen ? css.studioOpen : ""}`} aria-label="AI design tools">
            <button type="button" className={css.studioToggle} onClick={() => setAiOpen((current) => !current)} aria-expanded={aiOpen}><span><b>✦</b> CUSTOMIZE WITH AI</span><small>Remove background, generate art or styled text</small><i>{aiOpen ? "−" : "+"}</i></button>
            {aiOpen && <><div className={css.studioHead}><div><p className={css.eyebrow}>CHAOTIC CUSTOM LAB</p><h2>MAKE IT <em>YOURS.</em></h2></div><p>Choose one tool. Your result appears on the product preview above.</p></div>
            <div className={css.toolGrid}>
              <article className={css.toolCard}>
                <span className={css.toolNumber}>01</span><div className={css.toolIcon}><Icon name="magic" size={19}/></div><p className={css.toolKicker}>UPLOAD + CLEAN UP</p><h3>REMOVE BACKGROUND</h3><p>Turn a logo, photo or drawing into a print-ready cutout.</p>
                <label className={css.toggle}><input type="checkbox" checked={removeBackground} onChange={(event) => setRemoveBackground(event.target.checked)} /><i /><span>Remove background automatically</span></label>
                <input ref={fileInputRef} className={css.fileInput} type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFiles} />
                <button className={css.toolButton} onClick={() => fileInputRef.current?.click()} disabled={isBusy}>{busy === "upload" ? <LoaderCircle className={css.spin} size={17}/> : <Icon name="plus" size={17}/>} {busy === "upload" ? "PROCESSING…" : "UPLOAD ARTWORK"}</button>
              </article>
              <article className={`${css.toolCard} ${css.pinkCard}`}>
                <span className={css.toolNumber}>02</span><div className={css.toolIcon}><Icon name="sparkle" size={19}/></div><p className={css.toolKicker}>WORDS TO ART</p><h3>GENERATE AN IMAGE</h3><label className={css.fieldLabel}>YOUR IDEA<textarea value={imagePrompt} onChange={(event) => setImagePrompt(event.target.value)} maxLength={1000} placeholder="A spooky disco ball, pink bows, and tiny stars…" /></label><button className={css.toolButton} onClick={() => void handleGenerateImage()} disabled={isBusy || !imagePrompt.trim()}>{busy === "image" ? <LoaderCircle className={css.spin} size={17}/> : <Icon name="sparkle" size={17}/>} {busy === "image" ? "CREATING…" : "CREATE ARTWORK"}</button>
              </article>
              <article className={`${css.toolCard} ${css.blueCard}`}>
                <span className={css.toolNumber}>03</span><div className={css.toolIcon}><b>Aa</b></div><p className={css.toolKicker}>YOUR WORDS, REMIXED</p><h3>GENERATE STYLED TEXT</h3><label className={css.fieldLabel}>YOUR TEXT<input value={customText} onChange={(event) => setCustomText(event.target.value)} maxLength={100} placeholder="CHAOTIC CLUB" /></label><div className={css.stylePicker}>{textStyles.slice(0, 4).map((style) => <button key={style} className={style === selectedStyle ? css.styleSelected : ""} onClick={() => setSelectedStyle(style)}>{style.replaceAll("-", " ")}</button>)}</div><button className={css.toolButton} onClick={() => void handleGenerateText()} disabled={isBusy || !customText.trim()}>{busy === "text" ? <LoaderCircle className={css.spin} size={17}/> : <Icon name="sparkle" size={17}/>} {busy === "text" ? "STYLING…" : "STYLE MY TEXT"}</button>
              </article>
            </div><div className={css.usageBar}><span className={online ? css.online : css.statusDot} /><b>CHAOTIC CUSTOM AI</b><span>{online ? "Connected" : online === false ? "API unavailable" : "Checking connection"}</span><i /><span>{usage.calls} AI calls today</span></div></>}
          </section>
        </div>
      </section>

      {customizing && <div className={css.customLoadingBackdrop} role="status" aria-live="polite"><section className={css.customLoadingCard} data-custom-job-status={customJobStatus}><div className={css.loadingOrbit}><WandSparkles size={29}/><span/><span/><span/></div><p className={css.eyebrow}>CHAOTIC CUSTOM AI</p><h2>MAKING IT <em>YOURS.</em></h2><p>We’re applying your details while preserving the original garment, print layout and product views.</p><div className={css.loadingTrack}><i/></div><small>{customJobStatus === "running" ? "CUSTOMIZING YOUR JERSEY" : "PREPARING YOUR CUSTOM JOB"}</small></section></div>}

      {customResultUrl && <div className={css.resultBackdrop} onMouseDown={closeResult}><section className={css.resultModal} role="dialog" aria-modal="true" aria-label="Custom jersey preview" onMouseDown={(event) => event.stopPropagation()}>
        <header className={css.resultHeader}><div><p className={css.eyebrow}>CHAOTIC CUSTOM CLUB</p><h2>CUSTOM <em>PREVIEW.</em></h2></div><div className={css.completePill}><Check size={13}/> CUSTOM COMPLETE</div><button type="button" className={css.resultClose} onClick={closeResult} aria-label="Close custom preview"><X size={20}/></button></header>
        <div className={css.resultBody}>
          <div className={`${css.resultViewport} ${resultDragging ? css.resultDragging : ""}`} onPointerDown={handleResultPointerDown} onPointerMove={handleResultPointerMove} onPointerUp={handleResultPointerEnd} onPointerCancel={handleResultPointerEnd} onWheel={(event) => { event.preventDefault(); setResultScale((current) => Math.min(4, Math.max(.5, current + (event.deltaY < 0 ? .15 : -.15)))); }}>
            <div className={css.resultGrid}/><img src={customResultUrl} alt={`Customized ${product.name}`} draggable={false} style={{ transform: `translate(${resultPosition.x}px, ${resultPosition.y}px) scale(${resultScale})` }}/>
            <span className={css.panHint}><Move size={13}/> DRAG TO PAN · SCROLL TO ZOOM</span>
          </div>
          <aside className={css.resultSidebar}><p className={css.eyebrow}>IMAGE VIEW</p><h3>YOUR JERSEY<br/>IS READY.</h3><p>Inspect every detail before continuing. The generated result is stored by your custom job.</p><dl><div><dt>PRODUCT</dt><dd>{product.shortName}</dd></div><div><dt>VARIANT</dt><dd>{matchingVariant?.title ?? "Selected options"}</dd></div><div><dt>ZOOM</dt><dd>{Math.round(resultScale * 100)}%</dd></div></dl></aside>
        </div>
        <footer className={css.resultToolbar}><div className={css.resultTools}><button type="button" onClick={() => setResultScale((current) => Math.max(.5, current - .2))} aria-label="Zoom out"><Minus size={16}/><span>ZOOM OUT</span></button><button type="button" onClick={() => setResultScale((current) => Math.min(4, current + .2))} aria-label="Zoom in"><Plus size={16}/><span>ZOOM IN</span></button><button type="button" onClick={resetResultView}><Maximize2 size={16}/><span>FIT</span></button><button type="button" onClick={resetResultView}><RefreshCcw size={16}/><span>RESET VIEW</span></button></div><button type="button" className={css.downloadButton} onClick={() => void downloadResult()}><Download size={16}/> DOWNLOAD PNG</button></footer>
      </section></div>}

      {showDone && customResultUrl && <div className={css.customToast} role="status"><span><Sparkles size={16}/></span><div><b>CUSTOM COMPLETE</b><small>Your new jersey preview is ready.</small></div><button type="button" onClick={() => setShowDone(false)} aria-label="Dismiss notification"><X size={15}/></button></div>}
    </main>
  );
}
