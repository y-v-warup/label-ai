import type { ComplianceReport } from "@/lib/compliance/types";

const KEY = "labelguard.history.v1";
const MAX = 24;

export function loadHistory(): ComplianceReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ComplianceReport[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveReport(report: ComplianceReport) {
  const next = [report, ...loadHistory().filter((r) => r.id !== report.id)].slice(0, MAX);
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function clearHistory() {
  localStorage.removeItem(KEY);
}
