"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data remains fresh for 1 minute
            staleTime: 60 * 1000,
            // Keep data in cache for 5 minutes
            gcTime: 5 * 60 * 1000,
            // Don't retry on 404s
            retry: (failureCount, error: unknown) => {
              if ((error as { status?: number })?.status === 404) return false;
              return failureCount < 2;
            },
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
