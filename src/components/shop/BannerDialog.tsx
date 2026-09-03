import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
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

const MAX_INSPO_FILE_SIZE = 8 * 1024 * 1024; // 8 MB

function isBusinessDay(date: Date) {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function addBusinessDays(startDate: Date, businessDays: number) {
  const date = new Date(startDate);
  let added = 0;
  while (added < businessDays) {
    date.setDate(date.getDate() + 1);
    if (isBusinessDay(date)) {
      added += 1;
    }
  }
  return date;
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMinSelectableDate() {
  const now = new Date();
  const businessDays = now.getHours() >= 15 ? 4 : 3;
  return formatLocalDate(addBusinessDays(now, businessDays));
}

function parseLocalDate(value: string): Date | null {
  const parts = value.split("-");
  if (parts.length !== 3) return null;
  const [year, month, day] = parts.map((part) => Number(part));
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day)
    return null;
  return date;
}

function isDateAllowed(value: string, minDate: string) {
  const selectedDate = parseLocalDate(value);
  const minSelectableDate = parseLocalDate(minDate);
  return selectedDate !== null && minSelectableDate !== null && selectedDate >= minSelectableDate;
}

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
  const [dateError, setDateError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const minDate = useMemo(() => getMinSelectableDate(), []);
  const helperText = `Choose a delivery date on or after ${minDate}. Weekends are not available.`;

  const price = BANNER_SIZES.find((s) => s.id === size)!.price;

  const onFiles = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 4 - inspo.length);
    const oversized = list.some((file) => file.size > MAX_INSPO_FILE_SIZE);
    if (oversized) {
      toast.error("One or more files are too large. Please keep inspo photos under 8 MB each.");
      return;
    }

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
    if (!isDateAllowed(dateNeeded, minDate)) {
      setDateError(`Date must be on or after ${minDate} and must be a business day.`);
      toast.error(`Please choose a date on or after ${minDate} that is not a weekend.`);
      return;
    }
    setDateError("");
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
          <DialogTitle className="font-display text-2xl">
            Customize your {product.title}
          </DialogTitle>
          <DialogDescription>
            Each banner is hand-drawn from scratch. Share the details and any inspo — I'll do the
            rest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div>
            <Label className="mb-2 block">Size</Label>
            <RadioGroup
              value={size}
              onValueChange={(v) => setSize(v as BannerSizeId)}
              className="grid grid-cols-3 gap-2"
            >
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
              <Input
                id="date"
                type="date"
                value={dateNeeded}
                min={minDate}
                onChange={(e) => {
                  setDateNeeded(e.target.value);
                  if (e.target.value && !isDateAllowed(e.target.value, minDate)) {
                    setDateError(`Date must be on or after ${minDate} and must be a business day.`);
                  } else {
                    setDateError("");
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">{helperText}</p>
              {dateError ? <p className="text-xs text-destructive">{dateError}</p> : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="bname">Name on banner</Label>
              <Input
                id="bname"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                placeholder="e.g. Benjamin"
              />
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
                  <img
                    src={src}
                    alt=""
                    className="h-20 w-20 rounded-md border border-border object-cover"
                  />
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
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleAdd}>Add to cart · ${price}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
