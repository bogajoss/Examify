import { getExams, getBatches } from "@/lib/data-supabase";
import { ExamsClient } from "./ExamsClient";

export default async function AdminExamsPage() {
  try {
    const [exams, batches] = await Promise.all([getExams(), getBatches()]);
    return <ExamsClient initialExams={exams} initialBatches={batches} />;
  } catch (error) {
    console.error("তথ্য আনতে সমস্যা হয়েছে:", error);
    return <p>তথ্য আনতে সমস্যা হয়েছে।</p>;
  }
}
