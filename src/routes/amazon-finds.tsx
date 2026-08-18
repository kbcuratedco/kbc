import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import logo from "@/assets/kbc-logo-transparent.png";

export const Route = createFileRoute("/amazon-finds")({
  head: () => ({
    meta: [
      { title: "Amazon Finds — KB Curated Co" },
      {
        name: "description",
        content:
          "Things I'm loving, using and gifting lately, curated by KB Curated Co.",
      },
    ],
  }),
  component: AmazonFinds,
});

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/19l0GSs-S4-EFcvquQHU2mp-huLQ_rInPUkR_VVebsDc/gviz/tq?tqx=out:csv";

type AmazonFind = {
  active: boolean;
  product: string;
  category: string;
  description: string;
  imageUrl: string;
  amazonUrl: string;
  asin: string;
};

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell.trim());
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;

      row.push(cell.trim());
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }

      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell.trim());
    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  return rows;
}

function AmazonFinds() {
  const [finds, setFinds] = useState<AmazonFind[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");

  useEffect(() => {
    async function loadFinds() {
      try {
        const response = await fetch(SHEET_URL);
        const csv = await response.text();
        const rows = parseCsv(csv);

        if (rows.length < 2) {
          setFinds([]);
          return;
        }

        const headers = rows[0].map((header) =>
          header.toLowerCase().trim()
        );

        const getValue = (row: string[], name: string) => {
          const index = headers.indexOf(name);
          return index >= 0 ? row[index] ?? "" : "";
        };

        const products = rows
          .slice(1)
          .map((row) => ({
            active: getValue(row, "active").toLowerCase() === "true",
            product: getValue(row, "product"),
            category: getValue(row, "category"),
            description: getValue(row, "description"),
            imageUrl: getValue(row, "image url"),
            amazonUrl: getValue(row, "amazon affiliate link"),
            asin: getValue(row, "asin"),
          }))
          .filter((item) => item.active && item.product && item.amazonUrl);

        setFinds(products);
      } catch (error) {
        console.error("Unable to load Amazon Finds:", error);
        setFinds([]);
      } finally {
        setLoading(false);
      }
    }

    loadFinds();
  }, []);

  const categories = useMemo(() => {
    return [
      "All",
      ...Array.from(
        new Set(finds.map((item) => item.category).filter(Boolean))
      ),
    ];
  }, [finds]);

  const visibleFinds =
    activeCategory === "All"
      ? finds
      : finds.filter((item) => item.category === activeCategory);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90">
        <div className="mx-auto flex max-w-5xl items-center justify-center px-4 py-5">
          <a href="/">
            <img
              src={logo}
              alt="KB Curated Co"
              className="h-16 w-16 object-contain"
            />
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-12 md:py-16">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <span className="font-script text-4xl text-primary">
            KB Curated
          </span>

          <h1 className="mt-2 font-display text-5xl md:text-6xl">
            Amazon Finds
          </h1>

          <p className="mt-5 text-lg text-muted-foreground">
            Things I&apos;m loving, using &amp; gifting lately.
          </p>
        </div>

        {categories.length > 1 && (
          <div className="mb-10 flex gap-2 overflow-x-auto pb-2 justify-center">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                  activeCategory === category
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground hover:bg-muted/70"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-muted-foreground">
            Loading my finds...
          </div>
        ) : visibleFinds.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-muted/20 p-12 text-center text-muted-foreground">
            Check back soon for my favorite finds.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3">
            {visibleFinds.map((item) => (
              <article
                key={`${item.product}-${item.asin}`}
                className="overflow-hidden rounded-2xl border border-border/60 bg-background"
              >
                <div className="aspect-square bg-muted/40">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.product}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
                      Product photo coming soon
                    </div>
                  )}
                </div>

                <div className="p-4">
                  {item.category && (
                    <div className="mb-1 text-xs font-medium uppercase tracking-wider text-primary">
                      {item.category}
                    </div>
                  )}

                  <h2 className="font-display text-xl">
                    {item.product}
                  </h2>

                  {item.description && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      {item.description}
                    </p>
                  )}

                  <a
                    href={item.amazonUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Shop on Amazon →
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

        <p className="mx-auto mt-12 max-w-xl text-center text-xs text-muted-foreground">
          As an Amazon Associate, KB Curated Co may earn from qualifying
          purchases.
        </p>
      </main>

      <footer className="border-t border-border/60 px-4 py-10 text-center">
        <img
          src={logo}
          alt="KB Curated Co"
          className="mx-auto h-12 w-12 object-contain"
        />
        <p className="mt-3 text-sm text-muted-foreground">
          © {new Date().getFullYear()} KB Curated Co
        </p>
      </footer>
    </div>
  );
}