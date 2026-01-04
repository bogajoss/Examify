"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import ConfirmPasswordDialog from "@/components/ConfirmPasswordDialog";
import { useAdminAuth } from "@/context/AdminAuthContext";
import type { Batch } from "@/lib/types";
import { getAllBatches } from "@/lib/users-supabase";
import {
  createBatch,
  deleteBatch,
  importBatchData,
} from "@/lib/actions";
import { EditBatchModal } from "@/components/EditBatchModal";
import { UniversalDetailsCard } from "@/components/UniversalDetailsCard";
import { CustomLoader } from "@/components";
import {
  Upload,
  Pencil,
  Trash2,
  Users,
  FileText,
  Copy,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";
import { useCopyLink } from "@/hooks/use-copy-link";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface BatchWithCount extends Batch {
  student_count?: number;
  exam_count?: number;
}

export function BatchesClient({
  initialBatches,
}: {
  initialBatches: BatchWithCount[];
}) {
  const queryClient = useQueryClient();
  const { admin } = useAdminAuth();
  const { toast } = useToast();
  const { copy } = useCopyLink();

  const [status, setStatus] = useState("live");
  const [isPublic, setIsPublic] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [pendingBatchToDelete, setPendingBatchToDelete] = useState<
    string | null
  >(null);
  const [isPasswordOpen, setIsPasswordOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Queries
  const { data: batches = initialBatches, isLoading: loadingBatches } =
    useQuery({
      queryKey: ["admin", "batches"],
      queryFn: async () => {
        return (await getAllBatches()) as BatchWithCount[];
      },
      placeholderData: initialBatches,
    });

  // Mutations
  const createBatchMutation = useMutation({
    mutationFn: createBatch,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "batches"] });
      toast({ title: "ব্যাচ যুক্ত হয়েছে" });
      formRef.current?.reset();
      setIsPublic(false);
      setStatus("live");
      clearImage();
    },
    onError: (err: Error) => {
      toast({
        title: "ব্যাচ যোগ করতে সমস্যা হয়েছে",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const deleteBatchMutation = useMutation({
    mutationFn: async (password: string) => {
      if (!pendingBatchToDelete) return;
      const formData = new FormData();
      formData.append("id", pendingBatchToDelete);
      formData.append("password", password);
      formData.append("admin_uid", admin?.uid || "");
      const result = await deleteBatch(formData);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "batches"] });
      toast({ title: "ব্যাচ মুছে গেছে" });
      setIsPasswordOpen(false);
      setPendingBatchToDelete(null);
    },
    onError: (err: Error) => {
      toast({
        title: "মুছে ফেলতে ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const importBatchMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("adminPassword", importPassword);
      formData.append("adminUid", admin?.uid || "");
      const result = await importBatchData(formData);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "batches"] });
      toast({ title: "ইমপোর্ট সফল", description: result.message });
      setIsImportDialogOpen(false);
      setImportPassword("");
    },
    onError: (err: Error) => {
      toast({
        title: "ইমপোর্ট ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "শুধুমাত্র ছবি ফাইল আপলোড করুন", variant: "destructive" });
      return;
    }
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
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDeleteBatch = (batchId: string) => {
    setPendingBatchToDelete(batchId);
    setIsPasswordOpen(true);
  };

  const handleEditBatch = (batch: Batch) => {
    setEditingBatch(batch);
    setIsEditModalOpen(true);
  };

  const handleCopyLink = (batchId: string) => {
    const batchUrl = `${window.location.origin}/batches/${batchId}`;
    copy(batchUrl, "ব্যাচ লিঙ্ক কপি করা হয়েছে।");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    if (isPublic) formData.set("is_public", "true");
    if (imageBase64) formData.set("icon_url", imageBase64);
    createBatchMutation.mutate(formData);
  };

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      <Card className={loadingBatches ? "opacity-60" : ""}>
        <CardHeader>
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2">
            <div>
              <CardTitle>ব্যাচ পরিচালনা</CardTitle>
              <CardDescription>
                নতুন ব্যাচ তৈরি করুন এবং বিদ্যমান ব্যাচ পরিচালনা করুন।
              </CardDescription>
            </div>
            <Dialog
              open={isImportDialogOpen}
              onOpenChange={setIsImportDialogOpen}
            >
              <DialogTrigger asChild>
                <Button size="sm" variant="outline" className="gap-1">
                  <Upload className="h-3.5 w-3.5" />
                  <span className="whitespace-nowrap">ইমপোর্ট ব্যাচ</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>ব্যাচ ডেটা ইমপোর্ট করুন</DialogTitle>
                  <DialogDescription>
                    পূর্ববর্তী এক্সপোর্টকৃত ব্যাচ JSON ফাইল নির্বাচন করুন। এটি
                    নতুন ব্যাচ হিসেবে তৈরি হবে।
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="import-file">JSON ফাইল</Label>
                    <Input
                      id="import-file"
                      type="file"
                      accept=".json"
                      disabled={importBatchMutation.isPending}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsImportDialogOpen(false)}
                    disabled={importBatchMutation.isPending}
                  >
                    বাতিল করুন
                  </Button>
                  <Button
                    onClick={() => {
                      const fileInput = document.getElementById(
                        "import-file",
                      ) as HTMLInputElement;
                      const file = fileInput?.files?.[0];
                      if (!file) {
                        toast({
                          variant: "destructive",
                          title: "ফাইল বেছে নিন",
                        });
                        return;
                      }
                      importBatchMutation.mutate(file);
                    }}
                    disabled={importBatchMutation.isPending}
                  >
                    {importBatchMutation.isPending ? (
                      <>
                        <CustomLoader minimal />
                        ইমপোর্ট হচ্ছে...
                      </>
                    ) : (
                      "ইমপোর্ট করুন"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-3 md:p-6">
          <form
            ref={formRef}
            onSubmit={handleSubmit}
            className="space-y-4 mb-8 border p-4 rounded-xl bg-muted/5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-4">
              <div className="space-y-2">
                <Label htmlFor="batch-name">ব্যাচের নাম</Label>
                <Input
                  id="batch-name"
                  type="text"
                  name="name"
                  placeholder="ব্যাচের নাম"
                  disabled={createBatchMutation.isPending}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-desc">ব্যাচের বিবরণ</Label>
                <Input
                  id="batch-desc"
                  type="text"
                  name="description"
                  placeholder="ব্যাচের বিবরণ"
                  disabled={createBatchMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="batch-icon">ব্যাচ ছবি (ঐচ্ছিক)</Label>
                <div className="space-y-3">
                  <Input
                    ref={fileInputRef}
                    id="batch-icon"
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    disabled={createBatchMutation.isPending}
                    className="cursor-pointer"
                  />
                  {imagePreview && (
                    <div className="space-y-2">
                      <div className="relative w-24 h-24">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          fill
                          className="object-cover rounded-lg border"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={clearImage}
                        disabled={createBatchMutation.isPending}
                      >
                        ছবি সরান
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>ব্যাচের স্ট্যাটাস</Label>
                <Select
                  value={status}
                  onValueChange={setStatus}
                  disabled={createBatchMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="স্ট্যাটাস নির্বাচন করুন" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="live">লাইভ</SelectItem>
                    <SelectItem value="end">শেষ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-2">
                <Checkbox
                  id="is_public_create"
                  checked={isPublic}
                  onCheckedChange={(checked) => setIsPublic(checked as boolean)}
                  disabled={createBatchMutation.isPending}
                />
                <Label
                  htmlFor="is_public_create"
                  className="text-sm cursor-pointer"
                >
                  পাবলিক ব্যাচ
                </Label>
              </div>
            </div>
            <Button
              type="submit"
              disabled={createBatchMutation.isPending}
              className="w-full md:w-auto"
            >
              {createBatchMutation.isPending ? (
                <>
                  <CustomLoader minimal />
                  যোগ করা হচ্ছে...
                </>
              ) : (
                "নতুন ব্যাচ তৈরি করুন"
              )}
            </Button>
          </form>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {batches.map((batch) => (
              <UniversalDetailsCard
                key={batch.id}
                title={batch.name}
                subtitle={
                  batch.description
                    ? batch.description.substring(0, 60) +
                      (batch.description.length > 60 ? "..." : "")
                    : "No description"
                }
                imageSrc={batch.icon_url}
                badges={
                  <>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        batch.status === "live"
                          ? "bg-green-500/20 text-green-700"
                          : "bg-gray-500/20 text-gray-700"
                      }`}
                    >
                      {batch.status === "live" ? "লাইভ" : "শেষ"}
                    </span>
                    {batch.is_public && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary">
                        পাবলিক
                      </span>
                    )}
                    {batch.student_count !== undefined && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {batch.student_count}
                      </span>
                    )}
                    {batch.exam_count !== undefined && (
                      <span className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-muted text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        {batch.exam_count}
                      </span>
                    )}
                  </>
                }
                info={[
                  {
                    label: "তৈরি হয়েছে:",
                    value: formatDate(batch.created_at, "DD/MM/YYYY"),
                  },
                ]}
                actions={
                  <div className="flex flex-col gap-2 w-full">
                    <div className="grid grid-cols-3 gap-2 w-full">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleCopyLink(batch.id)}
                        className="w-full text-[10px] md:text-xs px-1"
                      >
                        <Copy className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        লিঙ্ক কপি
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleEditBatch(batch)}
                        className="w-full text-[10px] md:text-xs px-1"
                      >
                        <Pencil className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        এডিট
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteBatch(batch.id)}
                        className="w-full text-[10px] md:text-xs px-1"
                      >
                        <Trash2 className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        মুছুন
                      </Button>
                    </div>
                    <Link
                      href={`/admin/batches/${batch.id}`}
                      className="w-full"
                    >
                      <button className="inline-flex items-center justify-center shadow-sm font-medium rounded-lg text-sm px-5 py-2.5 focus:outline-none transition-all duration-200 w-full text-neutral-50 dark:text-neutral-950 bg-neutral-900 dark:bg-neutral-50 border border-neutral-900 dark:border-neutral-50 hover:bg-neutral-800 dark:hover:bg-neutral-100 focus:ring-4 focus:ring-neutral-300 dark:focus:ring-neutral-600">
                        বিস্তারিত দেখুন
                        <svg
                          className="w-4 h-4 ms-2 rtl:rotate-180"
                          aria-hidden="true"
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <path
                            stroke="currentColor"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M19 12H5m14 0-4 4m4-4-4-4"
                          />
                        </svg>
                      </button>
                    </Link>
                  </div>
                }
              />
            ))}
          </div>
        </CardContent>
      </Card>
      <hr className="h-8 border-transparent" />
      <ConfirmPasswordDialog
        open={isPasswordOpen}
        onOpenChange={(open) => {
          setIsPasswordOpen(open);
          if (!open) setPendingBatchToDelete(null);
        }}
        title="ব্যাচ মুছে ফেলার নিশ্চিতকরণ"
        description={
          pendingBatchToDelete
            ? "আপনি এই ব্যাচটি মুছে ফেলতে যাচ্ছেন — এটি সব পরীক্ষা এবং সম্পর্কিত তথ্য মুছে ফেলবে। আপনি কি নিশ্চিত?"
            : undefined
        }
        confirmLabel="মুছে ফেলুন"
        onConfirm={(pass) => deleteBatchMutation.mutate(pass)}
      />
      <EditBatchModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBatch(null);
        }}
        batch={editingBatch}
        onSuccess={async () => {
          queryClient.invalidateQueries({ queryKey: ["admin", "batches"] });
        }}
      />
    </div>
  );
}
