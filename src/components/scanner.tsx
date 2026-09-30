import { Camera, ImagePlus, LoaderCircle, ScanLine, SwitchCamera, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { analyzeLabel } from "@/lib/analyze-label";
import { compressDataUrl, fetchAsDataUrl, fileToDataUrl, loadImage } from "@/lib/image";
import { saveReport } from "@/lib/history";
import { SAMPLE_PACKS } from "@/lib/samples";
import type { ComplianceReport } from "@/lib/compliance/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportView } from "@/components/report-view";

type Phase = "idle" | "live" | "preview" | "working" | "done";

async function decodeQrFromDataUrl(dataUrl: string): Promise<string | null> {
  try {
    const img = await loadImage(dataUrl);
    const canvas = document.createElement("canvas");
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(image.data, image.width, image.height);
    return code?.data ?? null;
  } catch {
    return null;
  }
}

export function Scanner() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [qrLive, setQrLive] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [sampleId, setSampleId] = useState<string | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  useEffect(() => {
    if (phase !== "live") return;
    let raf = 0;
    let last = 0;
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 450) return;
      last = t;
      const video = videoRef.current;
      const canvas = frameRef.current;
      if (!video || !canvas || video.readyState < 2) return;
      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0);
      const image = ctx.getImageData(0, 0, w, h);
      const code = jsQR(image.data, w, h);
      setQrLive(code?.data ?? null);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  async function startCamera(nextFacing = facing) {
    setError(null);
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: nextFacing },
          aspectRatio: { ideal: 4 / 3 },
          width: { ideal: 1280 },
        },
        audio: false,
      });
      streamRef.current = stream;
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await video.play();
      }
      setPhase("live");
      setReport(null);
      setPreview(null);
    } catch {
      setError("Camera is blocked. Upload a photo or try a sample pack instead.");
      setPhase("idle");
    }
  }

  function captureFrame(): string | null {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return null;
    const canvas = document.createElement("canvas");
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const targetRatio = 4 / 3;
    const srcRatio = vw / vh;
    let sx = 0;
    let sy = 0;
    let sw = vw;
    let sh = vh;
    if (srcRatio > targetRatio) {
      sw = vh * targetRatio;
      sx = (vw - sw) / 2;
    } else {
      sh = vw / targetRatio;
      sy = (vh - sh) / 2;
    }
    canvas.width = 960;
    canvas.height = 720;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  }

  async function onCapture() {
    const shot = captureFrame();
    if (!shot) {
      setError("Hold the pack still, then capture again.");
      return;
    }
    stopCamera();
    setPreview(shot);
    setSampleId(null);
    setPhase("preview");
  }

  async function onUpload(file: File) {
    setError(null);
    stopCamera();
    const raw = await fileToDataUrl(file);
    const compact = await compressDataUrl(raw);
    setPreview(compact);
    setSampleId(null);
    setQrLive(null);
    setPhase("preview");
    setReport(null);
  }

  async function onSample(id: string) {
    const sample = SAMPLE_PACKS.find((s) => s.id === id);
    if (!sample) return;
    setError(null);
    stopCamera();
    try {
      const raw = await fetchAsDataUrl(sample.image);
      const compact = await compressDataUrl(raw);
      setPreview(compact);
      setSampleId(id);
      setQrLive(sample.injectQr ?? null);
      setPhase("preview");
      setReport(null);
    } catch {
      setError("Could not load that sample pack.");
    }
  }

  async function runAnalyze() {
    if (!preview) return;
    setPhase("working");
    setError(null);
    setNote(null);
    try {
      const decoded = (await decodeQrFromDataUrl(preview)) || qrLive;
      const result = await analyzeLabel({
        data: {
          imageDataUrl: preview,
          qrText: decoded,
          sampleId,
        },
      });
      if (!result.ok) {
        setError(result.error);
        setPhase("preview");
        return;
      }
      const withThumb = { ...result.report, thumbnail: preview };
      setReport(withThumb);
      saveReport({ ...withThumb, thumbnail: await compressDataUrl(preview, 420, 0.55) });
      setPhase("done");
    } catch {
      setError("Analysis failed. Try another photo.");
      setPhase("preview");
    }
  }

  function reset() {
    stopCamera();
    setPhase("idle");
    setPreview(null);
    setReport(null);
    setQrLive(null);
    setSampleId(null);
    setError(null);
    setNote(null);
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div>
          <div className="relative aspect-pack overflow-hidden rounded-xl border border-border bg-fg shadow-soft">
            {phase === "live" ? (
              <video
                ref={videoRef}
                className="h-full w-full object-cover"
                playsInline
                muted
                autoPlay
              />
            ) : preview ? (
              <img src={preview} alt="Captured label" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-accent-fg/80">
                <ScanLine className="size-8" />
                <p className="max-w-xs text-sm">
                  Capture the label — QR is optional. If a code is there, we use it first.
                </p>
              </div>
            )}
            {phase === "live" ? (
              <div className="pointer-events-none absolute inset-6 rounded-lg border border-accent-fg/40" />
            ) : null}
            {phase === "live" && qrLive ? (
              <div className="absolute left-3 top-3">
                <Badge tone="accent">QR found</Badge>
              </div>
            ) : null}
            {phase === "working" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-fg/50">
                <LoaderCircle className="size-8 animate-spin text-accent-fg" />
              </div>
            ) : null}
          </div>
          <canvas ref={frameRef} className="hidden" />

          <div className="mt-4 flex flex-wrap gap-2">
            {phase === "live" ? (
              <>
                <Button onClick={onCapture}>
                  <Camera className="size-4" />
                  Capture label / QR
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    const next = facing === "environment" ? "user" : "environment";
                    setFacing(next);
                    void startCamera(next);
                  }}
                >
                  <SwitchCamera className="size-4" />
                  Flip
                </Button>
                <Button variant="ghost" onClick={reset}>
                  <X className="size-4" />
                  Cancel
                </Button>
              </>
            ) : phase === "preview" || phase === "working" ? (
              <>
                <Button onClick={runAnalyze} disabled={phase === "working"}>
                  {phase === "working" ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <ScanLine className="size-4" />
                  )}
                  Run compliance check
                </Button>
                <Button variant="outline" onClick={() => void startCamera()} disabled={phase === "working"}>
                  Retake
                </Button>
              </>
            ) : phase === "done" ? (
              <Button onClick={reset} variant="secondary">
                New scan
              </Button>
            ) : (
              <>
                <Button onClick={() => void startCamera()}>
                  <Camera className="size-4" />
                  Open camera
                </Button>
                <Button variant="outline" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="size-4" />
                  Upload photo
                </Button>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void onUpload(file);
                e.target.value = "";
              }}
            />
          </div>
          <p className="mt-3 text-sm text-muted">
            QR is not required. If a code is on the pack we read it first and fill gaps from the
            printed label.
          </p>
          {error ? <p className="mt-2 text-sm text-fail">{error}</p> : null}
          {note ? <p className="mt-2 text-sm text-warn">{note}</p> : null}
        </div>

        <aside className="space-y-3">
          <h2 className="font-display text-lg font-semibold">Try a sample pack</h2>
          <p className="text-sm text-muted">
            Desktop-friendly. Each pack is a known Legal Metrology case.
          </p>
          <ul className="space-y-2">
            {SAMPLE_PACKS.filter((s) => s.id !== "freshdrop-qr-only").map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => void onSample(s.id)}
                  className="flex w-full gap-3 rounded-lg border border-border bg-surface p-2 text-left hover:bg-surface-2"
                >
                  <img src={s.image} alt="" className="size-16 shrink-0 rounded-sm object-cover" />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{s.name}</span>
                    <span className="mt-0.5 block text-xs text-muted">{s.blurb}</span>
                  </span>
                </button>
              </li>
            ))}
            <li>
              <button
                type="button"
                onClick={() => void onSample("freshdrop-qr-only")}
                className="w-full rounded-lg border border-dashed border-border px-3 py-2 text-left text-sm text-muted hover:bg-surface"
              >
                Scan QR payload only
              </button>
            </li>
          </ul>
        </aside>
      </div>

      {report && phase === "done" ? <ReportView report={report} /> : null}
    </div>
  );
}
