import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Upload, X, ArrowUp, Trash2 } from "lucide-react";
import { useRemoveProduct, useUpdateProduct, type StoredProduct } from "@/lib/product-store";
import type { ProductCategory } from "@/lib/products";
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

const CATS: { id: ProductCategory; label: string }[] = [
  { id: "stationery", label: "Stationery" },
  { id: "banner", label: "Banners" },
  { id: "sports", label: "Sports" },
];

export function EditProductDialog({
  product,
  open,
  onOpenChange,
}: {
  product: StoredProduct;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description);
  const [price, setPrice] = useState(String(product.price));
  const [category, setCategory] = useState<ProductCategory>(product.category);
  const [images, setImages] = useState<string[]>(product.images ?? [product.image]);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const update = useUpdateProduct();
  const remove = useRemoveProduct();

  useEffect(() => {
    if (open) {
      setTitle(product.title);
      setDescription(product.description);
      setPrice(String(product.price));
      setCategory(product.category);
      setImages(product.images ?? [product.image]);
    }
  }, [open, product]);

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 6 - images.length);
    const results = await Promise.all(
      list.map(
        (f) =>
          new Promise<string>((resolve) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.readAsDataURL(f);
          }),
      ),
    );
    setImages((p) => [...p, ...results].slice(0, 6));
  };

  const makePrimary = (i: number) => {
    if (i === 0) return;
    setImages((p) => {
      const copy = [...p];
      const [item] = copy.splice(i, 1);
      copy.unshift(item);
      return copy;
    });
  };

  const save = () => {
    if (!title.trim() || images.length === 0) {
      toast.error("Title and at least one photo required");
      return;
    }
    update.mutate(
      {
        id: product.id,
        title: title.trim(),
        description,
        price: parseFloat(price) || 0,
        category,
        images,
      },
      {
        onSuccess: () => {
          toast.success("Saved");
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to save"),
      },
    );
  };

  const deleteProduct = () => {
    remove.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          toast.success("Product deleted from the shop");
          setDeleteOpen(false);
          onOpenChange(false);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to delete product"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Edit product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Photos (up to 6 — first is the primary)</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
                  {i === 0 ? (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                      Main
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => makePrimary(i)}
                      className="absolute bottom-1 left-1 rounded-full bg-background/90 p-0.5 shadow"
                      aria-label="Make primary"
                      title="Make primary"
                    >
                      <ArrowUp className="h-3 w-3" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, ix) => ix !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-foreground/80 p-0.5 text-background"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {images.length < 6 && (
                <label className="dashed-frame flex h-20 w-20 cursor-pointer flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted">
                  <Upload className="h-4 w-4 text-primary" />
                  Add
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onFiles(e.target.files)}
                  />
                </label>
              )}
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label>Price ($)</Label>
              <Input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" />
            </div>
            <div className="grid gap-2">
              <Label>Category</Label>
              <div className="flex flex-wrap gap-1">
                {CATS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategory(c.id)}
                    className={`rounded-full px-3 py-1 text-xs ${
                      category === c.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-between">
            <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" disabled={remove.isPending}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete product
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
            <Button className="w-full sm:w-auto" onClick={save} disabled={update.isPending || remove.isPending}>
              {update.isPending ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
