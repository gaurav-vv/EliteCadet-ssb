import Image from "next/image";
import { getBrandImage } from "@/lib/academy/brand-images";

// Wide banner beside the greeting. Shows the image you place at
// public/academy/hero-banner.(jpg|png|webp) as-is (so any text should be in
// the image); without one, a plain navy card with the quote.
export function DashboardHero() {
  const image = getBrandImage("hero-banner");

  if (image) {
    return (
      <section aria-label="SSB Path Academy" className="relative aspect-[1330/188] w-full min-w-0 min-h-[96px] overflow-hidden rounded-card border border-hairline xl:min-h-0">
        <Image src={image} alt="A disciplined mind builds an extraordinary future." fill sizes="600px" priority className="object-cover object-left" />
      </section>
    );
  }

  return (
    <section
      aria-label="SSB Path Academy"
      className="flex min-h-[104px] flex-col justify-center rounded-card border border-(--academy-navy-line) bg-(--academy-navy) px-6 py-5 sm:px-8"
    >
      <p className="text-[11px] font-semibold tracking-[0.16em] text-(--academy-gold)">SSB PATH ACADEMY</p>
      <p className="mt-1 max-w-[30ch] text-[18px] leading-snug font-semibold text-white italic sm:text-[20px]">
        &ldquo;A disciplined mind builds an extraordinary future.&rdquo;
      </p>
    </section>
  );
}
