import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  Globe2,
  MapPin,
  PackageSearch,
  Phone,
  Play,
  Route,
  ShieldCheck,
  Truck,
  Upload,
  Users,
} from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type { User } from '../lib/firebase';
import { lookupPublicTrackingInFirestore } from '../services/firestoreSync';
import type {
  ActivePortal,
  CapturedMediaItem,
  DriverProfile,
  NewsPublication,
  PublicTrackingRecord,
  PublicationCategory,
  QuoteRecord,
  RouteVoyageRecord,
  ServiceType,
  ShipmentRecord,
  SiteContentConfig,
  VehicleRecord,
} from '../types/logistics';
import {
  buildDriverDocumentHtml,
  buildPublicationSheetHtml,
  buildVehicleDocumentHtml,
  buildVoyageDocumentHtml,
  calculateDynamicQuote,
  EUROPEAN_COUNTRIES,
  formatEur,
  formatFileSize,
  formatWeight,
  getServiceLabel,
  getShipmentStatusMeta,
  getVehicleTypeLabel,
  inferPublicationFromFile,
  parseSocialMediaUrl,
  sanitizeTrackingCode,
  triggerFileDownload,
  validateQuoteInput,
  type QuoteFormInput,
} from '../utils/logistics';
import { CameraCaptureStudio } from './CameraCaptureStudio';
import { CorridorMap, type InterventionZone } from './CorridorMap';

interface ShowcaseLandingProps {
  shipments: ShipmentRecord[];
  routes: RouteVoyageRecord[];
  vehicles: VehicleRecord[];
  drivers: DriverProfile[];
  publications: NewsPublication[];
  siteContent: SiteContentConfig;
  onSubmitQuote: (quote: QuoteRecord) => Promise<{ savedToFirestore: boolean }>;
  onQuickPublishFiles: (pubs: NewsPublication[], vaultAssets: CapturedMediaItem[]) => void;
  onCameraCaptureSaved: (item: CapturedMediaItem, publishToShowcase: boolean) => void;
  onNavigatePortal: (portal: ActivePortal) => void;
  user: User | null;
}

const TRACKING_STEPS = ['Enregistré', 'Assigné', 'Enlevé', 'En transit', 'Livré (POD)'];

const PUB_CATEGORY_LABELS: Record<PublicationCategory, string> = {
  actualite: 'Actualité',
  info: 'Info Trafic',
  media: 'Média & Vidéo',
  document: 'Document',
  facture: 'Facture',
  voyage: 'Voyage Europe',
  camion: 'Flotte Camion',
};

type PublicNewsFilter = 'all' | 'actualite' | 'info' | 'media' | 'docs_factures' | 'voyages_flotte';

const ZONE_CARDS: {
  id: InterventionZone;
  title: string;
  countries: string;
  transit: string;
  detail: string;
}[] = [
  {
    id: 'spain_national',
    title: 'Espagne Nationale (Péninsule)',
    countries: 'Yuncos (Tolède) · Madrid · Barcelone · Valence · Bilbao · Séville · Saragosse',
    transit: '12–24 h',
    detail: 'Navettes quotidiennes depuis notre quai de Yuncos sur tout le territoire espagnol et Portugal.',
  },
  {
    id: 'france_benelux',
    title: 'France & Benelux',
    countries: 'France (Paris, Lyon, Marseille, Bordeaux, Lille) · Belgique · Pays-Bas · Luxembourg',
    transit: '24–48 h',
    detail: 'Passages frontières Irún & Le Perthus sans rupture de charge en 40T Tautliner ou 12T.',
  },
  {
    id: 'central_europe',
    title: 'Italie, Allemagne & Europe Centrale',
    countries: 'Italie (Milan, Turin, Bologne) · Allemagne · Suisse · Autriche · Pologne · R.-U.',
    transit: '36–60 h',
    detail: 'Affrètement international sous licence communautaire UE et lettres de voiture CMR.',
  },
];

export function ShowcaseLanding({
  shipments,
  routes,
  vehicles,
  drivers,
  publications,
  siteContent,
  onSubmitQuote,
  onQuickPublishFiles,
  onCameraCaptureSaved,
  onNavigatePortal,
  user,
}: ShowcaseLandingProps) {
  const [newsFilter, setNewsFilter] = useState<PublicNewsFilter>('all');
  const [expandedPubId, setExpandedPubId] = useState<string | null>(null);
  const [activeZone, setActiveZone] = useState<InterventionZone>('all');
  const [quickFileCategory, setQuickFileCategory] = useState<PublicationCategory | 'auto'>('auto');
  const [showPublicCamera, setShowPublicCamera] = useState(false);
  const [quickPublishFeedback, setQuickPublishFeedback] = useState<string | null>(null);
  const [fleetShowcaseTab, setFleetShowcaseTab] = useState<'voyages' | 'camions' | 'chauffeurs'>('voyages');

  const [trackingQuery, setTrackingQuery] = useState('BT-2026-841');
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [trackedResult, setTrackedResult] = useState<PublicTrackingRecord | null>(() => {
    const initial = shipments.find((s) => s.trackingNumber === 'BT-2026-841');
    if (!initial) return null;
    return {
      trackingNumber: initial.trackingNumber,
      shipmentId: initial.id,
      originCity: initial.originCity,
      destinationCity: initial.destinationCity,
      status: initial.status,
      serviceType: initial.serviceType,
      estimatedDelivery: initial.estimatedDelivery,
      checkpoints: initial.checkpoints,
      updatedAt: initial.updatedAt,
    };
  });

  const [formState, setFormState] = useState<QuoteFormInput>({
    clientName: user?.displayName || '',
    clientEmail: user?.email || '',
    clientPhone: '+34 632 60 71 01',
    originCountry: 'Espagne (National)',
    originCity: 'Yuncos (Toledo)',
    destinationCountry: 'France',
    destinationCity: 'Lyon',
    weightKg: 1200,
    volumeM3: 6,
    serviceType: 'express',
    notes: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof QuoteFormInput, string>>>({});
  const [submittingQuote, setSubmittingQuote] = useState(false);
  const [submittedQuote, setSubmittedQuote] = useState<{
    quote: QuoteRecord;
    savedToFirestore: boolean;
  } | null>(null);

  const originCountryObj =
    EUROPEAN_COUNTRIES.find((c) => c.name === formState.originCountry) || EUROPEAN_COUNTRIES[0];
  const destCountryObj =
    EUROPEAN_COUNTRIES.find((c) => c.name === formState.destinationCountry) || EUROPEAN_COUNTRIES[1];

  const liveEstimate = useMemo(
    () =>
      calculateDynamicQuote({
        originCity: formState.originCity,
        destinationCity: formState.destinationCity,
        weightKg: formState.weightKg,
        volumeM3: formState.volumeM3,
        serviceType: formState.serviceType,
      }),
    [
      formState.originCity,
      formState.destinationCity,
      formState.weightKg,
      formState.volumeM3,
      formState.serviceType,
    ],
  );

  const filteredPublications = useMemo(() => {
    return publications.filter((p) => {
      if (!p.published) return false;
      if (newsFilter === 'all') return true;
      if (newsFilter === 'docs_factures') {
        return p.category === 'document' || p.category === 'facture';
      }
      if (newsFilter === 'voyages_flotte') {
        return p.category === 'voyage' || p.category === 'camion';
      }
      return p.category === newsFilter;
    });
  }, [publications, newsFilter]);

  const {
    visibleItems: visiblePublications,
    hasMore: hasMorePubs,
    loadMore: loadMorePubs,
    totalCount: totalPubsCount,
    visibleCount: visiblePubsCount,
    sentinelRef: pubSentinelRef,
  } = useInfiniteScroll(filteredPublications, { initialBatchSize: 6, stepSize: 6 });

  const handlePublicQuickFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    Promise.all(
      files.map(
        (file) =>
          new Promise<{ pub: NewsPublication; vault: CapturedMediaItem }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              const dataUrl = typeof reader.result === 'string' ? reader.result : '';
              const inferred = inferPublicationFromFile(
                { name: file.name, type: file.type, size: file.size },
                quickFileCategory,
              );
              const nowIso = new Date().toISOString();
              const pubId = `pub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
              const isVideo = inferred.mediaPlatform === 'video';
              const isImage = inferred.mediaPlatform === 'image';

              const pub: NewsPublication = {
                id: pubId,
                title: inferred.title,
                category: inferred.category,
                summary: inferred.summary,
                content: inferred.content,
                mediaLabel: inferred.mediaLabel,
                mediaPlatform: inferred.mediaPlatform,
                mediaPreviewData: isImage ? dataUrl : undefined,
                videoPreviewData: isVideo ? dataUrl : undefined,
                fileDataUrl: !isImage && !isVideo ? dataUrl : undefined,
                fileName: file.name,
                fileMimeType: file.type || 'application/octet-stream',
                fileSizeBytes: file.size,
                capturedSource: 'upload',
                published: true,
                createdAt: nowIso,
                updatedAt: nowIso,
              };

              const vault: CapturedMediaItem = {
                id: `vault-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
                kind: isVideo ? 'video' : isImage ? 'photo' : 'document',
                title: inferred.title,
                fileName: file.name,
                mimeType: file.type || 'application/octet-stream',
                sizeBytes: file.size,
                dataUrl,
                source: 'upload',
                publishedToShowcase: true,
                linkedPubId: pubId,
                createdAt: nowIso,
              };
              resolve({ pub, vault });
            };
            reader.readAsDataURL(file);
          }),
      ),
    ).then((results) => {
      onQuickPublishFiles(
        results.map((r) => r.pub),
        results.map((r) => r.vault),
      );
      setQuickPublishFeedback(
        `${results.length} fichier${results.length > 1 ? 's' : ''} publié${results.length > 1 ? 's' : ''} instantanément sur l’interface publique et synchronisé${results.length > 1 ? 's' : ''} avec l’administration.`,
      );
    });
    e.target.value = '';
  };

  const handleSearchTracking = async (codeOverride?: string) => {
    const cleanCode = sanitizeTrackingCode(codeOverride ?? trackingQuery);
    if (codeOverride) setTrackingQuery(cleanCode);
    setTrackingError(null);

    if (cleanCode.length < 5) {
      setTrackingError('Saisissez un numéro de récépissé valide (ex. BT-2026-841).');
      setTrackedResult(null);
      return;
    }

    setTrackingLoading(true);
    try {
      const localMatch = shipments.find((s) => s.trackingNumber === cleanCode);
      if (localMatch) {
        setTrackedResult({
          trackingNumber: localMatch.trackingNumber,
          shipmentId: localMatch.id,
          originCity: localMatch.originCity,
          destinationCity: localMatch.destinationCity,
          status: localMatch.status,
          serviceType: localMatch.serviceType,
          estimatedDelivery: localMatch.estimatedDelivery,
          checkpoints: localMatch.checkpoints,
          updatedAt: localMatch.updatedAt,
        });
        return;
      }

      const remoteMatch = await lookupPublicTrackingInFirestore(cleanCode);
      if (remoteMatch) {
        setTrackedResult(remoteMatch);
        return;
      }

      setTrackedResult(null);
      setTrackingError(
        `Aucun récépissé trouvé pour « ${cleanCode} ». Vérifiez la référence ou essayez BT-2026-841.`,
      );
    } finally {
      setTrackingLoading(false);
    }
  };

  const handleQuoteSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const validation = validateQuoteInput(formState);
    if (!validation.valid) {
      setFormErrors(validation.errors);
      return;
    }

    setFormErrors({});
    setSubmittingQuote(true);
    const nowIso = new Date().toISOString();
    const quoteId = `qt-${Date.now().toString(36)}`;
    const newQuote: QuoteRecord = {
      id: quoteId,
      clientId: user?.uid || 'guest-session',
      clientName: formState.clientName.trim(),
      clientEmail: formState.clientEmail.trim(),
      clientPhone: formState.clientPhone.trim(),
      originCountry: formState.originCountry || 'Espagne (National)',
      originCity: formState.originCity.trim(),
      destinationCountry: formState.destinationCountry || 'France',
      destinationCity: formState.destinationCity.trim(),
      weightKg: Number(formState.weightKg),
      volumeM3: Number(formState.volumeM3),
      serviceType: formState.serviceType,
      estimatedPriceEur: liveEstimate.estimatedPriceEur,
      distanceKm: liveEstimate.distanceKm,
      status: 'pending',
      notes: formState.notes?.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      source: user ? 'firestore' : 'local',
    };

    try {
      const result = await onSubmitQuote(newQuote);
      setSubmittedQuote({ quote: newQuote, savedToFirestore: result.savedToFirestore });
    } finally {
      setSubmittingQuote(false);
    }
  };

  const trackedStatusMeta = trackedResult ? getShipmentStatusMeta(trackedResult.status) : null;

  return (
    <main id="top" className="space-y-16 pb-20">
      {/* HERO SPLIT SECTION — EXCLUSIVELY SPAIN & EUROPE (EDITABLE VIA ADMIN CMS) */}
      <section className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        {siteContent.bannerText && (
          <div className="bg-[#0B1F3A] dark:bg-slate-900 border-b border-slate-800 text-white px-4 py-2 text-center text-xs font-medium">
            <span className="text-orange-400 font-semibold mr-2">INFO RÉSEAU :</span>
            <span>{siteContent.bannerText}</span>
          </div>
        )}
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            {/* Left Copy & Primary Action */}
            <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
              <div className="space-y-5">
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {siteContent.heroBadge}
                </p>
                <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0B1F3A] dark:text-white leading-[1.1] [text-wrap:balance]">
                  {siteContent.heroTitle}
                </h1>
                <p className="text-base sm:text-lg text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                  {siteContent.heroDescription}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <a
                  href="#devis"
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <span>Calculer mon devis Europe</span>
                  <ArrowRight className="h-4 w-4" />
                </a>
                <a
                  href="#suivi"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-100 px-5 py-3 text-sm font-semibold transition-colors whitespace-nowrap"
                >
                  <PackageSearch className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span>Suivre un récépissé</span>
                </a>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Espagne Nationale
                  </span>
                  Yuncos · Madrid · Barcelone · Valence · Bilbao
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Corridors Européens
                  </span>
                  France · Portugal · Benelux · Italie · Allemagne
                </div>
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    Exploitation Directe
                  </span>
                  <span className="font-mono">{siteContent.hqPhone}</span>
                </div>
              </div>
            </div>

            {/* Right Corridor Map Visual */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <CorridorMap
                originCity={formState.originCity}
                destinationCity={formState.destinationCity}
                activeZone={activeZone}
                onSelectHub={(cityName) =>
                  setFormState((prev) => ({ ...prev, destinationCity: cityName }))
                }
              />
            </div>
          </div>

          {/* Full-width 4-Column KPI Strip */}
          <div className="mt-10 grid grid-cols-2 lg:grid-cols-4 gap-4 pt-8 border-t border-slate-200 dark:border-slate-800">
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <p className="font-mono text-2xl font-bold text-[#0B1F3A] dark:text-white tabular-nums">
                98,4 %
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Ponctualité réseau Espagne & Europe (12 mois)
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <p className="font-mono text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                16 pays
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Couverture routière européenne directe sans sous-traitance opaque
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <p className="font-mono text-2xl font-bold text-[#0B1F3A] dark:text-white tabular-nums">
                24–48 h
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Liaisons express Yuncos / Madrid ↔ France & Portugal
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 p-4">
              <p className="font-mono text-2xl font-bold text-[#0B1F3A] dark:text-white tabular-nums">
                100 %
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                Conformité CMR, DECA Espagne et POD signés sur mobile
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 1: SUIVI DE COLIS EN TEMPS REEL */}
      <section id="suivi" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-5 space-y-4">
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white [text-wrap:balance]">
                Suivi de colis en temps réel
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Saisissez votre numéro de récépissé Boua Trans pour consulter la position de votre
                expédition entre l’Espagne et l’Europe et l’horaire estimé d’arrivée.
              </p>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleSearchTracking();
                }}
                className="space-y-3"
              >
                <div>
                  <label
                    htmlFor="tracking-search-input"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
                  >
                    Numéro de récépissé
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="tracking-search-input"
                      type="text"
                      value={trackingQuery}
                      onChange={(e) => setTrackingQuery(e.target.value)}
                      placeholder="Ex : BT-2026-841"
                      className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button
                      type="submit"
                      disabled={trackingLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] hover:bg-[#13325C] dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-5 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                    >
                      <PackageSearch className="h-4 w-4" />
                      <span>{trackingLoading ? 'Recherche...' : 'Rechercher'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Exemples actifs :</span>
                  {['BT-2026-841', 'BT-2026-842', 'BT-2026-843'].map((sample) => (
                    <button
                      key={sample}
                      type="button"
                      onClick={() => void handleSearchTracking(sample)}
                      className="font-mono px-2.5 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-200 hover:border-orange-500 transition-colors cursor-pointer"
                    >
                      {sample}
                    </button>
                  ))}
                </div>
              </form>

              {trackingError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-lg border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-700 dark:text-red-300"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{trackingError}</span>
                </div>
              )}
            </div>

            {/* Right: Tracking Result Panel */}
            <div className="lg:col-span-7">
              {trackedResult && trackedStatusMeta ? (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-5 sm:p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Récépissé · {getServiceLabel(trackedResult.serviceType)}
                      </p>
                      <p className="font-mono text-lg font-bold text-[#0B1F3A] dark:text-white">
                        {trackedResult.trackingNumber}
                      </p>
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-semibold ${trackedStatusMeta.badgeClass}`}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>{trackedStatusMeta.label}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        Départ
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {trackedResult.originCity}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        Destination
                      </span>
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {trackedResult.destinationCity}
                      </span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block">
                        Arrivée estimée
                      </span>
                      <span className="font-mono font-semibold text-slate-900 dark:text-white">
                        {trackedResult.estimatedDelivery}
                      </span>
                    </div>
                  </div>

                  {/* Stepper bar */}
                  <div className="grid grid-cols-5 gap-1.5 sm:gap-2 pt-1">
                    {TRACKING_STEPS.map((stepLabel, idx) => {
                      const reached = idx <= trackedStatusMeta.stepIndex;
                      return (
                        <div key={stepLabel} className="space-y-1.5 min-w-0">
                          <div
                            className={`h-1.5 rounded-sm ${
                              reached
                                ? 'bg-orange-600 dark:bg-orange-500'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                          <p
                            className={`text-[9.5px] sm:text-[11px] leading-tight truncate ${
                              reached
                                ? 'font-semibold text-slate-900 dark:text-white'
                                : 'text-slate-400 dark:text-slate-500'
                            }`}
                            title={stepLabel}
                          >
                            {stepLabel}
                          </p>
                        </div>
                      );
                    })}
                  </div>

                  {/* Chronological checkpoints */}
                  <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Historique d’acheminement
                    </p>
                    <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
                      {trackedResult.checkpoints.map((cp, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                          <span>{cp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                  Saisissez un numéro de récépissé à gauche pour afficher le détail du suivi.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: CALCULATEUR DE DEVIS DYNAMIQUE (ESPAGNE & EUROPE UNIQUEMENT) */}
      <section id="devis" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white [text-wrap:balance]">
                Calculateur de devis Espagne & Europe
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                Couverture exclusive Espagne (national) et Europe (international) au départ de
                Yuncos, Tolède. Indicatifs téléphoniques européens vérifiés.
              </p>
            </div>

            <form onSubmit={handleQuoteSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quote-name"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Nom complet ou Société
                  </label>
                  <input
                    id="quote-name"
                    type="text"
                    required
                    value={formState.clientName}
                    onChange={(e) => setFormState({ ...formState, clientName: e.target.value })}
                    placeholder="Ex : Transports Valéry SAS"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.clientName && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {formErrors.clientName}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quote-email"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Email de contact
                  </label>
                  <input
                    id="quote-email"
                    type="email"
                    required
                    value={formState.clientEmail}
                    onChange={(e) => setFormState({ ...formState, clientEmail: e.target.value })}
                    placeholder="dispatch@entreprise.es"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.clientEmail && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {formErrors.clientEmail}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quote-phone"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Téléphone (Indicatif européen)
                  </label>
                  <input
                    id="quote-phone"
                    type="tel"
                    required
                    value={formState.clientPhone}
                    onChange={(e) => setFormState({ ...formState, clientPhone: e.target.value })}
                    placeholder="+34 632 60 71 01 ou +33 6..."
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.clientPhone && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {formErrors.clientPhone}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quote-service"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Type de prestation
                  </label>
                  <select
                    id="quote-service"
                    value={formState.serviceType}
                    onChange={(e) =>
                      setFormState({ ...formState, serviceType: e.target.value as ServiceType })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="express">Messagerie Express 24/48h</option>
                    <option value="standard">Transport Routier Europe (FTL / LTL)</option>
                    <option value="pallet">Affrètement & Palettes</option>
                    <option value="moving">Déménagement Pro & Particuliers</option>
                  </select>
                </div>
              </div>

              {/* Country + City Selectors (Strictly Spain & Europe) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quote-origin-country"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Pays de départ (Espagne / Europe)
                  </label>
                  <select
                    id="quote-origin-country"
                    value={formState.originCountry}
                    onChange={(e) => {
                      const nextCountry = EUROPEAN_COUNTRIES.find((c) => c.name === e.target.value);
                      setFormState({
                        ...formState,
                        originCountry: e.target.value,
                        originCity: nextCountry?.sampleCities[0] || formState.originCity,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {EUROPEAN_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name} ({country.phonePrefix})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quote-dest-country"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Pays de destination (Espagne / Europe)
                  </label>
                  <select
                    id="quote-dest-country"
                    value={formState.destinationCountry}
                    onChange={(e) => {
                      const nextCountry = EUROPEAN_COUNTRIES.find((c) => c.name === e.target.value);
                      setFormState({
                        ...formState,
                        destinationCountry: e.target.value,
                        destinationCity: nextCountry?.sampleCities[0] || formState.destinationCity,
                      });
                    }}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    {EUROPEAN_COUNTRIES.map((country) => (
                      <option key={country.code} value={country.name}>
                        {country.name} ({country.phonePrefix})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quote-origin"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Ville de départ
                  </label>
                  <input
                    id="quote-origin"
                    type="text"
                    list="eu-origin-cities"
                    required
                    value={formState.originCity}
                    onChange={(e) => setFormState({ ...formState, originCity: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <datalist id="eu-origin-cities">
                    {originCountryObj.sampleCities.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {formErrors.originCity && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {formErrors.originCity}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quote-destination"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Ville d’arrivée
                  </label>
                  <input
                    id="quote-destination"
                    type="text"
                    list="eu-dest-cities"
                    required
                    value={formState.destinationCity}
                    onChange={(e) =>
                      setFormState({ ...formState, destinationCity: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  <datalist id="eu-dest-cities">
                    {destCountryObj.sampleCities.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                  {formErrors.destinationCity && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {formErrors.destinationCity}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="quote-weight"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Poids total du fret (kg)
                  </label>
                  <input
                    id="quote-weight"
                    type="number"
                    min={1}
                    max={44000}
                    required
                    value={formState.weightKg}
                    onChange={(e) =>
                      setFormState({ ...formState, weightKg: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.weightKg && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {formErrors.weightKg}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quote-volume"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Volume estimé (m³)
                  </label>
                  <input
                    id="quote-volume"
                    type="number"
                    min={0.1}
                    max={120}
                    step={0.5}
                    required
                    value={formState.volumeM3}
                    onChange={(e) =>
                      setFormState({ ...formState, volumeM3: Number(e.target.value) })
                    }
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 font-mono text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                  {formErrors.volumeM3 && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {formErrors.volumeM3}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label
                  htmlFor="quote-notes"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Précisions logistiques (optionnel : hayon, palettes, horaires quai)
                </label>
                <textarea
                  id="quote-notes"
                  rows={2}
                  value={formState.notes || ''}
                  onChange={(e) => setFormState({ ...formState, notes: e.target.value })}
                  placeholder="Ex : 4 Europalettes, accès quai 14h-17h."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <button
                type="submit"
                disabled={submittingQuote}
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 text-sm font-semibold transition-colors cursor-pointer disabled:opacity-60"
              >
                <span>
                  {submittingQuote ? 'Enregistrement en cours...' : 'Envoyer la demande de devis'}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </form>

            {submittedQuote && (
              <div
                role="status"
                className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/40 p-4 space-y-2 text-sm"
              >
                <div className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="h-5 w-5 shrink-0" />
                  <span>
                    Demande enregistrée · Référence{' '}
                    <span className="font-mono">{submittedQuote.quote.id}</span>
                  </span>
                </div>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  {submittedQuote.savedToFirestore
                    ? 'Devis synchronisé sur Firestore et visible immédiatement dans votre Portail Client.'
                    : 'Devis enregistré dans votre session locale et visible dans le Portail Client et la Console Admin.'}
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => onNavigatePortal('client')}
                    className="text-xs font-semibold text-[#0B1F3A] dark:text-orange-300 underline underline-offset-4 cursor-pointer"
                  >
                    Consulter dans le Portail Client →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Live Pricing Summary Panel */}
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#0B1F3A] text-white p-6 sm:p-8 space-y-6">
            <div>
              <p className="text-xs font-medium text-orange-300">
                Estimation tarifaire · {formState.originCountry} → {formState.destinationCountry}
              </p>
              <h3 className="font-display text-xl font-bold mt-1">
                {formState.originCity || 'Départ'} → {formState.destinationCity || 'Arrivée'}
              </h3>
            </div>

            <div className="border-y border-slate-700/80 py-5 space-y-1">
              <p className="text-xs text-slate-300">Tarif estimatif TTC</p>
              <p className="font-mono text-4xl font-bold text-white tabular-nums">
                {formatEur(liveEstimate.estimatedPriceEur)}
              </p>
              <p className="text-xs text-slate-300">
                Inclut prise en charge, péages européens et assurance marchandises CMR.
              </p>
            </div>

            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">Distance routière estimée</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {liveEstimate.distanceKm} km
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">Délai de transit estimé</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  ~{liveEstimate.estimatedTransitHours} h
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">Charge & volume</dt>
                <dd className="font-mono font-semibold tabular-nums">
                  {formatWeight(formState.weightKg || 0)} · {formState.volumeM3 || 0} m³
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-slate-300">Véhicule recommandé</dt>
                <dd className="font-semibold text-orange-300">
                  {getVehicleTypeLabel(liveEstimate.recommendedVehicle)}
                </dd>
              </div>
            </dl>

            <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 text-xs text-slate-300 space-y-1.5">
              <p className="font-semibold text-white">Zone desservie uniquement : Espagne & Europe</p>
              <p>
                Appelez l’exploitation à Yuncos au{' '}
                <a href="tel:+34632607101" className="font-mono text-orange-300 underline">
                  +34 632 60 71 01
                </a>{' '}
                pour verrouiller un camion sous 2 heures.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: ZONE D'INTERVENTION INTERACTIVE (ESPAGNE & EUROPE) */}
      <section
        id="zone-intervention"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Globe2 className="h-4 w-4" />
              <span>Ancrage local Yuncos (Toledo) · Réseau 100 % Européen</span>
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white mt-1 [text-wrap:balance]">
              Zone d’intervention : Espagne Nationale & Europe
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
              Exploitation dédiée exclusivement au transport routier en Espagne et vers les pays
              européens. Sélectionnez un corridor pour filtrer la carte stratégique.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setActiveZone('all')}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
              activeZone === 'all'
                ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300'
                : 'border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300'
            }`}
          >
            Afficher tout le réseau UE
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-5 space-y-4">
            {ZONE_CARDS.map((card) => {
              const selected = activeZone === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => setActiveZone(selected ? 'all' : card.id)}
                  className={`w-full text-left rounded-xl border p-5 transition-colors cursor-pointer space-y-2 ${
                    selected
                      ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                      {card.title}
                    </h3>
                    <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                      {card.transit}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    {card.countries}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{card.detail}</p>
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-7 min-h-[340px]">
            <CorridorMap
              originCity="Yuncos (Toledo)"
              destinationCity={
                activeZone === 'spain_national'
                  ? 'Barcelone'
                  : activeZone === 'central_europe'
                  ? 'Milan'
                  : 'Lyon'
              }
              activeZone={activeZone}
              onSelectHub={(cityName) =>
                setFormState((prev) => ({ ...prev, destinationCity: cityName }))
              }
            />
          </div>
        </div>
      </section>

      {/* SECTION 4: SERVICES LOGISTIQUES */}
      <section id="services" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white [text-wrap:balance]">
              Solutions de transport adaptées à chaque flux
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Des liaisons régulières pour industriels, distributeurs et particuliers en Espagne et en Europe.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigatePortal('driver')}
            className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline underline-offset-4 cursor-pointer"
          >
            Découvrir l’interface chauffeur & POD →
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-white">
                01. Transport Routier Espagne & Europe (FTL & LTL)
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Lignes dédiées au départ de Yuncos (Tolède) et Madrid vers l’ensemble de l’Espagne,
                le Portugal, la France, le Benelux, l’Italie et l’Allemagne. Semi-remorques 40T ou
                groupage palettisé sans rupture de charge.
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Capacité jusqu’à 24 000 kg · 33 Europalettes · Suivi CMR & DECA
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-white">
                02. Messagerie Express 24/48h
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Enlèvement rapide par fourgon 3,5T ou porteur 12T pour vos urgences industrielles,
                pièces critiques et livraisons sur rendez-vous.
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Livraison directe · Signature numérique POD
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-white">
                03. Affrètement & Palettes
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                Prise en charge de 1 à 20 palettes avec hayon élévateur et transpalette embarqué
                pour une dépose fluide sur quai ou en centre-ville européen.
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Porteurs hayon 12T · Facturation consolidée
            </p>
          </div>

          <div className="md:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <h3 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-white">
                04. Déménagement & Fret Dédié Particuliers / Entreprises
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl">
                Transfert sécurisé de mobilier, équipements professionnels et effets personnels en
                Espagne et dans toute l’Europe avec sanglage renforcé et suivi client dédié.
              </p>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
              Véhicule exclusif · Assurance ad valorem sur demande
            </p>
          </div>
        </div>
      </section>

      {/* SECTION 4B: VOYAGES EUROPE, FLOTTE CAMIONS & CHAUFFEURS EN DIRECT (SYNCHRONISÉ ADMIN) */}
      <section
        id="flotte-voyages"
        className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-6"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-orange-600 dark:text-orange-400 flex items-center gap-1.5">
              <Truck className="h-4 w-4" />
              <span>Synchronisé en direct avec l’Exploitation Admin</span>
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white mt-1 [text-wrap:balance]">
              Voyages Europe, Camions & Chauffeurs actifs
            </h2>
          </div>

          <div
            role="tablist"
            aria-label="Afficher flotte publique"
            className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            {[
              { id: 'voyages', label: `Voyages Europe (${routes.length})` },
              { id: 'camions', label: `Camions (${vehicles.length})` },
              { id: 'chauffeurs', label: `Chauffeurs (${drivers.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={fleetShowcaseTab === tab.id}
                onClick={() =>
                  setFleetShowcaseTab(tab.id as 'voyages' | 'camions' | 'chauffeurs')
                }
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  fleetShowcaseTab === tab.id
                    ? 'bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {fleetShowcaseTab === 'voyages' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {routes.map((r) => (
              <div
                key={r.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      {r.routeCode}
                    </span>
                    <span className="rounded border border-slate-200 dark:border-slate-700 px-2 py-0.5 font-semibold text-[11px] text-slate-700 dark:text-slate-300">
                      {r.status === 'in_progress'
                        ? 'En cours'
                        : r.status === 'completed'
                        ? 'Terminé'
                        : r.status === 'delayed'
                        ? 'Retard'
                        : 'Planifié'}
                    </span>
                  </div>
                  <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-1.5">
                    <Route className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                    <span>
                      {r.originCity} → {r.destinationCity}
                    </span>
                  </h3>
                  {r.tradeType && (
                    <span className="inline-block rounded-md border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                      {r.tradeType}
                    </span>
                  )}
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-mono">
                    {r.distanceKm} km · {r.scheduleOrDate}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chauffeur : {r.driverName || 'Affectation en cours'} · Véhicule :{' '}
                    <span className="font-mono">{r.vehiclePlate || '—'}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    triggerFileDownload(
                      undefined,
                      `${r.routeCode.toLowerCase()}.html`,
                      buildVoyageDocumentHtml(r),
                      `${r.routeCode.toLowerCase()}.html`,
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  <span>Télécharger fiche voyage</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {fleetShowcaseTab === 'camions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <p className="font-mono text-sm font-bold text-orange-600 dark:text-orange-400">
                    {v.plateNumber}
                  </p>
                  <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                    {v.model}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {getVehicleTypeLabel(v.type)} · {formatWeight(v.capacityKg)}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Chauffeur : {v.assignedDriverName || 'Disponible'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    triggerFileDownload(
                      undefined,
                      `camion_${v.plateNumber.toLowerCase()}.html`,
                      buildVehicleDocumentHtml(v),
                      `camion_${v.plateNumber.toLowerCase()}.html`,
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  <span>Télécharger fiche camion</span>
                </button>
              </div>
            ))}
          </div>
        )}

        {fleetShowcaseTab === 'chauffeurs' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {drivers.map((d) => (
              <div
                key={d.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                      {d.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300">
                    {d.licenseType} · Hub {d.hubCity}
                  </p>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    Véhicule : {d.assignedVehiclePlate || 'En attente'}{' '}
                    {d.assignedTrailerPlate ? `+ ${d.assignedTrailerPlate}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    triggerFileDownload(
                      undefined,
                      `chauffeur_${d.id}.html`,
                      buildDriverDocumentHtml(d),
                      `chauffeur_${d.id}.html`,
                    )
                  }
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                  <span>Télécharger fiche chauffeur</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 5: ACTUALITES, INFOS, VIDEOS, DOCUMENTS & PUBLICATION EXPRESS PAR FICHIERS */}
      <section id="actualites" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 scroll-mt-24 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white [text-wrap:balance]">
              Actualités, Infos, Vidéos & Documents BOUA TRANS
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              Consultez, publiez sans complication par simple sélection de fichiers, et téléchargez tous les médias et documents.
            </p>
          </div>

          <div
            role="tablist"
            aria-label="Filtrer les publications"
            className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
          >
            {[
              { id: 'all', label: 'Tout' },
              { id: 'actualite', label: 'Actualités' },
              { id: 'info', label: 'Infos' },
              { id: 'media', label: 'Vidéos & Photos' },
              { id: 'docs_factures', label: 'Documents & Factures' },
              { id: 'voyages_flotte', label: 'Voyages & Flotte' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={newsFilter === tab.id}
                onClick={() => setNewsFilter(tab.id as PublicNewsFilter)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                  newsFilter === tab.id
                    ? 'bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ZERO-OBSTACLE PUBLIC FILE PUBLISHER + CAMERA */}
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Upload className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>Publier directement par fichiers (sans blocage)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Choisissez une ou plusieurs photos, vidéos, documents, infos ou actualités : la publication est immédiate sur la vitrine et dans la console admin.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                aria-label="Rubrique de publication rapide"
                value={quickFileCategory}
                onChange={(e) =>
                  setQuickFileCategory(e.target.value as PublicationCategory | 'auto')
                }
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold"
              >
                <option value="auto">Détection auto du fichier</option>
                <option value="media">Photo / Vidéo</option>
                <option value="document">Document</option>
                <option value="info">Info</option>
                <option value="actualite">Actualité</option>
                <option value="facture">Facture</option>
                <option value="voyage">Voyage</option>
                <option value="camion">Camion</option>
              </select>

              <label className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>Choisir fichiers & publier</span>
                <input
                  id="public-quick-file-input"
                  type="file"
                  multiple
                  accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html"
                  onChange={handlePublicQuickFileChange}
                  className="sr-only"
                />
              </label>

              <button
                type="button"
                onClick={() => setShowPublicCamera((v) => !v)}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Camera className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                <span>{showPublicCamera ? 'Masquer Caméra' : 'Appareil Photo / Vidéo'}</span>
              </button>
            </div>
          </div>

          {quickPublishFeedback && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
            >
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{quickPublishFeedback}</span>
            </div>
          )}

          {showPublicCamera && (
            <CameraCaptureStudio
              compact
              defaultPublishToShowcase={true}
              onCaptureSaved={onCameraCaptureSaved}
            />
          )}
        </div>

        {/* PUBLICATIONS FEED WITH UNIVERSAL DOWNLOAD & INFINITE SCROLL */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {visiblePublications.map((pub) => {
            const isExpanded = expandedPubId === pub.id;
            const parsedSocial = pub.mediaUrl ? parseSocialMediaUrl(pub.mediaUrl) : null;
            const hasSocialIframe =
              parsedSocial &&
              parsedSocial.embedUrl &&
              ['youtube', 'facebook', 'tiktok', 'instagram', 'twitter'].includes(
                parsedSocial.platform,
              );

            const downloadableData =
              pub.videoPreviewData ||
              pub.mediaPreviewData ||
              pub.fileDataUrl ||
              (parsedSocial?.platform === 'video' || parsedSocial?.platform === 'image'
                ? parsedSocial.embedUrl || undefined
                : undefined);

            const downloadFileName =
              pub.fileName ||
              `${pub.id}.${pub.videoPreviewData ? 'webm' : pub.mediaPreviewData ? 'jpg' : 'html'}`;

            return (
              <article
                key={pub.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-orange-600 dark:text-orange-400">
                      {PUB_CATEGORY_LABELS[pub.category]}
                      {parsedSocial && parsedSocial.platform !== 'none'
                        ? ` · ${parsedSocial.label}`
                        : ''}
                    </span>
                    <time dateTime={pub.createdAt} className="font-mono tabular-nums">
                      {new Date(pub.createdAt).toLocaleDateString('fr-FR')}
                    </time>
                  </div>

                  {/* Local or Direct Video */}
                  {(pub.videoPreviewData || parsedSocial?.platform === 'video') && (
                    <video
                      controls
                      playsInline
                      preload="metadata"
                      src={pub.videoPreviewData || parsedSocial?.embedUrl || undefined}
                      className="w-full h-44 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 object-cover"
                    />
                  )}

                  {/* Local or Direct Photo */}
                  {(pub.mediaPreviewData || parsedSocial?.platform === 'image') && (
                    <img
                      src={pub.mediaPreviewData || parsedSocial?.embedUrl || undefined}
                      alt={pub.mediaLabel || pub.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-44 object-contain rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1.5"
                    />
                  )}

                  {/* File Attachment Badge (PDF, Docs, Factures, Voyages) */}
                  {!pub.videoPreviewData &&
                    !pub.mediaPreviewData &&
                    !hasSocialIframe &&
                    pub.fileName && (
                      <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                          <span className="font-mono truncate text-slate-700 dark:text-slate-200">
                            {pub.fileName}
                          </span>
                        </div>
                        {pub.fileSizeBytes ? (
                          <span className="font-mono text-slate-400 shrink-0">
                            {formatFileSize(pub.fileSizeBytes)}
                          </span>
                        ) : null}
                      </div>
                    )}

                  {/* Social Media Embeds: YouTube, Facebook, TikTok, Instagram, Twitter/X */}
                  {hasSocialIframe && parsedSocial?.embedUrl && (
                    <div className="space-y-2">
                      <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-950 aspect-video">
                        <iframe
                          src={parsedSocial.embedUrl}
                          title={pub.title}
                          loading="lazy"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full border-0"
                        />
                      </div>
                      <a
                        href={parsedSocial.originalUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-orange-600 dark:text-orange-400 hover:underline"
                      >
                        <Play className="h-3 w-3" />
                        <span>Ouvrir sur {parsedSocial.label}</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}

                  <h3 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-white leading-snug">
                    {pub.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    {pub.summary}
                  </p>

                  {isExpanded && (
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-3">
                      {pub.content}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() =>
                      triggerFileDownload(
                        downloadableData,
                        downloadFileName,
                        buildPublicationSheetHtml(pub),
                        `${pub.id}.html`,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    <span>Télécharger</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExpandedPubId(isExpanded ? null : pub.id)}
                    className="font-semibold text-[#0B1F3A] dark:text-orange-400 hover:underline whitespace-nowrap cursor-pointer"
                  >
                    {isExpanded ? 'Réduire' : 'Lire la suite →'}
                  </button>
                </div>
              </article>
            );
          })}
        </div>

        {/* INFINITE SCROLL SENTINEL & PROGRESSIVE LOAD BAR */}
        <div
          ref={pubSentinelRef}
          className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400"
        >
          <span className="font-mono">
            Affichées : {visiblePubsCount} / {totalPubsCount} publications
          </span>
          {hasMorePubs && (
            <button
              type="button"
              onClick={loadMorePubs}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Charger plus de publications (Scroll infini actif)
            </button>
          )}
        </div>
      </section>

      {/* SECTION 6: SIEGE SOCIAL & CONFIANCE */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <img
              src="/assets/aistudio/image_28715b4e.png"
              alt="Emblème officiel Boua Trans"
              referrerPolicy="no-referrer"
              className="h-16 w-16 rounded-full border border-slate-200 dark:border-slate-700 bg-white shrink-0"
            />
            <div className="space-y-1">
              <h3 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-white">
                Plateforme Logistique BOUA TRANS — Yuncos (Toledo, Espagne)
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                <span>{siteContent.hqAddress}</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex flex-wrap items-center gap-3 pt-1">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Phone className="h-3.5 w-3.5" /> {siteContent.hqPhone}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Licence Transport Communautaire Espagne & Europe
                </span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigatePortal('docs')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Scanner · CMR · DECA
            </button>
            <button
              type="button"
              onClick={() => onNavigatePortal('client')}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              Ouvrir Portail Client
            </button>
            <button
              type="button"
              onClick={() => onNavigatePortal('admin')}
              className="rounded-lg bg-[#0B1F3A] dark:bg-orange-600 px-4 py-2.5 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
            >
              Console Exploitation
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
