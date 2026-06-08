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
    <header className="bg-white border-b border-gray-200 px-3 py-2 sticky top-0 z-10">
      <div className={`${maxWidth} mx-auto flex items-center justify-between gap-2`}>

        {/* Left */}
        <div className="flex items-center gap-2 min-w-0">
          {backHref && (
            <Link
              href={backHref}
              className="text-gray-400 hover:text-gray-600 transition-colors text-sm flex-shrink-0 mr-1"
            >
              {backLabel}
            </Link>
          )}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Image src="/mspc.jpeg" alt="MSPC" width={40} height={40}
              className="object-contain rounded h-8 w-8 sm:h-10 sm:w-10" />
            <Image src="/dcpaf.jpg" alt="DCPAF" width={40} height={40}
              className="object-contain rounded h-8 w-8 sm:h-10 sm:w-10 hidden xs:block sm:block" />
            <Image src="/esonoya.png" alt="eSonoya" width={110} height={32}
              className="object-contain h-6 w-auto sm:h-8" />
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0 text-sm">
            {actions}
          </div>
        )}

        {/* Right: Guinée branding */}
        <Image
          src="/branging.jpeg"
          alt="Guinée"
          width={70}
          height={28}
          className="object-contain flex-shrink-0 h-7 w-auto sm:h-9"
        />
      </div>
    </header>
  );
}
