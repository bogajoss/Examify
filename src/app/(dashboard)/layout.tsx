"use client";
import { useAuth } from "@/context/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, ReactNode, useState } from "react";
import {
  BarChart,
  LayoutDashboard,
  User as UserIcon,
  FileText,
  Users,
  Home,
  CalendarCheck,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import { CustomLoader } from "@/components";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { maskRollNumber } from "@/lib/utils";

const sidebarNavItems = [
  { title: "ড্যাশবোর্ড", href: "/exams", icon: LayoutDashboard },
  { title: "প্রতিদিনের কাজ", href: "/daily", icon: CalendarCheck },
  { title: "সকল ব্যাচ", href: "/batches", icon: Users },
  { title: "পরীক্ষাসমূহ", href: "/exams", icon: FileText },
  { title: "ফলাফল", href: "/results", icon: BarChart },
  { title: "প্রোফাইল", href: "/profile", icon: UserIcon },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, signOut, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const isExamPage = pathname?.match(/^\/exams\/[^/]+$/);

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.push(`/login?redirect=${pathname}`);
    }
  }, [user, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <CustomLoader />
      </div>
    );
  }

  const handleLogout = () => {
    signOut();
    router.push("/login");
  };

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Desktop Sidebar */}
      <DashboardSidebar
        items={sidebarNavItems}
        userInfo={{
          name: user.name,
          role: user.roll ? `রোল: ${maskRollNumber(user.roll)}` : "Student",
        }}
        onLogout={handleLogout}
        panelType="student"
        onExpandedChange={setSidebarExpanded}
        hideMobileNav={!!isExamPage}
      />

      {/* Main Content */}
      <div
        className={`flex flex-1 flex-col pb-16 lg:pb-0 ${
          sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <header className="flex h-16 items-center justify-between border-b bg-card pr-6 sticky top-0 z-20 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="হোমপেজে যান">
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/exams">
              <h1 className="text-xl font-semibold cursor-pointer">
                ড্যাশবোর্ড
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <Avatar className="h-9 w-9">
              <AvatarFallback>
                <UserIcon className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <p className="text-sm font-medium">
                {user.name.length > 11
                  ? `${user.name.slice(0, 11)}...`
                  : user.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {user.roll ? `রোল: ${maskRollNumber(user.roll)}` : "Student"}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-1 md:p-4 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
