import Image from "next/image";

export function Logo({ size = 32, className = "" }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.jpg"
      alt="Community Health Practitioners Registration Board of Nigeria"
      width={size}
      height={size}
      priority
      className={`shrink-0 rounded-md object-contain ${className}`}
    />
  );
}
