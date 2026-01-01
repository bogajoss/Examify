"use client";
import { useState } from "react";
import { useAdminAuth } from "@/context/AdminAuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { AlertBox } from "@/components";

export default function AdminLoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAdminAuth();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await signIn(username, password);
      router.push("/admin");
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("লগইন ব্যর্থ হয়েছে। আপনার প্রমাণপত্র চেক করুন।");
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
            <Shield className="h-10 w-10 text-destructive" />
          </div>
          <CardTitle className="text-2xl">অ্যাডমিন লগইন</CardTitle>
          <CardDescription>
            অ্যাডমিন প্যানেলে প্রবেশ করতে আপনার প্রমাণপত্র লিখুন।
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            {error && (
              <AlertBox type="error" title="লগইন ব্যর্থ" description={error} />
            )}
            <div className="space-y-2">
              <Label htmlFor="username">ব্যবহারকারীর নাম</Label>
              <Input
                id="username"
                type="text"
                placeholder="আপনার ব্যবহারকারীর নাম"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
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
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  লগইন করা হচ্ছে...
                </>
              ) : (
                "লগইন"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
