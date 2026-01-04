"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Download,
  Upload,
  Check,
  Copy,
  Edit,
  Eye,
  MoreHorizontal,
  PlusCircle,
  Search,
  Trash2,
  User as UserIcon,
  UserPlus,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UserForm } from "@/components/landing/user-form";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { User, Batch, UserFormResult } from "@/lib/types";
import {
  createUser,
  updateUser,
  deleteUser,
  exportUsersData,
  importUsersData,
  enrollStudent,
} from "@/lib/actions";
import {
  getAllBatches,
  getUsersWithParams,
  getUserById,
} from "@/lib/users-supabase";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useRouter, useSearchParams } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { CustomLoader } from "@/components";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";
import { Switch } from "@/components/ui/switch";
import { useCopyLink } from "@/hooks/use-copy-link";
import { maskRollNumber } from "@/lib/utils";

interface UsersClientProps {
  initialUsers: User[];
  initialBatches: Batch[];
}

// Dialog to show newly created user's credentials
function NewUserCredentialsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: (User & { pass: string }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copiedRoll, setCopiedRoll] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);
  const { copy } = useCopyLink();

  if (!user) return null;

  const handleCopy = (text: string, type: "roll" | "pass") => {
    copy(
      text,
      `${type === "roll" ? "Roll" : "Password"} copied to clipboard`,
      "Copied",
    );
    if (type === "roll") {
      setCopiedRoll(true);
      setTimeout(() => setCopiedRoll(false), 2000);
    } else {
      setCopiedPass(true);
      setTimeout(() => setCopiedPass(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>নতুন ব্যবহারকারী তৈরি হয়েছে</DialogTitle>
          <DialogDescription>
            ব্যবহারকারী নিম্নলিখিত তথ্য দিয়ে তৈরি করা হয়েছে। অনুগ্রহ করে এই
            তথ্য ব্যবহারকারীর সাথে শেয়ার করুন।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>নাম</Label>
            <Input value={user.name} readOnly />
          </div>
          <div className="space-y-2">
            <Label>
              রোল নম্বর / ফোন নম্বর (অফিসিয়ালি রোল না পেলে তোমার ফোন নম্বর দাও)
            </Label>
            <div className="flex items-center gap-2">
              <Input value={user.roll || ""} readOnly className="font-mono" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleCopy(user.roll || "", "roll")}
              >
                {copiedRoll ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>পাসওয়ার্ড</Label>
            <div className="flex items-center gap-2">
              <Input value={user.pass} readOnly className="font-mono" />
              <Button
                size="icon"
                variant="outline"
                onClick={() => handleCopy(user.pass, "pass")}
              >
                {copiedPass ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>বন্ধ করুন</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UsersClient({
  initialUsers,
  initialBatches,
}: UsersClientProps) {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const { admin } = useAdminAuth();
  const { copy } = useCopyLink();

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEnrollDialogOpen, setIsEnrollDialogOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [newUserCredentials, setNewUserCredentials] = useState<
    (User & { pass: string }) | null
  >(null);
  const [userToEnroll, setUserToEnroll] = useState<User | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [importPassword, setImportPassword] = useState("");
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );

  // Queries
  const { data: users = initialUsers, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "users", searchParams.toString()],
    queryFn: async () => {
      const page = parseInt(searchParams.get("page") || "1");
      const search = searchParams.get("search") || "";
      const enrolled_only = searchParams.get("enrolled_only") ?? "1";

      const result = await getUsersWithParams(page, 20, search, enrolled_only);
      return result.data || [];
    },
    placeholderData: initialUsers,
  });

  const { data: batches = initialBatches } = useQuery({
    queryKey: ["admin", "batches"],
    queryFn: getAllBatches,
    placeholderData: initialBatches,
  });

  // Mutations
  const deleteUserMutation = useMutation({
    mutationFn: (uid: string) => {
      const formData = new FormData();
      formData.append("uid", uid);
      formData.append("admin_uid", admin?.uid || "");
      return deleteUser(formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "ইউজার মুছে ফেলা হয়েছে" });
      setIsDeleteAlertOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "মুছে ফেলতে ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const enrollUserMutation = useMutation({
    mutationFn: async ({ uid, batchId }: { uid: string; batchId: string }) => {
      const formData = new FormData();
      formData.append("user_id", uid);
      formData.append("batch_id", batchId);
      const result = await enrollStudent(formData);
      if (!result.success) throw new Error(result.message);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast({ title: "ব্যাচে ভর্তি করা হয়েছে" });
      setIsEnrollDialogOpen(false);
    },
    onError: (err: Error) => {
      toast({
        title: "ভর্তি করতে ব্যর্থ",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const exportMutation = useMutation({
    mutationFn: exportUsersData,
    onSuccess: (result) => {
      if (result.success && result.data) {
        const element = document.createElement("a");
        element.setAttribute(
          "href",
          "data:text/plain;charset=utf-8," + encodeURIComponent(result.data),
        );
        element.setAttribute("download", result.filename || "users.json");
        element.click();
        toast({ title: "এক্সপোর্ট সফল" });
      }
    },
  });

  const handleAddUser = () => {
    setSelectedUser(null);
    setIsUserDialogOpen(true);
  };

  const handleViewUser = async (user: User) => {
    try {
      const data = await getUserById(user.uid);
      if (data) {
        setViewingUser(data);
        setIsViewDialogOpen(true);
      }
    } catch {
      toast({ variant: "destructive", title: "তথ্য আনতে সমস্যা হয়েছে" });
    }
  };

  const handleEditUser = (user: User) => {
    getUserById(user.uid).then((data) => {
      setSelectedUser(data || user);
      setIsUserDialogOpen(true);
    });
  };

  const handleFormSuccess = (data?: User | UserFormResult | null) => {
    setIsUserDialogOpen(false);
    if (!data) return;
    queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    if (!selectedUser && "pass" in data && data.pass) {
      setNewUserCredentials(data as User & { pass: string });
    }
    toast({
      title: selectedUser ? "ইউজার আপডেট হয়েছে" : "নতুন ইউজার তৈরি হয়েছে",
    });
  };

  const handleToggleEnrolledOnly = (checked: boolean) => {
    const params = new URLSearchParams(searchParams.toString());
    if (checked) params.set("enrolled_only", "1");
    else params.set("enrolled_only", "0");
    params.set("page", "1");
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams.toString());
    if (searchTerm) params.set("search", searchTerm);
    else params.delete("search");
    params.set("page", "1");
    router.push(`/admin/users?${params.toString()}`);
  };

  const handleImportUsers = async (file: File) => {
    if (!admin) {
      toast({ variant: "destructive", title: "অনুমতি নেই" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("adminPassword", importPassword);
      formData.append("adminUid", admin.uid);

      const result = await importUsersData(formData);

      if (result.success) {
        toast({
          title: "ইমপোর্ট সফল",
          description: result.message,
        });
        setIsImportDialogOpen(false);
        setImportPassword("");
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      } else {
        toast({
          variant: "destructive",
          title: "ইমপোর্ট ব্যর্থ",
          description: result.message,
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "ইমপোর্ট ব্যর্থ",
        description: (error as Error).message,
      });
    }
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href="/admin/settings"
          className="flex items-center text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          সেটিংস-এ ফিরে যান
        </Link>
      </div>
      <Card className={loadingUsers ? "opacity-60 transition-opacity" : ""}>
        <CardHeader>
          <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2 md:gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                ব্যবহারকারীগণ
                {loadingUsers && <Loader2 className="h-4 w-4 animate-spin" />}
              </CardTitle>
              <CardDescription>
                আপনার প্ল্যাটফর্মে সমস্ত নিবন্ধিত ব্যবহারকারীদের পরিচালনা করুন।
              </CardDescription>
            </div>
            <div className="flex items-center gap-1 md:gap-2 w-full md:w-auto flex-wrap">
              <div className="flex items-center space-x-2 mr-2 bg-muted/50 px-3 py-1.5 rounded-lg border">
                <Label
                  htmlFor="enrolled-filter"
                  className="text-xs cursor-pointer whitespace-nowrap"
                >
                  শুধুমাত্র ভর্তি হওয়া
                </Label>
                <Switch
                  id="enrolled-filter"
                  checked={searchParams.get("enrolled_only") !== "0"}
                  onCheckedChange={handleToggleEnrolledOnly}
                />
              </div>
              <form onSubmit={handleSearch} className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="নাম বা রোল দিয়ে খুঁজুন..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </form>
              <Button
                size="sm"
                variant="outline"
                className="gap-1"
                onClick={() => exportMutation.mutate()}
                disabled={exportMutation.isPending}
              >
                <Download className="h-3.5 w-3.5" />
                <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                  {exportMutation.isPending
                    ? "এক্সপোর্ট করা হচ্ছে..."
                    : "এক্সপোর্ট"}
                </span>
              </Button>
              <Dialog
                open={isImportDialogOpen}
                onOpenChange={setIsImportDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline" className="gap-1">
                    <Upload className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      ইমপোর্ট
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ইউজার ডেটা ইমপোর্ট করুন</DialogTitle>
                    <DialogDescription>
                      পূর্ববর্তী এক্সপোর্টকৃত JSON ফাইল নির্বাচন করুন।
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="import-file">JSON ফাইল</Label>
                      <Input id="import-file" type="file" accept=".json" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsImportDialogOpen(false)}
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
                        handleImportUsers(file);
                      }}
                    >
                      ইমপোর্ট করুন
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog
                open={isUserDialogOpen}
                onOpenChange={setIsUserDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-1" onClick={handleAddUser}>
                    <PlusCircle className="h-3.5 w-3.5" />
                    <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                      নতুন ব্যবহারকারী
                    </span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] w-[95vw] rounded-2xl md:max-w-lg p-1 md:p-6 overflow-hidden flex flex-col">
                  <DialogHeader className="shrink-0">
                    <DialogTitle>
                      {selectedUser
                        ? "ব্যবহারকারী সম্পাদনা করুন"
                        : "নতুন ব্যবহারকারী যোগ করুন"}
                    </DialogTitle>
                    <DialogDescription>
                      {selectedUser
                        ? "এই ব্যবহারকারীর তথ্য পরিবর্তন করুন।"
                        : "স্বয়ংক্রিয় বা ম্যানুয়াল পাসওয়ার্ড দিয়ে নতুন ব্যবহারকারী তৈরি করুন।"}
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="flex-1 -mr-2 pr-2">
                    <div className="pt-2 pb-1">
                      <UserForm
                        isCreateMode={!selectedUser}
                        defaultValues={selectedUser}
                        action={selectedUser ? updateUser : createUser}
                        onSuccess={handleFormSuccess}
                        batches={batches}
                      />
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
            {Array.isArray(users) && users.length > 0 ? (
              users.map((user) => (
                <Card key={user.uid} className="flex flex-col">
                  <CardHeader className="flex flex-row items-center gap-2 md:gap-4">
                    <Avatar>
                      <AvatarFallback>
                        <UserIcon className="h-5 w-5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="font-semibold">{user.name}</p>
                      <p className="text-sm text-muted-foreground">
                        রোল: {maskRollNumber(user.roll)}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          aria-haspopup="true"
                          size="icon"
                          variant="ghost"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Toggle menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>কার্যক্রম</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => handleViewUser(user)}>
                          <Eye className="mr-2 h-4 w-4" />
                          <span>বিস্তারিত দেখুন</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleEditUser(user)}>
                          <Edit className="mr-2 h-4 w-4" />
                          <span>সম্পাদনা</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => {
                            setUserToEnroll(user);
                            setIsEnrollDialogOpen(true);
                          }}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          <span>ব্যাচে ভর্তি করুন</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => {
                            setUserToDelete(user);
                            setIsDeleteAlertOpen(true);
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          <span>মুছে ফেলুন</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm font-medium mb-2">ভর্তি হওয়া কোর্স</p>
                    <div className="flex flex-wrap gap-1">
                      {user.enrolled_batches &&
                      user.enrolled_batches.length > 0 ? (
                        user.enrolled_batches.map((batchId) => {
                          const batch = batches.find((b) => b.id === batchId);
                          return batch ? (
                            <Link
                              href={`/admin/batches/${batch.id}`}
                              key={batch.id}
                            >
                              <Badge
                                variant="secondary"
                                className="cursor-pointer hover:bg-secondary/80"
                              >
                                {batch.name}
                              </Badge>
                            </Link>
                          ) : null;
                        })
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          কোনো ব্যাচে নেই
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="col-span-full text-center py-10">
                <p>কোনো ব্যবহারকারী পাওয়া যায়নি।</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog
        open={isDeleteAlertOpen}
        onOpenChange={(open) => {
          setIsDeleteAlertOpen(open);
          if (!open) setUserToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>আপনি কি নিশ্চিত?</AlertDialogTitle>
            <AlertDialogDescription>
              আপনি {userToDelete?.name} (রোল:{" "}
              {userToDelete?.roll ? maskRollNumber(userToDelete.roll) : ""})-কে
              মুছে ফেলতে চলেছেন। এই কাজটি ফিরিয়ে নেওয়া যাবে না।
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>বাতিল করুন</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                userToDelete && deleteUserMutation.mutate(userToDelete.uid)
              }
              disabled={deleteUserMutation.isPending}
            >
              {deleteUserMutation.isPending
                ? "মুছে ফেলা হচ্ছে..."
                : "মুছে ফেলুন"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isEnrollDialogOpen} onOpenChange={setIsEnrollDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ব্যাচে ভর্তি করুন</DialogTitle>
            <DialogDescription>
              {userToEnroll?.name}-কে একটি ব্যাচে ভর্তি করুন।
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Select
              onValueChange={setSelectedBatch}
              disabled={enrollUserMutation.isPending}
            >
              <SelectTrigger>
                <SelectValue placeholder="একটি ব্যাচ নির্বাচন করুন" />
              </SelectTrigger>
              <SelectContent>
                {batches.map((batch) => (
                  <SelectItem key={batch.id} value={batch.id}>
                    {batch.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            onClick={() =>
              userToEnroll &&
              selectedBatch &&
              enrollUserMutation.mutate({
                uid: userToEnroll.uid,
                batchId: selectedBatch,
              })
            }
            disabled={enrollUserMutation.isPending || !selectedBatch}
          >
            {enrollUserMutation.isPending ? (
              <>
                <CustomLoader minimal />
                ভর্তি হচ্ছে...
              </>
            ) : (
              "ভর্তি করুন"
            )}
          </Button>
        </DialogContent>
      </Dialog>

      <NewUserCredentialsDialog
        user={newUserCredentials}
        open={!!newUserCredentials}
        onOpenChange={(open) => {
          if (!open) {
            setNewUserCredentials(null);
          }
        }}
      />

      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>ব্যবহারকারীর বিস্তারিত তথ্য</DialogTitle>
            <DialogDescription>
              ব্যবহারকারীর লগইন তথ্য এবং অন্যান্য বিবরণ।
            </DialogDescription>
          </DialogHeader>
          {viewingUser && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>নাম</Label>
                <div className="p-2 border rounded bg-muted/50">
                  {viewingUser.name}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  রোল নম্বর / ফোন নম্বর (অফিসিয়ালি রোল না পেলে তোমার ফোন নম্বর
                  দাও)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={viewingUser.roll || ""}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => {
                      copy(
                        viewingUser.roll || "",
                        "রোল / ফোন নম্বর কপি করা হয়েছে",
                        "Copied",
                      );
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-2">
                <Label>পাসওয়ার্ড</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={viewingUser.pass || "পাওয়া যায়নি"}
                    readOnly
                    className="font-mono"
                  />
                  {viewingUser.pass && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        copy(
                          viewingUser.pass!,
                          "পাসওয়ার্ড কপি করা হয়েছে",
                          "Copied",
                        );
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-2">
                <Label>তৈরি হয়েছে</Label>
                <div className="p-2 border rounded bg-muted/50">
                  {formatDate(viewingUser.created_at, "DD/MM/YYYY, hh:mm A")}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setIsViewDialogOpen(false)}>
              বন্ধ করুন
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
