import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/amazon-finds")({
  component: AmazonFinds,
});

const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/19l0GSs-S4-EFcvquQHU2mp-huLQ_rInPUkR_VVebsDc/gviz/tq?tqx=out:csv";

type Find = {
  active: boolean;
  product: string;
  category: string;
  description: string;
  imageUrl: string;
  amazonUrl: string;
};

function AmazonFinds() {
  const [finds, setFinds] = useState<Find[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(SHEET_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Could not load the Amazon Finds sheet.");
        }
        return response.text();
      })
      .then((csv) => {
        const rows = csv
          .split(/\r?\n/)
          .map((row) => row.split(",").map((cell) => cell.replace(/^"|"$/g, "").trim()));

        const headers = rows[0]?.map((h) => h.toLowerCase());

        if (!headers) return;

        const get = (row: string[], name: string) => {
          const index = headers.indexOf(name);
          return index >= 0 ? row[index] || "" : "";
        };

        const products = rows
          .slice(1)
          .map((row) => ({
            active: get(row, "active").toLowerCase() === "true",
            product: get(row, "product"),
            category: get(row, "category"),
            description: get(row, "description"),
            imageUrl: get(row, "image url"),
            amazonUrl: get(row, "amazon affiliate link"),
          }))
          .filter((item) => item.active && item.product && item.amazonUrl);

        setFinds(products);
      })
      .catch((err) => {
        console.error(err);
        setError("I couldn't load the finds right now.");
      });
  }, []);

  return (
    <main className="min-h-screen bg-white px-6 py-12 text-gray-900">
      <div className="mx-auto max-w-5xl">
        <header className="mb-12 text-center">
          <p className="mb-2 text-sm uppercase tracking-[0.25em]">
            KB Curated Co
          </p>

          <h1 className="text-5xl font-semibold">
            Amazon Finds
          </h1>

          <p className="mt-4 text-gray-500">
            Things I&apos;m loving, using &amp; gifting lately.
          </p>
        </header>

        {error && (
          <p className="mb-8 text-center text-red-600">
            {error}
          </p>
        )}

        {finds.length === 0 && !error && (
          <p className="text-center text-gray-500">
            Loading my finds...
          </p>
        )}

        <div className="grid grid-cols-2 gap-6 md:grid-cols-3">
          {finds.map((item) => (
            <article
              key={item.product}
              className="overflow-hidden rounded-2xl border border-gray-200"
            >
              {item.imageUrl && (
                <img
                  src={item.imageUrl}
                  alt={item.product}
                  className="aspect-square w-full object-cover"
                />
              )}

              <div className="p-4">
                {item.category && (
                  <p className="mb-1 text-xs uppercase tracking-wider text-gray-500">
                    {item.category}
                  </p>
                )}

                <h2 className="text-lg font-medium">
                  {item.product}
                </h2>

                {item.description && (
                  <p className="mt-2 text-sm text-gray-500">
                    {item.description}
                  </p>
                )}

                <a
                  href={item.amazonUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-block font-medium underline"
                >
                  Shop on Amazon →
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}