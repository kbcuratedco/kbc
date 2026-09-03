import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useDeletedProducts, useRestoreDeletedProduct } from "@/lib/product-store";
import { toast } from "sonner";
import { RotateCcw } from "lucide-react";

export function DeletedProductsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data = [], isLoading } = useDeletedProducts(open);
  const restore = useRestoreDeletedProduct();

  const onRestore = (id: string, title: string) => {
    restore.mutate(id, {
      onSuccess: () => toast.success(`“${title}” can be added or imported again.`),
      onError: (err) => toast.error(err instanceof Error ? err.message : "Restore failed"),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">Restore deleted products</DialogTitle>
          <DialogDescription>
            These titles are blocked from importing so they don't come back by mistake. Restore one
            to allow it again — it won't reappear on its own, you can then re-add or re-import it.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Loading…</div>
        ) : data.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">Nothing deleted yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {data.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">{row.title}</div>
                  <div className="text-xs text-muted-foreground">{row.category}</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  disabled={restore.isPending}
                  onClick={() => onRestore(row.id, row.title)}
                >
                  <RotateCcw className="mr-1 h-3 w-3" /> Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
