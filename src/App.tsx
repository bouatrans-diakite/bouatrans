import { useEffect, useState } from 'react';
import { AdminConsole } from './components/AdminConsole';
import { ClientPortal } from './components/ClientPortal';
import { DriverPortal } from './components/DriverPortal';
import { Navbar } from './components/Navbar';
import { ScannerDocsPortal } from './components/ScannerDocsPortal';
import { ShowcaseLanding } from './components/ShowcaseLanding';
import { WhatsAppButton } from './components/WhatsAppButton';
import {
  SEED_CAPTURED_MEDIA,
  SEED_CHAT_MESSAGES,
  SEED_CMRS,
  SEED_DECAS,
  SEED_DRIVERS,
  SEED_FACTURAS,
  SEED_FUEL_LOGS,
  SEED_INVOICES,
  SEED_NOTIFICATIONS,
  SEED_PUBLICATIONS,
  SEED_QUOTES,
  SEED_ROUTES,
  SEED_SHIPMENTS,
  SEED_SITE_CONTENT,
  SEED_TRAILERS,
  SEED_TRANSPORT_DOCS,
  SEED_VEHICLES,
} from './data/seedData';
import {
  auth,
  googleProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from './lib/firebase';
import {
  ensureUserProfileInFirestore,
  isBootstrappedAdminEmail,
  saveChatMessageInFirestore,
  saveCmrInFirestore,
  saveDecaInFirestore,
  saveDriverInFirestore,
  saveFuelLogToFirestore,
  saveInvoiceInFirestore,
  savePublicationToFirestore,
  saveQuoteToFirestore,
  saveRouteInFirestore,
  saveShipmentAndTrackingAsAdmin,
  saveSiteContentToFirestore,
  saveTrailerInFirestore,
  saveTransportDocToFirestore,
  saveVehicleInFirestore,
  subscribeChatMessages,
  subscribeCmrs,
  subscribeDecas,
  subscribeDriversAsAdmin,
  subscribeFuelLogs,
  subscribeInvoicesAsAdmin,
  subscribePublicPublications,
  subscribeRoutesAsAdmin,
  subscribeSiteContent,
  subscribeTrailersAsAdmin,
  subscribeTransportDocs,
  subscribeUserQuotes,
  subscribeUserShipments,
  subscribeVehiclesAsAdmin,
  updateShipmentStatusInFirestore,
} from './services/firestoreSync';
import type {
  ActivePortal,
  AppNotification,
  CapturedMediaItem,
  ChatMessage,
  CmrDocumentData,
  DecaRecord,
  DriverProfile,
  FuelMileageLog,
  InvoiceRecord,
  LassineFacturaData,
  NewsPublication,
  QuoteRecord,
  RouteVoyageRecord,
  ShipmentRecord,
  ShipmentStatus,
  SiteContentConfig,
  TrailerRecord,
  TransportDocumentRecord,
  VehicleRecord,
  VehicleStatus,
} from './types/logistics';
import {
  formatFileSize,
  generateCmrReference,
  generateDecaReference,
} from './utils/logistics';
import { deleteVaultAsset, loadAllVaultAssets, saveVaultAsset } from './utils/mediaVaultDb';

const STORAGE_KEY = 'bouatrans_state_v2';
const THEME_KEY = 'bouatrans_theme_v1';
const SITE_CONTENT_KEY = 'bouatrans_site_content_v1';

interface StoredState {
  quotes: QuoteRecord[];
  shipments: ShipmentRecord[];
  vehicles: VehicleRecord[];
  trailers: TrailerRecord[];
  drivers: DriverProfile[];
  routes: RouteVoyageRecord[];
  invoices: InvoiceRecord[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  transportDocs: TransportDocumentRecord[];
  fuelLogs: FuelMileageLog[];
  publications: NewsPublication[];
  cmrs: CmrDocumentData[];
  decas: DecaRecord[];
  facturas: LassineFacturaData[];
}

function loadInitialSiteContent(): SiteContentConfig {
  try {
    const raw = localStorage.getItem(SITE_CONTENT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<SiteContentConfig>;
      if (parsed.heroTitle && parsed.hqAddress) {
        return {
          ...SEED_SITE_CONTENT,
          ...parsed,
        };
      }
    }
  } catch {
    // Fallback to seed site content
  }
  return SEED_SITE_CONTENT;
}

function loadInitialState(): StoredState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<StoredState>;
      return {
        quotes:
          Array.isArray(parsed.quotes) && parsed.quotes.length > 0 ? parsed.quotes : SEED_QUOTES,
        shipments:
          Array.isArray(parsed.shipments) && parsed.shipments.length > 0
            ? parsed.shipments
            : SEED_SHIPMENTS,
        vehicles:
          Array.isArray(parsed.vehicles) && parsed.vehicles.length > 0
            ? parsed.vehicles
            : SEED_VEHICLES,
        trailers:
          Array.isArray(parsed.trailers) && parsed.trailers.length > 0
            ? parsed.trailers
            : SEED_TRAILERS,
        drivers:
          Array.isArray(parsed.drivers) && parsed.drivers.length > 0
            ? parsed.drivers
            : SEED_DRIVERS,
        routes:
          Array.isArray(parsed.routes) && parsed.routes.length > 0 ? parsed.routes : SEED_ROUTES,
        invoices:
          Array.isArray(parsed.invoices) && parsed.invoices.length > 0
            ? parsed.invoices
            : SEED_INVOICES,
        messages:
          Array.isArray(parsed.messages) && parsed.messages.length > 0
            ? parsed.messages
            : SEED_CHAT_MESSAGES,
        notifications:
          Array.isArray(parsed.notifications) && parsed.notifications.length > 0
            ? parsed.notifications
            : SEED_NOTIFICATIONS,
        transportDocs:
          Array.isArray(parsed.transportDocs) && parsed.transportDocs.length > 0
            ? parsed.transportDocs
            : SEED_TRANSPORT_DOCS,
        fuelLogs:
          Array.isArray(parsed.fuelLogs) && parsed.fuelLogs.length > 0
            ? parsed.fuelLogs
            : SEED_FUEL_LOGS,
        publications:
          Array.isArray(parsed.publications) && parsed.publications.length > 0
            ? parsed.publications
            : SEED_PUBLICATIONS,
        cmrs: Array.isArray(parsed.cmrs) && parsed.cmrs.length > 0 ? parsed.cmrs : SEED_CMRS,
        decas: Array.isArray(parsed.decas) && parsed.decas.length > 0 ? parsed.decas : SEED_DECAS,
        facturas:
          Array.isArray(parsed.facturas) && parsed.facturas.length > 0
            ? parsed.facturas
            : SEED_FACTURAS,
      };
    }
  } catch {
    // Fallback cleanly to deterministic seed data
  }
  return {
    quotes: SEED_QUOTES,
    shipments: SEED_SHIPMENTS,
    vehicles: SEED_VEHICLES,
    trailers: SEED_TRAILERS,
    drivers: SEED_DRIVERS,
    routes: SEED_ROUTES,
    invoices: SEED_INVOICES,
    messages: SEED_CHAT_MESSAGES,
    notifications: SEED_NOTIFICATIONS,
    transportDocs: SEED_TRANSPORT_DOCS,
    fuelLogs: SEED_FUEL_LOGS,
    publications: SEED_PUBLICATIONS,
    cmrs: SEED_CMRS,
    decas: SEED_DECAS,
    facturas: SEED_FACTURAS,
  };
}

export default function App() {
  const initial = loadInitialState();
  const [activePortal, setActivePortal] = useState<ActivePortal>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('deca')) return 'docs';
    }
    return 'showcase';
  });
  const [highlightedDecaId, setHighlightedDecaId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('deca');
    }
    return null;
  });
  const [isDark, setIsDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem(THEME_KEY) === 'dark';
    } catch {
      return false;
    }
  });

  const [quotes, setQuotes] = useState<QuoteRecord[]>(initial.quotes);
  const [shipments, setShipments] = useState<ShipmentRecord[]>(initial.shipments);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>(initial.vehicles);
  const [trailers, setTrailers] = useState<TrailerRecord[]>(initial.trailers);
  const [drivers, setDrivers] = useState<DriverProfile[]>(initial.drivers);
  const [routes, setRoutes] = useState<RouteVoyageRecord[]>(initial.routes);
  const [invoices, setInvoices] = useState<InvoiceRecord[]>(initial.invoices);
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [notifications, setNotifications] = useState<AppNotification[]>(initial.notifications);
  const [transportDocs, setTransportDocs] = useState<TransportDocumentRecord[]>(
    initial.transportDocs,
  );
  const [fuelLogs, setFuelLogs] = useState<FuelMileageLog[]>(initial.fuelLogs);
  const [publications, setPublications] = useState<NewsPublication[]>(initial.publications);
  const [cmrs, setCmrs] = useState<CmrDocumentData[]>(initial.cmrs);
  const [decas, setDecas] = useState<DecaRecord[]>(initial.decas);
  const [facturas, setFacturas] = useState<LassineFacturaData[]>(initial.facturas);
  const [mediaVault, setMediaVault] = useState<CapturedMediaItem[]>(SEED_CAPTURED_MEDIA);
  const [siteContent, setSiteContent] = useState<SiteContentConfig>(loadInitialSiteContent);

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Hydrate server-generated DECA records with embedded QR codes on mount
  useEffect(() => {
    let cancelled = false;
    fetch('/api/deca')
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { decas?: DecaRecord[] } | null) => {
        if (cancelled || !data?.decas || data.decas.length === 0) return;
        setDecas((prev) => {
          const map = new Map(prev.map((d) => [d.id, d]));
          for (const rd of data.decas!) {
            map.set(rd.id, rd);
          }
          return Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        });
      })
      .catch(() => {
        // Keep local seed DECAs if server route unavailable
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Hydrate IndexedDB media vault on mount
  useEffect(() => {
    let cancelled = false;
    loadAllVaultAssets().then((storedAssets) => {
      if (cancelled) return;
      if (storedAssets.length > 0) {
        const map = new Map<string, CapturedMediaItem>();
        for (const seed of SEED_CAPTURED_MEDIA) map.set(seed.id, seed);
        for (const asset of storedAssets) map.set(asset.id, asset);
        setMediaVault(
          Array.from(map.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
        );
      } else {
        for (const seed of SEED_CAPTURED_MEDIA) {
          void saveVaultAsset(seed);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    try {
      localStorage.setItem(THEME_KEY, isDark ? 'dark' : 'light');
    } catch {
      // Ignore storage error
    }
  }, [isDark]);

  // Persist Site CMS content locally
  useEffect(() => {
    try {
      localStorage.setItem(SITE_CONTENT_KEY, JSON.stringify(siteContent));
    } catch {
      // Ignore storage error
    }
  }, [siteContent]);

  // Persist operational state locally (trimming large inline blobs if quota exceeded)
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          quotes,
          shipments,
          vehicles,
          trailers,
          drivers,
          routes,
          invoices,
          messages,
          notifications,
          transportDocs,
          fuelLogs,
          publications,
          cmrs,
          decas,
          facturas,
        }),
      );
    } catch {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            quotes,
            shipments,
            vehicles,
            trailers,
            drivers,
            routes,
            invoices,
            messages,
            notifications,
            transportDocs,
            fuelLogs,
            cmrs,
            decas,
            facturas,
            publications: publications.map((p) => ({
              ...p,
              videoPreviewData: undefined,
              fileDataUrl: undefined,
            })),
          }),
        );
      } catch {
        // Ignore storage quota errors
      }
    }
  }, [
    quotes,
    shipments,
    vehicles,
    trailers,
    drivers,
    routes,
    invoices,
    messages,
    notifications,
    transportDocs,
    fuelLogs,
    publications,
    cmrs,
    decas,
    facturas,
  ]);

  // Firebase Auth & Firestore Subscriptions
  useEffect(() => {
    let unsubQuotes: (() => void) | undefined;
    let unsubShipments: (() => void) | undefined;
    let unsubVehicles: (() => void) | undefined;
    let unsubTrailers: (() => void) | undefined;
    let unsubDrivers: (() => void) | undefined;
    let unsubRoutes: (() => void) | undefined;
    let unsubInvoices: (() => void) | undefined;
    let unsubMessages: (() => void) | undefined;
    let unsubDocs: (() => void) | undefined;
    let unsubFuel: (() => void) | undefined;
    let unsubCmrs: (() => void) | undefined;
    let unsubDecas: (() => void) | undefined;

    const unsubPubs = subscribePublicPublications((remotePubs) => {
      if (remotePubs.length > 0) {
        setPublications((prev) => {
          const map = new Map(prev.map((p) => [p.id, p]));
          for (const rp of remotePubs) {
            const existing = map.get(rp.id);
            map.set(rp.id, {
              ...rp,
              mediaPreviewData: rp.mediaPreviewData || existing?.mediaPreviewData,
              videoPreviewData: rp.videoPreviewData || existing?.videoPreviewData,
              fileDataUrl: rp.fileDataUrl || existing?.fileDataUrl,
            });
          }
          return Array.from(map.values()).sort((a, b) =>
            b.createdAt.localeCompare(a.createdAt),
          );
        });
      }
    });

    const unsubSiteContent = subscribeSiteContent((remoteContent) => {
      if (remoteContent.heroTitle) {
        setSiteContent(remoteContent);
      }
    });

    const unsubAuth = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      unsubQuotes?.();
      unsubShipments?.();
      unsubVehicles?.();
      unsubTrailers?.();
      unsubDrivers?.();
      unsubRoutes?.();
      unsubInvoices?.();
      unsubMessages?.();
      unsubDocs?.();
      unsubFuel?.();
      unsubCmrs?.();
      unsubDecas?.();

      if (!nextUser) return;

      try {
        await ensureUserProfileInFirestore(nextUser);
        const adminMode = isBootstrappedAdminEmail(nextUser.email);

        unsubQuotes = subscribeUserQuotes(nextUser.uid, adminMode, (remoteQuotes) => {
          if (remoteQuotes.length > 0) {
            setQuotes((prev) => {
              const map = new Map(prev.map((q) => [q.id, q]));
              for (const rq of remoteQuotes) map.set(rq.id, rq);
              return Array.from(map.values()).sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              );
            });
          }
        });

        unsubShipments = subscribeUserShipments(nextUser.uid, adminMode, (remoteShipments) => {
          if (remoteShipments.length > 0) {
            setShipments((prev) => {
              const map = new Map(prev.map((s) => [s.id, s]));
              for (const rs of remoteShipments) map.set(rs.id, rs);
              return Array.from(map.values()).sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              );
            });
          }
        });

        unsubDocs = subscribeTransportDocs(nextUser.uid, adminMode, (remoteDocs) => {
          if (remoteDocs.length > 0) {
            setTransportDocs((prev) => {
              const map = new Map(prev.map((d) => [d.id, d]));
              for (const rd of remoteDocs) map.set(rd.id, rd);
              return Array.from(map.values()).sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              );
            });
          }
        });

        unsubFuel = subscribeFuelLogs(nextUser.uid, adminMode, (remoteFuel) => {
          if (remoteFuel.length > 0) {
            setFuelLogs((prev) => {
              const map = new Map(prev.map((f) => [f.id, f]));
              for (const rf of remoteFuel) map.set(rf.id, rf);
              return Array.from(map.values()).sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              );
            });
          }
        });

        unsubMessages = subscribeChatMessages(nextUser.uid, adminMode, (remoteMsgs) => {
          if (remoteMsgs.length > 0) {
            setMessages((prev) => {
              const map = new Map(prev.map((m) => [m.id, m]));
              for (const rm of remoteMsgs) map.set(rm.id, rm);
              return Array.from(map.values()).sort((a, b) =>
                a.createdAt.localeCompare(b.createdAt),
              );
            });
          }
        });

        unsubCmrs = subscribeCmrs(nextUser.uid, adminMode, (remoteCmrs) => {
          if (remoteCmrs.length > 0) {
            setCmrs((prev) => {
              const map = new Map(prev.map((c) => [c.id, c]));
              for (const rc of remoteCmrs) map.set(rc.id, rc);
              return Array.from(map.values()).sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              );
            });
          }
        });

        unsubDecas = subscribeDecas(nextUser.uid, adminMode, (remoteDecas) => {
          if (remoteDecas.length > 0) {
            setDecas((prev) => {
              const map = new Map(prev.map((d) => [d.id, d]));
              for (const rd of remoteDecas) {
                const existing = map.get(rd.id);
                map.set(rd.id, {
                  ...rd,
                  qrCodeDataUrl: rd.qrCodeDataUrl || existing?.qrCodeDataUrl || '',
                });
              }
              return Array.from(map.values()).sort((a, b) =>
                b.createdAt.localeCompare(a.createdAt),
              );
            });
          }
        });

        if (adminMode) {
          unsubVehicles = subscribeVehiclesAsAdmin((remoteVehicles) => {
            if (remoteVehicles.length > 0) {
              setVehicles((prev) => {
                const map = new Map(prev.map((v) => [v.id, v]));
                for (const rv of remoteVehicles) map.set(rv.id, rv);
                return Array.from(map.values());
              });
            }
          });
          unsubTrailers = subscribeTrailersAsAdmin((remoteTrailers) => {
            if (remoteTrailers.length > 0) {
              setTrailers((prev) => {
                const map = new Map(prev.map((t) => [t.id, t]));
                for (const rt of remoteTrailers) map.set(rt.id, rt);
                return Array.from(map.values());
              });
            }
          });
          unsubDrivers = subscribeDriversAsAdmin((remoteDrivers) => {
            if (remoteDrivers.length > 0) {
              setDrivers((prev) => {
                const map = new Map(prev.map((d) => [d.id, d]));
                for (const rd of remoteDrivers) map.set(rd.id, rd);
                return Array.from(map.values());
              });
            }
          });
          unsubRoutes = subscribeRoutesAsAdmin((remoteRoutes) => {
            if (remoteRoutes.length > 0) {
              setRoutes((prev) => {
                const map = new Map(prev.map((r) => [r.id, r]));
                for (const rr of remoteRoutes) map.set(rr.id, rr);
                return Array.from(map.values());
              });
            }
          });
          unsubInvoices = subscribeInvoicesAsAdmin((remoteInvoices) => {
            if (remoteInvoices.length > 0) {
              setInvoices((prev) => {
                const map = new Map(prev.map((i) => [i.id, i]));
                for (const ri of remoteInvoices) map.set(ri.id, ri);
                return Array.from(map.values());
              });
            }
          });
        }
      } catch (err) {
        console.error('Auth/Firestore synchronization error:', err);
      }
    });

    return () => {
      unsubPubs();
      unsubSiteContent();
      unsubAuth();
      unsubQuotes?.();
      unsubShipments?.();
      unsubVehicles?.();
      unsubTrailers?.();
      unsubDrivers?.();
      unsubRoutes?.();
      unsubInvoices?.();
      unsubMessages?.();
      unsubDocs?.();
      unsubFuel?.();
      unsubCmrs?.();
      unsubDecas?.();
    };
  }, []);

  const pushNotification = (
    type: AppNotification['type'],
    title: string,
    body: string,
  ) => {
    setNotifications((prev) => [
      {
        id: `notif-${Date.now().toString(36)}`,
        type,
        title,
        body,
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...prev.slice(0, 19),
    ]);
  };

  const handleSignIn = async () => {
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-In failed:', err);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-Out failed:', err);
    }
  };

  const handleSubmitQuote = async (quote: QuoteRecord): Promise<{ savedToFirestore: boolean }> => {
    setQuotes((prev) => [quote, ...prev]);

    if (user && user.emailVerified) {
      try {
        await saveQuoteToFirestore(quote, user.uid);
        return { savedToFirestore: true };
      } catch (err) {
        console.error('Firestore quote save failed:', err);
      }
    }
    return { savedToFirestore: false };
  };

  const handleConvertQuoteToShipment = (quoteId: string) => {
    const targetQuote = quotes.find((q) => q.id === quoteId);
    if (!targetQuote) return;

    const nowIso = new Date().toISOString();
    const numSuffix = Math.floor(100 + Math.random() * 899);
    const trackingNumber = `BT-2026-${numSuffix}`;
    const newShipment: ShipmentRecord = {
      id: `shp-${Date.now().toString(36)}`,
      trackingNumber,
      quoteId: targetQuote.id,
      clientId: targetQuote.clientId,
      clientName: targetQuote.clientName,
      originCity: targetQuote.originCity,
      destinationCity: targetQuote.destinationCity,
      weightKg: targetQuote.weightKg,
      volumeM3: targetQuote.volumeM3,
      serviceType: targetQuote.serviceType,
      priceEur: targetQuote.estimatedPriceEur,
      status: 'pending_assignment',
      departureSchedule: '2026-11-16 · 07:30',
      estimatedDelivery: 'Sous 24–48h',
      invoiceNumber: `FAC-2026-${numSuffix}`,
      invoicePaid: false,
      cmrNumber: generateCmrReference(trackingNumber),
      decaNumber: generateDecaReference(trackingNumber),
      checkpoints: [
        `${new Date().toLocaleDateString('fr-FR')} — Expédition créée depuis devis ${targetQuote.id}`,
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
      source: user && isBootstrappedAdminEmail(user.email) ? 'firestore' : 'local',
    };

    setQuotes((prev) =>
      prev.map((q) => (q.id === quoteId ? { ...q, status: 'converted', updatedAt: nowIso } : q)),
    );
    setShipments((prev) => [newShipment, ...prev]);
    pushNotification(
      'trip_status',
      `Expédition créée · ${trackingNumber}`,
      `${targetQuote.originCity} → ${targetQuote.destinationCity}`,
    );

    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveShipmentAndTrackingAsAdmin(newShipment);
    }
  };

  const handleAssignShipment = (shipmentId: string, driverId: string, vehicleId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const nowIso = new Date().toISOString();

    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const updated: ShipmentRecord = {
          ...s,
          driverId: driver?.id,
          driverName: driver?.name,
          vehicleId: vehicle?.id,
          vehiclePlate: vehicle?.plateNumber,
          status: 'assigned',
          checkpoints: [
            ...s.checkpoints,
            `Chauffeur ${driver?.name || ''} & véhicule ${vehicle?.plateNumber || ''} attribués`,
          ],
          updatedAt: nowIso,
        };
        if (user && isBootstrappedAdminEmail(user.email)) {
          void updateShipmentStatusInFirestore(s, {
            driverId: updated.driverId,
            driverName: updated.driverName,
            vehicleId: updated.vehicleId,
            status: 'assigned',
          });
        }
        return updated;
      }),
    );

    if (vehicle) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicle.id
            ? { ...v, status: 'on_route', assignedDriverName: driver?.name, updatedAt: nowIso }
            : v,
        ),
      );
    }
  };

  const handleUpdateShipmentStatus = (
    shipmentId: string,
    nextStatus: ShipmentStatus,
    checkpointNote: string,
  ) => {
    const nowIso = new Date().toISOString();
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const updated: ShipmentRecord = {
          ...s,
          status: nextStatus,
          checkpoints: [...s.checkpoints, checkpointNote],
          updatedAt: nowIso,
        };
        if (user && user.emailVerified && s.source === 'firestore') {
          void updateShipmentStatusInFirestore(s, { status: nextStatus });
        }
        pushNotification('trip_status', `Statut mis à jour · ${s.trackingNumber}`, checkpointNote);
        return updated;
      }),
    );
  };

  const handleUpdateShipmentSchedule = (
    shipmentId: string,
    departureSchedule: string,
    estimatedDelivery: string,
  ) => {
    const nowIso = new Date().toISOString();
    setShipments((prev) =>
      prev.map((s) =>
        s.id === shipmentId
          ? {
              ...s,
              departureSchedule: departureSchedule.trim() || s.departureSchedule,
              estimatedDelivery: estimatedDelivery.trim() || s.estimatedDelivery,
              updatedAt: nowIso,
            }
          : s,
      ),
    );
  };

  const handleCompletePod = (
    shipmentId: string,
    payload: { signedBy: string; signatureData: string; photoLabel: string },
  ) => {
    const nowIso = new Date().toISOString();
    setShipments((prev) =>
      prev.map((s) => {
        if (s.id !== shipmentId) return s;
        const updated: ShipmentRecord = {
          ...s,
          status: 'delivered',
          podSignedBy: payload.signedBy,
          podSignatureData: payload.signatureData,
          podPhotoLabel: payload.photoLabel,
          podDeliveredAt: nowIso,
          checkpoints: [...s.checkpoints, `Livré et signé (POD) par ${payload.signedBy}`],
          updatedAt: nowIso,
        };
        if (user && user.emailVerified && s.source === 'firestore') {
          void updateShipmentStatusInFirestore(s, {
            status: 'delivered',
            podSignedBy: payload.signedBy,
            podSignatureData: payload.signatureData,
            podPhotoLabel: payload.photoLabel,
          });
        }
        pushNotification(
          'trip_status',
          `POD validé · ${s.trackingNumber}`,
          `Signé par ${payload.signedBy}`,
        );
        return updated;
      }),
    );
  };

  const handleToggleInvoicePaid = (shipmentId: string) => {
    const nowIso = new Date().toISOString();
    setShipments((prev) =>
      prev.map((s) =>
        s.id === shipmentId ? { ...s, invoicePaid: !s.invoicePaid, updatedAt: nowIso } : s,
      ),
    );
  };

  const handleUpdateVehicleStatus = (vehicleId: string, status: VehicleStatus) => {
    const nowIso = new Date().toISOString();
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;
        const updated = { ...v, status, updatedAt: nowIso };
        if (user && isBootstrappedAdminEmail(user.email)) {
          void saveVehicleInFirestore(updated);
        }
        return updated;
      }),
    );
  };

  const handleUpdateVehicleMaintenance = (vehicleId: string, nextDate: string, note: string) => {
    const nowIso = new Date().toISOString();
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id !== vehicleId) return v;
        const updated = {
          ...v,
          nextMaintenanceDate: nextDate,
          maintenanceNote: note,
          updatedAt: nowIso,
        };
        if (user && isBootstrappedAdminEmail(user.email)) {
          void saveVehicleInFirestore(updated);
        }
        return updated;
      }),
    );
  };

  const handleUpdateVehicle = (updatedVehicle: VehicleRecord) => {
    setVehicles((prev) => prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v)));
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveVehicleInFirestore(updatedVehicle);
    }
  };

  const handleAddVehicle = (vehicle: VehicleRecord) => {
    setVehicles((prev) => [vehicle, ...prev]);
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveVehicleInFirestore(vehicle);
    }
  };

  const handleAddTrailer = (trailer: TrailerRecord) => {
    setTrailers((prev) => [trailer, ...prev]);
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveTrailerInFirestore(trailer);
    }
  };

  const handleUpdateTrailerStatus = (trailerId: string, status: VehicleStatus) => {
    const nowIso = new Date().toISOString();
    setTrailers((prev) =>
      prev.map((t) => {
        if (t.id !== trailerId) return t;
        const updated = { ...t, status, updatedAt: nowIso };
        if (user && isBootstrappedAdminEmail(user.email)) {
          void saveTrailerInFirestore(updated);
        }
        return updated;
      }),
    );
  };

  const handleAddDriver = (driver: DriverProfile) => {
    setDrivers((prev) => [driver, ...prev]);
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveDriverInFirestore(driver);
    }
  };

  const handleUpdateDriver = (updatedDriver: DriverProfile) => {
    setDrivers((prev) => prev.map((d) => (d.id === updatedDriver.id ? updatedDriver : d)));
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveDriverInFirestore(updatedDriver);
    }
  };

  const handleAssignDriverFleet = (driverId: string, vehicleId: string, trailerId: string) => {
    const vehicle = vehicles.find((v) => v.id === vehicleId);
    const trailer = trailers.find((t) => t.id === trailerId);
    const driver = drivers.find((d) => d.id === driverId);
    if (!driver) return;

    const updatedDriver: DriverProfile = {
      ...driver,
      assignedVehicleId: vehicle?.id,
      assignedVehiclePlate: vehicle?.plateNumber,
      assignedTrailerId: trailer?.id,
      assignedTrailerPlate: trailer?.plateNumber,
    };

    setDrivers((prev) => prev.map((d) => (d.id === driverId ? updatedDriver : d)));
    if (vehicle) {
      setVehicles((prev) =>
        prev.map((v) =>
          v.id === vehicle.id
            ? {
                ...v,
                assignedDriverId: driver.id,
                assignedDriverName: driver.name,
                assignedTrailerId: trailer?.id,
                assignedTrailerPlate: trailer?.plateNumber,
                updatedAt: new Date().toISOString(),
              }
            : v,
        ),
      );
    }
    if (trailer && vehicle) {
      setTrailers((prev) =>
        prev.map((t) =>
          t.id === trailer.id
            ? {
                ...t,
                assignedVehicleId: vehicle.id,
                assignedVehiclePlate: vehicle.plateNumber,
                updatedAt: new Date().toISOString(),
              }
            : t,
        ),
      );
    }

    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveDriverInFirestore(updatedDriver);
    }
  };

  const handleAddRoute = (route: RouteVoyageRecord) => {
    setRoutes((prev) => [route, ...prev]);
    pushNotification(
      'trip_status',
      `Nouvelle route créée · ${route.routeCode}`,
      `${route.originCity} → ${route.destinationCity} (${route.distanceKm} km)`,
    );
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveRouteInFirestore(route);
    }
  };

  const handleUpdateRouteStatus = (routeId: string, status: RouteVoyageRecord['status']) => {
    const nowIso = new Date().toISOString();
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id !== routeId) return r;
        const updated = { ...r, status, updatedAt: nowIso };
        pushNotification(
          'trip_status',
          `Route ${r.routeCode}`,
          `État actualisé : ${status === 'in_progress' ? 'En cours' : status === 'completed' ? 'Terminé' : status === 'delayed' ? 'Retard' : 'Planifié'}`,
        );
        if (user && isBootstrappedAdminEmail(user.email)) {
          void saveRouteInFirestore(updated);
        }
        return updated;
      }),
    );
  };

  const handleUpdateRoute = (updatedRoute: RouteVoyageRecord) => {
    setRoutes((prev) => prev.map((r) => (r.id === updatedRoute.id ? updatedRoute : r)));
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveRouteInFirestore(updatedRoute);
    }
  };

  const handleDeleteRoute = (routeId: string) => {
    setRoutes((prev) => prev.filter((r) => r.id !== routeId));
  };

  const handleAddInvoice = (invoice: InvoiceRecord) => {
    setInvoices((prev) => [invoice, ...prev]);
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveInvoiceInFirestore(invoice);
    }
  };

  const handleToggleArchiveInvoiceStatus = (invoiceId: string) => {
    const nowIso = new Date().toISOString();
    setInvoices((prev) =>
      prev.map((inv) => {
        if (inv.id !== invoiceId) return inv;
        const updated: InvoiceRecord = {
          ...inv,
          status: inv.status === 'paid' ? 'pending' : 'paid',
          updatedAt: nowIso,
        };
        if (user && isBootstrappedAdminEmail(user.email)) {
          void saveInvoiceInFirestore(updated);
        }
        return updated;
      }),
    );
  };

  const handleSendMessage = (payload: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'admin' | 'driver' | 'partner';
    recipientName: string;
    text: string;
  }) => {
    const nowIso = new Date().toISOString();
    const newMsg: ChatMessage = {
      id: `msg-${Date.now().toString(36)}`,
      threadId: payload.threadId,
      senderId: payload.senderId,
      senderName: payload.senderName,
      senderRole: payload.senderRole,
      recipientName: payload.recipientName,
      text: payload.text,
      createdAt: nowIso,
      read: payload.senderRole === 'admin',
    };
    setMessages((prev) => [...prev, newMsg]);
    pushNotification('message', `Message de ${payload.senderName}`, payload.text);
    if (user && user.emailVerified) {
      void saveChatMessageInFirestore(newMsg, user.uid);
    }
  };

  const handleMarkThreadRead = (threadId: string) => {
    setMessages((prev) => prev.map((m) => (m.threadId === threadId ? { ...m, read: true } : m)));
  };

  const handleAddTransportDoc = (docItem: TransportDocumentRecord) => {
    setTransportDocs((prev) => [docItem, ...prev]);
    if (user && user.emailVerified) {
      void saveTransportDocToFirestore(docItem, user.uid);
    }
  };

  const handleAddFuelLog = (log: FuelMileageLog) => {
    setFuelLogs((prev) => [log, ...prev]);
    const nowIso = new Date().toISOString();
    setVehicles((prev) =>
      prev.map((v) =>
        v.plateNumber === log.vehiclePlate
          ? { ...v, currentKm: log.odometerKm, updatedAt: nowIso }
          : v,
      ),
    );
    if (user && user.emailVerified) {
      void saveFuelLogToFirestore(log, user.uid);
    }
  };

  const handlePublishNews = (pub: NewsPublication) => {
    setPublications((prev) => [pub, ...prev]);
    pushNotification('trip_status', `Nouvelle publication · ${pub.category.toUpperCase()}`, pub.title);
    if (user && isBootstrappedAdminEmail(user.email)) {
      void savePublicationToFirestore(pub);
    }
  };

  const handleUpdatePublication = (updatedPub: NewsPublication) => {
    setPublications((prev) => prev.map((p) => (p.id === updatedPub.id ? updatedPub : p)));
    if (user && isBootstrappedAdminEmail(user.email)) {
      void savePublicationToFirestore(updatedPub);
    }
  };

  const handleDeletePublication = (pubId: string) => {
    setPublications((prev) => prev.filter((p) => p.id !== pubId));
  };

  const handleTogglePublicationPublished = (pubId: string) => {
    const nowIso = new Date().toISOString();
    setPublications((prev) =>
      prev.map((p) => {
        if (p.id !== pubId) return p;
        const updated = { ...p, published: !p.published, updatedAt: nowIso };
        if (user && isBootstrappedAdminEmail(user.email)) {
          void savePublicationToFirestore(updated);
        }
        return updated;
      }),
    );
  };

  const handleQuickPublishFiles = (
    pubs: NewsPublication[],
    vaultAssets: CapturedMediaItem[],
  ) => {
    setPublications((prev) => [...pubs, ...prev]);
    setMediaVault((prev) => [...vaultAssets, ...prev]);
    for (const asset of vaultAssets) {
      void saveVaultAsset(asset);
    }
    for (const pub of pubs) {
      if (user && user.emailVerified) {
        void savePublicationToFirestore(pub);
      }
    }
    if (pubs.length > 0) {
      pushNotification(
        'trip_status',
        `${pubs.length} fichier${pubs.length > 1 ? 's' : ''} publié${pubs.length > 1 ? 's' : ''}`,
        pubs[0].title,
      );
    }
  };

  const buildPubFromVaultItem = (item: CapturedMediaItem): NewsPublication => {
    const isVideo = item.kind === 'video';
    const isPhoto = item.kind === 'photo';
    const sizeText = formatFileSize(item.sizeBytes);
    const pubId = `pub-cam-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`;
    return {
      id: pubId,
      title: item.title,
      category: isVideo || isPhoto ? 'media' : 'document',
      summary: `${isVideo ? 'Vidéo capturée' : isPhoto ? 'Photo capturée' : 'Fichier'} · ${item.fileName}${sizeText ? ` (${sizeText})` : ''}`,
      content: `Média archivé dans le Coffre Administrateur BOUA TRANS (${item.fileName}) et diffusé sur l’interface publique.`,
      mediaLabel: item.fileName,
      mediaPlatform: isVideo ? 'video' : isPhoto ? 'image' : 'file',
      mediaPreviewData: isPhoto ? item.dataUrl : undefined,
      videoPreviewData: isVideo ? item.dataUrl : undefined,
      fileDataUrl: !isPhoto && !isVideo ? item.dataUrl : undefined,
      fileName: item.fileName,
      fileMimeType: item.mimeType,
      fileSizeBytes: item.sizeBytes,
      capturedSource: item.source,
      published: true,
      createdAt: item.createdAt,
      updatedAt: item.createdAt,
    };
  };

  const handleCameraCaptureSaved = (
    item: CapturedMediaItem,
    publishToShowcase: boolean,
  ) => {
    let savedItem = item;
    if (publishToShowcase) {
      const pub = buildPubFromVaultItem(item);
      savedItem = { ...item, publishedToShowcase: true, linkedPubId: pub.id };
      setPublications((prev) => [pub, ...prev]);
      if (user && user.emailVerified) {
        void savePublicationToFirestore(pub);
      }
    }
    setMediaVault((prev) => [savedItem, ...prev]);
    void saveVaultAsset(savedItem);
    pushNotification(
      'trip_status',
      item.kind === 'video' ? 'Vidéo caméra stockée (Admin)' : 'Photo caméra stockée (Admin)',
      item.fileName,
    );
  };

  const handlePublishVaultItem = (item: CapturedMediaItem) => {
    const pub = buildPubFromVaultItem(item);
    const updatedItem: CapturedMediaItem = {
      ...item,
      publishedToShowcase: true,
      linkedPubId: pub.id,
    };
    setPublications((prev) => [pub, ...prev]);
    setMediaVault((prev) => prev.map((v) => (v.id === item.id ? updatedItem : v)));
    void saveVaultAsset(updatedItem);
    if (user && isBootstrappedAdminEmail(user.email)) {
      void savePublicationToFirestore(pub);
    }
  };

  const handleDeleteVaultItem = (id: string) => {
    setMediaVault((prev) => prev.filter((item) => item.id !== id));
    void deleteVaultAsset(id);
  };

  const handleUpdateSiteContent = (nextContent: SiteContentConfig) => {
    setSiteContent(nextContent);
    if (user && isBootstrappedAdminEmail(user.email)) {
      void saveSiteContentToFirestore(nextContent);
    }
  };

  const handleSaveCmr = (cmr: CmrDocumentData) => {
    setCmrs((prev) => {
      const exists = prev.some((c) => c.id === cmr.id);
      return exists ? prev.map((c) => (c.id === cmr.id ? cmr : c)) : [cmr, ...prev];
    });
    pushNotification('trip_status', `CMR ${cmr.cmrNumber}`, `${cmr.pickupPlace} → ${cmr.deliveryPlace}`);
    if (user && user.emailVerified) {
      void saveCmrInFirestore(cmr, user.uid);
    }
  };

  const handleAddDeca = (deca: DecaRecord) => {
    setDecas((prev) => {
      const exists = prev.some((d) => d.id === deca.id);
      return exists ? prev.map((d) => (d.id === deca.id ? deca : d)) : [deca, ...prev];
    });
    setHighlightedDecaId(deca.id);
    pushNotification('trip_status', `DECA ${deca.reference}`, `${deca.origin} → ${deca.destination}`);
    if (user && user.emailVerified) {
      void saveDecaInFirestore(deca, user.uid);
    }
  };

  const handleSaveFactura = (fac: LassineFacturaData) => {
    setFacturas((prev) => {
      const exists = prev.some((f) => f.id === fac.id);
      return exists ? prev.map((f) => (f.id === fac.id ? fac : f)) : [fac, ...prev];
    });
    pushNotification(
      'trip_status',
      `Factura ${fac.invoiceNumber || 'Lassine Diakite'}`,
      fac.clientName || 'Enregistrée',
    );
  };

  const handleQuickQuoteClick = () => {
    if (activePortal !== 'showcase') {
      setActivePortal('showcase');
      setTimeout(() => {
        document.getElementById('devis')?.scrollIntoView({ behavior: 'smooth' });
      }, 60);
    } else {
      document.getElementById('devis')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar
        activePortal={activePortal}
        onSelectPortal={setActivePortal}
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onQuickQuoteClick={handleQuickQuoteClick}
        authLoading={authLoading}
        notifications={notifications}
        onMarkNotificationsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
      />

      <div className="flex-1">
        {activePortal === 'showcase' && (
          <ShowcaseLanding
            shipments={shipments}
            routes={routes}
            vehicles={vehicles}
            drivers={drivers}
            publications={publications}
            siteContent={siteContent}
            onSubmitQuote={handleSubmitQuote}
            onQuickPublishFiles={handleQuickPublishFiles}
            onCameraCaptureSaved={handleCameraCaptureSaved}
            onNavigatePortal={setActivePortal}
            user={user}
          />
        )}

        {activePortal === 'client' && (
          <ClientPortal
            shipments={shipments}
            quotes={quotes}
            onGoToCalculator={handleQuickQuoteClick}
          />
        )}

        {activePortal === 'driver' && (
          <DriverPortal
            shipments={shipments}
            drivers={drivers}
            vehicles={vehicles}
            fuelLogs={fuelLogs}
            travelDocs={transportDocs}
            messages={messages}
            onUpdateShipmentStatus={handleUpdateShipmentStatus}
            onCompletePod={handleCompletePod}
            onAddFuelLog={handleAddFuelLog}
            onSendMessage={handleSendMessage}
            onOpenScanner={() => setActivePortal('docs')}
          />
        )}

        {activePortal === 'docs' && (
          <ScannerDocsPortal
            shipments={shipments}
            vehicles={vehicles}
            transportDocs={transportDocs}
            savedCmrs={cmrs}
            decas={decas}
            savedFacturas={facturas}
            highlightedDecaId={highlightedDecaId}
            onAddTransportDoc={handleAddTransportDoc}
            onToggleInvoicePaid={handleToggleInvoicePaid}
            onSaveCmr={handleSaveCmr}
            onAddDeca={handleAddDeca}
            onSaveFactura={handleSaveFactura}
          />
        )}

        {activePortal === 'admin' && (
          <AdminConsole
            shipments={shipments}
            quotes={quotes}
            vehicles={vehicles}
            trailers={trailers}
            drivers={drivers}
            routes={routes}
            invoices={invoices}
            messages={messages}
            fuelLogs={fuelLogs}
            publications={publications}
            mediaVault={mediaVault}
            siteContent={siteContent}
            savedFacturas={facturas}
            onAssignShipment={handleAssignShipment}
            onConvertQuoteToShipment={handleConvertQuoteToShipment}
            onToggleInvoicePaid={handleToggleInvoicePaid}
            onUpdateVehicleStatus={handleUpdateVehicleStatus}
            onUpdateVehicleMaintenance={handleUpdateVehicleMaintenance}
            onUpdateVehicle={handleUpdateVehicle}
            onAddVehicle={handleAddVehicle}
            onAddTrailer={handleAddTrailer}
            onUpdateTrailerStatus={handleUpdateTrailerStatus}
            onAddDriver={handleAddDriver}
            onUpdateDriver={handleUpdateDriver}
            onAssignDriverFleet={handleAssignDriverFleet}
            onAddRoute={handleAddRoute}
            onUpdateRouteStatus={handleUpdateRouteStatus}
            onUpdateRoute={handleUpdateRoute}
            onDeleteRoute={handleDeleteRoute}
            onAddInvoice={handleAddInvoice}
            onToggleArchiveInvoiceStatus={handleToggleArchiveInvoiceStatus}
            onSaveFactura={handleSaveFactura}
            onSendMessage={handleSendMessage}
            onMarkThreadRead={handleMarkThreadRead}
            onUpdateShipmentSchedule={handleUpdateShipmentSchedule}
            onPublishNews={handlePublishNews}
            onUpdatePublication={handleUpdatePublication}
            onDeletePublication={handleDeletePublication}
            onTogglePublicationPublished={handleTogglePublicationPublished}
            onQuickPublishFiles={handleQuickPublishFiles}
            onCameraCaptureSaved={handleCameraCaptureSaved}
            onPublishVaultItem={handlePublishVaultItem}
            onDeleteVaultItem={handleDeleteVaultItem}
            onUpdateSiteContent={handleUpdateSiteContent}
          />
        )}
      </div>

      {/* Quiet Footer synced with Admin CMS */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8 pb-20 sm:pb-16 lg:pr-52 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            <span className="font-display font-bold text-[#0B1F3A] dark:text-white">
              BOUA TRANS
            </span>{' '}
            · {siteContent.hqAddress} ·{' '}
            {siteContent.footerNote || 'Réseau Espagne & Europe'} ·{' '}
            <span className="font-mono">{siteContent.hqPhone}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setActivePortal('showcase')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Vitrine
            </button>
            <button
              type="button"
              onClick={() => setActivePortal('client')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Portail Client
            </button>
            <button
              type="button"
              onClick={() => setActivePortal('driver')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              App Chauffeur
            </button>
            <button
              type="button"
              onClick={() => setActivePortal('docs')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Scanner · CMR · DECA
            </button>
            <button
              type="button"
              onClick={() => setActivePortal('admin')}
              className="hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>

      <WhatsAppButton />
    </div>
  );
}
