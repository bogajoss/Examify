"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { apiRequest } from "@/lib/api";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@/lib/types";
import { setCookie, deleteCookie } from "@/lib/cookie";

type AuthContextType = {
  user: User | null;
  signIn: (
    rollNumber: string,
    password: string,
    redirectTo?: string,
  ) => Promise<void>;
  signOut: () => void;
  loading: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Guard against server-side rendering
    if (typeof window === "undefined") {
      setLoading(false);
      return;
    }

    // This code now runs only on the client
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        setUser(JSON.parse(storedUser));
        setCookie("student-token", "true");
      }
    } catch (error) {
      console.error("Failed to parse user from localStorage", error);
      if (typeof window !== "undefined") {
        localStorage.removeItem("user");
        deleteCookie("student-token");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const signIn = async (
    rollNumber: string,
    password: string,
    redirectTo?: string,
  ) => {
    let actualRollNumber = rollNumber;
    if (rollNumber.includes("-")) {
      const parts = rollNumber.split("-");
      if (parts.length > 1 && parts[1]) {
        actualRollNumber = parts[1].trim();
      }
    }

    const { data: userData, error } = await supabase
      .from("users")
      .select("*")
      .eq("roll", actualRollNumber)
      .eq("pass", password)
      .single();

    if (error || !userData) {
      throw new Error("ব্যবহারকারী খুঁজে পাওয়া যায়নি বা পাসওয়ার্ড ভুল।");
    }

    setUser(userData as User);

    // Guard localStorage access
    if (typeof window !== "undefined") {
      localStorage.setItem("user", JSON.stringify(userData));
      setCookie("student-token", "true");
    }

    if (redirectTo) {
      router.push(redirectTo);
    } else {
      router.push("/exams");
    }
  };

  const signOut = () => {
    setUser(null);

    // Guard localStorage access
    if (typeof window !== "undefined") {
      localStorage.removeItem("user");
      deleteCookie("student-token");
    }

    router.push("/login");
  };

  const value = {
    user,
    signIn,
    signOut,
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error(
      "useAuth অবশ্যই একটি AuthProvider এর মধ্যে ব্যবহার করতে হবে",
    );
  }
  return context;
};
