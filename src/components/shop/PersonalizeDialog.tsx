import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { Product } from "@/lib/products";
import { addToCart } from "@/lib/shop-store";
import { Upload, X } from "lucide-react";
import { useRef } from "react";
import { uploadResizedImageFile } from "@/lib/image-utils";

export function PersonalizeDialog({
  product,
  price,
  open,
  onOpenChange,
  mode = "stationery",
}: {
  product: Product;
  price: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode?: "stationery" | "sports";
}) {
  const [name, setName] = useState("");
  const [colorNotes, setColorNotes] = useState("");
  const [inspoImage, setInspoImage] = useState<string>("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const isSports = mode === "sports";

  const onFile = async (f: File | null) => {
    if (!f) return;
    setUploading(true);
    try {
      setInspoImage(await uploadResizedImageFile(f));
    } catch {
      toast.error("Couldn't upload that photo. Try a different image.");
    } finally {
      setUploading(false);
    }
  };

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error(isSports ? "Please add the child's name." : "Please add a name to personalize with.");
      return;
    }
    try {
      addToCart({
      productId: product.id,
      title: product.title,
      image: product.image,
      unitPrice: price,
      quantity: 1,
      category: product.category,
      personalization: isSports
        ? {
            name: name.trim(),
            inspoImage: inspoImage || undefined,
            sportsDetails: { notes: colorNotes.trim() || undefined },
          }
        : {
            name: name.trim(),
            colorNotes: colorNotes.trim() || undefined,
            inspoImage: inspoImage || undefined,
          },
      });
      toast.success(isSports ? `Added — customized for ${name.trim()}` : `Added — personalized for ${name.trim()}`);
      setName("");
      setColorNotes("");
      setInspoImage("");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add to cart.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="paper-card max-h-[92vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isSports ? "Customize" : "Personalize"} {product.title}
          </DialogTitle>
          <DialogDescription>
            {isSports
              ? "Every ball is hand-painted to match your player and team. Tell me the details below."
              : "Every set is hand-lettered. Tell us the name you'd like painted on the cards."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="pname">{isSports ? "Child's name" : "Name to personalize"}</Label>
            <Input
              id="pname"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={isSports ? "e.g. Mateo" : "e.g. Ana Paula"}
              maxLength={40}
            />
            <p className="text-xs text-muted-foreground">
              {isSports ? "I'll paint this exactly as written." : "I'll hand-letter this exactly as written."}
            </p>
          </div>
          {isSports && (
            <div className="space-y-2">
              <Label htmlFor="pcolor">Team details</Label>
              <Textarea
                id="pcolor"
                value={colorNotes}
                onChange={(e) => setColorNotes(e.target.value)}
                maxLength={2000}
                rows={5}
                placeholder="Tell me child's name, team name, mascot, child's number, and team colors."
              />
            </div>
          )}
          {isSports && (
          <div className="space-y-2">
            <Label>Inspiration photo (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {inspoImage ? (
                <div className="relative">
                  <img src={inspoImage} alt="" className="h-24 w-24 rounded-md border border-border object-cover" />
                  <button
                    type="button"
                    onClick={() => setInspoImage("")}
                    className="absolute -right-2 -top-2 rounded-full bg-foreground/80 p-0.5 text-background"
                    aria-label="Remove"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="dashed-frame flex h-24 w-24 flex-col items-center justify-center gap-1 text-xs text-muted-foreground hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAdd}>Add to cart · ${price.toFixed(2)}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
