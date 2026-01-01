"use client";

import { useState, Suspense } from "react";
import {
  AlertBox,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from "@/components";
import { Loader2, UserPlus } from "lucide-react";
import Link from "next/link";
import { createUser } from "@/lib/actions";
import { useSearchParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/AuthContext";

// const DEFAULT_BATCH_ID = "48a42c85-aa53-4749-a4b8-851fe2003464";

function RegisterPageContent() {
  const [formData, setFormData] = useState({
    name: "",
    roll: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { signIn } = useAuth();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.id]: e.target.value,
    });
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("পাসওয়ার্ড মিলছে না");
      setLoading(false);
      return;
    }

    if (formData.password.length < 4) {
      setError("পাসওয়ার্ড কমপক্ষে ৪টি অক্ষরের হতে হবে");
      setLoading(false);
      return;
    }

    try {
      const submitData = new FormData();
      submitData.append("name", formData.name);
      submitData.append("roll", formData.roll);
      submitData.append("pass", formData.password);
      submitData.append("passwordMode", "manual");
      // submitData.append("batch_id", DEFAULT_BATCH_ID);

      const result = await createUser(submitData);

      if (result.success) {
        toast({
          title: "নিবন্ধন সফল",
          description: "আপনার অ্যাকাউন্ট তৈরি হয়েছে। আপনাকে লগইন করানো হচ্ছে...",
        });
        
        // Auto-login after successful registration
        const redirectTo = searchParams.get("redirect") || undefined;
        await signIn(formData.roll, formData.password, redirectTo);
      } else {
        setError(result.message || "নিবন্ধন ব্যর্থ হয়েছে।");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("একটি ত্রুটি ঘটেছে। অনুগ্রহ করে আবার চেষ্টা করুন।");
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background animate-in fade-in duration-500 py-8">
      <Card className="w-full max-w-sm animate-in zoom-in slide-in-from-bottom-8 duration-500 shadow-lg">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <UserPlus className="h-6 w-6 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">
            নতুন অ্যাকাউন্ট
          </CardTitle>
          <CardDescription>
            অ্যাকাউন্ট তৈরি করতে নিচের তথ্যগুলো দিন
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">আপনার নাম</Label>
              <Input
                id="name"
                type="text"
                placeholder="আপনার পূর্ণ নাম"
                value={formData.name}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="roll">
                রোল নম্বর / ফোন নম্বর (অফিসিয়ালি রোল না পেলে তোমার ফোন নম্বর দাও)
              </Label>
              <Input
                id="roll"
                type="text"
                placeholder="আপনার রোল বা ফোন নম্বর"
                value={formData.roll}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                placeholder="একটি শক্তিশালী পাসওয়ার্ড দিন"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">পাসওয়ার্ড নিশ্চিত করুন</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="পাসওয়ার্ডটি পুনরায় লিখুন"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <AlertBox
                type="error"
                title="নিবন্ধন ব্যর্থ"
                description={error}
              />
            )}
          </CardContent>
          <CardFooter className="flex-col gap-4">
            <Button
              type="submit"
              className="w-full font-semibold text-md"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  নিবন্ধন হচ্ছে...
                </>
              ) : (
                "নিবন্ধন করুন"
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              ইতিমধ্যে অ্যাকাউন্ট আছে?{" "}
              <Link
                href={`/login${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`}
                className="font-semibold text-primary underline-offset-4 hover:underline"
              >
                লগইন করুন
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <RegisterPageContent />
    </Suspense>
  );
}
