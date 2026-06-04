import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { AppFooter } from "@/components/AppFooter";

export const metadata: Metadata = {
  title: "eSonoya — Passeport Guinée en ligne",
};

export default function HomePage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/mspc.jpeg"   alt="MSPC"    width={52} height={52} className="object-contain rounded" />
            <Image src="/dcpaf.jpg"   alt="DCPAF"   width={52} height={52} className="object-contain rounded" />
            <Image src="/esonoya.png" alt="eSonoya" width={140} height={40} className="object-contain" />
          </div>
          <div className="flex items-center gap-4">
            <Image src="/branging.jpeg" alt="Guinée" width={80} height={32} className="object-contain" />
            <Link
              href="/auth"
              className="text-sm font-semibold text-white bg-blue-900 px-4 py-2 rounded-lg hover:bg-blue-800 transition-colors"
            >
              Se connecter
            </Link>
          </div>
        </div>
      </header>

      {/* ── Bandeau drapeau ── */}
      <div className="flex h-1.5 w-full">
        <div className="flex-1 bg-[#CE1126]" />
        <div className="flex-1 bg-[#FCD116]" />
        <div className="flex-1 bg-[#009460]" />
      </div>

      {/* ── Hero ── */}
      <section className="bg-gradient-to-br from-blue-950 to-blue-800 text-white px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-white/10 border border-white/20 text-xs font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
            Direction Centrale de la Police aux Frontières (DCPAF)
          </span>
          <h1 className="text-3xl sm:text-5xl font-bold leading-tight mb-4">
            Votre Processus de demande de passeport guinéen<br />
            <span className="text-yellow-300">dématérialisé</span>
          </h1>
          <p className="text-blue-200 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
            Prenez rendez-vous dans un centre agréé, préparez votre dossier et
            recevez votre ticket numérique avec QR code — le tout depuis votre téléphone.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/prendre-rdv"
              className="inline-flex items-center justify-center gap-2 bg-yellow-400 text-blue-950 font-bold px-8 py-3.5 rounded-xl hover:bg-yellow-300 transition-colors text-base"
            >
              📅 Prendre un rendez-vous
            </Link>
            <Link
              href="/auth"
              className="inline-flex items-center justify-center gap-2 bg-white/10 border border-white/30 text-white font-semibold px-8 py-3.5 rounded-xl hover:bg-white/20 transition-colors text-base"
            >
              Mon espace citoyen
            </Link>
          </div>
        </div>
      </section>

      {/* ── Types de passeport ── */}
      <section className="px-4 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Types de passeport biométrique
          </h2>
          <p className="text-gray-500 text-center text-sm mb-8">
            La République de Guinée délivre trois types de passeports biométriques.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                color:   "bg-green-700",
                border:  "border-green-200",
                badge:   "bg-green-100 text-green-800",
                type:    "Ordinaire",
                color2:  "Vert",
                desc:    "Délivré aux citoyens guinéens pour les déplacements internationaux à titre personnel.",
                icon:    "🛂",
              },
              {
                color:   "bg-blue-700",
                border:  "border-blue-200",
                badge:   "bg-blue-100 text-blue-800",
                type:    "De service",
                color2:  "Bleu",
                desc:    "Réservé aux agents de l'État en mission officielle à l'étranger.",
                icon:    "🏛️",
              },
              {
                color:   "bg-red-700",
                border:  "border-red-200",
                badge:   "bg-red-100 text-red-800",
                type:    "Diplomatique",
                color2:  "Rouge",
                desc:    "Attribué aux personnalités et diplomates habilités par l'État.",
                icon:    "🎖️",
              },
            ].map((p) => (
              <div key={p.type} className={`rounded-2xl border ${p.border} overflow-hidden shadow-sm`}>
                <div className={`${p.color} px-5 py-6 text-white text-center`}>
                  <div className="text-4xl mb-2">{p.icon}</div>
                  <p className="font-bold text-lg">{p.type}</p>
                  <span className={`inline-block mt-1 text-xs font-semibold px-2 py-0.5 rounded-full ${p.badge}`}>
                    Couverture {p.color2}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <p className="text-sm text-gray-600 leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Délais express ── */}
      {/* <section className="bg-gray-50 border-y border-gray-200 px-4 py-10">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">
            Délais de traitement disponibles
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { delay: "20 jours", label: "Standard",  color: "bg-blue-50 border-blue-200 text-blue-900" },
              { delay: "72 h",     label: "Rapide",    color: "bg-green-50 border-green-200 text-green-900" },
              { delay: "48 h",     label: "Urgent",    color: "bg-orange-50 border-orange-200 text-orange-900" },
              { delay: "24 h",     label: "Express",   color: "bg-red-50 border-red-200 text-red-900" },
            ].map((d) => (
              <div key={d.delay} className={`rounded-xl border-2 p-4 text-center ${d.color}`}>
                <p className="text-2xl font-bold">{d.delay}</p>
                <p className="text-xs font-semibold mt-1 opacity-70 uppercase tracking-wide">{d.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section> */}

 {/* ── Procédure ── */}
      <section className="bg-blue-950 text-white px-4 py-14">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">
            Procédure de délivrance
          </h2>
          <p className="text-blue-300 text-center text-sm mb-10">
            Suivez ces étapes pour obtenir votre passeport.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { step: "01", title: "Prise de rendez-vous", desc: "Réservez votre créneau en ligne via eSonoya." },
              { step: "02", title: "Paiement des frais (reçu bancaire)", desc: "Effectuez le paiement au guichet agréé et conservez le reçu." },
              { step: "03", title: "Enrôlement biométrique", desc: "Présentez-vous au centre le jour J avec vos documents." },
              { step: "04", title: "Retrait du passeport", desc: "Revenez récupérer votre passeport dans le délai choisi." },
            ].map((s) => (
              <div key={s.step} className="flex flex-col gap-2">
                <span className="text-4xl font-black text-yellow-400 opacity-80">{s.step}</span>
                <h3 className="font-bold text-white text-sm">{s.title}</h3>
                <p className="text-blue-300 text-xs leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Documents requis ── */}
      <section className="px-4 py-14 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Documents obligatoires
          </h2>
          <p className="text-gray-500 text-center text-sm mb-8">
            Préparez ces pièces avant votre rendez-vous.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                title: "Première demande",
                icon: "🆕",
                docs: [
                  "Acte de naissance original + copie certifiée",
                  "2 photos d'identité (fond blanc, 4×4 cm)",
                  "Réçu de paiement original",
                  "Pièce d'identité des parents (uniquement pour les enfants de 0 à 17 ans)",
                ],
              },
              {
                title: "Renouvellement",
                icon: "🔄",
                docs: [
                  "Ancien passeport (original)",
                  "2 photos d'identité (fond blanc, 4×4 cm)",
                  "Réçu de paiement original",
                  "Pièce d'identité des parents (uniquement pour les enfants de 0 à 17 ans)",
                ],
              },
              {
                title: "Duplicata",
                icon: "📋",
                docs: [
                  "Déclaration de perte ou vol (police)",
                  "2 photos d'identité (fond blanc, 4×4 cm)",
                  "Réçu de paiement original",
                ],
              },
            ].map((cat) => (
              <div key={cat.title} className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="font-bold text-amber-900 text-sm">{cat.title}</h3>
                </div>
                <ul className="space-y-2">
                  {cat.docs.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-xs text-amber-800">
                      <span className="text-amber-500 mt-0.5 flex-shrink-0">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pièces première demande ── */}
      <section className="px-4 py-14 bg-gray-50 border-t border-gray-200">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
            Pièces à fournir pour la première demande de passeport
          </h2>
          <p className="text-gray-500 text-center text-sm mb-8">
            Les documents varient selon votre situation.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              {
                title: "Pour les naturalisés",
                icon: "📜",
                docs: [
                  "Une copie du décret de naturalisation",
                  "Une copie de l'extrait d'acte de naissance",
                  "Une photocopie légalisée de la Carte Nationale d'Identité",
                  "Un extrait légalisé d'acte de mariage (pour la femme mariée)",
                  "Une autorisation parentale légalisée pour les mineurs",
                  "Un certificat de nationalité sécurisé",
                  "Un récépissé de paiement des droits de passeport",
                  "Un certificat de résidence datant de moins de trois mois",
                  "Deux photos d'identité en fond blanc",
                ],
              },
              {
                title: "Pour l'étranger adopté par un Guinéen",
                icon: "👨‍👧",
                docs: [
                  "Un jugement d'adoption",
                  "Un certificat de nationalité sécurisé",
                  "Une copie de l'extrait d'acte de naissance",
                  "Une photocopie légalisée de la Carte Nationale d'Identité",
                  "Une autorisation parentale légalisée pour les mineurs",
                  "Un certificat de nationalité guinéenne de l'adoptant",
                  "Un récépissé de paiement des droits de passeport",
                  "Un certificat de résidence datant de moins de trois mois",
                  "Deux photos d'identité en fond blanc",
                ],
              },
              {
                title: "Pour la femme étrangère mariée avec un Guinéen",
                icon: "💍",
                docs: [
                  "Une copie de l'extrait d'acte de naissance",
                  "Une copie de l'extrait d'acte de mariage sécurisé",
                  "Une copie du certificat de nationalité",
                  "Une photocopie légalisée de la Carte Nationale d'Identité",
                  "Un récépissé de paiement des droits de passeport",
                  "Un certificat de nationalité de l'époux",
                  "Un certificat de résidence datant de moins de trois mois",
                  "Deux photos d'identité en fond blanc",
                ],
              },
            ].map((cat) => (
              <div key={cat.title} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="font-bold text-gray-900 text-sm">{cat.title}</h3>
                </div>
                <ul className="space-y-2">
                  {cat.docs.map((d) => (
                    <li key={d} className="flex items-start gap-2 text-xs text-gray-600">
                      <span className="text-blue-400 mt-0.5 flex-shrink-0">•</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="bg-gradient-to-r from-yellow-400 to-yellow-300 px-4 py-12">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-blue-950 mb-3">
            Prêt à prendre votre rendez-vous ?
          </h2>
          <p className="text-blue-900 text-sm mb-6">
            Réservez votre créneau maintenant — gratuit, simple et sans déplacement.
          </p>
          <Link
            href="/prendre-rdv"
            className="inline-flex items-center gap-2 bg-blue-900 text-white font-bold px-10 py-4 rounded-xl hover:bg-blue-800 transition-colors text-base shadow-lg"
          >
            📅 PRENDRE RENDEZ-VOUS
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <AppFooter />

    </main>
  );
}
