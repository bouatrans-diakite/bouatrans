import { MessageCircle } from 'lucide-react';

export function WhatsAppButton() {
  const whatsappUrl =
    'https://wa.me/34632607101?text=' +
    encodeURIComponent(
      'Bonjour BOUA TRANS, je souhaite obtenir des informations ou un devis de transport.',
    );

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Contacter Boua Trans sur WhatsApp au +34 632 60 71 01"
      className="fixed bottom-4 right-4 z-40 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white w-12 h-12 sm:w-auto sm:px-4 shadow-lg transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2"
    >
      <MessageCircle className="h-5 w-5 shrink-0" />
      <span className="hidden sm:inline text-xs font-semibold whitespace-nowrap">
        WhatsApp Dispatch
      </span>
    </a>
  );
}
