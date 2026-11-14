import Image from "next/image";

interface BrandLogoProps {
  // Rendered width and height in px (the mark is a circle, so it is square).
  size?: number;
  className?: string;
}

// The EliteCadet mark (public/brand/elitecadet-logo.png). Decorative by
// default: every place it appears sits next to the brand name or inside a
// link that already has an aria-label. Its white disc keeps it legible on
// both white and navy backgrounds.
export function BrandLogo({ size = 36, className }: BrandLogoProps) {
  return (
    <Image
      src="/brand/elitecadet-logo.png"
      alt=""
      width={size}
      height={size}
      sizes={`${size}px`}
      className={className}
    />
  );
}
