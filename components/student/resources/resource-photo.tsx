import Image from "next/image";
import { cn } from "cn";
import type { ResourcePhoto } from "@/types/resources";

// An article's photograph (lib/content/resources/photos.ts), cropped to fill
// whatever fixed-ratio box the caller gives it, so every card's thumbnail has
// the same shape. Decorative by default (the card's title names the article);
// pass `describe` where the photo stands alone, e.g. the article hero.
export function ResourcePhotoImage({
  photo,
  sizes,
  className,
  describe = false,
  priority = false,
}: {
  photo: ResourcePhoto;
  sizes: string;
  className?: string;
  describe?: boolean;
  priority?: boolean;
}) {
  return (
    <Image
      src={photo.src}
      alt={describe ? photo.alt : ""}
      fill
      sizes={sizes}
      priority={priority}
      className={cn("object-cover", className)}
    />
  );
}

// "Photo: Author · Licence" with links, as the licence asks.
export function PhotoCredit({ photo, className }: { photo: ResourcePhoto; className?: string }) {
  return (
    <span className={cn("text-[11px] text-ink-secondary", className)}>
      Photo:{" "}
      <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-ink-secondary underline-offset-2 hover:underline">
        {photo.author}
      </a>
      {" · "}
      {photo.licenseUrl ? (
        <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer" className="text-ink-secondary underline-offset-2 hover:underline">
          {photo.license}
        </a>
      ) : (
        photo.license
      )}
      {" · Wikimedia Commons"}
      <span className="sr-only"> (links open in a new tab)</span>
    </span>
  );
}
