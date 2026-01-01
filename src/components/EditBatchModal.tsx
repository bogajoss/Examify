"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Batch } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { updateBatch } from "@/lib/actions";
import { CustomLoader } from "@/components";

interface EditBatchModalProps {
  batch: Batch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => Promise<void>;
}

export function EditBatchModal({
  batch,
  isOpen,
  onClose,
  onSuccess,
}: EditBatchModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPublic, setIsPublic] = useState(batch?.is_public || false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (batch) {
      formRef.current?.reset();
      setIsPublic(batch.is_public || false);
      // If batch has an icon_url, show preview
      if (batch.icon_url) {
        setImagePreview(batch.icon_url);
        if (batch.icon_url.startsWith("data:image")) {
          setImageBase64(batch.icon_url);
        } else {
          setImageBase64(null); // It's a remote URL, not a new upload
        }
      } else {
        setImagePreview(null);
        setImageBase64(null);
      }
    }
  }, [batch]);

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "শুধুমাত্র ছবি ফাইল আপলোড করুন",
        variant: "destructive",
      });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64String = event.target?.result as string;
      setImagePreview(base64String);
      setImageBase64(base64String);
    };
    reader.readAsDataURL(file);
  };

  const clearImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    if (batch?.id) {
      formData.append("id", batch.id);
    }
    if (imageBase64) {
      formData.set("icon_url", imageBase64);
    }

    const result = await updateBatch(formData);
    if (result.success) {
      toast({ title: "ব্যাচ সফলভাবে আপডেট করা হয়েছে!" });
      if (onSuccess) {
        await onSuccess();
      }
      onClose();
    } else {
      toast({
        title: "ব্যাচ আপডেট করতে সমস্যা হয়েছে",
        description: result.message,
        variant: "destructive",
      });
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-h-[90vh] w-[95vw] rounded-2xl md:max-w-lg p-4 md:p-6 overflow-y-auto flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle>কোর্স সম্পাদন করুন</DialogTitle>
          <DialogDescription>নিচে কোর্সের বিবরণ আপডেট করুন।</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-4 pt-2 pb-1"
          >
            <div className="space-y-2">
              <Label htmlFor="batch-name">কোর্সের নাম</Label>
              <Input
                id="batch-name"
                type="text"
                name="name"
                defaultValue={batch?.name || ""}
                placeholder="কোর্সের নাম"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-description">কোর্সের বিবরণ</Label>
              <Textarea
                id="batch-description"
                name="description"
                defaultValue={batch?.description || ""}
                placeholder="কোর্সের বিবরণ"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="batch-image">কভার ছবি (ঐচ্ছিক)</Label>
              <div className="space-y-3">
                <Input
                  ref={fileInputRef}
                  id="batch-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  disabled={isSubmitting}
                  className="cursor-pointer"
                />
                {imagePreview && (
                  <div className="space-y-2">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={clearImage}
                      disabled={isSubmitting}
                    >
                      ছবি সরান
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="is_public"
                name="is_public"
                checked={isPublic}
                onCheckedChange={setIsPublic}
              />
              <Label htmlFor="is_public">পাবলিক কোর্স</Label>
            </div>
            <input
              type="hidden"
              name="is_public_hidden"
              value={isPublic ? "true" : "false"}
            />
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting ? <CustomLoader minimal /> : "কোর্স আপডেট করুন"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
