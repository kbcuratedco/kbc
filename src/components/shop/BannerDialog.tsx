import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";
import { BANNER_SIZES, type Product, type BannerSizeId } from "@/lib/products";
import { addToCart } from "@/lib/shop-store";
import { uploadResizedImageFile } from "@/lib/image-utils";

export function BannerDialog({
  product,
  open,
  onOpenChange,
}: {
  product: Product;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [size, setSize] = useState<BannerSizeId>("5ft");
  const [dateNeeded, setDateNeeded] = useState("");
  const [name, setName] = useState("");
  const [theme, setTheme] = useState("");
  const [inspo, setInspo] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const price = BANNER_SIZES.find((s) => s.id === size)!.price;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 4 - inspo.length);
    setUploading(true);
    try {
      const results = await Promise.all(list.map((f) => uploadResizedImageFile(f)));
      setInspo((prev) => [...prev, ...results].slice(0, 4));
    } catch {
      toast.error("Couldn't upload one of those photos. Try a different image.");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    if (!dateNeeded || !name.trim() || !theme.trim()) {
      toast.error("Please fill in the date, name, and theme.");
      return;
    }
    try {
      addToCart({
        productId: product.id,
        title: `${product.title} (${BANNER_SIZES.find((s) => s.id === size)!.label})`,
        image: product.image,
        unitPrice: price,
        quantity: 1,
        category: product.category,
        bannerSize: size,
        bannerDetails: {
          dateNeeded,
          name: name.trim(),
          theme: theme.trim(),
          inspoImages: inspo,
        },
      });
      toast.success("Banner request added to your cart.");
      setDateNeeded("");
      setName("");
      setTheme("");
      setInspo([]);
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add to cart.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-card max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Customize your {product.title}</DialogTitle>
          <DialogDescription>
            Each banner is hand-drawn from scratch. Share the details and any inspo — I'll do the rest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="mb-2 block">Size</Label>
            <RadioGroup value={size} onValueChange={(v) => setSize(v as BannerSizeId)} className="grid grid-cols-3 gap-2">
              {BANNER_SIZES.map((s) => (
                <label
                  key={s.id}
                  htmlFor={`sz-${s.id}`}
                  className={`dashed-frame cursor-pointer p-3 text-center transition ${
                    size === s.id ? "bg-accent/40" : "hover:bg-muted"
                  }`}
                >
                  <RadioGroupItem id={`sz-${s.id}`} value={s.id} className="sr-only" />
                  <div className="font-display text-xl">{s.label}</div>
                  <div className="text-sm text-muted-foreground">${s.price}</div>
                </label>
              ))}
            </RadioGroup>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="date">Date needed</Label>
              <Input id="date" type="date" value={dateNeeded} onChange={(e) => setDateNeeded(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bname">Name on banner</Label>
              <Input id="bname" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="e.g. Benjamin" />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme, colors, vibe</Label>
            <Textarea
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              maxLength={800}
              rows={4}
              placeholder="Tell me about the theme, colors, favorite characters, sports team, or any details to include…"
            />
          </div>

          <div className="space-y-2">
            <Label>Inspiration photos (up to 4)</Label>
            <div className="flex flex-wrap gap-2">
              {inspo.map((src, i) => (
                <div key={i} className="relative">
                  <img src={src} alt="" className="h-20 w-20 rounded-md border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => setInspo((p) => p.filter((_, ix) => ix !== i))}
                    className="absolute -right-2 -top-2 rounded-full bg-foreground/80 p-0.5 text-background"
                    aria-label="Remove image"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {inspo.length < 4 && (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="dashed-frame flex h-20 w-20 flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => onFiles(e.target.files)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Add to cart · ${price}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}