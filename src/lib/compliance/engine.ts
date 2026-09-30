import type { CheckResult, ComplianceReport, ExtractedLabel, ScanSource } from "./types";

const MONTH_YEAR =
  /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?|(?:0?[1-9]|1[0-2]))[\/\-\s.]+(?:20)?\d{2}\b/i;

const QTY = /\b\d+(?:[.,]\d+)?\s*(?:mg|g|kg|ml|l|ltr|litre|liter|pcs?|n|nos?|pieces?|units?|m|cm|mm)\b/i;
const PRICE = /(?:₹|rs\.?|inr|mrp)\s*[:\-]?\s*₹?\s*[\d,]+(?:\.\d{1,2})?/i;
const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(?:\+?91[\s-]?)?(?:1800[\s-]?\d{3}[\s-]?\d{4}|[6-9]\d{9}|\d{10,12})/;
const PIN = /\b\d{6}\b/;

function present(v: string | null | undefined): v is string {
  return typeof v === "string" && v.trim().length > 0 && v.trim().toLowerCase() !== "null";
}

function looksLikeAddress(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (PIN.test(t)) return true;
  if (/\d/.test(t) && t.length >= 18) return true;
  return /(road|street|nagar|colony|plot|dist|india|pvt|ltd|limited|mumbai|delhi|pune|chennai|bengaluru|hyderabad|kolkata|coonoor|midc)/i.test(
    t,
  );
}

function check(
  id: string,
  rule: string,
  title: string,
  status: CheckResult["status"],
  found: string | null,
  message: string,
  suggestion: string | null,
  mandatory: boolean,
): CheckResult {
  return { id, rule, title, status, found, message, suggestion, mandatory };
}

export function evaluateCompliance(
  extracted: ExtractedLabel,
  source: ScanSource,
  qrDetected: boolean,
  thumbnail: string | null,
): ComplianceReport {
  const checks: CheckResult[] = [];
  const food = extracted.category === "food";

  const generic = present(extracted.genericName) ? extracted.genericName : extracted.productName;
  if (present(generic) && generic.trim().length >= 3) {
    checks.push(
      check(
        "name",
        "Rule 6(1)(b)",
        "Common / generic name",
        "pass",
        generic,
        "Commodity name is declared on the package.",
        null,
        true,
      ),
    );
  } else {
    checks.push(
      check(
        "name",
        "Rule 6(1)(b)",
        "Common / generic name",
        "fail",
        null,
        "No common or generic name of the commodity was found.",
        "Print the common name of the commodity in a definite, plain and conspicuous manner on the principal display panel.",
        true,
      ),
    );
  }

  const mfgName = extracted.manufacturerName || extracted.packerName || extracted.importerName;
  const mfgAddr = extracted.manufacturerAddress;
  if (present(mfgName) && present(mfgAddr) && looksLikeAddress(mfgAddr)) {
    checks.push(
      check(
        "manufacturer",
        "Rule 6(1)(a)",
        "Manufacturer / packer / importer",
        "pass",
        `${mfgName}, ${mfgAddr}`,
        "Name and address of the manufacturer, packer or importer are present.",
        null,
        true,
      ),
    );
  } else if (present(mfgName) && !present(mfgAddr)) {
    checks.push(
      check(
        "manufacturer",
        "Rule 6(1)(a)",
        "Manufacturer / packer / importer",
        "fail",
        mfgName,
        "A manufacturer or packer name is present, but the registered address is missing.",
        "Add the full registered office address (with PIN) of the manufacturer, packer or importer. Name alone is not enough.",
        true,
      ),
    );
  } else if (present(mfgName) && present(mfgAddr) && !looksLikeAddress(mfgAddr)) {
    checks.push(
      check(
        "manufacturer",
        "Rule 6(1)(a)",
        "Manufacturer / packer / importer",
        "warn",
        `${mfgName}, ${mfgAddr}`,
        "Address looks incomplete — typically a city name without street, plot or PIN.",
        "Declare the complete registered office address, not only the brand or city.",
        true,
      ),
    );
  } else {
    checks.push(
      check(
        "manufacturer",
        "Rule 6(1)(a)",
        "Manufacturer / packer / importer",
        "fail",
        null,
        "Manufacturer, packer or importer name and address were not found.",
        "Declare name and registered address of the manufacturer. If packed by someone else, declare both. Imported packs must name the importer.",
        true,
      ),
    );
  }

  if (extracted.isImported) {
    if (present(extracted.countryOfOrigin)) {
      checks.push(
        check(
          "origin",
          "Rule 6(1)(aa)",
          "Country of origin",
          "pass",
          extracted.countryOfOrigin,
          "Country of origin is declared for this imported package.",
          null,
          true,
        ),
      );
    } else {
      checks.push(
        check(
          "origin",
          "Rule 6(1)(aa)",
          "Country of origin",
          "fail",
          null,
          "Package appears imported, but country of origin is not declared.",
          "Print the country of origin, manufacture or assembly on the package.",
          true,
        ),
      );
    }
  } else {
    checks.push(
      check(
        "origin",
        "Rule 6(1)(aa)",
        "Country of origin",
        "na",
        extracted.countryOfOrigin,
        extracted.countryOfOrigin
          ? `Origin noted as ${extracted.countryOfOrigin}. Required only for imported packs.`
          : "Required only when the commodity is imported.",
        null,
        false,
      ),
    );
  }

  if (present(extracted.netQuantity) && QTY.test(extracted.netQuantity)) {
    checks.push(
      check(
        "quantity",
        "Rule 6(1)(c)",
        "Net quantity",
        "pass",
        extracted.netQuantity,
        "Net quantity is declared in a standard unit of weight, measure or number.",
        null,
        true,
      ),
    );
  } else if (present(extracted.netQuantity)) {
    checks.push(
      check(
        "quantity",
        "Rule 6(1)(c)",
        "Net quantity",
        "warn",
        extracted.netQuantity,
        "A quantity-like value was found, but the standard unit is unclear.",
        "Declare net quantity as a number plus a standard unit (g, kg, ml, L, or number of pieces).",
        true,
      ),
    );
  } else {
    checks.push(
      check(
        "quantity",
        "Rule 6(1)(c)",
        "Net quantity",
        "fail",
        null,
        "Net quantity was not found on the label.",
        "Print net quantity in a standard unit of weight or measure, or the number of pieces.",
        true,
      ),
    );
  }

  const date =
    extracted.mfgMonthYear ||
    extracted.packedMonthYear ||
    (food ? extracted.bestBefore || extracted.useBy : null);
  if (present(date) && MONTH_YEAR.test(date)) {
    checks.push(
      check(
        "date",
        food ? "Rule 6 / FSSAI dating" : "Rule 6(1)(d)",
        food ? "Manufacture / pack / best before" : "Month and year of manufacture",
        "pass",
        date,
        food
          ? "A manufacture, packing or best-before date is present."
          : "Month and year of manufacture, packing or import is declared.",
        null,
        true,
      ),
    );
  } else if (present(date)) {
    checks.push(
      check(
        "date",
        "Rule 6(1)(d)",
        "Month and year of manufacture",
        "warn",
        date,
        "A date-like value was found but month and year are not clearly paired.",
        "Declare month and year (for example JAN 2026). Day is optional except where food law requires it.",
        true,
      ),
    );
  } else {
    checks.push(
      check(
        "date",
        "Rule 6(1)(d)",
        "Month and year of manufacture",
        "fail",
        null,
        "Month and year of manufacture, packing or import was not found.",
        food
          ? "For food, declare manufacture/packing date and best before or use-by as required by FSSAI."
          : "Print month and year of manufacture, pre-packing or import.",
        true,
      ),
    );
  }

  if (present(extracted.mrp) && PRICE.test(extracted.mrp)) {
    const inclusive =
      extracted.mrpInclusiveOfTaxes === true || /incl|inclusive|all taxes/i.test(extracted.mrp);
    if (inclusive) {
      checks.push(
        check(
          "mrp",
          "Rule 6(1)(e)",
          "Maximum retail price",
          "pass",
          extracted.mrp,
          "MRP is declared in Indian currency, inclusive of all taxes.",
          null,
          true,
        ),
      );
    } else {
      checks.push(
        check(
          "mrp",
          "Rule 6(1)(e)",
          "Maximum retail price",
          "warn",
          extracted.mrp,
          "A price is present, but it does not clearly say it is the MRP inclusive of all taxes.",
          'Print as “MRP ₹ xx.xx (Incl. of all taxes)” — or an equivalent Rule 6 illustration.',
          true,
        ),
      );
    }
  } else {
    checks.push(
      check(
        "mrp",
        "Rule 6(1)(e)",
        "Maximum retail price",
        "fail",
        extracted.mrp,
        "Maximum retail price inclusive of all taxes was not found.",
        "Declare MRP in rupees, rounded as required, with the words “inclusive of all taxes”.",
        true,
      ),
    );
  }

  const phoneOk = present(extracted.consumerCarePhone) && PHONE.test(extracted.consumerCarePhone);
  const emailOk = present(extracted.consumerCareEmail) && EMAIL.test(extracted.consumerCareEmail);
  if (phoneOk && emailOk) {
    checks.push(
      check(
        "care",
        "Rule 6 — consumer care",
        "Consumer care details",
        "pass",
        `${extracted.consumerCarePhone} · ${extracted.consumerCareEmail}`,
        "Telephone and email for consumer complaints are declared.",
        null,
        true,
      ),
    );
  } else if (phoneOk || emailOk) {
    checks.push(
      check(
        "care",
        "Rule 6 — consumer care",
        "Consumer care details",
        "warn",
        [extracted.consumerCarePhone, extracted.consumerCareEmail].filter(Boolean).join(" · "),
        "Only part of the consumer-care contact is present. Email and telephone are both expected.",
        "Add name/office, telephone number and email address of the person who can be contacted for complaints.",
        true,
      ),
    );
  } else {
    checks.push(
      check(
        "care",
        "Rule 6 — consumer care",
        "Consumer care details",
        "fail",
        null,
        "Consumer care telephone and email were not found.",
        "Declare a telephone number and email address for consumer complaints on the package.",
        true,
      ),
    );
  }

  if (present(extracted.unitSalePrice)) {
    checks.push(
      check(
        "usp",
        "Rule 6 — unit sale price",
        "Unit sale price",
        "pass",
        extracted.unitSalePrice,
        "Unit sale price is declared.",
        null,
        false,
      ),
    );
  } else {
    checks.push(
      check(
        "usp",
        "Rule 6 — unit sale price",
        "Unit sale price",
        "warn",
        null,
        "Unit sale price was not detected. It is required on many retail packs under recent amendments.",
        "Declare unit sale price (price per kg / L / number) where the current Packaged Commodities Rules require it.",
        false,
      ),
    );
  }

  if (food) {
    if (present(extracted.fssaiLicense)) {
      checks.push(
        check(
          "fssai",
          "FSSAI (advisory)",
          "FSSAI licence number",
          "pass",
          extracted.fssaiLicense,
          "An FSSAI licence number was read from the label.",
          null,
          false,
        ),
      );
    } else {
      checks.push(
        check(
          "fssai",
          "FSSAI (advisory)",
          "FSSAI licence number",
          "warn",
          null,
          "This looks like food, but no FSSAI licence number was read. LabelGuard checks Legal Metrology declarations first — FSSAI is flagged only as guidance.",
          "Food packs should carry a valid FSSAI licence number and the veg / non-veg mark under food law.",
          false,
        ),
      );
    }
  }

  const mandatory = checks.filter((c) => c.mandatory && c.status !== "na");
  const fails = mandatory.filter((c) => c.status === "fail").length;
  const warns = mandatory.filter((c) => c.status === "warn").length;
  const passes = mandatory.filter((c) => c.status === "pass").length;
  const denom = mandatory.length || 1;
  const score = Math.round(((passes + warns * 0.5) / denom) * 100);
  const verdict =
    fails === 0 && warns === 0 ? "compliant" : fails === 0 ? "partial" : "non-compliant";

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    score,
    verdict,
    source,
    qrDetected,
    extracted,
    checks,
    thumbnail,
  };
}
