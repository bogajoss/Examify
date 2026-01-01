import { getBatches } from "@/lib/data-supabase";
import { BatchesClient } from "./BatchesClient";

export default async function AdminBatchesPage() {
  try {
    const batches = await getBatches();
    return <BatchesClient initialBatches={batches} />;
  } catch (error) {
    console.error("ব্যাচ আনতে সমস্যা হয়েছে:", error);
    return <p>ব্যাচ আনতে সমস্যা হয়েছে।</p>;
  }
}
