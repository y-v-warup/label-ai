export type FieldStatus = "pass" | "fail" | "warn" | "na";

export type ProductCategory = "food" | "non-food" | "unknown";

export type ExtractedLabel = {
  productName: string | null;
  genericName: string | null;
  manufacturerName: string | null;
  manufacturerAddress: string | null;
  packerName: string | null;
  importerName: string | null;
  netQuantity: string | null;
  mrp: string | null;
  mrpInclusiveOfTaxes: boolean | null;
  mfgMonthYear: string | null;
  packedMonthYear: string | null;
  bestBefore: string | null;
  useBy: string | null;
  consumerCarePhone: string | null;
  consumerCareEmail: string | null;
  countryOfOrigin: string | null;
  isImported: boolean | null;
  fssaiLicense: string | null;
  vegNonVeg: "veg" | "non-veg" | null;
  unitSalePrice: string | null;
  barcode: string | null;
  rawOcrText: string;
  category: ProductCategory;
};

export const EMPTY_LABEL: ExtractedLabel = {
  productName: null,
  genericName: null,
  manufacturerName: null,
  manufacturerAddress: null,
  packerName: null,
  importerName: null,
  netQuantity: null,
  mrp: null,
  mrpInclusiveOfTaxes: null,
  mfgMonthYear: null,
  packedMonthYear: null,
  bestBefore: null,
  useBy: null,
  consumerCarePhone: null,
  consumerCareEmail: null,
  countryOfOrigin: null,
  isImported: null,
  fssaiLicense: null,
  vegNonVeg: null,
  unitSalePrice: null,
  barcode: null,
  rawOcrText: "",
  category: "unknown",
};

export type CheckResult = {
  id: string;
  rule: string;
  title: string;
  status: FieldStatus;
  found: string | null;
  message: string;
  suggestion: string | null;
  mandatory: boolean;
};

export type ScanSource = "qr" | "label" | "qr+label";

export type ComplianceReport = {
  id: string;
  createdAt: string;
  score: number;
  verdict: "compliant" | "non-compliant" | "partial";
  source: ScanSource;
  qrDetected: boolean;
  extracted: ExtractedLabel;
  checks: CheckResult[];
  thumbnail: string | null;
};

export const LABEL_KEYS = [
  "productName",
  "genericName",
  "manufacturerName",
  "manufacturerAddress",
  "packerName",
  "importerName",
  "netQuantity",
  "mrp",
  "mrpInclusiveOfTaxes",
  "mfgMonthYear",
  "packedMonthYear",
  "bestBefore",
  "useBy",
  "consumerCarePhone",
  "consumerCareEmail",
  "countryOfOrigin",
  "isImported",
  "fssaiLicense",
  "vegNonVeg",
  "unitSalePrice",
  "barcode",
  "rawOcrText",
  "category",
] as const satisfies readonly (keyof ExtractedLabel)[];
