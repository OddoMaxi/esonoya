import Image from "next/image";

export function AppFooter() {
  return (
    <footer className="bg-black border-t border-gray-800 py-6 px-4">
      <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-center sm:items-start justify-between gap-5">

        {/* Left: texte + logos */}
        <div className="flex flex-col items-center sm:items-start gap-2">
          <p className="text-sm font-semibold text-gray-100 text-center sm:text-left">
            Ministère de la Sécurité et de la Protection Civile
          </p>
          <p className="text-xs text-gray-300 text-center sm:text-left">
            Direction Centrale de la Police aux Frontières (DCPAF)
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
            <Image src="/mspc.jpeg"   alt="MSPC"           width={36} height={36} className="object-contain rounded h-8 w-8" />
            <Image src="/dcpaf.jpg"   alt="DCPAF"          width={36} height={36} className="object-contain rounded h-8 w-8" />
            <Image src="/logo-V.png"  alt="Louba Services" width={110} height={44} className="object-contain h-10 w-auto" />
            <Image src="/esonoya.png" alt="eSonoya"        width={110} height={32} className="object-contain h-8 w-auto" />
          </div>
        </div>

        {/* Right: Simandou */}
        <Image
          src="/simandou2040.png"
          alt="Simandou 2040"
          width={180}
          height={90}
          className="object-contain flex-shrink-0 h-16 sm:h-24 w-auto"
        />
      </div>
    </footer>
  );
}
