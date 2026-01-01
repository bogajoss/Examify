import { supabase } from "@/lib/supabase";
import { getBatch, getExams, getUsers } from "@/lib/data-supabase";
import { BatchDetailsClient } from "./BatchDetailsClient";

export default async function BatchExamsPage({
  params,
}: {
  params: Promise<{ batch_id: string }>;
}) {
  const { batch_id } = await params;

  try {
    const [batch, exams, students] = await Promise.all([
      getBatch(batch_id),
      getExams(batch_id),
      getUsers(batch_id),
    ]);

    return (
      <BatchDetailsClient
        initialBatch={batch}
        initialExams={exams}
        initialEnrolledStudents={students}
      />
    );
  } catch (error) {
    console.error("তথ্য আনতে সমস্যা হয়েছে:", error);
    return <p>তথ্য আনতে সমস্যা হয়েছে।</p>;
  }
}
