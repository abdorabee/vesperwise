"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DeleteListDialogProps {
  listId: string;
  listName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { error?: string };
    return data.error ?? "Failed to delete the list";
  } catch {
    return "Failed to delete the list";
  }
}

export function DeleteListDialog({ listId, listName, open, onOpenChange }: DeleteListDialogProps) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard/lists/${listId}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res));
      toast.success(`Deleted "${listName}"`);
      onOpenChange(false);
      router.push("/lists");
      router.refresh();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete the list";
      setError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !deleting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete this list?</DialogTitle>
          <DialogDescription>
            &quot;{listName}&quot; will be deleted. Its accounts stay in your scores and watchlist. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete list"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
