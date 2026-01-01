import {
  Globe,
  Mail,
  Send,
  Facebook,
  Youtube,
  Twitter,
  Instagram,
  Github,
  ArrowRight,
  NotebookText,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import dayjs from "@/lib/date-utils";

const socialLinks = [
  { label: "Website", href: "#", icon: Globe },
  { label: "Mail", href: "#", icon: Mail },
  { label: "Telegram", href: "#", icon: Send },
  {
    label: "Facebook",
    href: "#",
    icon: Facebook,
  },
  { label: "Youtube", href: "#", icon: Youtube },
  { label: "Twitter", href: "#", icon: Twitter },
  {
    label: "Instagram",
    href: "#",
    icon: Instagram,
  },
  { label: "Github", href: "#", icon: Github },
];

const footerLinks = [
  {
    title: "পণ্য",
    links: [
      { label: "লাইভ পরীক্ষা", href: "#" },
      { label: "বিশ্লেষণ", href: "#" },
      { label: "ব্যাচ ব্যবস্থাপনা", href: "#" },
      { label: "প্রশ্ন ব্যাংক", href: "#" },
    ],
  },
  {
    title: "সংস্থা",
    links: [
      { label: "আমাদের সম্পর্কে", href: "#" },
      { label: "ব্লগ", href: "#" },
      { label: "চাকরির সুযোগ", href: "#" },
      { label: "যোগাযোগ", href: "#" },
    ],
  },
  {
    title: "আইনি",
    links: [
      { label: "গোপনীয়তা নীতি", href: "#" },
      { label: "সেবার শর্তাবলী", href: "#" },
      { label: "কুকি নীতি", href: "#" },
      { label: "সতর্কতা", href: "#" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative w-full border-t border-border/40 bg-background overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl"></div>
      </div>

      {/* Main Footer Content */}
      <div className="relative z-10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-12 mb-12">
            {/* Brand Section */}
            <div className="lg:col-span-1">
              <Link
                href="/"
                className="inline-flex items-center space-x-2.5 group mb-4"
              >
                <div className="relative">
                  <div className="h-8 w-8 text-primary transition-transform duration-300 group-hover:scale-110">
                    <NotebookText size={32} className="h-full w-full" />
                  </div>
                  <div className="absolute inset-0 bg-primary/20 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity"></div>
                </div>
                <span className="font-bold text-lg bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                  Examify
                </span>
              </Link>

              <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                আপনার চূড়ান্ত পরীক্ষার প্রস্তুতি সঙ্গী। বিশ্বমানের শিক্ষা,
                ব্যক্তিগত গাইডেন্স এবং সফলতার পথ।
              </p>

              <div className="flex items-center flex-wrap gap-2">
                {socialLinks.map(({ href, icon: Icon, label }) => (
                  <a
                    key={label}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-card border border-primary/20 hover:border-primary/40 hover:bg-primary/10 transition-all duration-300 text-muted-foreground hover:text-primary"
                    aria-label={label}
                    href={href}
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links Columns */}
            {footerLinks.map((column, i) => (
              <div key={i}>
                <h3 className="font-semibold text-foreground mb-4">
                  {column.title}
                </h3>
                <ul className="space-y-2">
                  {column.links.map((link, linkIndex) => (
                    <li key={`${i}-${linkIndex}`}>
                      <Link
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-primary transition-colors duration-300"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Newsletter Section */}
          <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl border border-primary/30 p-8 sm:p-10 mb-12">
            <div className="max-w-md">
              <h3 className="text-lg sm:text-xl font-semibold mb-2">
                আপডেট পান
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                নতুন ফিচার এবং টিপস সরাসরি আপনার ইনবক্সে পান।
              </p>

              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="আপনার ইমেইল..."
                  className="flex-1 bg-background border-primary/20 focus:border-primary"
                />
                <Button
                  size="sm"
                  className="bg-gradient-to-r from-primary to-primary/80"
                >
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-border/40"></div>

          {/* Bottom Footer */}
          <div className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {dayjs().year()} Examify. সকল অধিকার সংরক্ষিত।
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
