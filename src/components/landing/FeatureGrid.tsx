"use client";
import { LogIn, Users, FileText, BookOpen, Info, Mail } from "lucide-react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { getPublicStats } from "@/lib/stats-supabase";
import { Skeleton } from "@/components/ui/skeleton";

const StatCard = ({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) => (
  <Card className="p-3 sm:p-4 rounded-lg shadow-xs text-center text-card-foreground flex flex-col justify-center items-center w-full h-full bg-card hover:bg-accent">
    <CardContent className="p-0">
      {icon}
      <p className="font-bold text-lg sm:text-xl text-primary">{value}</p>
      <p className="font-semibold text-xs sm:text-sm">{label}</p>
    </CardContent>
  </Card>
);

const ActionCard = ({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
}) => (
  <Link href={href} aria-label={label} className="flex">
    <Card className="p-3 sm:p-4 rounded-lg shadow-xs hover:shadow-md hover:bg-accent hover:scale-105 text-center text-card-foreground flex flex-col justify-center items-center w-full h-full">
      <CardContent className="p-0">
        {icon}
        <p className="font-semibold text-xs sm:text-sm">{label}</p>
      </CardContent>
    </Card>
  </Link>
);

export function FeatureGrid() {
  const [stats, setStats] = useState({
    courses: 0,
    exams: 0,
    students: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getPublicStats();
        setStats({
          courses: data.batchesCount,
          exams: data.examsCount,
          students: data.usersCount,
        });
      } catch (error) {
        console.error("Error fetching stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const topRowStats = [
    {
      label: "কোর্স",
      value: stats.courses,
      icon: (
        <BookOpen className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary mb-1" />
      ),
    },
    {
      label: "পরীক্ষা",
      value: stats.exams,
      icon: (
        <FileText className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary mb-1" />
      ),
    },
    {
      label: "শিক্ষার্থী",
      value: stats.students,
      icon: (
        <Users className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary mb-1" />
      ),
    },
  ];

  const bottomRowActions = [
    {
      label: "লগইন করুন",
      href: "/login",
      icon: (
        <LogIn className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary mb-2" />
      ),
    },
    {
      label: "আমরা কারা",
      href: "/about",
      icon: (
        <Info className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary mb-2" />
      ),
    },
    {
      label: "যোগাযোগ",
      href: "mailto:mail@mnr.world",
      icon: (
        <Mail className="h-8 w-8 sm:h-10 sm:w-10 mx-auto text-primary mb-2" />
      ),
    },
  ];

  return (
    <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
      {loading
        ? Array.from({ length: 3 }).map((_, idx) => (
            <Card
              key={idx}
              className="p-3 sm:p-4 rounded-lg shadow-xs text-center flex flex-col justify-center items-center w-full h-full bg-card"
            >
              <CardContent className="p-0 flex flex-col items-center gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))
        : topRowStats.map((stat, idx) => (
            <div
              key={idx}
              style={{ animationDelay: `${idx * 100}ms` }}
              className="animate-in fade-in"
            >
              <StatCard
                {...stat}
                value={`${stat.value.toLocaleString("bn-BD")}+`}
              />
            </div>
          ))}

      {bottomRowActions.map((action, idx) => (
        <div
          key={action.href}
          style={{ animationDelay: `${(idx + 3) * 100}ms` }}
          className="animate-in fade-in"
        >
          <ActionCard {...action} />
        </div>
      ))}
    </div>
  );
}
