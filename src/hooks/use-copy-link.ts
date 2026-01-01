"use client";

import { useToast } from "@/hooks/use-toast";

export function useCopyLink() {
  const { toast } = useToast();

  const copy = (
    text: string,
    message: string = "Link clipboard-e copy kora hoyeche.",
    title: string = "Copied",
  ) => {
    navigator.clipboard.writeText(text);
    toast({
      title: title,
      description: message,
    });
  };

  return { copy };
}
