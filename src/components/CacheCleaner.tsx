"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Update this version string whenever you want to force a cleanup for all users
// This MUST match the string set in src/app/verify/page.tsx
const CURRENT_APP_VERSION = "v2.0.0-auth-migration"; 
const VERSION_KEY = "app_version";

export default function CacheCleaner() {
  const pathname = usePathname();

  useEffect(() => {
    // Don't run this check on the verify page itself to avoid loops/conflicts
    if (pathname === "/verify") return;

    if (typeof window !== "undefined") {
      try {
        const storedVersion = localStorage.getItem(VERSION_KEY);

        if (storedVersion !== CURRENT_APP_VERSION) {
          console.log("Detecting old app version. Redirecting to verification...");
          // Hard redirect to the verification/cleanup page
          const redirectUrl = pathname && pathname !== "/" ? `/verify?redirect=${encodeURIComponent(pathname)}` : "/verify";
          window.location.href = redirectUrl;
        }
      } catch (err) {
        console.error("Version check failed:", err);
      }
    }
  }, [pathname]);

  return null;
}
