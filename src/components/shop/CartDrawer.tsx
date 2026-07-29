import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Trash2, Minus, Plus, FileText, Truck, MapPin } from "lucide-react";
import { useCart, removeFromCart, updateCartQty, clearCart } from "@/lib/shop-store";
import { toast } from "sonner";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useServerFn } from "@tanstack/react-start";
import { submitOrderRequest } from "@/lib/order.functions";

const SHIPPING_RATES: Record<string, number> = {
  stationery: 6.95,
  sports: 10,
  banner: 15,
};
const FREE_SHIPPING_THRESHOLD = 75;

export function CartDrawer() {
  const items = useCart();
  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const [requestOpen, setRequestOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [pickup, setPickup] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submit = useServerFn(submitOrderRequest);

  const categoriesInCart = new Set(items.map((i) => i.category).filter(Boolean) as string[]);
  const rawShipping = Array.from(categoriesInCart).reduce(
    (s, cat) => s + (SHIPPING_RATES[cat] ?? 0),
    0,
  );
  const freeByThreshold = total >= FREE_SHIPPING_THRESHOLD;
  const shipping = pickup || freeByThreshold ? 0 : rawShipping;
  const grandTotal = total + shipping;

  const submitRequest = async () => {
    if (!name.trim() || !email.trim()) {
      toast.error("Please add your name and email so I can send your invoice.");
      return;
    }
    setSubmitting(true);
    try {
      await submit({
        data: {
          customerName: name.trim(),
          customerEmail: email.trim(),
          notes: notes.trim() || undefined,
          pickup,
          subtotal: total,
          shipping,
          total: grandTotal,
          items: items.map((i) => ({
            productId: i.productId,
            title: i.title,
            unitPrice: i.unitPrice,
            quantity: i.quantity,
            category: i.category,
            personalization: i.personalization,
            bannerSize: i.bannerSize,
            bannerDetails: i.bannerDetails,
          })),
        },
      });
      toast.success("Request sent! I'll confirm details and email your invoice.");
      clearCart();
      setRequestOpen(false);
      setName("");
      setEmail("");
      setNotes("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong sending your request.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative gap-2 rounded-full border-primary/40 bg-background">
          <ShoppingBag className="h-4 w-4" />
          <span className="font-body">Cart</span>
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-xs font-medium text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="flex w-full flex-col sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display text-2xl">Your basket</SheetTitle>
        </SheetHeader>

        {items.length === 0 ? (
          <div className="mt-16 flex flex-col items-center gap-3 text-center text-muted-foreground">
            <ShoppingBag className="h-10 w-10 opacity-40" />
            <p>Your basket is empty.</p>
            <p className="text-sm">Every piece is hand-painted just for you.</p>
          </div>
        ) : (
          <>
            <div className="mt-4 flex-1 space-y-4 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.key} className="paper-card flex gap-3 p-3">
                  <img src={item.image} alt="" className="h-20 w-20 rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-display text-base leading-tight">{item.title}</div>
                      <button onClick={() => removeFromCart(item.key)} aria-label="Remove">
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                      </button>
                    </div>
                    {item.personalization && (
                      <div className="mt-0.5 space-y-0.5 text-xs text-muted-foreground">
                        <div>
                          {item.category === "sports" ? "Child:" : "Personalized:"}{" "}
                          <span className="font-script text-foreground">{item.personalization.name}</span>
                        </div>
                        {item.category === "sports"
                          ? item.personalization.sportsDetails?.notes && (
                              <div className="line-clamp-3">Details: {item.personalization.sportsDetails.notes}</div>
                            )
                          : item.personalization.colorNotes && (
                              <div className="line-clamp-2">Color: {item.personalization.colorNotes}</div>
                            )}
                        {item.personalization.inspoImage && (
                          <div className="flex items-center gap-1">
                            Inspo:
                            <img
                              src={item.personalization.inspoImage}
                              alt=""
                              className="h-6 w-6 rounded object-cover"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {item.bannerDetails && (
                      <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        For {item.bannerDetails.name} · {item.bannerDetails.dateNeeded}
                      </div>
                    )}
                    <div className="mt-2 flex items-center justify-between">
                      <div className="inline-flex items-center gap-2 rounded-full border border-border px-2 py-0.5">
                        <button aria-label="Decrease" onClick={() => updateCartQty(item.key, item.quantity - 1)}>
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-4 text-center text-sm">{item.quantity}</span>
                        <button aria-label="Increase" onClick={() => updateCartQty(item.key, item.quantity + 1)}>
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="font-medium">${(item.unitPrice * item.quantity).toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 space-y-3 border-t border-border pt-4">
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
                <input
                  type="checkbox"
                  checked={pickup}
                  onChange={(e) => setPickup(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-primary"
                />
                <span className="flex-1">
                  <span className="flex items-center gap-1.5 font-medium text-foreground">
                    <MapPin className="h-3.5 w-3.5" /> Houston local pickup — free
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Skip shipping and grab your order in Houston.
                  </span>
                </span>
              </label>

              <div className="space-y-1 text-sm">
                <div className="flex items-baseline justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>${total.toFixed(2)}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Truck className="h-3 w-3" /> Shipping
                  </span>
                  <span>
                    {pickup ? (
                      <span className="text-secondary-foreground">Pickup</span>
                    ) : freeByThreshold ? (
                      <span className="text-secondary-foreground">Free</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                {!pickup && !freeByThreshold && (
                  <p className="text-xs text-muted-foreground">
                    Add ${(FREE_SHIPPING_THRESHOLD - total).toFixed(2)} more for free shipping.
                  </p>
                )}
                <div className="flex items-baseline justify-between pt-2">
                  <span className="text-muted-foreground">Estimated total</span>
                  <span className="font-display text-2xl">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              <div className="rounded-lg border border-dashed border-primary/40 bg-accent/30 p-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-foreground">
                  <FileText className="h-3.5 w-3.5" /> Invoice-based checkout
                </div>
                <p className="mt-1">
                  Every piece is hand-made to order. Submit your request and I'll confirm the details and email you an invoice for payment.
                </p>
              </div>
              <Button className="w-full" size="lg" onClick={() => setRequestOpen(true)}>
                Request order & invoice
              </Button>
              <button
                onClick={() => clearCart()}
                className="w-full text-center text-xs text-muted-foreground hover:text-foreground"
              >
                Clear basket
              </button>
            </div>
          </>
        )}
      </SheetContent>

      <Dialog open={requestOpen} onOpenChange={setRequestOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Request your order</DialogTitle>
            <DialogDescription>
              I'll review your request, confirm details, and email you an invoice to complete payment. Nothing is charged today.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="req-name">Your name</Label>
              <Input id="req-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-email">Email for invoice</Label>
              <Input id="req-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-notes">Notes (optional)</Label>
              <Textarea id="req-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything else I should know?" rows={3} />
            </div>
            <div className="flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-muted-foreground text-sm">Estimated total</span>
              <span className="font-display text-xl">${grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRequestOpen(false)}>Cancel</Button>
            <Button onClick={submitRequest} disabled={submitting}>
              {submitting ? "Sending…" : "Send request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sheet>
  );
}