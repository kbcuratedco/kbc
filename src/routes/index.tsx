import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Heart, Cloud, LogIn, LogOut, Wrench } from "lucide-react";
import logo from "@/assets/kbc-logo-transparent.png";
import floralCorner from "@/assets/floral-corner.png";
import { CATEGORY_LABELS, type ProductCategory } from "@/lib/products";
import {
  useProducts,
  useAdminStatus,
  useImportFromLocalStorage,
  useClaimAdmin,
  useCleanupDuplicateProducts,
} from "@/lib/product-store";
import { AddProductDialog } from "@/components/shop/AddProductDialog";
import { ProductCard } from "@/components/shop/ProductCard";
import { CartDrawer } from "@/components/shop/CartDrawer";
import { DeletedProductsDialog } from "@/components/shop/DeletedProductsDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminMode } from "@/lib/shop-store";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "KB Curated Co — Handmade Stationery, Banners & Sports Balls" },
      {
        name: "description",
        content:
          "Shop hand-painted stationery, custom banners, and one-of-a-kind sports balls by KB Curated Co. Every piece drawn by hand by Karen B.",
      },
      {
        property: "og:title",
        content: "KB Curated Co — Handmade Stationery, Banners & Sports Balls",
      },
      {
        property: "og:description",
        content:
          "Shop hand-painted stationery, custom banners, and one-of-a-kind sports balls by KB Curated Co. Every piece drawn by hand by Karen B.",
      },
    ],
  }),
  component: Index,
});

const CATEGORIES: ProductCategory[] = ["stationery", "banner", "sports"];

function Index() {
  const [active, setActive] = useState<ProductCategory | "all">("all");
  const [admin, setAdmin] = useAdminMode();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const { data: products = [], isLoading } = useProducts(!admin);
  const { data: adminStatus } = useAdminStatus();
  const isAdmin = !!adminStatus?.isAdmin;
  const importMutation = useImportFromLocalStorage();
  const cleanupMutation = useCleanupDuplicateProducts();
  const claimMutation = useClaimAdmin();
  const [deletedOpen, setDeletedOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast?.success?.("Signed out.");
  };

  const visible = admin ? products : products.filter((p) => p.active !== false);
  const items = active === "all" ? visible : visible.filter((p) => p.category === active);

  const handleImport = () => {
    const raw = window.localStorage.getItem("kb_products_v3");
    const list = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || list.length === 0) {
      toast?.error?.("No saved products found in this browser.");
      return;
    }
    importMutation.mutate(list, {
      onSuccess: (result) => {
        const skipped = (result as { skippedDeleted?: number }).skippedDeleted ?? 0;
        const parts = [`${result.updated} updated`, `${result.imported} added`];
        if (skipped > 0) parts.push(`${skipped} skipped (previously deleted)`);
        toast?.success?.(`Cloud sync done: ${parts.join(", ")}.`);
      },
      onError: (err) => toast?.error?.(err instanceof Error ? err.message : "Import failed"),
    });
  };

  const handleCleanupDuplicates = () => {
    cleanupMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast?.success?.(
          result.deleted > 0
            ? `Deleted ${result.deleted} exact duplicate product${result.deleted === 1 ? "" : "s"}.`
            : "No exact duplicates found.",
        );
      },
      onError: (err) =>
        toast?.error?.(err instanceof Error ? err.message : "Duplicate cleanup failed"),
    });
  };

  return (
    <div className="min-h-screen">
      <Toaster position="top-center" richColors />

      {/* Top strip */}
      <div className="border-b border-border/60 bg-primary/95 text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-xs">
          <Heart className="h-3 w-3" />
          <span className="font-body tracking-wide">
            Every piece is hand-drawn & hand-painted by Karen B — no two are alike.
          </span>
        </div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <a href="#top" className="flex items-center gap-3">
            <img src={logo} alt="KB Curated Co" className="h-14 w-14 object-contain" />
            <div className="hidden sm:block">
              <div className="font-display text-2xl leading-none">KB Curated Co</div>
              <div className="font-smallcaps text-[0.65rem] text-muted-foreground">
                art & maker market
              </div>
            </div>
          </a>

          <nav className="hidden items-center gap-1 md:flex">
            {(["all", ...CATEGORIES] as const).map((c) => (
              <button
                key={c}
                onClick={() => {
                  setActive(c);
                  document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" });
                }}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  active === c
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-muted"
                }`}
              >
                {c === "all" ? "All" : CATEGORY_LABELS[c]}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            {mounted && (
              <div
                className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex"
                title="Owner mode: edits save to your cloud shop"
              >
                <Cloud className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Owner mode</span>
                <Switch checked={admin} onCheckedChange={setAdmin} />
                {admin && !isAdmin && (
                  <>
                    <Link
                      to="/auth"
                      className="ml-1 rounded-full bg-primary px-2.5 py-1 text-primary-foreground hover:bg-primary/90"
                    >
                      <LogIn className="mr-1 inline h-3 w-3" /> Sign in to edit
                    </Link>
                  </>
                )}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-1 h-7 rounded-full px-2.5 text-xs"
                    onClick={handleSignOut}
                  >
                    <LogOut className="mr-1 h-3 w-3" /> Sign out
                  </Button>
                )}
              </div>
            )}
            <CartDrawer />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="top" className="relative overflow-hidden">
        <div className="relative mx-auto flex max-w-4xl flex-col items-center px-6 pb-40 pt-20 text-center md:pb-56 md:pt-28">
          <h1 className="font-display text-6xl leading-[1.05] text-foreground md:text-8xl">
            KB Curated Co
          </h1>
          <p className="mt-6 font-display text-2xl italic text-foreground/80 md:text-3xl">
            Hand-painted details for life's best moments.
          </p>

          <div className="mt-10 h-px w-64 bg-primary/50" aria-hidden="true" />

          {/* Three hand-drawn icons */}
          <div className="mt-10 flex items-center justify-center gap-14 text-primary md:gap-20">
            {/* Writing hand */}
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 md:h-16 md:w-16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 44c4-2 8-1 12 1s7 4 12 3" />
              <path d="M28 42l14-20 6 4-14 20" />
              <path d="M42 22l4-5c1-1 3-1 4 0l2 2c1 1 1 3 0 4l-4 5" />
              <path d="M28 42l-3 6 7-2" />
              <path d="M8 48c2 2 5 3 8 2" />
            </svg>
            {/* Banner flag */}
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 md:h-16 md:w-16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 10v46" />
              <path d="M18 14c8-4 14 4 22 0 3-1 6-1 8 0v18c-2-1-5-1-8 0-8 4-14-4-22 0" />
              <path
                d="M31 18l1.6 3.3 3.6.5-2.6 2.5.6 3.6L31 26.2l-3.2 1.7.6-3.6-2.6-2.5 3.6-.5z"
                fill="currentColor"
                fillOpacity="0.15"
              />
            </svg>
            {/* Baseball */}
            <svg
              viewBox="0 0 64 64"
              className="h-14 w-14 md:h-16 md:w-16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="32" cy="32" r="20" />
              <path d="M17 22c3 3 4 7 4 10s-1 7-4 10" />
              <path d="M47 22c-3 3-4 7-4 10s1 7 4 10" />
              <path d="M20 26l-3-1M20 30l-3-1M20 34l-3 1M20 38l-3 1" />
              <path d="M44 26l3-1M44 30l3-1M44 34l3 1M44 38l3 1" />
            </svg>
          </div>

          <p className="mt-12 max-w-2xl font-display text-xl italic leading-relaxed text-foreground/70 md:text-2xl">
            Shop hand-painted stationery, custom banners, and one-of-a-kind sports balls by KB
            Curated Co. Every piece drawn by hand by Karen B.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              className="rounded-full"
              onClick={() =>
                document.getElementById("shop")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Shop the collection
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full border-primary/40"
              onClick={() =>
                document.getElementById("story")?.scrollIntoView({ behavior: "smooth" })
              }
            >
              Meet the maker
            </Button>
          </div>

          <p className="font-smallcaps mt-6 text-[0.7rem] text-muted-foreground">
            Free shipping over $75 · Free Houston local pickup
          </p>

          {/* Floral corners */}
          <img
            src={floralCorner}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-4 -left-6 w-56 select-none md:-bottom-8 md:-left-10 md:w-80 lg:w-96"
          />
          <img
            src={floralCorner}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-4 -right-6 w-56 -scale-x-100 select-none md:-bottom-8 md:-right-10 md:w-80 lg:w-96"
          />
        </div>
      </section>

      {/* Filter tabs (mobile) */}
      <div className="border-y border-border/60 bg-muted/40 md:hidden">
        <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-3">
          {(["all", ...CATEGORIES] as const).map((c) => (
            <button
              key={c}
              onClick={() => setActive(c)}
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition ${
                active === c
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-foreground"
              }`}
            >
              {c === "all" ? "All" : CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
      </div>

      {/* Shop grid */}
      <section id="shop" className="mx-auto max-w-7xl px-4 py-14">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <span className="font-script text-4xl text-primary">the collection</span>
            <h2 className="font-display text-4xl">
              {active === "all"
                ? "Everything, made by hand"
                : CATEGORY_LABELS[active as ProductCategory]}
            </h2>
          </div>
          {admin && isAdmin && (
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="rounded-full border border-primary/40 bg-accent/40 px-3 py-1 text-xs">
                Owner mode · edits save to the cloud
              </span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="rounded-full border-primary/40">
                    <Wrench className="mr-1 h-3 w-3" /> Recovery tools
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  <DropdownMenuLabel>Advanced</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={() => setDeletedOpen(true)}>
                    Restore deleted products…
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={handleCleanupDuplicates}
                    disabled={cleanupMutation.isPending}
                  >
                    {cleanupMutation.isPending ? "Cleaning duplicates…" : "Clean duplicates"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={() => {
                      if (
                        window.confirm(
                          "Import will only add items you have never deleted. Continue?",
                        )
                      ) {
                        handleImport();
                      }
                    }}
                    disabled={importMutation.isPending}
                  >
                    {importMutation.isPending ? "Importing…" : "Import from this browser"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <AddProductDialog />
            </div>
          )}
        </div>

        <DeletedProductsDialog open={deletedOpen} onOpenChange={setDeletedOpen} />

        {admin && !isAdmin && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-accent/30 p-4 text-sm text-foreground">
            <strong>Owner mode is on, but you&apos;re not signed in.</strong>{" "}
            <Link to="/auth" className="text-primary underline">
              Sign in with orders@kbcuratedco.com
            </Link>{" "}
            to edit products. Shoppers still see the normal shop below.
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">Loading the collection…</div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Story */}
      <section id="story" className="border-t border-border/60 bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 md:grid-cols-[1fr_1.4fr] md:py-24">
          <div className="flex items-center justify-center p-4">
            <img
              src={logo}
              alt="KB Curated Co logo"
              className="mx-auto h-80 w-80 object-contain md:h-96 md:w-96"
            />
          </div>
          <div>
            <span className="font-script text-5xl text-primary">meet the maker</span>
            <h2 className="mt-1 font-display text-4xl leading-tight md:text-5xl">
              Hi, I'm <em className="hand-underline not-italic">Karen B</em> — the artist behind KB
              Curated Co.
            </h2>
            <p className="mt-5 text-lg text-muted-foreground">
              Every piece you see here begins with a pencil sketch and a paintbrush. I love creating
              colorful, personalized artwork that helps families celebrate the people they love.
            </p>
            <p className="mt-4 text-lg text-muted-foreground">
              Whether it's a birthday banner, custom stationery, or a hand-painted sports ball, each
              order is made with care and painted just for you.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 bg-background">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 px-4 py-10 text-center">
          <img src={logo} alt="" className="h-12 w-12" />
          <div className="font-display text-xl">KB Curated Co</div>
          <div className="font-smallcaps text-xs text-muted-foreground">art & maker market</div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Karen. Every piece hand-made with love.
          </p>
        </div>
      </footer>
    </div>
  );
}
