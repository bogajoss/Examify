"use client";

import { useState, useEffect } from "react";
import { CustomLoader, CSVUploadComponent, EmptyState } from "@/components";
import { supabase } from "@/lib/supabase";
import { deleteFileAction, renameFileAction } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Trash2,
  FileText,
  Search,
  Upload,
  Eye,
  Calendar,
  Pencil,
} from "lucide-react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { useDebounce } from "use-debounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/date-utils";

interface FileRecord {
  id: string;
  original_filename: string;
  display_name: string;
  uploaded_at: string;
  total_questions: number;
}

export default function AdminFilesPage() {
  const { admin } = useAdminAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 500);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Rename states
  const [renamingFile, setRenamingFile] = useState<FileRecord | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    fetchFiles();
  }, [debouncedSearchTerm]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("files")
        .select("*")
        .order("uploaded_at", { ascending: false });

      if (debouncedSearchTerm) {
        query = query.or(
          `display_name.ilike.%${debouncedSearchTerm}%,original_filename.ilike.%${debouncedSearchTerm}%`,
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Failed to fetch files:", error);
      } else {
        setFiles((data as FileRecord[]) || []);
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredFiles = files; // Server-side filtered now

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (
      !confirm(
        "Are you sure you want to delete this file and all its questions?",
      )
    )
      return;

    try {
      const result = await deleteFileAction(fileId);
      if (result.success) {
        fetchFiles();
      } else {
        alert(result.message || "Failed to delete file");
      }
    } catch {
      alert("Error deleting file");
    }
  };

  const handleRenameClick = (file: FileRecord) => {
    setRenamingFile(file);
    setNewName(file.display_name || file.original_filename);
  };

  const submitRename = async () => {
    if (!renamingFile) return;
    try {
      const result = await renameFileAction(renamingFile.id, newName);
      if (result.success) {
        setRenamingFile(null);
        fetchFiles();
      } else {
        alert(result.message || "Failed to rename");
      }
    } catch {
      alert("Error renaming file");
    }
  };

  if (!admin) {
    return (
      <div className="container mx-auto p-1 md:p-2 lg:p-4">
        <Card>
          <CardContent className="p-8 text-center">
            Please log in as admin.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>প্রশ্ন ব্যাংক (Question Bank)</CardTitle>
          <CardDescription>
            আপনার আপলোড করা সমস্ত প্রশ্নপত্রের ফাইল এখানে দেখুন এবং ফাইল ম্যানেজ
            করুন
          </CardDescription>
        </CardHeader>
        <CardContent className="p-2 md:p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-2 md:gap-4 items-center justify-between">
            <div className="relative w-full md:w-1/2">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ফাইল বা বিষয়ের নাম দিয়ে খুঁজুন..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
              <DialogTrigger asChild>
                <Button className="w-full md:w-auto gap-2">
                  <Upload className="h-4 w-4" />
                  নতুন ফাইল আপলোড
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md w-[95vw]">
                <DialogHeader>
                  <DialogTitle>CSV আপলোড করুন</DialogTitle>
                  <DialogDescription>
                    আপনার প্রশ্নের ফাইলটি (CSV ফরম্যাটে) নির্বাচন করুন।
                  </DialogDescription>
                </DialogHeader>
                <CSVUploadComponent
                  isBank={true}
                  onUploadSuccess={() => {
                    fetchFiles();
                    setIsUploadOpen(false);
                  }}
                />
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <CustomLoader />
            </div>
          ) : filteredFiles.length === 0 ? (
            <EmptyState
              title="কোনো ফাইল পাওয়া যায়নি"
              description={
                searchTerm
                  ? "অন্য কোনো নাম দিয়ে চেষ্টা করুন"
                  : "নতুন একটি ফাইল আপলোড করে শুরু করুন"
              }
              icon={<FileText className="h-16 w-16 text-muted-foreground/20" />}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
              {filteredFiles.map((file) => (
                <Card
                  key={file.id}
                  className="overflow-hidden flex flex-col justify-between"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <CardTitle
                          className="text-base line-clamp-1"
                          title={file.display_name || file.original_filename}
                        >
                          {file.display_name || file.original_filename}
                        </CardTitle>
                        <div className="flex items-center text-xs text-muted-foreground">
                          <Calendar className="mr-1 h-3 w-3" />
                          {formatDate(file.uploaded_at, "DD/MM/YYYY")}
                        </div>
                      </div>
                      <div className="bg-primary/10 p-2 rounded-full">
                        <FileText className="h-4 w-4 text-primary" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pb-2">
                    <Badge variant="secondary" className="font-normal">
                      {file.total_questions} টি প্রশ্ন
                    </Badge>
                  </CardContent>
                  <CardFooter className="pt-2 border-t bg-muted/5 flex justify-between items-center gap-2">
                    <Link
                      href={`/admin/questions/edit/${file.id}`}
                      className="flex-1"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-xs"
                      >
                        <Eye className="h-3 w-3" />
                        প্রশ্ন দেখুন
                      </Button>
                    </Link>
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={() => handleRenameClick(file)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => handleDeleteFile(file.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog
        open={!!renamingFile}
        onOpenChange={(open) => !open && setRenamingFile(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ফাইল নাম পরিবর্তন</DialogTitle>
            <DialogDescription>
              ফাইলের জন্য একটি নতুন নাম দিন।
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-2 md:gap-4">
              <Label htmlFor="name" className="text-right">
                নাম
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={submitRename}>সেভ করুন</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <hr className="h-8 border-transparent" />
    </div>
  );
}
