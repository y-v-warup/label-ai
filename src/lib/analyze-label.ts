import { createServerFn } from "@tanstack/react-start";
import { evaluateCompliance } from "@/lib/compliance/engine";
import { countFilled, mergeLabel, parseQrPayload } from "@/lib/compliance/parse-qr";
import { sampleById } from "@/lib/samples";
import {
  EMPTY_LABEL,
  type ComplianceReport,
  type ExtractedLabel,
  type ScanSource,
} from "@/lib/compliance/types";

type AnalyzeInput = {
  imageDataUrl: string;
  qrText: string | null;
  sampleId?: string | null;
};

export type AnalyzeResult =
  | { ok: true; report: ComplianceReport; usedFallback: boolean }
  | { ok: false; error: string };

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 20;
const hits: number[] = [];

function rateLimit(): string | null {
  const now = Date.now();
  while (hits.length && now - hits[0] > WINDOW_MS) hits.shift();
  if (hits.length >= MAX_PER_WINDOW) {
    return "Too many scans just now. Wait a minute and try again.";
  }
  hits.push(now);
  return null;
}

function stripJsonFence(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start >= 0 && end > start) return text.slice(start, end + 1);
  return text;
}

function asString(v: unknown): string | null {
  if (typeof v === "string" && v.trim() && v.trim().toLowerCase() !== "null") return v.trim();
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  return null;
}

function asBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") {
    if (/^(true|yes|1)$/i.test(v)) return true;
    if (/^(false|no|0)$/i.test(v)) return false;
  }
  return null;
}

function coerceLabel(raw: unknown, ocrFallback: string): ExtractedLabel {
  const obj = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const veg = asString(obj.vegNonVeg)?.toLowerCase();
  const cat = asString(obj.category)?.toLowerCase();
  return {
    productName: asString(obj.productName),
    genericName: asString(obj.genericName),
    manufacturerName: asString(obj.manufacturerName),
    manufacturerAddress: asString(obj.manufacturerAddress),
    packerName: asString(obj.packerName),
    importerName: asString(obj.importerName),
    netQuantity: asString(obj.netQuantity),
    mrp: asString(obj.mrp),
    mrpInclusiveOfTaxes: asBool(obj.mrpInclusiveOfTaxes),
    mfgMonthYear: asString(obj.mfgMonthYear),
    packedMonthYear: asString(obj.packedMonthYear),
    bestBefore: asString(obj.bestBefore),
    useBy: asString(obj.useBy),
    consumerCarePhone: asString(obj.consumerCarePhone)?.replace(/\s+/g, "") ?? null,
    consumerCareEmail: asString(obj.consumerCareEmail),
    countryOfOrigin: asString(obj.countryOfOrigin),
    isImported: asBool(obj.isImported),
    fssaiLicense: asString(obj.fssaiLicense),
    vegNonVeg: veg === "veg" || veg === "non-veg" ? veg : null,
    unitSalePrice: asString(obj.unitSalePrice),
    barcode: asString(obj.barcode),
    rawOcrText: asString(obj.rawOcrText) ?? ocrFallback,
    category: cat === "food" || cat === "non-food" ? cat : "unknown",
  };
}

const SYSTEM_PROMPT = `You are LabelGuard, an inspector for Indian pre-packaged commodities.
Read the product label image. Extract only what is actually visible. Do not invent missing fields.
Return a single JSON object with exactly these keys:
productName, genericName, manufacturerName, manufacturerAddress, packerName, importerName,
netQuantity, mrp, mrpInclusiveOfTaxes, mfgMonthYear, packedMonthYear, bestBefore, useBy,
consumerCarePhone, consumerCareEmail, countryOfOrigin, isImported, fssaiLicense, vegNonVeg,
unitSalePrice, barcode, rawOcrText, category.
Use null for anything not clearly present.
mrpInclusiveOfTaxes is true only if the label says inclusive / incl. of all taxes.
isImported is true only if the pack is clearly imported (or country of origin is not India).
vegNonVeg is "veg" or "non-veg" or null.
category is "food", "non-food", or "unknown".
rawOcrText is all readable text, line by line.
Read small print, MRP (MRP / M.R.P / Maximum Retail Price / ₹ / Rs / INR), net qty, dates, FSSAI, phone and email.`;

async function visionExtract(imageDataUrl: string, qrText: string | null): Promise<ExtractedLabel> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error("AI is not available in this environment");

  const userText = [
    "Extract Legal Metrology declarations from this packaged-product image.",
    qrText
      ? `A QR code on the pack decoded as:\n${qrText.slice(0, 1200)}\nUse the image as the printed label. Do not copy QR fields unless they are also printed.`
      : "No QR code was decoded. Use only the printed label.",
  ].join("\n");

  const res = await fetch("https://api.x.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "grok-4.5",
      temperature: 0.1,
      max_tokens: 1600,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageDataUrl, detail: "high" } },
            { type: "text", text: userText },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`xAI API error ${res.status}${body ? `: ${body.slice(0, 180)}` : ""}`);
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  let parsed: unknown = {};
  try {
    parsed = JSON.parse(stripJsonFence(content));
  } catch {
    parsed = {};
  }
  return coerceLabel(parsed, content);
}

function sourceOf(qrDetected: boolean, qrFilled: number, visionFilled: number): ScanSource {
  if (qrDetected && qrFilled > 0 && visionFilled > 0) return "qr+label";
  if (qrDetected && qrFilled > 0) return "qr";
  return "label";
}

export const analyzeLabel = createServerFn({ method: "POST" })
  .validator((input: AnalyzeInput) => input)
  .handler(async ({ data }): Promise<AnalyzeResult> => {
    const limited = rateLimit();
    if (limited) return { ok: false, error: limited };

    const imageDataUrl = data.imageDataUrl?.trim() ?? "";
    if (!imageDataUrl.startsWith("data:image/")) {
      return { ok: false, error: "Capture or upload a label photo first." };
    }
    if (imageDataUrl.length > 3_500_000) {
      return { ok: false, error: "Image is too large. Move closer and capture again." };
    }

    const sample = sampleById(data.sampleId ?? undefined);
    const qrText = (data.qrText && data.qrText.trim()) || sample?.injectQr || null;
    const qrParsed = parseQrPayload(qrText);

    let vision: ExtractedLabel = { ...EMPTY_LABEL };
    let usedFallback = false;

    try {
      vision = await visionExtract(imageDataUrl, qrText);
    } catch {
      if (sample) {
        vision = { ...sample.fallback };
        usedFallback = true;
      } else {
        return {
          ok: false,
          error:
            "Could not read that label just now. Try a sample pack, or recapture with the declarations filling the frame.",
        };
      }
    }

    if (
      sample &&
      !vision.productName &&
      !vision.genericName &&
      !vision.mrp &&
      !vision.netQuantity
    ) {
      vision = { ...sample.fallback };
      usedFallback = true;
    }

    const visionFilled = countFilled(vision);
    const { merged, qrFilled } = mergeLabel(qrParsed, vision);
    if (!merged.category || merged.category === "unknown") {
      if (sample?.fallback.category) merged.category = sample.fallback.category;
    }

    const qrDetected = Boolean(qrText);
    const source = sourceOf(qrDetected, qrFilled, visionFilled);
    const report = evaluateCompliance(merged, source, qrDetected, imageDataUrl);
    return { ok: true, report, usedFallback };
  });
