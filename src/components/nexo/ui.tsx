import { useEffect, useRef, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { createPortal } from "react-dom";

export function Button({
  tone = "teal",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: "teal" | "clay" | "ghost" }) {
  const tones = {
    teal: "bg-teal text-on-teal",
    clay: "bg-clay text-on-clay",
    ghost: "bg-surface text-ink",
  };
  return (
    <button
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold transition-opacity disabled:opacity-50 ${tones[tone]} ${className}`}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-muted">{label}</span>
      {children}
    </label>
  );
}

const control = "min-h-11 w-full rounded-xl border border-line bg-paper px-3 text-base text-ink";

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Area(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${control} min-h-24 py-2 ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${control} ${props.className ?? ""}`} />;
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-ink/40" aria-label="Cerrar" onClick={onClose} />
      <div className="relative z-10 max-h-[92dvh] w-full overflow-auto rounded-t-3xl bg-surface p-4 shadow-none sm:max-w-lg sm:rounded-3xl">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-xl text-ink">{title}</h2>
          <button type="button" className="min-h-11 min-w-11 rounded-xl text-muted" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <div className="card px-4 py-8 text-center">
      <p className="font-display text-xl">{title}</p>
      <p className="mt-2 text-sm text-pretty text-muted">{body}</p>
    </div>
  );
}

export function pesos(value: string) {
  const normal = value.replace(/\s/g, "").replace(",", ".");
  const amount = Number(normal);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

/** Downscale while decoding. A full camera JPEG can close the page on a phone. */
export async function fileToPhoto(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("No es una imagen");
  if (file.size > 20_000_000) throw new Error("La foto es demasiado pesada");
  const bitmap = await createImageBitmap(file, { resizeWidth: 640, resizeQuality: "medium" });
  try {
    return bitmapToJpeg(bitmap);
  } finally {
    bitmap.close();
  }
}

function bitmapToJpeg(source: CanvasImageSource & { width: number; height: number }) {
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, 640 / Math.max(source.width, source.height));
  canvas.width = Math.max(1, Math.round(source.width * scale));
  canvas.height = Math.max(1, Math.round(source.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo leer la imagen");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  let quality = 0.72;
  let url = canvas.toDataURL("image/jpeg", quality);
  while (url.length > 180_000 && quality > 0.42) {
    quality -= 0.1;
    url = canvas.toDataURL("image/jpeg", quality);
  }
  return url;
}

export function PhotoPicker({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (value: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [camera, setCamera] = useState(false);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [error, setError] = useState("");

  function stop() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCamera(false);
  }

  useEffect(() => () => streamRef.current?.getTracks().forEach((track) => track.stop()), []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!camera || !video || !stream) return;
    video.srcObject = stream;
    void video.play().catch(() => setError("No se pudo mostrar la cámara."));
  }, [camera, facing]);

  async function openCamera(next: "environment" | "user") {
    setError("");
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Esta pantalla no abre la cámara. Elija la foto en la galería.");
      return;
    }
    try {
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: next }, width: { ideal: 1280 }, height: { ideal: 720 } },
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: true });
      }
      streamRef.current = stream;
      setFacing(next);
      setCamera(true);
    } catch {
      setCamera(false);
      setError("No se pudo abrir la cámara. Elija la foto en la galería, sin salir de la ficha.");
    }
  }

  function snap() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) {
      setError("Espere un momento a que aparezca la imagen.");
      return;
    }
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onChange(canvas.toDataURL("image/jpeg", 0.72));
    stop();
  }

  return (
    <div className="space-y-2">
      {value ? <img src={value} alt="" className="h-24 w-24 rounded-xl object-cover" /> : <p className="text-sm text-muted">Sin imagen</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => void openCamera("environment")}>Tomar foto</Button>
        <Button type="button" tone="ghost" onClick={() => fileRef.current?.click()}>Galería</Button>
      </div>
      {value && (
        <button type="button" className="min-h-11 text-sm text-clay" onClick={() => onChange(null)}>
          Quitar imagen
        </button>
      )}
      {error && <p className="text-sm text-clay">{error}</p>}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          void fileToPhoto(file).then(onChange).catch(() => setError("No se pudo usar esa foto. Pruebe con otra más pequeña."));
        }}
      />
      {camera && createPortal(
        <div className="fixed inset-0 z-[80] flex flex-col bg-ink text-paper">
          <video ref={videoRef} className="min-h-0 flex-1 object-cover" playsInline muted autoPlay />
          <div className="grid grid-cols-3 gap-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button type="button" tone="ghost" onClick={stop}>Cancelar</Button>
            <Button type="button" onClick={snap}>Usar foto</Button>
            <Button type="button" tone="ghost" onClick={() => void openCamera(facing === "environment" ? "user" : "environment")}>
              Voltear
            </Button>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}

function hexToRgb(hex: string) {
  const n = hex.replace("#", "");
  return { r: Number.parseInt(n.slice(0, 2), 16), g: Number.parseInt(n.slice(2, 4), 16), b: Number.parseInt(n.slice(4, 6), 16) };
}

function rgbToHex(r: number, g: number, b: number) {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function mix(a: string, b: string, t: number) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.r + (B.r - A.r) * t, A.g + (B.g - A.g) * t, A.b + (B.b - A.b) * t);
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function onColor(bg: string) {
  return luminance(bg) > 0.42 ? "#1b1914" : "#f4fbf9";
}

function rotateHue(hex: string, degrees: number) {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  h = (h + degrees) % 360;
  const s = max === 0 ? 0 : d / max;
  const l = (max + min) / 2 / 255;
  const sat = Math.max(s, 0.45);
  const c = (1 - Math.abs(2 * l - 1)) * sat;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let rr = 0, gg = 0, bb = 0;
  if (h < 60) [rr, gg, bb] = [c, x, 0];
  else if (h < 120) [rr, gg, bb] = [x, c, 0];
  else if (h < 180) [rr, gg, bb] = [0, c, x];
  else if (h < 240) [rr, gg, bb] = [0, x, c];
  else if (h < 300) [rr, gg, bb] = [x, 0, c];
  else [rr, gg, bb] = [c, 0, x];
  return rgbToHex((rr + m) * 255, (gg + m) * 255, (bb + m) * 255);
}

export function brandVars(accent: string, dark: boolean) {
  const primary = dark ? mix(accent, "#ffffff", 0.28) : accent;
  const second = rotateHue(accent, 36);
  const clay = dark ? mix(second, "#ffffff", 0.18) : second;
  return {
    "--teal": primary,
    "--teal-soft": dark ? mix(accent, "#121410", 0.8) : mix(accent, "#ffffff", 0.86),
    "--on-teal": onColor(primary),
    "--clay": clay,
    "--clay-soft": dark ? mix(second, "#121410", 0.8) : mix(second, "#ffffff", 0.88),
    "--on-clay": onColor(clay),
  };
}

const BRAND_KEYS = ["--teal", "--teal-soft", "--on-teal", "--clay", "--clay-soft", "--on-clay"];

export function BrandTheme({ accent, enabled }: { accent: string; enabled: boolean }) {
  useEffect(() => {
    const root = document.documentElement;
    const apply = () => {
      const meta = document.querySelector('meta[name="theme-color"]');
      if (!enabled || !/^#[0-9a-f]{6}$/i.test(accent)) {
        for (const key of BRAND_KEYS) root.style.removeProperty(key);
        meta?.setAttribute("content", root.classList.contains("dark") ? "#121410" : "#0f6e62");
        return;
      }
      const dark = root.classList.contains("dark");
      const vars = brandVars(accent, dark);
      for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
      meta?.setAttribute("content", vars["--teal"]);
    };
    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => {
      observer.disconnect();
      for (const key of BRAND_KEYS) root.style.removeProperty(key);
    };
  }, [accent, enabled]);
  return null;
}

/** Most saturated color that is not near white or black. Empty if the image has none. */
export async function accentFromDataUrl(dataUrl: string) {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("logo"));
    img.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = 24;
  canvas.height = 24;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";
  ctx.drawImage(img, 0, 0, 24, 24);
  const data = ctx.getImageData(0, 0, 24, 24).data;
  let best = { score: 0, r: 0, g: 0, b: 0, n: 0 };
  const buckets = new Map<number, { n: number; r: number; g: number; b: number; score: number }>();
  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 180) continue;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const light = (max + min) / 2;
    if (light < 28 || light > 232) continue;
    const delta = max - min;
    if (delta < 22) continue;
    let h = 0;
    if (max === r) h = ((g - b) / delta) % 6;
    else if (max === g) h = (b - r) / delta + 2;
    else h = (r - g) / delta + 4;
    h = Math.round((h * 60 + 360) % 360 / 12) * 12;
    const score = delta * (a / 255);
    const prev = buckets.get(h) ?? { n: 0, r: 0, g: 0, b: 0, score: 0 };
    prev.n += 1;
    prev.r += r;
    prev.g += g;
    prev.b += b;
    prev.score += score;
    buckets.set(h, prev);
    if (prev.score > best.score) best = prev;
  }
  if (!best.n) return "";
  return rgbToHex(best.r / best.n, best.g / best.n, best.b / best.n);
}

export function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}
