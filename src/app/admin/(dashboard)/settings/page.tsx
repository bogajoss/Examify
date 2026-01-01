"use client";

import { Settings, Users, ShieldCheck, Trash2 } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { CleanupUnrolledStudents } from "./CleanupUnrolledStudents";

export default function AdminSettingsPage() {
  useAdminAuth();

  return (
    <div className="container mx-auto p-1 md:p-2 lg:p-4 space-y-6">
      <div className="flex items-center space-x-2">
        <Settings className="h-6 w-6 text-muted-foreground" />
        <h1 className="text-2xl font-bold tracking-tight">সেটিংস</h1>
      </div>

      <div className="grid gap-6">
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              সাধারণ ব্যবস্থাপনা
            </h2>
            <div className="grid gap-2 md:gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Link href="/admin/users">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      ব্যবহারকারী ব্যবস্থাপনা
                    </CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground">
                      শিক্ষার্থী এবং অ্যাডমিনদের তালিকা দেখুন এবং পরিচালনা করুন।
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <CleanupUnrolledStudents />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
