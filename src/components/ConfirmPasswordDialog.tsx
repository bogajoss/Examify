"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  onConfirm: (password: string) => Promise<void> | void;
}

export default function ConfirmPasswordDialog({
  open,
  onOpenChange,
  title = "অ্যাডমিন পদক্ষেপ নিশ্চিত করুন",
  description,
  confirmLabel = "নিশ্চিত করুন",
  onConfirm,
}: Props) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm(password);
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : (
            <DialogDescription>
              আপনি কি এই কাজটি করতে নিশ্চিত?
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            বাতিল
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "প্রক্রিয়াকরণ হচ্ছে..." : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
