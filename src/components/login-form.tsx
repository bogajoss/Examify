"use client";

import { useState } from "react";
import Link from "next/link";
import { NotebookText, Shield, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface UnifiedLoginFormProps {
  userType: "student" | "admin";
  onSubmit: (credentials: Record<string, string>) => Promise<void>;
  loading?: boolean;
  error?: string;
}

export function UnifiedLoginForm({
  userType,
  onSubmit,
  loading = false,
  error,
}: UnifiedLoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isStudent = userType === "student";
  const fieldLabel = isStudent
    ? "রোল নম্বর / ফোন নম্বর (অফিসিয়ালি রোল না পেলে তোমার ফোন নম্বর দাও)"
    : "ব্যবহারকারীর নাম";
  const fieldPlaceholder = isStudent
    ? "আপনার রোল বা ফোন নম্বর"
    : "আপনার ব্যবহারকারীর নাম";
  const logoGradient = isStudent
    ? "from-primary via-primary/80 to-primary/60"
    : "from-destructive via-destructive/80 to-destructive/60";
  const logoIcon = isStudent ? (
    <NotebookText className="h-8 w-8 text-white" />
  ) : (
    <Shield className="h-8 w-8 text-white" />
  );
  const userTypeLabel = isStudent ? "শিক্ষার্থী পোর্টাল" : "অ্যাডমিন প্যানেল";
  const buttonBg = isStudent
    ? "bg-primary hover:bg-primary/90"
    : "bg-destructive hover:bg-destructive/90";
  const otherTypeHref = isStudent ? "/admin/login" : "/login";
  const otherTypeText = isStudent ? "অ্যাডমিন লগইন" : "শিক্ষার্থী লগইন";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!email || !password) {
      setLocalError("সব ফিল্ড পূরণ করুন");
      return;
    }

    try {
      await onSubmit(
        isStudent
          ? { rollNumber: email, password }
          : { username: email, password },
      );
    } catch (err) {
      if (err instanceof Error) {
        setLocalError(err.message);
      }
    }
  };

  const displayError = error || localError;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md">
        <Card className="border border-border shadow-2xl">
          <CardHeader className="text-center pb-8 pt-8">
            <div className="flex justify-center mb-6">
              <div
                className={`h-16 w-16 bg-linear-to-br ${logoGradient} rounded-2xl flex items-center justify-center shadow-lg`}
              >
                {logoIcon}
              </div>
            </div>
            <CardTitle className="text-3xl font-bold bg-linear-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              লগইন
            </CardTitle>
            <p className="text-sm font-medium text-muted-foreground mt-2">
              {userTypeLabel}
            </p>
            <CardDescription className="text-base mt-3 text-muted-foreground">
              {isStudent
                ? "আপনার অ্যাকাউন্টে প্রবেশ করুন"
                : "প্রশাসক অ্যাকাউন্টে লগইন করুন"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="email"
                  className="text-sm font-semibold text-foreground"
                >
                  {fieldLabel}
                </Label>
                <Input
                  id="email"
                  type="text"
                  placeholder={fieldPlaceholder}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="px-4 py-2.5 rounded-lg border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 bg-muted/30 focus:bg-background transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label
                    htmlFor="password"
                    className="text-sm font-semibold text-foreground"
                  >
                    পাসওয়ার্ড
                  </Label>
                  <a
                    href="#"
                    className="text-xs font-medium text-primary hover:underline transition-colors"
                  >
                    পাসওয়ার্ড ভুলে গেছেন?
                  </a>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="আপনার পাসওয়ার্ড"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="px-4 py-2.5 rounded-lg border border-input focus:border-primary focus:ring-2 focus:ring-primary/20 bg-muted/30 focus:bg-background transition-all pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={loading}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              {displayError && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-sm font-medium text-destructive">
                    {displayError}
                  </p>
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 font-semibold text-primary-foreground rounded-lg transition-all duration-200 ${buttonBg} shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    লগইন করা হচ্ছে...
                  </div>
                ) : (
                  "লগইন করুন"
                )}
              </Button>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border"></span>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-background text-muted-foreground font-medium">
                    বা
                  </span>
                </div>
              </div>

              <div className="space-y-3 text-center text-sm">
                {isStudent && (
                  <p className="text-muted-foreground">
                    অ্যাকাউন্ট নেই?{" "}
                    <Link
                      href="/register"
                      className="font-semibold text-primary hover:underline transition-colors"
                    >
                      নিবন্ধন করুন
                    </Link>
                  </p>
                )}
                <p>
                  <Link
                    href={otherTypeHref}
                    className="font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {otherTypeText}
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          নিরাপত্তা এবং গোপনীয়তার সাথে আপনার তথ্য সুরক্ষিত রাখা হয়।
        </p>
      </div>
    </div>
  );
}
