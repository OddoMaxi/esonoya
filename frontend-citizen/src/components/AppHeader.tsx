import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

interface AppHeaderProps {
  maxWidth?: string;
  backHref?: string;
  backLabel?: string;
  actions?: ReactNode;
}

export function AppHeader({
  maxWidth = "max-w-2xl",
  backHref,
  backLabel = "← Retour",
  actions,
}: AppHeaderProps) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10">
      <div className={`${maxWidth} mx-auto flex items-center justify-between`}>

        {/* Left: back link (optional) + institution logos */}
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="text-gray-400 hover:text-gray-600 transition-colors text-sm"
            >
              {backLabel}
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Image src="/mspc.jpeg"   alt="MSPC"    width={56} height={56} className="object-contain rounded" />
            <Image src="/dcpaf.jpg"   alt="DCPAF"   width={56} height={56} className="object-contain rounded" />
            <Image src="/esonoya.png" alt="eSonoya" width={140} height={40} className="object-contain" />
          </div>
        </div>

        {/* Center: page-specific actions (optional) */}
        {actions && (
          <div className="flex items-center gap-3">{actions}</div>
        )}

        {/* Right: Guinée branding */}
        <Image
          src="/branging.jpeg"
          alt="Guinée"
          width={90}
          height={36}
          className="object-contain"
        />
      </div>
    </header>
  );
}
