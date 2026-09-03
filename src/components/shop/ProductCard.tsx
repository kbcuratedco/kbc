import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, X, Sparkles, Trash2, Eye, EyeOff, Settings2, Loader2 } from "lucide-react";
import { useAdminMode, addToCart } from "@/lib/shop-store";
import { useToggleProductActive, useRemoveProduct, useUpdateProduct, type StoredProduct } from "@/lib/product-store";
import { PersonalizeDialog } from "./PersonalizeDialog";
import { BannerDialog } from "./BannerDialog";
import { EditProductDialog } from "./EditProductDialog";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function ProductCard({ product }: { product: StoredProduct }) {
  const [admin] = useAdminMode();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(product.price));
  const [personOpen, setPersonOpen] = useState(false);
  const [personMode, setPersonMode] = useState<"stationery" | "sports">("stationery");
  const [bannerOpen, setBannerOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const toggleActive = useToggleProductActive();
  const remove = useRemoveProduct();
  const update = useUpdateProduct();

  const images = product.images && product.images.length > 0 ? product.images : [product.image];
  const [imgIdx, setImgIdx] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (images.length < 2 || paused) return;
    const t = setInterval(() => setImgIdx((i) => (i + 1) % images.length), 3000);
    return () => clearInterval(t);
  }, [images.length, paused]);

  useEffect(() => {
    if (imgIdx >= images.length) setImgIdx(0);
  }, [images.length, imgIdx]);

  const savePrice = () => {
    const n = parseFloat(draft);
    if (!Number.isFinite(n) || n < 0) {
      setEditing(false);
      return;
    }
    update.mutate(
      { id: product.id, price: n },
      {
        onSuccess: () => {
          toast.success("Price saved to shop");
          setEditing(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save price"),
      },
    );
  };

const isCustomBanner =
  product.category === "banner" &&
  !product.title.toLowerCase().includes("bundle");

const displayPrice =
  isCustomBanner ? `from $${product.price.toFixed(0)}` : `$${product.price.toFixed(2)}`;
  const handlePrimary = () => {
    if (product.category === "stationery" && !product.digital) {
      setPersonMode("stationery");
      setPersonOpen(true);
    } else if (product.category === "sports") {
      setPersonMode("sports");
      setPersonOpen(true);
} else if (isCustomBanner) {
  setBannerOpen(true);
} else {
      addToCart({
        productId: product.id,
        title: product.title,
        image: images[0],
        unitPrice: product.price,
        quantity: 1,
        category: product.category,
      });
      toast.success("Added to your basket");
    }
  };

  const deleteProduct = () => {
    remove.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          toast.success("Product deleted from the shop");
          setDeleteOpen(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete product"),
      },
    );
  };

  const cta =
    (product.category === "stationery" && !product.digital) || product.category === "sports"
      ? "Personalize"
    : isCustomBanner
      ? "Customize"
      : "Add to basket";

  return (
    <article
      className={`paper-card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-xl ${
        product.active === false ? "opacity-60" : ""
      }`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {images.map((src, i) => (
          <img
            key={i}
            src={src}
            alt={product.title}
            loading="lazy"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 group-hover:scale-105 ${
              i === imgIdx ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}
        {images.length > 1 && (
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setImgIdx(i)}
                aria-label={`Show photo ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === imgIdx ? "w-5 bg-primary" : "w-1.5 bg-background/80"
                }`}
              />
            ))}
          </div>
        )}
        {product.digital && (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground shadow">
            <Sparkles className="h-3 w-3" /> Digital
          </span>
        )}
        {admin && (
          <div className="absolute right-2 top-2 z-10 flex flex-col gap-1">
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() => setEditOpen(true)}
              className="h-8 w-8 rounded-full bg-background/90 shadow hover:bg-background"
              aria-label="Edit product"
              title="Edit product"
            >
              <Settings2 className="h-4 w-4 text-primary" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="secondary"
              onClick={() =>
                toggleActive.mutate(
                  { id: product.id, active: product.active === false },
                  {
                    onSuccess: () => toast.success(product.active === false ? "Activated" : "Deactivated"),
                    onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to update"),
                  },
                )
              }
              disabled={toggleActive.isPending}
              className="h-8 w-8 rounded-full bg-background/90 shadow hover:bg-background disabled:opacity-50"
              aria-label="Toggle active"
              title={product.active === false ? "Activate" : "Deactivate"}
            >
              {product.active === false ? (
                <EyeOff className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Eye className="h-4 w-4 text-primary" />
              )}
            </Button>
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  size="icon"
                  variant="secondary"
                  disabled={remove.isPending}
                  className="h-8 w-8 rounded-full bg-background/90 shadow hover:bg-background disabled:opacity-50"
                  aria-label="Delete product"
                  title="Delete product"
                >
                  {remove.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this product?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes “{product.title}” from your shop for everyone. Use deactivate instead if you may want it back later.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={(event) => {
                      event.preventDefault();
                      deleteProduct();
                    }}
                    disabled={remove.isPending}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {remove.isPending ? "Deleting…" : "Delete forever"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
        {product.active === false && (
          <span className="absolute bottom-3 left-3 rounded-full bg-foreground/80 px-2.5 py-1 text-xs font-medium text-background">
            Inactive
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-5">
        {admin && (
          <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="rounded-full border border-border bg-muted px-2 py-1">Owner item</span>
            <span className="truncate">ID: {product.id.slice(0, 8)}</span>
          </div>
        )}
        <div>
          <h3 className="font-display text-xl leading-tight">{product.title}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{product.description}</p>
          {product.category === "sports" && (
            <p className="mt-2 text-xs font-medium text-primary">
              Team order? DM{" "}
              <a
                href="https://instagram.com/kbcuratedco"
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                @kbcuratedco
              </a>{" "}
              on Instagram for team pricing!
            </p>
          )}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-2">
          <div>
            {editing ? (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">$</span>
                <Input
                  className="h-8 w-20"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  inputMode="decimal"
                />
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={savePrice}
                  disabled={update.isPending}
                  aria-label="Save price"
                >
                  {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditing(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="font-display text-2xl text-foreground">{displayPrice}</span>
                {admin && (
                  <button
                    onClick={() => {
                      setDraft(String(product.price));
                      setEditing(true);
                    }}
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Edit price"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            )}
          </div>
          <Button onClick={handlePrimary} className="rounded-full">
            {cta}
          </Button>
        </div>
      </div>

      {(product.category === "stationery" && !product.digital) || product.category === "sports" ? (
        <PersonalizeDialog
          product={product}
          price={product.price}
          open={personOpen}
          onOpenChange={setPersonOpen}
          mode={personMode}
        />
      ) : null}
      {isCustomBanner && (
        <BannerDialog product={product} open={bannerOpen} onOpenChange={setBannerOpen} />
      )}
      {admin && <EditProductDialog product={product} open={editOpen} onOpenChange={setEditOpen} />}
    </article>
  );
}