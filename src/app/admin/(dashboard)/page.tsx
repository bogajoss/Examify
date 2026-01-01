"use client";

import { StatCard, CustomLoader } from "@/components";
import { getAdminStats } from "@/lib/data-supabase";
import { Users, BookOpen, FileQuestion, Layers } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: getAdminStats,
  });

  if (isLoading) return <CustomLoader />;

  const cards = [
    {
      title: "মোট ব্যবহারকারী",
      value: stats?.usersCount.toLocaleString("bn-BD") || "0",
      description: "নিবন্ধিত মোট ছাত্রছাত্রীর সংখ্যা",
      icon: <Users className="h-5 w-5" />,
    },
    {
      title: "মোট পরীক্ষা",
      value: stats?.examsCount.toLocaleString("bn-BD") || "0",
      description: "সিস্টেমে থাকা মোট পরীক্ষার সংখ্যা",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      title: "মোট ব্যাচ",
      value: stats?.batchesCount.toLocaleString("bn-BD") || "0",
      description: "সিস্টেমে থাকা মোট ব্যাচের সংখ্যা",
      icon: <Layers className="h-5 w-5" />,
    },
    {
      title: "মোট প্রশ্ন",
      value: stats
        ? `${(stats.questionsCount / 1000).toLocaleString("bn-BD")}K+`
        : "0",
      description: "প্রশ্নব্যাংকে থাকা মোট প্রশ্ন",
      icon: <FileQuestion className="h-5 w-5" />,
    },
  ];

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 animate-in fade-in duration-500">
        {cards.map((card, idx) => (
          <div key={idx} style={{ animationDelay: `${idx * 150}ms` }}>
            <StatCard
              title={card.title}
              value={card.value}
              description={card.description}
              icon={card.icon}
            />
          </div>
        ))}
      </div>
      <hr className="h-8 border-transparent" />
    </>
  );
}
