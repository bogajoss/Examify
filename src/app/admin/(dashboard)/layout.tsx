"use client";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Settings,
  User,
  Home,
  FileText,
  BarChart,
} from "lucide-react";
import DashboardSidebar from "@/components/DashboardSidebar";
import CustomLoader from "@/components/CustomLoader";
import { Button } from "@/components/ui/button";
import { ReactNode, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Link from "next/link";

const sidebarNavItems = [
  { title: "ড্যাশবোর্ড", href: "/admin", icon: LayoutDashboard },
  { title: "রিপোর্টস", href: "/admin/reports", icon: BarChart },
  { title: "পরীক্ষা", href: "/admin/exams", icon: FileText },
  { title: "প্রশ্ন ব্যাংক", href: "/admin/questions", icon: ClipboardList },
  { title: "ব্যাচ", href: "/admin/batches", icon: ClipboardList },
  { title: "সেটিংস", href: "/admin/settings", icon: Settings },
];

export default function AdminDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { admin, signOut } = useAdminAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  const navItems = sidebarNavItems.map((item) => {
    let isActive = false;
    if (item.href === "/admin") {
      isActive = pathname === item.href;
    } else if (item.href === "/admin/settings") {
      isActive =
        pathname.startsWith(item.href) || pathname.startsWith("/admin/users");
    } else {
      isActive = pathname.startsWith(item.href);
    }
    return { ...item, isActive };
  });

  const handleLogout = () => {
    signOut();
    router.push("/admin/login");
  };

  if (!admin) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <CustomLoader />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground overflow-hidden">
      <DashboardSidebar
        items={navItems}
        userInfo={{
          name: admin.username,
          role: admin.role,
        }}
        onLogout={handleLogout}
        panelType="admin"
        onExpandedChange={setSidebarExpanded}
      />

      <div
        className={`flex flex-1 flex-col pb-16 lg:pb-0 ${
          sidebarExpanded ? "lg:ml-64" : "lg:ml-20"
        }`}
      >
        <header className="flex h-16 items-center justify-between border-b bg-card px-6 sticky top-0 z-20 rounded-b-2xl">
          <div className="flex items-center gap-2">
            <Link href="/" aria-label="হোমপেজে যান">
              <Button variant="ghost" size="icon">
                <Home className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/admin">
              <h1 className="text-xl font-semibold cursor-pointer">
                অ্যাডমিন ড্যাশবোর্ড
              </h1>
            </Link>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            <ThemeToggle />
            <Avatar className="h-9 w-9">
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <div className="text-right">
              <p className="text-sm font-medium">{admin.username}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {admin.role}
              </p>
            </div>
          </div>
        </header>
        <main className="flex-1 p-1 md:p-4 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
