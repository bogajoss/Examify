"use client";

import { useAuth } from "@/context/AuthContext";
import {
  CustomLoader,
  PageHeader,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from "@/components";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  CalendarIcon,
  User as UserIcon,
  Edit,
  Save,
  X,
  BookOpen,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import Link from "next/link";
import { useQuery, useMutation } from "@tanstack/react-query";
import { formatDate } from "@/lib/date-utils";

interface Batch {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  name: string;
  created_at: string;
  duration_minutes?: number;
}

export default function ProfilePage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    if (user) {
      setEditName(user.name);
    }
  }, [user, authLoading, router]);

  // Query for enrolled batches
  const { data: enrolledBatches = [], isLoading: enrolledBatchesLoading } =
    useQuery({
      queryKey: ["batches", "enrolled", user?.uid],
      queryFn: async () => {
        if (!user?.uid) return [];
        const { data, error } = await supabase
          .from("batches")
          .select("*")
          .in("id", user.enrolled_batches || []);
        if (error) throw error;
        return (data as Batch[]) || [];
      },
      enabled: !!user?.uid && !authLoading,
    });

  // Query for all available batches
  const { data: allBatches = [], isLoading: allBatchesLoading } = useQuery({
    queryKey: ["batches", "all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("batches")
        .select("*")
        .eq("is_public", true);
      if (error) throw error;
      return (data as Batch[]) || [];
    },
    enabled: !!user?.uid && !authLoading,
  });

  // Query for upcoming exams
  const { data: upcomingExams = [], isLoading: examsLoading } = useQuery({
    queryKey: ["exams", "accessible", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("exams")
        .select("*")
        .or(
          `batch_id.is.null,batch_id.in.(${user.enrolled_batches?.join(",") || ""})`,
        );
      if (error) throw error;
      return (data as Exam[]) || [];
    },
    enabled: !!user?.uid && !authLoading,
  });

  // Profile Update Mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (newName: string) => {
      const { error } = await supabase
        .from("users")
        .update({ name: newName.trim() })
        .eq("uid", user?.uid);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      toast({ title: "প্রোফাইল আপডেট হয়েছে" });
      setEditing(false);
      // Fresh reload to sync context
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "প্রোফাইল আপডেট করতে ব্যর্থ",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveProfile = () => {
    if (!editName.trim()) return;
    updateProfileMutation.mutate(editName);
  };

  if (authLoading) {
    return <CustomLoader />;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="container mx-auto p-1 sm:p-4 md:p-6 max-w-6xl space-y-6">
      <PageHeader
        title="প্রোফাইল"
        description="আপনার ব্যক্তিগত তথ্য এবং আসন্ন পরীক্ষা"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
              <Avatar className="h-20 w-20 border-2 border-primary">
                <AvatarFallback className="text-2xl">
                  <UserIcon className="h-10 w-10" />
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 flex-1">
                {editing ? (
                  <div className="space-y-2">
                    <Label htmlFor="name">নাম</Label>
                    <Input
                      id="name"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="আপনার নাম"
                      disabled={updateProfileMutation.isPending}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleSaveProfile}
                        disabled={updateProfileMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {updateProfileMutation.isPending
                          ? "সেভ হচ্ছে..."
                          : "সেভ"}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setEditing(false)}
                        disabled={updateProfileMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        বাতিল
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <CardTitle className="text-2xl">{user.name}</CardTitle>
                    <CardDescription className="text-md">
                      {user.roll}
                    </CardDescription>
                    <Button size="sm" onClick={() => setEditing(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      এডিট
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div>
              <h3 className="font-semibold text-lg mb-2">
                ভর্তি হওয়া ব্যাচসমূহ
              </h3>
              <div className="flex flex-wrap gap-2">
                {enrolledBatchesLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : enrolledBatches.length > 0 ? (
                  enrolledBatches.map((batch) => (
                    <Badge key={batch.id} variant="secondary">
                      {batch.name}
                    </Badge>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    কোনো ব্যাচে ভর্তি হননি।
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">সকল উপলব্ধ ব্যাচ</h3>
              <div className="flex flex-wrap gap-2">
                {allBatchesLoading ? (
                  <Skeleton className="h-6 w-24" />
                ) : allBatches.length > 0 ? (
                  allBatches.map((batch) => {
                    const isEnrolled = enrolledBatches.some(
                      (b) => b.id === batch.id,
                    );
                    return (
                      <Badge
                        key={batch.id}
                        variant={isEnrolled ? "secondary" : "outline"}
                      >
                        {batch.name}
                        {isEnrolled && " ✓"}
                      </Badge>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground">
                    কোনো সার্বজনীন ব্যাচ নেই।
                  </p>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">অন্যান্য তথ্য</h3>
              <div className="flex items-center text-sm text-muted-foreground">
                <CalendarIcon className="mr-2 h-4 w-4" />
                <span>
                  রেজিস্ট্রেশনের তারিখ:{" "}
                  {formatDate(user.created_at, "DD/MM/YYYY")}
                </span>
              </div>
              <Button
                variant="destructive"
                onClick={signOut}
                className="mt-4 w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                লগ আউট
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2" />
              আসন্ন পরীক্ষা
            </CardTitle>
            <CardDescription>আপনার অ্যাক্সেস করা পরীক্ষাগুলো</CardDescription>
          </CardHeader>
          <CardContent>
            {examsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ) : upcomingExams.length > 0 ? (
              <div className="space-y-4">
                {upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="border rounded-lg p-3 flex justify-between items-center"
                  >
                    <div>
                      <h4 className="font-medium">{exam.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(exam.created_at, "DD/MM/YYYY")}
                        {exam.duration_minutes &&
                          ` • ${exam.duration_minutes} মিনিট`}
                      </p>
                    </div>
                    <Link href={`/exams/${exam.id}`}>
                      <Button variant="outline" size="sm">
                        <BookOpen className="h-4 w-4 mr-2" />
                        পরীক্ষা দিন
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                কোনো আসন্ন পরীক্ষা নেই।
              </p>
            )}
          </CardContent>
        </Card>
      </div>
      <hr className="h-20 border-transparent" />
    </div>
  );
}
