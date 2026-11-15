import { useState } from 'react';
import { Bell, CheckCheck, LogIn, LogOut, Menu, Moon, Sun, X } from 'lucide-react';
import type { User } from '../lib/firebase';
import type { ActivePortal, AppNotification } from '../types/logistics';
import { OfflineIndicator, PWAInstallButton } from './PWAInstallButton';

interface NavbarProps {
  activePortal: ActivePortal;
  onSelectPortal: (portal: ActivePortal) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
  onQuickQuoteClick: () => void;
  authLoading: boolean;
  notifications: AppNotification[];
  onMarkNotificationsRead: () => void;
}

const PORTAL_ITEMS: { id: ActivePortal; label: string }[] = [
  { id: 'showcase', label: 'Site Vitrine' },
  { id: 'client', label: 'Portail Client' },
  { id: 'driver', label: 'App Chauffeur' },
  { id: 'docs', label: 'Scanner · CMR · DECA' },
  { id: 'admin', label: 'Admin Flotte' },
];

export function Navbar({
  activePortal,
  onSelectPortal,
  isDark,
  onToggleTheme,
  user,
  onSignIn,
  onSignOut,
  onQuickQuoteClick,
  authLoading,
  notifications,
  onMarkNotificationsRead,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNavSection = (anchorId: string) => {
    setMobileMenuOpen(false);
    if (activePortal !== 'showcase') {
      onSelectPortal('showcase');
      setTimeout(() => {
        document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <>
      <OfflineIndicator />

      {/* Top Bar Contract: strictly 3 zones separated by gap-8 */}
      <header className="relative z-40 border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
          {/* Zone 1: Brand emblem + single-line wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onSelectPortal('showcase');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-md"
          >
            <img
              src="/assets/aistudio/image_28715b4e.png"
              alt="Logo Boua Trans"
              referrerPolicy="no-referrer"
              className="h-9 w-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 bg-white"
            />
            <span className="font-display text-lg font-extrabold tracking-tight text-[#0B1F3A] dark:text-white">
              BOUA TRANS
            </span>
          </a>

          {/* Zone 2: 4 concise single-line nav links */}
          <nav
            aria-label="Navigation principale"
            className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600 dark:text-slate-300"
          >
            <button
              type="button"
              onClick={() => handleNavSection('suivi')}
              className="hover:text-[#0B1F3A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Suivi colis
            </button>
            <button
              type="button"
              onClick={() => handleNavSection('devis')}
              className="hover:text-[#0B1F3A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Devis Europe
            </button>
            <button
              type="button"
              onClick={() => handleNavSection('zone-intervention')}
              className="hover:text-[#0B1F3A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Zone Europe
            </button>
            <button
              type="button"
              onClick={() => handleNavSection('actualites')}
              className="hover:text-[#0B1F3A] dark:hover:text-white hover:underline underline-offset-4 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Médias & Infos
            </button>
          </nav>

          {/* Zone 3: 1 primary CTA */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={onQuickQuoteClick}
              className="hidden sm:inline-flex items-center justify-center rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
            >
              Devis express
            </button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
              aria-expanded={mobileMenuOpen}
              className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavSection('suivi')}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Suivi colis
              </button>
              <button
                type="button"
                onClick={() => handleNavSection('devis')}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Devis Europe
              </button>
              <button
                type="button"
                onClick={() => handleNavSection('zone-intervention')}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Zone Europe
              </button>
              <button
                type="button"
                onClick={() => handleNavSection('actualites')}
                className="text-left px-3 py-2.5 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900"
              >
                Médias & Infos
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onQuickQuoteClick();
                }}
                className="col-span-2 text-center px-3 py-2.5 rounded-lg text-sm font-semibold bg-orange-600 text-white"
              >
                Devis express
              </button>
            </div>
          </div>
        )}
      </header>

      {/* Workspace Role, PWA Install & Notifications Bar (in normal flow, below header) */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-900/70">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 sm:px-6 lg:px-8 py-2.5">
          <div
            role="tablist"
            aria-label="Sélecteur de portail opérationnel"
            className="flex flex-nowrap overflow-x-auto max-w-full items-center gap-1 p-1 rounded-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800"
          >
            {PORTAL_ITEMS.map((item) => {
              const isActive = activePortal === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onSelectPortal(item.id)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-[#0B1F3A] text-white dark:bg-orange-600 dark:text-white'
                      : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/70'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2 max-w-full">
            <PWAInstallButton />

            {/* Real-time notifications popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((prev) => !prev)}
                aria-label="Notifications en temps réel"
                aria-expanded={notifOpen}
                data-testid="notifications-toggle-btn"
                className="relative inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Bell className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                {unreadCount > 0 && (
                  <span className="font-mono text-[11px] font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                    <span className="font-display text-xs font-bold text-[#0B1F3A] dark:text-white">
                      Alertes & Messagerie ({unreadCount} non lues)
                    </span>
                    {unreadCount > 0 && (
                      <button
                        type="button"
                        onClick={() => onMarkNotificationsRead()}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
                      >
                        <CheckCheck className="h-3 w-3" />
                        <span>Tout lire</span>
                      </button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800">
                    {notifications.length === 0 ? (
                      <p className="p-4 text-xs text-slate-500">Aucune notification récente.</p>
                    ) : (
                      notifications.slice(0, 6).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 text-xs space-y-1 ${
                            n.read ? 'opacity-70' : 'bg-orange-50/40 dark:bg-orange-950/20'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {n.title}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {new Date(n.createdAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300">{n.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="px-4 py-2.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        setNotifOpen(false);
                        onSelectPortal('admin');
                      }}
                      className="text-[11px] font-semibold text-[#0B1F3A] dark:text-orange-400 hover:underline cursor-pointer"
                    >
                      Ouvrir Admin & Messagerie →
                    </button>
                    <button
                      type="button"
                      onClick={() => setNotifOpen(false)}
                      className="text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Fermer
                    </button>
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Activer le thème clair' : 'Activer le thème sombre'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isDark ? (
                <Sun className="h-3.5 w-3.5 text-orange-400" />
              ) : (
                <Moon className="h-3.5 w-3.5 text-[#0B1F3A]" />
              )}
              <span>{isDark ? 'Clair' : 'Sombre'}</span>
            </button>

            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:inline text-xs font-medium text-slate-700 dark:text-slate-300 max-w-[140px] truncate">
                  {user.displayName || user.email}
                </span>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Déconnexion</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={onSignIn}
                disabled={authLoading}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold text-[#0B1F3A] dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <LogIn className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                <span>{authLoading ? 'Connexion...' : 'Connexion Google'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
