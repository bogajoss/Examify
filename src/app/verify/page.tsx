"use client";

import { useEffect, useState, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCcw } from "lucide-react";
import { useSearchParams } from "next/navigation";

function VerifyPageContent() {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("সিস্টেম আপডেট চেক করা হচ্ছে...");
  const searchParams = useSearchParams();

  useEffect(() => {
    const performCleanup = async () => {
      // Step 1: Initialize
      await new Promise((r) => setTimeout(r, 500));
      setProgress(20);
      setStatus("পুরানো তথ্য মুছে ফেলা হচ্ছে...");

      // Step 2: Clear LocalStorage & SessionStorage
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.error("Storage clear failed", e);
      }
      setProgress(50);

      // Step 3: Clear Cookies
      try {
        const cookies = document.cookie.split(";");
        for (let i = 0; i < cookies.length; i++) {
          const cookie = cookies[i];
          const eqPos = cookie.indexOf("=");
          const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
          const host = window.location.hostname;
          const domain = host.startsWith("www.") ? host.slice(4) : host;
          
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + domain;
          document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=." + domain;
        }
      } catch (e) {
        console.error("Cookie clear failed", e);
      }
      setProgress(80);
      setStatus("ক্যাশ মেমোরি পরিষ্কার করা হচ্ছে...");

      // Step 4: Clear Service Workers / Cache Storage
      if ("caches" in window) {
        try {
          const keys = await caches.keys();
          await Promise.all(keys.map((name) => caches.delete(name)));
        } catch (e) {
          console.error("Cache storage clear failed", e);
        }
      }

      // Step 5: Clear IndexedDB (Used by Firebase and modern auth systems)
      if (window.indexedDB) {
        try {
          const databases = await window.indexedDB.databases();
          for (const db of databases) {
            if (db.name) window.indexedDB.deleteDatabase(db.name);
          }
        } catch (e) {
          console.error("IndexedDB clear failed", e);
        }
      }
      
      // Step 6: Unregister Service Workers
      if ("serviceWorker" in navigator) {
        try {
          const registrations = await navigator.serviceWorker.getRegistrations();
          for (const registration of registrations) {
            await registration.unregister();
          }
        } catch (e) {
          console.error("Service worker unregister failed", e);
        }
      }

      setProgress(100);
      setStatus("সম্পন্ন! আপনাকে নিবন্ধন পেজে নিয়ে যাওয়া হচ্ছে...");

      // Mark migration as done for this specific version in the NEW empty storage
      // This prevents the CacheCleaner from triggering again immediately
      // The version key must match what's in CacheCleaner.tsx
      localStorage.setItem("app_version", "v2.0.0-auth-migration");

      // Redirect after short delay
      setTimeout(() => {
        const redirect = searchParams.get("redirect");
        const url = `/register?migrated=true${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;
        window.location.href = url;
      }, 1000);
    };

    performCleanup();
  }, [searchParams]);

  const handleManualRedirect = () => {
    const redirect = searchParams.get("redirect");
    const url = `/register?migrated=true${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ""}`;
    window.location.href = url;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-2xl border-t-4 border-t-primary">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <RefreshCcw className="w-8 h-8 text-primary animate-spin-slow" />
          </div>
          <CardTitle className="text-2xl font-bold">সিস্টেম আপডেট</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <div className="space-y-2">
            <p className="text-muted-foreground">
              আমরা আমাদের সিস্টেম আপডেট করেছি। আপনার ব্রাউজারের পুরানো তথ্য মুছে ফেলা হচ্ছে যাতে আপনি নির্বিঘ্নে ব্যবহার করতে পারেন।
            </p>
            <p className="font-semibold text-primary">{status}</p>
          </div>

          <div className="w-full bg-secondary/30 h-2 rounded-full overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>

          <Button 
            className="w-full mt-4" 
            disabled={progress < 100}
            onClick={handleManualRedirect}
          >
            {progress < 100 ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                অপেক্ষা করুন...
              </>
            ) : (
              "নিবন্ধন করুন"
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
