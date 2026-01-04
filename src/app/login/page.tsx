"use client";
import { useState, Suspense } from "react";
import { useAuth } from "@/context/AuthContext";
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
import { GraduationCap, Loader2 } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect } from "react";

function LoginPageContent() {
  const [rollNumber, setRollNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (searchParams.get("migrated") === "true") {
      const redirect = searchParams.get("redirect");
      const url = `/register?migrated=true${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;
      router.replace(url);
    }
  }, [searchParams, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const redirectTo = searchParams.get("redirect");
      await signIn(rollNumber, password, redirectTo || undefined);
      // signIn will now handle redirection
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("লগইন ব্যর্থ হয়েছে। আপনার রোল এবং পাসওয়ার্ড চেক করুন।");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center items-center mb-4">
            <GraduationCap className="h-10 w-10 text-primary" />
          </div>
          <CardTitle className="text-2xl">লগইন</CardTitle>
          <CardDescription>
            লগইন করতে আপনার রোল বা ফোন নম্বর ও পাসওয়ার্ড দিন
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="roll-number">
                রোল নম্বর / ফোন নম্বর (অফিসিয়ালি রোল না পেলে তোমার ফোন নম্বর
                দাও)
              </Label>
              <Input
                id="roll-number"
                type="text"
                placeholder="আপনার রোল বা ফোন নম্বর"
                value={rollNumber}
                onChange={(e) => setRollNumber(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">পাসওয়ার্ড</Label>
              <Input
                id="password"
                type="password"
                placeholder="আপনার পাসওয়ার্ড"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            {error && (
              <AlertBox type="error" title="লগইন ব্যর্থ" description={error} />
            )}
          </CardContent>
          <CardFooter className="flex-col">
            <Button
              type="submit"
              className="w-full hover:scale-105"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  লগইন হচ্ছে...
                </>
              ) : (
                "লগইন করুন"
              )}
            </Button>
            <p className="mt-4 text-center text-sm text-muted-foreground">
              অ্যাকাউন্ট নেই?{" "}
              <Link
                href={`/register${searchParams.get("redirect") ? `?redirect=${searchParams.get("redirect")}` : ""}`}
                className="underline hover:text-primary"
              >
                নিবন্ধন করুন
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <LoginPageContent />
    </Suspense>
  );
}
