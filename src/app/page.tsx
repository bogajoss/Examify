import { Header } from "@/components/landing/Header";
import { Hero } from "@/components/landing/Hero";
import { Footer } from "@/components/landing/Footer";
import { ScrollToTop } from "@/components/landing/ScrollToTop";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-background pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <Header />
      <main className="grow flex items-center pt-2 sm:pt-6">
        <Hero />
      </main>
      <Footer />
      <ScrollToTop />
    </div>
  );
}
