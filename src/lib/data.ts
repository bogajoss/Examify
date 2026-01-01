import type { Contributor } from "@/app/about/page";

export interface AboutContent {
  title: string;
  description: string;
  sections: Array<{
    title: string;
    content: string;
  }>;
  team: {
    heading: string;
  };
}

export const allData = {
  aboutContent: {
    title: "আমাদের সম্পর্কে",
    description:
      "Examify - বাংলাদেশের শীর্ষস্থানীয় অনলাইন পরীক্ষার প্ল্যাটফর্ম",
    sections: [
      {
        title: "আমাদের মিশন",
        content:
          "প্রতিটি ছাত্রছাত্রীকে মানসম্পন্ন শিক্ষা প্রদান এবং তাদের স্বপ্ন পূরণে সহায়তা করা আমাদের প্রধান লক্ষ্য।",
      },
      {
        title: "আমাদের ভিশন",
        content:
          "একটি আধুনিক এবং প্রযুক্তি-চালিত শিক্ষা ব্যবস্থা গড়ে তোলা যা সকল ছাত্রছাত্রীর জন্য সুলভ।",
      },
      {
        title: "আমাদের প্রতিশ্রুতি",
        content:
          "আমরা প্রতিশ্রুতিবদ্ধ যে প্রতিটি ছাত্রছাত্রী সর্বোচ্চ মানের শিক্ষা ও নির্দেশনা পাবে।",
      },
    ],
    team: {
      heading: "আমাদের দল",
    },
  } as AboutContent,

  contributorsList: [
    {
      name: "FrostFoe",
      role: "প্রধান ডেভলপার",
      bio: "এই প্ল্যাটফর্ম ডেভলপ থেকে শুরু করে পরিচালনা এবং এর কার্যকারিতা বৃদ্ধিতে কাজ করছেন।",
      imageUrl: "https://avatars.githubusercontent.com/u/175545919?v=4",
      social: {
        globe: "https://frostfoe.netlify.app/",
        send: "https://t.me/FrostFoe",
        facebook: "https://facebook.com/FrostFoe/",
        instagram: "https://instagram.com/FrostFoe/",
        github: "https://github.com/FrostFoe",
      },
    },
  ] as Contributor[],
};
