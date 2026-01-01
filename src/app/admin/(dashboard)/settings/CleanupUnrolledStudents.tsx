"use client";

import { useState } from "react";
import { Trash2, Loader2, Sparkles } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cleanupUnrolledStudents } from "@/lib/actions";
import { useToast } from "@/hooks/use-toast";

export function CleanupUnrolledStudents() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setIsLoading(true);
    try {
      const result = await cleanupUnrolledStudents();

      if (result.success) {
        toast({
          title: "সফল হয়েছে",
          description:
            result.message || "অব্যবহৃত অ্যাকাউন্টগুলো মুছে ফেলা হয়েছে।",
        });
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ত্রুটি",
        description:
          (error as Error).message || "অ্যাকাউন্টগুলো মুছে ফেলতে সমস্যা হয়েছে।",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-destructive/20 hover:border-destructive/50 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            অব্যবহৃত অ্যাকাউন্ট পরিষ্কার করুন
            <Sparkles className="h-3 w-3 text-yellow-500 fill-yellow-500" />
          </CardTitle>
          <CardDescription className="text-xs">
            যারা কোনো কোর্সে ভর্তি নেই তাদের অ্যাকাউন্ট মুছে ফেলুন।
          </CardDescription>
        </div>
        <Trash2 className="h-4 w-4 text-destructive" />
      </CardHeader>
      <CardContent className="pt-4">
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  পরিষ্কার হচ্ছে...
                </>
              ) : (
                "এখনই পরিষ্কার করুন"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
              <AlertDialogDescription>
                এই প্রক্রিয়াটি ঐ সকল শিক্ষার্থী অ্যাকাউন্টগুলো মুছে ফেলবে যারা
                বর্তমানে কোনো ব্যাচে ভর্তি নেই। এই কাজটি ফিরিয়ে নেওয়া যাবে না।
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>বাতিল</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCleanup}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                হ্যাঁ, মুছে ফেলুন
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
