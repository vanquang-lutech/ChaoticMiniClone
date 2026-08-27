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
import { LoaderCircle } from "lucide-react";
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
import type { StoreProduct } from "@/lib/products";
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
  const [activeImage, setActiveImage] = useState(0);
  const [busy, setBusy] = useState<"upload" | "image" | "text" | null>(null);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [notice, setNotice] = useState("Choose a creation tool to start designing.");
  const [online, setOnline] = useState<boolean | null>(null);
  const [usage, setUsage] = useState<UsageSummary>({ date_from: "", date_to: "", calls: 0, input_tokens: 0, output_tokens: 0, total_tokens: 0, by_model: [], by_feature: [] });
  const [showDone, setShowDone] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printZoneRef = useRef<HTMLDivElement>(null);
  const objectUrlsRef = useRef(new Set<string>());
  const dragRef = useRef<{ id: string; startX: number; startY: number; originX: number; originY: number } | null>(null);
  const selectedLayer = layers.find((layer) => layer.id === selectedId) ?? null;
  const isBusy = busy !== null;
  const matchingVariant = product.variants.find((variant) => variant.options.every((value, index) => value === selectedOptions[index]))
    ?? product.variants.find((variant) => variant.available)
    ?? product.variants[0];
  const displayPrice = matchingVariant?.price ?? product.price;
  const displayOriginalPrice = matchingVariant?.compareAtPrice ?? product.originalPrice;
  const selectedImage = product.images[activeImage]?.src ?? product.image;

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

  return (
    <main className={css.page}>
      <SiteHeader />
      <div className={css.breadcrumb}><Link href="/">HOME</Link><span>/</span><Link href="/#shop">JERSEYS</Link><span>/</span><b>{product.shortName.toUpperCase()}</b></div>
      <section className={css.productTop}>
        <div className={css.previewColumn}>
          <div className={css.galleryLayout}>
            <div className={css.thumbnails}>{product.images.slice(0, 8).map((image, index) => <button key={image.src} className={activeImage === index ? css.activeThumbnail : ""} onClick={() => setActiveImage(index)}><img src={image.src} alt={image.alt} /></button>)}</div>
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
          {product.options.map((option, optionIndex) => <div className={css.optionGroup} key={option.name}><div className={css.optionName}><b>{option.name}</b><span>{selectedOptions[optionIndex]}</span></div><div className={css.optionValues}>{option.values.map((value) => <button key={value} className={selectedOptions[optionIndex] === value ? css.optionSelected : ""} onClick={() => setSelectedOptions((current) => current.map((choice, index) => index === optionIndex ? value : choice))}>{value}</button>)}</div></div>)}
          <div className={css.protection}><input type="checkbox" id="protection"/><label htmlFor="protection"><b>Shipping Protection Apparel</b><small>Protect your order from loss/damage.</small></label><strong>$1.99</strong></div>
          <div className={css.personalisation}><label>NAME <sup>*</sup><input placeholder="e.g. SMITH" /></label><label>NUMBER <sup>*</sup><input placeholder="e.g. 10" /></label></div>
          <div className={css.quantity}><span>Quantity</span><button>−</button><b>1</b><button>+</button></div>
          <button className={css.addButton} onClick={() => setShowDone(true)}>ADD CUSTOM JERSEY <span>→</span></button>
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

      {showDone && <div className={css.doneBackdrop} onMouseDown={() => setShowDone(false)}><section className={css.doneCard} role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}><button className={css.closeDone} onClick={() => setShowDone(false)}>×</button><span><Icon name="check" size={32}/></span><h2>Your jersey is saved.</h2><p>{layers.length ? `${layers.length} artwork layer${layers.length === 1 ? "" : "s"} will be included on your ${matchingVariant?.title ?? product.shortName} jersey.` : "You can still add AI artwork before checkout."}</p><button className={css.addButton} onClick={() => setShowDone(false)}>KEEP CREATING <Icon name="arrow" size={17}/></button></section></div>}
    </main>
  );
}
