import Image from "next/image";

export function AppHeader() {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-2">
      <div className="max-w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image src="/mspc.jpeg"   alt="MSPC"    width={56} height={56} className="object-contain rounded" />
          <Image src="/dcpaf.jpg"   alt="DCPAF"   width={56} height={56} className="object-contain rounded" />
          <Image src="/esonoya.png" alt="eSonoya" width={140} height={40} className="object-contain" />
        </div>
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
