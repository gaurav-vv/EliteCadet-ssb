import Image from "next/image";
import { LogOut } from "lucide-react";
import { getBrandImage } from "@/lib/academy/brand-images";
import { logoutAction } from "@/lib/auth/actions";

interface WorkspaceSidebarFooterProps {
  // Signed-in person, then their context (academy name, or the role).
  userName: string;
  contextName: string;
  // Collapses with the icon rail between md and lg.
  collapsible?: boolean;
}

// Page-agnostic: motivational card + who is signed in + sign-out, on every
// workspace page. The card shows the image you place at
// public/academy/sidebar-card.(jpg|png|webp); without one it falls back to a
// plain text card. Compact on short viewports so it never pushes content off.
export function WorkspaceSidebarFooter({ userName, contextName, collapsible = false }: WorkspaceSidebarFooterProps) {
  const image = getBrandImage("sidebar-card");
  const hideOnRail = collapsible ? "max-lg:hidden" : "";

  return (
    <div className="flex flex-col gap-3">
      <figure
        className={`relative m-0 overflow-hidden rounded-card border border-(--academy-navy-line) bg-(--academy-navy-raised) ${hideOnRail}`}
      >
        {image ? (
          <div className="relative h-[260px] [@media(max-height:820px)]:h-[132px]">
            <Image src={image} alt="Targeting Better Officers Together" fill sizes="260px" className="object-cover object-top" />
          </div>
        ) : (
          <figcaption className="p-4">
            <p className="text-[15px] leading-snug font-semibold text-white">Building Better Officers</p>
            <p className="mt-1 text-[12px] text-white/60 [@media(max-height:820px)]:hidden">
              Discipline · Preparation · Leadership
            </p>
          </figcaption>
        )}
      </figure>

      <div className={`flex items-center gap-3 border-t border-(--academy-navy-line) pt-2 ${collapsible ? "max-lg:flex-col" : ""}`}>
        <div className={`min-w-0 flex-1 ${hideOnRail}`}>
          <p className="truncate text-[13px] font-medium text-white">{userName}</p>
          <p className="truncate text-[12px] text-white/60">{contextName}</p>
        </div>
        <form action={logoutAction}>
          <button
            type="submit"
            aria-label="Log out"
            title="Log out"
            className="flex size-11 items-center justify-center rounded-button text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <LogOut aria-hidden="true" size={18} />
          </button>
        </form>
      </div>
    </div>
  );
}
