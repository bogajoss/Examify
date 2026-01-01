import { getBatches } from "@/lib/data-supabase";
import { supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";
import { UsersClient } from "./UsersClient";
import { Card, CardFooter } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const USERS_PER_PAGE = 20;

async function getUsersSupabase(
  page: number,
  searchTerm: string,
  enrolledOnly: string = "1",
) {
  let query = supabase.from("users").select("*", { count: "exact" });

  if (searchTerm) {
    query = query.or(`name.ilike.%${searchTerm}%,roll.ilike.%${searchTerm}%`);
  }

  if (enrolledOnly === "1") {
    query = query.not("enrolled_batches", "is", null);
  }

  const from = (page - 1) * USERS_PER_PAGE;
  const to = from + USERS_PER_PAGE - 1;

  const { data, error, count } = await query
    .range(from, to)
    .order("created_at", { ascending: false });

  return {
    users: (data as User[]) || [],
    error: error ? { message: error.message } : null,
    count: count || 0,
  };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string;
    search?: string;
    enrolled_only?: string;
  }>;
}) {
  const params = await searchParams;
  const currentPage = Number(params.page) || 1;
  const searchTerm = params.search || "";
  const enrolledOnly = params.enrolled_only ?? "1";

  try {
    const [usersResult, batches] = await Promise.all([
      getUsersSupabase(currentPage, searchTerm, enrolledOnly),
      getBatches(),
    ]);

    const { users, error: usersError, count: totalUsers } = usersResult;

    if (usersError) {
      return <p>তথ্য আনতে সমস্যা হয়েছে: {usersError.message}</p>;
    }

    const totalPages = Math.ceil((totalUsers || 0) / USERS_PER_PAGE);

    const renderPageNumbers = () => {
      const pageNumbers = [];
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(
          <Link
            key={i}
            href={`/admin/users?page=${i}${searchTerm ? `&search=${searchTerm}` : ""}${enrolledOnly !== "1" ? `&enrolled_only=${enrolledOnly}` : ""}`}
            className={cn(
              buttonVariants({
                variant: i === currentPage ? "default" : "outline",
                size: "sm",
              }),
            )}
          >
            {i}
          </Link>,
        );
      }
      return pageNumbers;
    };

    return (
      <>
        <UsersClient initialUsers={users} initialBatches={batches} />
        {totalPages > 1 && (
          <>
            <Card className="mt-2">
              <CardFooter className="flex items-center justify-center p-6">
                <div className="flex flex-col items-center justify-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    পৃষ্ঠা {currentPage} এর {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={
                        currentPage > 1
                          ? `/admin/users?page=${currentPage - 1}${searchTerm ? `&search=${searchTerm}` : ""}${enrolledOnly !== "1" ? `&enrolled_only=${enrolledOnly}` : ""}`
                          : "#"
                      }
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        currentPage <= 1 && "pointer-events-none opacity-50",
                      )}
                      aria-disabled={currentPage <= 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      আগের
                    </Link>
                    <div className="flex items-center gap-2 flex-wrap justify-center">
                      {renderPageNumbers()}
                    </div>
                    <Link
                      href={
                        currentPage < totalPages
                          ? `/admin/users?page=${currentPage + 1}${searchTerm ? `&search=${searchTerm}` : ""}${enrolledOnly !== "1" ? `&enrolled_only=${enrolledOnly}` : ""}`
                          : "#"
                      }
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        currentPage >= totalPages &&
                          "pointer-events-none opacity-50",
                      )}
                      aria-disabled={currentPage >= totalPages}
                    >
                      পরবর্তী
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Link>
                  </div>
                </div>
              </CardFooter>
            </Card>
            <hr className="h-8 border-transparent" />
          </>
        )}
      </>
    );
  } catch (error) {
    console.error("তথ্য আনতে সমস্যা হয়েছে:", error);
    return <p>তথ্য আনতে সমস্যা হয়েছে।</p>;
  }
}
