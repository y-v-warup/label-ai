import {
  AlertTriangle,
  Check,
  CircleDashed,
  Download,
  Printer,
  X,
} from "lucide-react";
import type { CheckResult, ComplianceReport, FieldStatus } from "@/lib/compliance/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function statusTone(status: FieldStatus) {
  if (status === "pass") return "pass" as const;
  if (status === "fail") return "fail" as const;
  if (status === "warn") return "warn" as const;
  return "neutral" as const;
}

function StatusIcon({ status }: { status: FieldStatus }) {
  if (status === "pass") return <Check className="size-4" strokeWidth={2.2} />;
  if (status === "fail") return <X className="size-4" strokeWidth={2.2} />;
  if (status === "warn") return <AlertTriangle className="size-4" strokeWidth={2.2} />;
  return <CircleDashed className="size-4" strokeWidth={2.2} />;
}

function sourceLabel(report: ComplianceReport) {
  if (report.source === "qr") return "QR only";
  if (report.source === "qr+label") return "QR first, label fallback";
  return "Label scan";
}

function verdictCopy(report: ComplianceReport) {
  if (report.verdict === "compliant") return "Declarations look complete";
  if (report.verdict === "partial") return "Present, but some wording is incomplete";
  return "Missing mandatory declarations";
}

export function ReportView({ report }: { report: ComplianceReport }) {
  const fails = report.checks.filter((c) => c.status === "fail");
  const warns = report.checks.filter((c) => c.status === "warn" && c.mandatory);

  function downloadJson() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `labelguard-${report.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-soft">
        <div className="grid gap-0 md:grid-cols-[220px_1fr]">
          <div className="border-b border-border bg-surface-2 md:border-b-0 md:border-r">
            {report.thumbnail ? (
              <img
                src={report.thumbnail}
                alt="Captured pack"
                className="aspect-pack h-full w-full object-cover"
              />
            ) : (
              <div className="flex aspect-pack items-center justify-center text-sm text-muted">
                No preview
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between gap-6 p-5 sm:p-7">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  tone={statusTone(
                    report.verdict === "compliant"
                      ? "pass"
                      : report.verdict === "partial"
                        ? "warn"
                        : "fail",
                  )}
                >
                  {report.verdict === "compliant"
                    ? "Compliant"
                    : report.verdict === "partial"
                      ? "Partial"
                      : "Non-compliant"}
                </Badge>
                <Badge>{sourceLabel(report)}</Badge>
                {report.qrDetected ? <Badge tone="accent">QR read</Badge> : <Badge>QR not used</Badge>}
              </div>
              <p className="mt-4 font-display text-3xl font-semibold tracking-tight tabular-nums">
                {report.score}
                <span className="text-lg text-muted"> / 100</span>
              </p>
              <p className="mt-1 text-muted">{verdictCopy(report)}</p>
              <p className="mt-3 text-sm text-fg">
                {report.extracted.productName || report.extracted.genericName || "Unnamed pack"}
                {report.extracted.netQuantity ? ` · ${report.extracted.netQuantity}` : ""}
              </p>
            </div>
            <div className="no-print flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="size-4" />
                Print report
              </Button>
              <Button variant="ghost" size="sm" onClick={downloadJson}>
                <Download className="size-4" />
                JSON
              </Button>
            </div>
          </div>
        </div>
      </div>

      {fails.length > 0 ? (
        <div className="rounded-xl border border-fail/20 bg-fail/5 p-5">
          <h3 className="font-display text-lg font-semibold">Violations</h3>
          <ul className="mt-3 space-y-3">
            {fails.map((c) => (
              <li key={c.id} className="text-sm">
                <p className="font-medium text-fail">{c.title}</p>
                <p className="text-fg">{c.message}</p>
                {c.suggestion ? <p className="mt-1 text-muted">{c.suggestion}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {warns.length > 0 ? (
        <div className="rounded-xl border border-warn/20 bg-warn/5 p-5">
          <h3 className="font-display text-lg font-semibold">Needs a closer look</h3>
          <ul className="mt-3 space-y-3">
            {warns.map((c) => (
              <li key={c.id} className="text-sm">
                <p className="font-medium text-warn">{c.title}</p>
                <p className="text-fg">{c.message}</p>
                {c.suggestion ? <p className="mt-1 text-muted">{c.suggestion}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div>
        <h3 className="font-display text-lg font-semibold">Declaration checklist</h3>
        <p className="mt-1 text-sm text-muted">
          Legal Metrology (Packaged Commodities) Rules, 2011 and later amendments. FSSAI items are
          advisory.
        </p>
        <ul className="mt-4 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {report.checks.map((c) => (
            <CheckRow key={c.id} check={c} />
          ))}
        </ul>
      </div>

      {report.extracted.rawOcrText ? (
        <details className="rounded-xl border border-border bg-surface p-4">
          <summary className="cursor-pointer text-sm font-medium">Extracted text</summary>
          <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap font-mono text-xs text-muted">
            {report.extracted.rawOcrText}
          </pre>
        </details>
      ) : null}
    </section>
  );
}

function CheckRow({ check }: { check: CheckResult }) {
  return (
    <li className="flex gap-3 p-4">
      <span
        className={cn(
          "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full",
          check.status === "pass" && "bg-pass/12 text-pass",
          check.status === "fail" && "bg-fail/12 text-fail",
          check.status === "warn" && "bg-warn/12 text-warn",
          check.status === "na" && "bg-surface-2 text-muted",
        )}
      >
        <StatusIcon status={check.status} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="font-medium">{check.title}</p>
          <p className="font-mono text-xs uppercase tracking-wider text-subtle">{check.rule}</p>
        </div>
        {check.found ? <p className="mt-0.5 text-sm text-fg">{check.found}</p> : null}
        <p className="mt-1 text-sm text-muted">{check.message}</p>
      </div>
    </li>
  );
}
