import { createFileRoute } from "@tanstack/react-router";
import { Scanner } from "@/components/scanner";

export const Route = createFileRoute("/scan")({ component: ScanPage });

function ScanPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Scanner</p>
      <h1 className="mt-2 font-display text-3xl font-semibold">Capture label / QR</h1>
      <p className="mt-2 max-w-2xl text-muted">
        Point the camera at the pack, upload a photo, or run a sample. If a QR code is present we
        use it first. If it is not, the printed label is enough.
      </p>
      <div className="mt-8">
        <Scanner />
      </div>
    </main>
  );
}
