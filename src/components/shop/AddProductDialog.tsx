import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Upload, X } from "lucide-react";
import { useAddProduct } from "@/lib/product-store";
import type { ProductCategory } from "@/lib/products";
import { toast } from "sonner";

const CATS: { id: ProductCategory; label: string }[] = [
  { id: "stationery", label: "Stationery" },
  { id: "banner", label: "Banners" },
  { id: "sports", label: "Sports" },
];

export function AddProductDialog() {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("25");
  const [category, setCategory] = useState<ProductCategory>("stationery");
  const [images, setImages] = useState<string[]>([]);
  const add = useAddProduct();

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
    setImages((prev) => [...prev, ...results].slice(0, 6));
  };

  const submit = () => {
    if (!title || images.length === 0) {
      toast.error("Please add a title and at least one photo");
      return;
    }
    add.mutate(
      {
        title,
        description,
        price: parseFloat(price) || 0,
        category,
        images,
        active: true,
        freeShipping: true,
        digital: false,
        sortOrder: 0,
      },
      {
        onSuccess: () => {
          toast.success("Product added");
          setOpen(false);
          setTitle("");
          setDescription("");
          setPrice("25");
          setImages([]);
        },
        onError: (err) => toast.error(err instanceof Error ? err.message : "Failed to add product"),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="rounded-full border-primary/40">
          <Plus className="mr-1 h-4 w-4" /> Add product
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Add a new product</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>Photos (up to 6 — first is the primary)</Label>
            <div className="flex flex-wrap gap-2">
              {images.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
                  {i === 0 && (
                    <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                      Main
                    </span>
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
                  Upload
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
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
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
          <Button className="w-full" onClick={submit} disabled={add.isPending}>
            {add.isPending ? "Adding…" : "Add to shop"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
