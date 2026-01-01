"use client";

import { useAuth } from "@/context/AuthContext";
import {
  UniversalDetailsCard,
  PageHeader,
  EmptyState,
  CustomLoader,
} from "@/components";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  Globe,
  FileText,
  Trophy,
  CreditCard,
  ExternalLink,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Batch } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { getEnrolledBatches } from "@/lib/daily-supabase";
import { getAllBatches } from "@/lib/users-supabase";
import Link from "next/link";
import { formatDate } from "@/lib/date-utils";

export default function StudentBatchesPage() {
  const { user, loading: authLoading } = useAuth();

  // Query for enrolled batches
  const { data: enrolledBatches = [], isLoading: loadingEnrolled } = useQuery({
    queryKey: ["batches", "enrolled", user?.uid],
    queryFn: async () => {
      if (!user?.uid) return [];
      const batches = await getEnrolledBatches(user.uid);
      // Filter out public ones if needed, or keep all enrolled. The original code filtered `is_public: "false"`
      // Assuming `getEnrolledBatches` returns all enrolled.
      return batches.filter((b) => !b.is_public) || [];
    },
    enabled: !!user?.uid && !authLoading,
  });

  // Query for public batches
  const { data: publicBatches = [], isLoading: loadingPublic } = useQuery({
    queryKey: ["batches", "public"],
    queryFn: async () => {
      const all = await getAllBatches();
      return all.filter((b) => b.is_public) || [];
    },
    enabled: !authLoading,
  });

  // Query for all batches to find paid/other batches
  const { data: allBatches = [], isLoading: loadingAll } = useQuery({
    queryKey: ["batches", "all"],
    queryFn: getAllBatches,
    enabled: !authLoading,
  });

  const paidBatches = allBatches.filter((batch) => {
    const isEnrolled = enrolledBatches.some((b) => b.id === batch.id);
    const isPublic = batch.is_public;
    return !isEnrolled && !isPublic;
  });

  const loading = loadingEnrolled || loadingPublic || loadingAll;

  if (loading || authLoading) {
    return <CustomLoader />;
  }

  const renderBatchCard = (batch: Batch) => (
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
        </>
      }
      info={[
        {
          label: "তৈরি হয়েছে:",
          value: formatDate(batch.created_at, "DD/MM/YYYY"),
        },
      ]}
      actions={
        <>
          <Link href={`/batches/${batch.id}`}>
            <Button variant="outline" size="sm">
              <FileText className="h-4 w-4 mr-2" />
              পরীক্ষা দেখুন
            </Button>
          </Link>
          <Link href={`/batches/${batch.id}/leaderboard`}>
            <Button variant="secondary" size="sm">
              <Trophy className="h-4 w-4 mr-2" />
              লিডারবোর্ড
            </Button>
          </Link>
        </>
      }
      actionsClassName="flex justify-start gap-2"
    />
  );

  const renderPaidBatchCard = (batch: Batch) => (
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
          <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-500/10 text-yellow-700 border border-yellow-200">
            পেইড
          </span>
        </>
      }
      info={[
        {
          label: "তৈরি হয়েছে:",
          value: formatDate(batch.created_at, "DD/MM/YYYY"),
        },
      ]}
      actions={
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          onClick={() => window.open("https://t.me/Examifyy", "_blank")}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          ভর্তি হন
        </Button>
      }
      actionsClassName="w-full"
    />
  );

  return (
    <div className="container mx-auto px-2 sm:px-4 md:px-6 py-4 max-w-6xl space-y-6">
      <PageHeader
        title="সকল ব্যাচ"
        description="আপনার ভর্তি হওয়া এবং পাবলিক ব্যাচগুলোর তালিকা।"
      />

      <Tabs defaultValue="my-batches" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-xl mx-auto">
          <TabsTrigger value="my-batches">
            <Users className="h-4 w-4 mr-2" />
            আমার ব্যাচ
          </TabsTrigger>
          <TabsTrigger value="paid-batches">
            <CreditCard className="h-4 w-4 mr-2" />
            পেইড ব্যাচ
          </TabsTrigger>
          <TabsTrigger value="public-batches">
            <Globe className="h-4 w-4 mr-2" />
            পাবলিক ব্যাচ
          </TabsTrigger>
        </TabsList>
        <TabsContent value="my-batches" className="mt-6">
          {enrolledBatches.length > 0 ? (
            <div className="grid gap-2 md:gap-4 lg:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {enrolledBatches.map(renderBatchCard)}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-12 w-12 text-primary" />}
              title="কোনো ব্যাচে ভর্তি হননি"
              description="আপনি কোনো ব্যাচে ভর্তি নন। পেইড বা পাবলিক ব্যাচ ট্যাবে সকল ব্যাচগুলো দেখুন।"
            />
          )}
        </TabsContent>
        <TabsContent value="paid-batches" className="mt-6">
          {paidBatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {paidBatches.map(renderPaidBatchCard)}
            </div>
          ) : (
            <EmptyState
              icon={<CreditCard className="h-12 w-12 text-primary" />}
              title="কোনো পেইড ব্যাচ নেই"
              description="বর্তমানে কোনো পেইড ব্যাচ উপলব্ধ নেই।"
            />
          )}
        </TabsContent>
        <TabsContent value="public-batches" className="mt-6">
          {publicBatches.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-4">
              {publicBatches.map(renderBatchCard)}
            </div>
          ) : (
            <EmptyState
              icon={<Globe className="h-12 w-12 text-primary" />}
              title="কোনো পাবলিক ব্যাচ পাওয়া যায়নি"
              description="শীঘ্রই পাবলিক ব্যাচ যোগ করা হবে।"
            />
          )}
        </TabsContent>
      </Tabs>
      <hr className="h-20 border-transparent" />
    </div>
  );
}
