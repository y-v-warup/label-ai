import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/rules")({ component: RulesPage });

const RULES = [
  {
    id: "6(1)(a)",
    title: "Manufacturer, packer or importer",
    body: "Every package must declare the name and address of the manufacturer. If the manufacturer is not the packer, both must appear. Imported packs must name the importer.",
  },
  {
    id: "6(1)(aa)",
    title: "Country of origin",
    body: "Imported products must state the country of origin, manufacture or assembly on the package.",
  },
  {
    id: "6(1)(b)",
    title: "Common or generic name",
    body: "The commodity’s common name must be declared. Multi-product packs must name each item and its quantity.",
  },
  {
    id: "6(1)(c)",
    title: "Net quantity",
    body: "Net quantity in a standard unit of weight or measure, or the number of pieces if sold by number.",
  },
  {
    id: "6(1)(d)",
    title: "Month and year",
    body: "Month and year of manufacture, pre-packing or import. Food packs follow FSSAI dating (manufacture / packing plus best before or use-by).",
  },
  {
    id: "6(1)(e)",
    title: "Maximum retail price",
    body: "MRP must be in Indian currency and clearly inclusive of all taxes — for example “MRP ₹ xx.xx (Incl. of all taxes)”.",
  },
  {
    id: "Care",
    title: "Consumer care",
    body: "Telephone number and email of the person or office who can be contacted for consumer complaints.",
  },
  {
    id: "USP",
    title: "Unit sale price",
    body: "Recent amendments require unit sale price on many retail packs. LabelGuard flags it when it is missing.",
  },
];

function RulesPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted">
        Legal Metrology
      </p>
      <h1 className="mt-2 font-display text-3xl font-semibold">
        What a pack must say
      </h1>
      <p className="mt-3 text-muted">
        The Legal Metrology (Packaged Commodities) Rules, 2011 — with later amendments — require
        definite, plain and conspicuous declarations on pre-packaged commodities meant for retail
        sale. LabelGuard checks those declarations from a photograph. It does not weigh the
        contents.
      </p>

      <ol className="mt-8 space-y-4">
        {RULES.map((rule) => (
          <li key={rule.id} className="rounded-xl border border-border bg-surface p-5">
            <p className="font-mono text-xs uppercase tracking-wider text-subtle">Rule {rule.id}</p>
            <h2 className="mt-1 font-display text-xl font-semibold">{rule.title}</h2>
            <p className="mt-2 text-sm text-muted">{rule.body}</p>
          </li>
        ))}
      </ol>

      <div className="mt-10 rounded-xl border border-border bg-surface-2 p-5">
        <h2 className="font-display text-lg font-semibold">Scope</h2>
        <p className="mt-2 text-sm text-muted">
          LabelGuard is a declaration inspector. A Legal Metrology officer still verifies net
          quantity with a stamped weighing instrument. Food packs also sit under FSSAI; those
          checks are marked advisory on the report.
        </p>
        <p className="mt-3 text-sm text-muted">
          Primary sources: Department of Consumer Affairs — Legal Metrology Act and the Packaged
          Commodities Rules, 2011, including G.S.R. 629(E) and later consumer-care and unit-sale
          price amendments. Always verify the current text before a production deployment.
        </p>
        <div className="mt-5">
          <Button asChild>
            <Link to="/scan">Inspect a pack</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
