"use client";
import { AdminAuthProvider } from "@/context/AdminAuthContext";
import { ReactNode } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AdminAuthProvider>{children}</AdminAuthProvider>;
}
