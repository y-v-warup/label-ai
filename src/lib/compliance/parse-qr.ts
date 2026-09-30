import { EMPTY_LABEL, type ExtractedLabel } from "./types";

function filled(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function pick(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const direct = obj[key];
    if (filled(direct)) return direct.trim();
    const lower = Object.keys(obj).find((k) => k.toLowerCase() === key.toLowerCase());
    if (lower && filled(obj[lower])) return String(obj[lower]).trim();
  }
  return null;
}

function parseKeyValues(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/[\n;&]+/)) {
    const line = raw.trim();
    const m = line.match(/^([^:=]{2,40})[:=]\s*(.+)$/);
    if (m) out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function fromRecord(obj: Record<string, unknown>): Partial<ExtractedLabel> {
  const mrp = pick(obj, ["mrp", "MRP", "retailPrice", "price", "maximumRetailPrice"]);
  const taxes = pick(obj, ["mrpInclusiveOfTaxes", "inclusiveOfTaxes", "inclTaxes"]);
  const imported = pick(obj, ["isImported", "imported"]);
  return {
    productName: pick(obj, ["productName", "name", "brand", "commodity"]),
    genericName: pick(obj, ["genericName", "commonName", "commodityName"]),
    manufacturerName: pick(obj, ["manufacturerName", "manufacturer", "mfg", "packedBy"]),
    manufacturerAddress: pick(obj, ["manufacturerAddress", "address", "mfgAddress"]),
    packerName: pick(obj, ["packerName", "packer"]),
    importerName: pick(obj, ["importerName", "importer"]),
    netQuantity: pick(obj, ["netQuantity", "netQty", "quantity", "net_weight"]),
    mrp,
    mrpInclusiveOfTaxes:
      taxes == null ? (mrp ? /incl|tax/i.test(mrp) : null) : /true|yes|1/i.test(taxes),
    mfgMonthYear: pick(obj, ["mfgMonthYear", "mfg", "manufactured", "packed"]),
    packedMonthYear: pick(obj, ["packedMonthYear", "pkd", "packed"]),
    bestBefore: pick(obj, ["bestBefore", "best_before", "expiry"]),
    useBy: pick(obj, ["useBy", "use_by"]),
    consumerCarePhone: pick(obj, ["consumerCarePhone", "phone", "carePhone", "helpline"]),
    consumerCareEmail: pick(obj, ["consumerCareEmail", "email", "careEmail"]),
    countryOfOrigin: pick(obj, ["countryOfOrigin", "origin", "country"]),
    isImported: imported == null ? null : /true|yes|1/i.test(imported),
    fssaiLicense: pick(obj, ["fssaiLicense", "fssai", "licNo"]),
    unitSalePrice: pick(obj, ["unitSalePrice", "usp"]),
    barcode: pick(obj, ["barcode", "gtin", "ean"]),
  };
}

export function parseQrPayload(raw: string | null | undefined): Partial<ExtractedLabel> | null {
  if (!raw || !raw.trim()) return null;
  const text = raw.trim();

  try {
    const json = JSON.parse(text) as unknown;
    if (json && typeof json === "object" && !Array.isArray(json)) {
      return fromRecord(json as Record<string, unknown>);
    }
  } catch {
    /* not json */
  }

  try {
    const url = new URL(text);
    const params: Record<string, unknown> = {};
    url.searchParams.forEach((v, k) => {
      params[k] = v;
    });
    const fromUrl = fromRecord(params);
    if (Object.values(fromUrl).some((v) => v != null && v !== "")) return fromUrl;
  } catch {
    /* not a url */
  }

  const kv = parseKeyValues(text);
  if (Object.keys(kv).length >= 2) return fromRecord(kv);

  return {
    ...EMPTY_LABEL,
    rawOcrText: text,
    barcode: text.length <= 32 ? text : null,
  };
}

function isFilledValue(value: unknown): boolean {
  if (value == null || value === "") return false;
  if (value === "unknown") return false;
  return true;
}

export function countFilled(label: Partial<ExtractedLabel>): number {
  let n = 0;
  (Object.keys(label) as (keyof ExtractedLabel)[]).forEach((key) => {
    if (key === "rawOcrText" || key === "category") return;
    if (isFilledValue(label[key])) n += 1;
  });
  return n;
}

export function mergeLabel(
  qr: Partial<ExtractedLabel> | null,
  vision: ExtractedLabel,
): { merged: ExtractedLabel; qrFilled: number } {
  const merged: ExtractedLabel = { ...vision };
  let qrFilled = 0;

  if (qr) {
    (Object.keys(qr) as (keyof ExtractedLabel)[]).forEach((key) => {
      const value = qr[key];
      if (!isFilledValue(value)) return;
      if (key === "rawOcrText" || key === "category") return;
      (merged as Record<string, unknown>)[key] = value;
      qrFilled += 1;
    });
  }

  if (qr?.rawOcrText) {
    merged.rawOcrText = [vision.rawOcrText, `QR: ${qr.rawOcrText}`].filter(Boolean).join("\n");
  }

  return { merged, qrFilled };
}
