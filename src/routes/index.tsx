import { createFileRoute, Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { ArrowRight, Camera, QrCode, Scale, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({ component: Home });

const STEPS = [
  { n: "01", title: "Capture", body: "Photograph the pack. QR is optional — use it if it is there." },
  { n: "02", title: "Read", body: "Vision extracts printed declarations. A QR payload, if any, is decoded first." },
  { n: "03", title: "Check", body: "A rule engine scores the pack against Legal Metrology Rule 6." },
  { n: "04", title: "Report", body: "Instant verdict, missing fields, and what to print to become compliant." },
];

const CHECKS = [
  "Manufacturer / packer / importer name and address",
  "Common or generic name of the commodity",
  "Net quantity in a standard unit",
  "Month and year of manufacture, packing or import",
  "MRP inclusive of all taxes",
  "Consumer care telephone and email",
  "Country of origin, if imported",
  "Unit sale price (flagged where expected)",
];

function Home() {
  return (
    <main>
      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center lg:py-16">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
            Packaged Commodities · Rule 6
          </p>
          <h1 className="mt-3 max-w-xl font-display text-4xl font-semibold sm:text-5xl">
            Photograph a pack. Know if it is legal.
          </h1>
          <p className="mt-4 max-w-lg text-muted">
            LabelGuard is an inspector for pre-packaged commodities. It reads the printed label —
            and a QR code if one exists — then checks the declarations required under the Legal
            Metrology (Packaged Commodities) Rules, 2011.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/scan">
                Open scanner
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/rules">Read the rules</Link>
            </Button>
          </div>
          <p className="mt-5 text-sm text-subtle">
            QR is not mandatory. No code on the pack? The label is enough.
          </p>
        </div>
        <div className="relative">
          <img
            src="/samples/nilgiri-gold.jpg"
            alt="Tea carton with Legal Metrology declarations"
            className="aspect-pack w-full rounded-xl object-cover object-top shadow-soft"
          />
          <div className="absolute bottom-4 left-4 right-4 rounded-lg border border-border bg-surface/95 p-3 shadow-soft">
            <p className="text-xs uppercase tracking-wider text-muted">Sample verdict</p>
            <p className="mt-1 font-medium text-pass">Core declarations present</p>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="mx-auto grid max-w-6xl gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((step) => (
            <article key={step.n} className="bg-surface px-5 py-8">
              <p className="font-mono text-xs text-subtle">{step.n}</p>
              <h2 className="mt-3 font-display text-xl font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm text-muted">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-4 py-14 lg:grid-cols-2">
        <div>
          <h2 className="font-display text-3xl font-semibold">What we check</h2>
          <p className="mt-3 text-muted">
            Declaration coverage — not laboratory testing of weight, and not a substitute for a
            Legal Metrology inspector. Physical verification of quantity still belongs to a
            metrology officer.
          </p>
          <ul className="mt-6 space-y-2.5">
            {CHECKS.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <span className="mt-1 size-1.5 shrink-0 rounded-full bg-accent" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-3">
          <Feature
            icon={<Camera className="size-4" />}
            title="4:3 camera"
            body="Built for a phone in the warehouse or a laptop at a desk. Upload if the camera is blocked."
          />
          <Feature
            icon={<QrCode className="size-4" />}
            title="QR first, label fallback"
            body="If a QR payload has the declarations, we use it. Missing fields are filled from the printed label."
          />
          <Feature
            icon={<ScanLine className="size-4" />}
            title="Vision + rule engine"
            body="Grok reads the image. A deterministic engine scores Rule 6 so the same pack always gets the same checklist."
          />
          <Feature
            icon={<Scale className="size-4" />}
            title="Corrective suggestions"
            body="Each miss comes with the wording the pack should carry — MRP inclusive of taxes, PIN in the address, care email."
          />
        </div>
      </section>

      <section className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-12 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-3xl font-semibold">Inspect a pack now</h2>
            <p className="mt-2 max-w-md text-muted">
              Start with the sample tea, biscuits, namkeen or detergent — or point a phone at a
              real package.
            </p>
          </div>
          <Button asChild>
            <Link to="/scan">
              Open scanner
              <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
        <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-subtle">
          LabelGuard is a demonstration inspector. Confirm current Legal Metrology amendments
          before relying on a result in production. Not a government service.
        </footer>
      </section>
    </main>
  );
}

function Feature({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <article className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2 text-accent">
        {icon}
        <h3 className="font-medium text-fg">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </article>
  );
}
