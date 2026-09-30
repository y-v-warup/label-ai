import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { clearHistory, loadHistory } from "@/lib/history";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportView } from "@/components/report-view";
import type { ComplianceReport } from "@/lib/compliance/types";

export const Route = createFileRoute("/history")({ component: HistoryPage });

function HistoryPage() {
  const [rows, setRows] = useState<ComplianceReport[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const list = loadHistory();
    setRows(list);
    setOpenId(list[0]?.id ?? null);
  }, []);

  const open = useMemo(() => rows.find((r) => r.id === openId) ?? null, [rows, openId]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">Reports</p>
          <h1 className="mt-2 font-display text-3xl font-semibold">Saved on this device</h1>
          <p className="mt-2 max-w-xl text-muted">
            Scans stay in the browser. Nothing is uploaded to a shared database.
          </p>
        </div>
        {rows.length > 0 ? (
          <Button
            variant="outline"
            onClick={() => {
              clearHistory();
              setRows([]);
              setOpenId(null);
            }}
          >
            Clear
          </Button>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-muted">No reports yet.</p>
          <div className="mt-4">
            <Button asChild>
              <Link to="/scan">Open scanner</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 lg:grid-cols-[280px_1fr]">
          <ul className="space-y-2">
            {rows.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(r.id)}
                  className="flex w-full gap-3 rounded-lg border border-border bg-surface p-2 text-left hover:bg-surface-2"
                >
                  {r.thumbnail ? (
                    <img src={r.thumbnail} alt="" className="size-14 rounded-sm object-cover" />
                  ) : (
                    <span className="size-14 rounded-sm bg-surface-2" />
                  )}
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {r.extracted.productName || r.extracted.genericName || "Pack"}
                    </span>
                    <span className="mt-1 flex items-center gap-2">
                      <Badge
                        tone={
                          r.verdict === "compliant"
                            ? "pass"
                            : r.verdict === "partial"
                              ? "warn"
                              : "fail"
                        }
                      >
                        {r.score}
                      </Badge>
                      <span className="text-xs text-muted">
                        {new Date(r.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <div>{open ? <ReportView report={open} /> : null}</div>
        </div>
      )}
    </main>
  );
}
