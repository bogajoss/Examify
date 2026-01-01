import React from "react";
import Image from "next/image";

export const Logo = ({ className }: { className?: string }) => (
  <Image
    src="/icon.png"
    alt="Logo"
    width={100}
    height={100}
    className={className}
    style={{ width: "auto", height: "auto" }}
  />
);
