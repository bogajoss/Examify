"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, CheckCircle, Zap } from "lucide-react";

export function Hero() {
  return (
    <div className="w-full">
      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 lg:py-24 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-2 gap-8 sm:gap-12 lg:gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-6 sm:space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-semibold text-primary">
                  বাংলাদেশের #১ পরীক্ষা প্রস্তুতি প্ল্যাটফর্ম
                </span>
              </div>

              {/* Main Heading */}
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                  <span className="bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent">
                    সাফল্যের পথে এক ধাপ এগিয়ে
                  </span>
                  <span className="block text-primary mt-2">Examify</span>
                </h1>
              </div>

              {/* Subtitle */}
              <p className="text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
                Examify-এর সাথে বিশ্বমানের পরীক্ষা প্রস্তুতি নিন। লাইভ পরীক্ষা,
                বিস্তারিত বিশ্লেষণ এবং ব্যক্তিগত গাইডেন্স সবই এক প্ল্যাটফর্মে।
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg hover:shadow-xl transition-all duration-300 group"
                >
                  <Link href="/register" className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    বিনামূল্যে শুরু করুন
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-primary/30 hover:bg-primary/5"
                >
                  <Link href="/exams" className="flex items-center gap-2">
                    ড্যাশবোর্ড
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-4 pt-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 border-2 border-background flex items-center justify-center text-xs font-bold text-white"
                    >
                      {i}
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">১০,০০০+</strong>{" "}
                  শিক্ষার্থী আমাদের বিশ্বাস করেন
                </p>
              </div>
            </div>

            {/* Right Illustration */}
            <div className="relative h-96 sm:h-[450px] lg:h-[500px]">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl blur-3xl"></div>
              <div className="relative h-full bg-gradient-to-br from-primary/10 to-transparent rounded-3xl border border-primary/20 flex items-center justify-center overflow-hidden">
                {/* Card Animation */}
                <div className="space-y-4 w-full max-w-xs px-6">
                  {[
                    { title: "গণিত পরীক্ষা", score: "95%" },
                    { title: "বাংলা পরীক্ষা", score: "88%" },
                    { title: "ইংরেজি পরীক্ষা", score: "92%" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="bg-card/80 backdrop-blur-sm rounded-xl p-4 border border-primary/20 animate-in fade-in slide-in-from-bottom"
                      style={{ animationDelay: `${i * 100}ms` }}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {item.title}
                        </span>
                        <span className="text-lg font-bold text-primary">
                          {item.score}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-primary/70 rounded-full"
                          style={{ width: item.score }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-12 sm:py-16 lg:py-20">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl border border-primary/30 p-8 sm:p-12 lg:p-16 text-center overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute inset-0 opacity-50">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent"></div>
            </div>

            <div className="relative z-10 space-y-6">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold">
                আপনার লক্ষ্য অর্জন করুন
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-base sm:text-lg">
                আজই শুরু করুন এবং হাজার হাজার সফল শিক্ষার্থীর সাথে যোগ দিন
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center pt-6">
                <Button
                  asChild
                  size="lg"
                  className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-white shadow-lg"
                >
                  <Link href="/register" className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    বিনামূল্যে শুরু করুন
                  </Link>
                </Button>

                <Button asChild size="lg" variant="outline">
                  <a href="mailto:mail@mnr.world">যোগাযোগ করুন</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
