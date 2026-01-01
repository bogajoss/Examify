"use client";

import { allData } from "@/lib/data";
import { Header } from "@/components/landing/Header";
import { Footer } from "@/components/landing/Footer";
import {
  Github,
  Linkedin,
  Mail,
  Twitter,
  Globe,
  Send,
  Facebook,
  Youtube,
  Instagram,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface SocialLinks {
  globe?: string;
  send?: string;
  facebook?: string;
  youtube?: string;
  github?: string;
  instagram?: string;
  mail?: string;
  linkedin?: string;
  twitter?: string;
}

export interface Contributor {
  name: string;
  role: string;
  bio: string;
  imageUrl: string;
  social: SocialLinks;
}

export const socialIcons: { [key in keyof SocialLinks]: React.ElementType } = {
  globe: Globe,
  send: Send,
  facebook: Facebook,
  youtube: Youtube,
  github: Github,
  instagram: Instagram,
  mail: Mail,
  linkedin: Linkedin,
  twitter: Twitter,
};

const ContributorCard: React.FC<{ contributor: Contributor }> = ({
  contributor,
}) => (
  <div className="group relative flex flex-col items-center text-center bg-card p-6 rounded-2xl border border-border shadow-sm hover:shadow-primary/20 hover:border-primary/50">
    <div className="relative h-32 w-32 mb-4">
      <Image
        src={contributor.imageUrl}
        alt={contributor.name}
        width={128}
        height={128}
        className="rounded-full object-cover border-4 border-card group-hover:border-primary/50"
      />
    </div>
    <h3 className="text-xl font-bold text-foreground">{contributor.name}</h3>
    <p className="text-primary font-medium">{contributor.role}</p>
    <p className="text-muted-foreground mt-2 text-sm flex-grow">
      {contributor.bio}
    </p>
    <div className="mt-4 flex space-x-2 flex-wrap justify-center">
      {Object.entries(contributor.social).map(([key, href]) => {
        const Icon = socialIcons[key as keyof SocialLinks];
        if (!Icon || !href) return null;
        return (
          <Link key={key} href={href} target="_blank" rel="noopener noreferrer">
            <Button variant="outline" size="icon" className="rounded-full">
              <Icon className="h-5 w-5" />
            </Button>
          </Link>
        );
      })}
    </div>
  </div>
);

export default function AboutPage() {
  const { title, description } = allData.aboutContent;
  const contributors = allData.contributorsList as Contributor[];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header />
      <main className="flex-grow font-bengali">
        <div className="container mx-auto px-2 pb-12">
          <div className="px-4 py-12">
            <h1 className="text-4xl md:text-5xl font-bold mb-4 gradient-text text-center animate-in fade-in duration-500">
              {title}
            </h1>
            <p className="text-lg text-muted-foreground text-center max-w-2xl mx-auto">
              {description}
            </p>
          </div>

          <div className="mt-20 text-center">
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {contributors.map((contributor: Contributor, index: number) => (
                <div
                  key={contributor.name}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <ContributorCard contributor={contributor} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
