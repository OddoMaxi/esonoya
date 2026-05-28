import Image from "next/image";

export function AppFooter() {
  return (
    <footer className="bg-black border-t border-gray-800 py-6 px-4">
      <div className="max-w-full mx-auto flex items-center justify-between gap-4">
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-gray-100">
            Ministère de la Sécurité et de la Protection Civile
          </p>
          <p className="text-xs text-gray-300">
            Direction Centrale de la Police aux Frontières (DCPAF)
          </p>
          <div className="flex items-center gap-3">
            <Image src="/mspc.jpeg"   alt="MSPC"           width={44} height={44} className="object-contain rounded" />
            <Image src="/dcpaf.jpg"   alt="DCPAF"          width={44} height={44} className="object-contain rounded" />
            <Image src="/logo-V.png"  alt="Louba Services" width={140} height={56} className="object-contain" />
            <Image src="/esonoya.png" alt="eSonoya"        width={145} height={41} className="object-contain" />
          </div>
        </div>
        <Image
          src="/simandou2040.png"
          alt="Simandou 2040"
          width={130}
          height={65}
          className="object-contain flex-shrink-0"
        />
      </div>
    </footer>
  );
}
