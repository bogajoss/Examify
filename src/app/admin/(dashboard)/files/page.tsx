"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CustomLoader } from "@/components";

export default function RedirectToQuestionBank() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin/questions");
  }, [router]);

  return (
    <div className="flex h-64 items-center justify-center">
      <CustomLoader />
    </div>
  );
}
