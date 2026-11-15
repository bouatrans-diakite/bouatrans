import { useState } from 'react';
import { Download, Monitor, Share, Smartphone, WifiOff, X } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstalled, isIOS, hasNativePrompt, triggerNativeInstall } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  if (isInstalled) return null;

  const handleClick = async () => {
    if (hasNativePrompt) {
      const outcome = await triggerNativeInstall();
      if (outcome !== 'unavailable') return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void handleClick()}
        data-testid="pwa-install-btn"
        className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#13325C] dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Download className="h-3.5 w-3.5" />
        <span>Installer l’app</span>
      </button>

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <img
                  src="/pwa-192x192.png"
                  alt="Icône BOUA TRANS"
                  className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white"
                />
                <div>
                  <h2
                    id="pwa-install-modal-title"
                    className="font-display text-base font-bold text-[#0B1F3A] dark:text-white"
                  >
                    Installer BOUA TRANS sur votre appareil
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Application Web Progressive (Android, iOS, Windows, macOS)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Fermer la fenêtre d'installation"
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {isIOS ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span>Installation sur iPhone / iPad (Safari)</span>
                </p>
                <ol className="list-decimal list-inside space-y-1.5">
                  <li>
                    Appuyez sur le bouton <Share className="inline h-3.5 w-3.5 mx-0.5" />{' '}
                    <strong>Partager</strong> en bas de Safari.
                  </li>
                  <li>
                    Faites défiler et sélectionnez <strong>Sur l’écran d’accueil</strong>.
                  </li>
                  <li>
                    Confirmez <strong>Ajouter</strong> pour lancer BOUA TRANS en plein écran.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1.5">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span>Ordinateur (Chrome / Edge)</span>
                  </p>
                  <p>
                    Cliquez sur l’icône <strong>Installer</strong> dans la barre d’adresse ou dans le
                    menu du navigateur → <em>Installer BOUA TRANS</em>.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1.5">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span>Mobile Android / iOS</span>
                  </p>
                  <p>
                    Sur Android (Chrome), ouvrez le menu <strong>⋮ → Ajouter à l’écran d’accueil</strong>.
                    Sur iPhone/iPad (Safari), appuyez sur <strong>Partager → Sur l’écran d’accueil</strong>.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                Compris
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function OfflineIndicator() {
  const isOnline = useOnlineStatus();
  if (isOnline) return null;

  return (
    <div
      role="status"
      className="bg-amber-600 text-white text-xs font-medium py-1.5 px-4 text-center flex items-center justify-center gap-2"
    >
      <WifiOff className="h-3.5 w-3.5" />
      <span>Mode hors-ligne actif — vos données locales restent consultables.</span>
    </div>
  );
}
