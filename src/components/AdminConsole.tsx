import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  CalendarClock,
  Camera,
  Check,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Fuel,
  Globe2,
  Megaphone,
  MessageSquare,
  Plus,
  Printer,
  Route,
  Search,
  Send,
  Share2,
  Trash2,
  Truck,
  Upload,
  Users,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import type {
  CapturedMediaItem,
  ChatMessage,
  DriverProfile,
  FreightCargoClass,
  FuelMileageLog,
  InvoiceRecord,
  LassineFacturaData,
  NewsPublication,
  PublicationCategory,
  QuoteRecord,
  RouteVoyageRecord,
  ServiceType,
  ShipmentRecord,
  SiteContentConfig,
  TrailerRecord,
  TrailerType,
  VehicleRecord,
  VehicleStatus,
  VehicleType,
} from '../types/logistics';
import {
  buildDriverDocumentHtml,
  buildPublicationSheetHtml,
  buildVehicleDocumentHtml,
  buildVoyageDocumentHtml,
  calculateCostPerKm,
  calculateFuelConsumptionL100,
  calculateInvoiceBreakdown,
  computeFinancialSummary,
  createDefaultFacturaLassine,
  estimateRouteDistanceKm,
  EUROPEAN_COUNTRIES,
  formatEur,
  formatFileSize,
  formatWeight,
  getServiceLabel,
  getShipmentStatusMeta,
  getTrailerTypeLabel,
  getVehicleTypeLabel,
  inferPublicationFromFile,
  normalizeQuickPublicationInput,
  parseSocialMediaUrl,
  summarizeFuelAndMileage,
  triggerFileDownload,
  validateVoyageForm,
} from '../utils/logistics';
import { downloadFacturaLassinePdf, exportElementToPdf } from '../utils/pdfGenerator';
import { CameraCaptureStudio } from './CameraCaptureStudio';
import { FacturaLassineEditor } from './FacturaLassineEditor';

interface AdminConsoleProps {
  shipments: ShipmentRecord[];
  quotes: QuoteRecord[];
  vehicles: VehicleRecord[];
  trailers: TrailerRecord[];
  drivers: DriverProfile[];
  routes: RouteVoyageRecord[];
  invoices: InvoiceRecord[];
  messages: ChatMessage[];
  fuelLogs: FuelMileageLog[];
  publications: NewsPublication[];
  mediaVault: CapturedMediaItem[];
  siteContent: SiteContentConfig;
  savedFacturas?: LassineFacturaData[];
  onAssignShipment: (shipmentId: string, driverId: string, vehicleId: string) => void;
  onConvertQuoteToShipment: (quoteId: string) => void;
  onToggleInvoicePaid: (shipmentId: string) => void;
  onUpdateVehicleStatus: (vehicleId: string, status: VehicleStatus) => void;
  onUpdateVehicleMaintenance: (vehicleId: string, nextDate: string, note: string) => void;
  onUpdateVehicle: (vehicle: VehicleRecord) => void;
  onAddVehicle: (vehicle: VehicleRecord) => void;
  onAddTrailer: (trailer: TrailerRecord) => void;
  onUpdateTrailerStatus: (trailerId: string, status: VehicleStatus) => void;
  onAddDriver: (driver: DriverProfile) => void;
  onUpdateDriver: (driver: DriverProfile) => void;
  onAssignDriverFleet: (driverId: string, vehicleId: string, trailerId: string) => void;
  onAddRoute: (route: RouteVoyageRecord) => void;
  onUpdateRouteStatus: (routeId: string, status: RouteVoyageRecord['status']) => void;
  onUpdateRoute: (route: RouteVoyageRecord) => void;
  onDeleteRoute: (routeId: string) => void;
  onAddInvoice: (invoice: InvoiceRecord) => void;
  onToggleArchiveInvoiceStatus: (invoiceId: string) => void;
  onSaveFactura?: (factura: LassineFacturaData) => void;
  onSendMessage: (payload: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'admin' | 'driver' | 'partner';
    recipientName: string;
    text: string;
  }) => void;
  onMarkThreadRead: (threadId: string) => void;
  onUpdateShipmentSchedule: (
    shipmentId: string,
    departureSchedule: string,
    estimatedDelivery: string,
  ) => void;
  onPublishNews: (pub: NewsPublication) => void;
  onUpdatePublication: (pub: NewsPublication) => void;
  onDeletePublication: (pubId: string) => void;
  onTogglePublicationPublished: (pubId: string) => void;
  onQuickPublishFiles: (pubs: NewsPublication[], vaultAssets: CapturedMediaItem[]) => void;
  onCameraCaptureSaved: (item: CapturedMediaItem, publishToShowcase: boolean) => void;
  onPublishVaultItem: (item: CapturedMediaItem) => void;
  onDeleteVaultItem: (id: string) => void;
  onUpdateSiteContent: (content: SiteContentConfig) => void;
}

type AdminSectionTab = 'operations' | 'fleet' | 'billing' | 'media' | 'chat';

const PUB_CATEGORY_OPTIONS: { value: PublicationCategory; label: string }[] = [
  { value: 'actualite', label: 'Actualité' },
  { value: 'info', label: 'Info Trafic & Réseau' },
  { value: 'media', label: 'Photo / Vidéo / Réseau' },
  { value: 'document', label: 'Document' },
  { value: 'facture', label: 'Facture' },
  { value: 'voyage', label: 'Voyage Europe' },
  { value: 'camion', label: 'Flotte Camion' },
];

export function AdminConsole({
  shipments,
  quotes,
  vehicles,
  trailers,
  drivers,
  routes,
  invoices,
  messages,
  fuelLogs,
  publications,
  mediaVault,
  siteContent,
  savedFacturas,
  onAssignShipment,
  onConvertQuoteToShipment,
  onToggleInvoicePaid,
  onUpdateVehicleStatus,
  onUpdateVehicleMaintenance,
  onUpdateVehicle,
  onAddVehicle,
  onAddTrailer,
  onUpdateTrailerStatus,
  onAddDriver,
  onUpdateDriver,
  onAssignDriverFleet,
  onAddRoute,
  onUpdateRouteStatus,
  onUpdateRoute,
  onDeleteRoute,
  onAddInvoice,
  onToggleArchiveInvoiceStatus,
  onSaveFactura,
  onSendMessage,
  onMarkThreadRead,
  onUpdateShipmentSchedule,
  onPublishNews,
  onUpdatePublication,
  onDeletePublication,
  onTogglePublicationPublished,
  onQuickPublishFiles,
  onCameraCaptureSaved,
  onPublishVaultItem,
  onDeleteVaultItem,
  onUpdateSiteContent,
}: AdminConsoleProps) {
  const [activeTab, setActiveTab] = useState<AdminSectionTab>('operations');
  const adminRef = useRef<HTMLElement | null>(null);
  const [exportingAdminPdf, setExportingAdminPdf] = useState(false);
  const summary = computeFinancialSummary(shipments, quotes);
  const fuelSummary = summarizeFuelAndMileage(fuelLogs);
  const unreadChatCount = messages.filter((m) => !m.read && m.senderRole !== 'admin').length;

  // Dispatch & Schedule drafts
  const [assignChoices, setAssignChoices] = useState<
    Record<string, { driverId: string; vehicleId: string }>
  >({});
  const [scheduleDrafts, setScheduleDrafts] = useState<
    Record<string, { departure: string; arrival: string }>
  >({});

  // Operations route edit & showcase publish feedback
  const [editingRouteId, setEditingRouteId] = useState<string | null>(null);
  const [editRouteCode, setEditRouteCode] = useState('');
  const [editRouteOrigin, setEditRouteOrigin] = useState('');
  const [editRouteDest, setEditRouteDest] = useState('');
  const [editRouteSchedule, setEditRouteSchedule] = useState('');
  const [editRouteTradeType, setEditRouteTradeType] = useState('');
  const [editRouteDistKm, setEditRouteDistKm] = useState(500);
  const [opsFeedback, setOpsFeedback] = useState<string | null>(null);

  // Truck add + maintenance edit + full edit state
  const [newPlate, setNewPlate] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newType, setNewType] = useState<VehicleType>('semi_40t');
  const [newCapacity, setNewCapacity] = useState(24000);
  const [newVehMaintDate, setNewVehMaintDate] = useState('2027-02-15');
  const [newVehMaintNote, setNewVehMaintNote] = useState('');
  const [vehicleError, setVehicleError] = useState<string | null>(null);
  const [editingVehId, setEditingVehId] = useState<string | null>(null);
  const [editMaintDate, setEditMaintDate] = useState('');
  const [editMaintNote, setEditMaintNote] = useState('');
  const [editingVehDetailsId, setEditingVehDetailsId] = useState<string | null>(null);
  const [editVehPlate, setEditVehPlate] = useState('');
  const [editVehModel, setEditVehModel] = useState('');
  const [editVehCapacity, setEditVehCapacity] = useState(24000);
  const [editVehKm, setEditVehKm] = useState(0);
  const [fleetFeedback, setFleetFeedback] = useState<string | null>(null);

  // Trailer add state
  const [trlPlate, setTrlPlate] = useState('');
  const [trlModel, setTrlModel] = useState('');
  const [trlType, setTrlType] = useState<TrailerType>('tautliner');
  const [trlCapacity, setTrlCapacity] = useState(24000);
  const [trlMaintDate, setTrlMaintDate] = useState('2027-03-01');
  const [trlError, setTrlError] = useState<string | null>(null);

  // Driver add + edit + assignment state
  const [drvName, setDrvName] = useState('');
  const [drvPhone, setDrvPhone] = useState('+34 600 00 00 00');
  const [drvLicense, setDrvLicense] = useState('Permis C+E · ADR');
  const [drvHub, setDrvHub] = useState('Yuncos (Toledo)');
  const [drvError, setDrvError] = useState<string | null>(null);
  const [driverFleetDrafts, setDriverFleetDrafts] = useState<
    Record<string, { vehicleId: string; trailerId: string }>
  >({});
  const [editingDriverId, setEditingDriverId] = useState<string | null>(null);
  const [editDrvName, setEditDrvName] = useState('');
  const [editDrvPhone, setEditDrvPhone] = useState('');
  const [editDrvLicense, setEditDrvLicense] = useState('');
  const [editDrvHub, setEditDrvHub] = useState('');

  // Routes & Voyages Europe form state
  const [rteCode, setRteCode] = useState('');
  const [rteType, setRteType] = useState<'regular' | 'punctual'>('regular');
  const [rteOriginCountry, setRteOriginCountry] = useState('Espagne (National)');
  const [rteOriginCity, setRteOriginCity] = useState('Yuncos (Toledo)');
  const [rteDestCountry, setRteDestCountry] = useState('France');
  const [rteDestCity, setRteDestCity] = useState('Paris');
  const [rteSchedule, setRteSchedule] = useState('2026-11-20 · 06:00');
  const [rteTradeType, setRteTradeType] = useState('Fret général & Palettes');
  const [rteDriverId, setRteDriverId] = useState(drivers[0]?.id || '');
  const [rteVehicleId, setRteVehicleId] = useState(vehicles[0]?.id || '');
  const [rteTrailerId, setRteTrailerId] = useState(trailers[0]?.id || '');
  const [rteError, setRteError] = useState<string | null>(null);

  // Billing calculator & archive state
  const [invClientName, setInvClientName] = useState('');
  const [invRouteLabel, setInvRouteLabel] = useState('Yuncos (Toledo) → Lyon');
  const [invDistanceKm, setInvDistanceKm] = useState(1125);
  const [invWeightKg, setInvWeightKg] = useState(14500);
  const [invServiceType, setInvServiceType] = useState<ServiceType>('standard');
  const [invCargoClass, setInvCargoClass] = useState<FreightCargoClass>('palletized');
  const [invError, setInvError] = useState<string | null>(null);
  const [invSearch, setInvSearch] = useState('');
  const [invStatusFilter, setInvStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [previewInvoice, setPreviewInvoice] = useState<InvoiceRecord | null>(null);
  const [activeBillingFactura, setActiveBillingFactura] = useState<LassineFacturaData>(
    () => savedFacturas?.[0] || createDefaultFacturaLassine(),
  );
  const [billingFeedback, setBillingFeedback] = useState<string | null>(null);

  // Publication & CMS studio state
  const [quickCatChoice, setQuickCatChoice] = useState<PublicationCategory | 'auto'>('auto');
  const [editingPubId, setEditingPubId] = useState<string | null>(null);
  const [pubTitle, setPubTitle] = useState('');
  const [pubCategory, setPubCategory] = useState<PublicationCategory>('actualite');
  const [pubSummary, setPubSummary] = useState('');
  const [pubContent, setPubContent] = useState('');
  const [pubMediaLabel, setPubMediaLabel] = useState('');
  const [pubMediaUrl, setPubMediaUrl] = useState('');
  const [pubMediaData, setPubMediaData] = useState<string | undefined>(undefined);
  const [pubVideoData, setPubVideoData] = useState<string | undefined>(undefined);
  const [pubFileDataUrl, setPubFileDataUrl] = useState<string | undefined>(undefined);
  const [pubFileName, setPubFileName] = useState<string | undefined>(undefined);
  const [pubFileMimeType, setPubFileMimeType] = useState<string | undefined>(undefined);
  const [pubFileSizeBytes, setPubFileSizeBytes] = useState<number | undefined>(undefined);
  const [pubError, setPubError] = useState<string | null>(null);
  const [pubSuccess, setPubSuccess] = useState<string | null>(null);
  const [adminPubFilter, setAdminPubFilter] = useState<PublicationCategory | 'all'>('all');

  // CMS Site Content Editor state
  const [cmsDraft, setCmsDraft] = useState<SiteContentConfig>(siteContent);
  const [cmsFeedback, setCmsFeedback] = useState<string | null>(null);

  useEffect(() => {
    setCmsDraft(siteContent);
  }, [siteContent]);

  // Real-Time Chat state
  const [activeThreadId, setActiveThreadId] = useState<string>(drivers[0]?.id || 'drv-karim');
  const [chatInput, setChatInput] = useState('');

  const liveInvoicePreview = useMemo(
    () =>
      calculateInvoiceBreakdown({
        distanceKm: invDistanceKm,
        weightKg: invWeightKg,
        serviceType: invServiceType,
        cargoClass: invCargoClass,
      }),
    [invDistanceKm, invWeightKg, invServiceType, invCargoClass],
  );

  const parsedSocialPreview = useMemo(() => parseSocialMediaUrl(pubMediaUrl), [pubMediaUrl]);

  const filteredAdminPubs = useMemo(() => {
    if (adminPubFilter === 'all') return publications;
    return publications.filter((p) => p.category === adminPubFilter);
  }, [publications, adminPubFilter]);

  const {
    visibleItems: visibleAdminPubs,
    hasMore: hasMoreAdminPubs,
    loadMore: loadMoreAdminPubs,
    totalCount: totalAdminPubs,
    visibleCount: visibleAdminPubsCount,
    sentinelRef: adminPubSentinelRef,
  } = useInfiniteScroll(filteredAdminPubs, { initialBatchSize: 6, stepSize: 6 });

  const {
    visibleItems: visibleVaultItems,
    hasMore: hasMoreVault,
    loadMore: loadMoreVault,
    totalCount: totalVaultCount,
    visibleCount: visibleVaultCount,
    sentinelRef: vaultSentinelRef,
  } = useInfiniteScroll(mediaVault, { initialBatchSize: 6, stepSize: 6 });

  const handleAddVehicleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (newPlate.trim().length < 4 || newModel.trim().length < 2) {
      setVehicleError('Plaque d’immatriculation (obligatoire, min. 4 car.) et modèle requis.');
      return;
    }
    setVehicleError(null);
    const nowIso = new Date().toISOString();
    onAddVehicle({
      id: `veh-${Date.now().toString(36)}`,
      plateNumber: newPlate.trim().toUpperCase().slice(0, 20),
      model: newModel.trim().slice(0, 80),
      type: newType,
      capacityKg: Math.max(500, Math.min(44000, Number(newCapacity) || 3500)),
      currentKm: 0,
      status: 'available',
      nextMaintenanceDate: newVehMaintDate || undefined,
      maintenanceNote: newVehMaintNote.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setNewPlate('');
    setNewModel('');
    setNewVehMaintNote('');
  };

  const handleAddTrailerSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (trlPlate.trim().length < 4 || trlModel.trim().length < 2) {
      setTrlError('Immatriculation remorque obligatoire (min. 4 car.) et modèle requis.');
      return;
    }
    setTrlError(null);
    const nowIso = new Date().toISOString();
    onAddTrailer({
      id: `trl-${Date.now().toString(36)}`,
      plateNumber: trlPlate.trim().toUpperCase().slice(0, 20),
      model: trlModel.trim().slice(0, 80),
      trailerType: trlType,
      capacityKg: Math.max(1000, Math.min(44000, Number(trlCapacity) || 24000)),
      status: 'available',
      nextMaintenanceDate: trlMaintDate || undefined,
      maintenanceNote: 'Enregistrement initial parc remorques',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setTrlPlate('');
    setTrlModel('');
  };

  const handleAddDriverSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (drvName.trim().length < 2 || drvPhone.trim().length < 6) {
      setDrvError('Nom complet et téléphone européen du chauffeur requis.');
      return;
    }
    setDrvError(null);
    onAddDriver({
      id: `drv-${Date.now().toString(36)}`,
      name: drvName.trim(),
      phone: drvPhone.trim(),
      licenseType: drvLicense.trim() || 'Permis C+E',
      hubCity: drvHub.trim() || 'Yuncos (Toledo)',
      status: 'available',
    });
    setDrvName('');
  };

  const handleAddRouteSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateVoyageForm({
      originCity: rteOriginCity,
      destinationCity: rteDestCity,
      scheduleOrDate: rteSchedule,
      tradeType: rteTradeType,
    });
    if (!validation.valid) {
      setRteError(validation.error || 'Origine, Destination, Date de départ et Type de commerce requis.');
      return;
    }
    setRteError(null);
    const nowIso = new Date().toISOString();
    const drv = drivers.find((d) => d.id === rteDriverId);
    const veh = vehicles.find((v) => v.id === rteVehicleId);
    const trl = trailers.find((t) => t.id === rteTrailerId);
    const distanceKm = estimateRouteDistanceKm(rteOriginCity, rteDestCity);
    const generatedCode =
      rteCode.trim().toUpperCase() ||
      `${rteType === 'regular' ? 'LINE' : 'VOY'}-${Date.now().toString().slice(-4)}`;

    onAddRoute({
      id: `rte-${Date.now().toString(36)}`,
      routeCode: generatedCode,
      routeType: rteType,
      originCountry: rteOriginCountry,
      originCity: rteOriginCity.trim(),
      destinationCountry: rteDestCountry,
      destinationCity: rteDestCity.trim(),
      distanceKm,
      scheduleOrDate: rteSchedule.trim(),
      tradeType: rteTradeType.trim(),
      status: 'planned',
      driverId: drv?.id,
      driverName: drv?.name,
      vehicleId: veh?.id,
      vehiclePlate: veh?.plateNumber,
      trailerId: trl?.id,
      trailerPlate: trl?.plateNumber,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setRteCode('');
    setOpsFeedback(`Voyage ${generatedCode} (${rteTradeType.trim()}) enregistré.`);
  };

  const handleCreateInvoiceSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (invClientName.trim().length < 2 || invRouteLabel.trim().length < 3) {
      setInvError('Indiquez la raison sociale du client et le trajet facturé.');
      return;
    }
    setInvError(null);
    const nowIso = new Date().toISOString();
    const invNum = `FAC-2026-${Math.floor(1000 + Math.random() * 8999)}`;
    const newInvoice: InvoiceRecord = {
      id: `inv-${Date.now().toString(36)}`,
      invoiceNumber: invNum,
      clientName: invClientName.trim(),
      routeLabel: invRouteLabel.trim(),
      distanceKm: Number(invDistanceKm),
      weightKg: Number(invWeightKg),
      serviceType: invServiceType,
      cargoClass: invCargoClass,
      htAmountEur: liveInvoicePreview.htAmountEur,
      tvaRate: liveInvoicePreview.tvaRate,
      tvaAmountEur: liveInvoicePreview.tvaAmountEur,
      totalTtcEur: liveInvoicePreview.totalTtcEur,
      status: 'pending',
      issuedAt: nowIso,
      updatedAt: nowIso,
    };
    onAddInvoice(newInvoice);
    setInvClientName('');
  };

  // Zero-obstacle multi-file publisher in Admin
  const handleAdminInstantMultiFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
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
                quickCatChoice,
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
      setPubError(null);
      setPubSuccess(
        `${results.length} fichier${results.length > 1 ? 's' : ''} publié${results.length > 1 ? 's' : ''} sans blocage sur l’interface publique et archivé${results.length > 1 ? 's' : ''} dans l’Admin.`,
      );
    });
    e.target.value = '';
  };

  const handlePubFormFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPubFileName(file.name);
    setPubFileMimeType(file.type || 'application/octet-stream');
    setPubFileSizeBytes(file.size);
    if (!pubMediaLabel) setPubMediaLabel(file.name);
    if (!pubTitle) {
      setPubTitle(
        inferPublicationFromFile({ name: file.name, type: file.type, size: file.size }).title,
      );
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      if (file.type.startsWith('video/')) {
        setPubVideoData(reader.result);
        setPubMediaData(undefined);
        setPubFileDataUrl(undefined);
      } else if (file.type.startsWith('image/')) {
        setPubMediaData(reader.result);
        setPubVideoData(undefined);
        setPubFileDataUrl(undefined);
      } else {
        setPubFileDataUrl(reader.result);
        setPubMediaData(undefined);
        setPubVideoData(undefined);
      }
    };
    reader.readAsDataURL(file);
  };

  const resetPubForm = () => {
    setEditingPubId(null);
    setPubTitle('');
    setPubCategory('actualite');
    setPubSummary('');
    setPubContent('');
    setPubMediaLabel('');
    setPubMediaUrl('');
    setPubMediaData(undefined);
    setPubVideoData(undefined);
    setPubFileDataUrl(undefined);
    setPubFileName(undefined);
    setPubFileMimeType(undefined);
    setPubFileSizeBytes(undefined);
  };

  const startEditPublication = (pub: NewsPublication) => {
    setEditingPubId(pub.id);
    setPubTitle(pub.title);
    setPubCategory(pub.category);
    setPubSummary(pub.summary);
    setPubContent(pub.content);
    setPubMediaLabel(pub.mediaLabel || '');
    setPubMediaUrl(pub.mediaUrl || '');
    setPubMediaData(pub.mediaPreviewData);
    setPubVideoData(pub.videoPreviewData);
    setPubFileDataUrl(pub.fileDataUrl);
    setPubFileName(pub.fileName);
    setPubFileMimeType(pub.fileMimeType);
    setPubFileSizeBytes(pub.fileSizeBytes);
    setPubError(null);
    setPubSuccess(null);
  };

  const handlePublishSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = normalizeQuickPublicationInput({
      title: pubTitle,
      category: pubCategory,
      summary: pubSummary,
      content: pubContent,
      mediaLabel: pubMediaLabel,
      mediaUrl: pubMediaUrl,
      fileName: pubFileName,
      fileMimeType: pubFileMimeType,
      fileSizeBytes: pubFileSizeBytes,
      hasMediaBlob: Boolean(pubMediaData || pubVideoData || pubFileDataUrl),
    });

    if (!validation.valid || !validation.normalized) {
      setPubError(validation.error || 'Champs de publication invalides.');
      setPubSuccess(null);
      return;
    }

    setPubError(null);
    const nowIso = new Date().toISOString();
    const norm = validation.normalized;
    const detectedPlatform = pubVideoData
      ? 'video'
      : pubMediaData
      ? 'image'
      : pubFileDataUrl
      ? 'file'
      : parsedSocialPreview.platform !== 'none'
      ? parsedSocialPreview.platform
      : norm.mediaPlatform;

    if (editingPubId) {
      const existing = publications.find((p) => p.id === editingPubId);
      const updatedPub: NewsPublication = {
        ...(existing || {
          id: editingPubId,
          createdAt: nowIso,
          published: true,
        }),
        title: norm.title,
        category: pubCategory,
        summary: norm.summary,
        content: norm.content,
        mediaLabel: norm.mediaLabel,
        mediaPlatform: detectedPlatform,
        mediaUrl: pubMediaUrl.trim() || undefined,
        mediaPreviewData: pubMediaData,
        videoPreviewData: pubVideoData,
        fileDataUrl: pubFileDataUrl,
        fileName: pubFileName,
        fileMimeType: pubFileMimeType,
        fileSizeBytes: pubFileSizeBytes,
        updatedAt: nowIso,
      };
      onUpdatePublication(updatedPub);
      setPubSuccess(`Publication « ${updatedPub.title} » modifiée et synchronisée.`);
      resetPubForm();
      return;
    }

    const newPub: NewsPublication = {
      id: `pub-${Date.now().toString(36)}`,
      title: norm.title,
      category: pubCategory,
      summary: norm.summary,
      content: norm.content,
      mediaLabel: norm.mediaLabel,
      mediaPlatform: detectedPlatform,
      mediaUrl: pubMediaUrl.trim() || undefined,
      mediaPreviewData: pubMediaData,
      videoPreviewData: pubVideoData,
      fileDataUrl: pubFileDataUrl,
      fileName: pubFileName,
      fileMimeType: pubFileMimeType,
      fileSizeBytes: pubFileSizeBytes,
      capturedSource: pubMediaData || pubVideoData || pubFileDataUrl ? 'upload' : 'social',
      published: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    onPublishNews(newPub);
    setPubSuccess(`Publication « ${newPub.title} » diffusée sur la vitrine et l’Admin.`);
    resetPubForm();
  };

  const handleSaveSiteContent = (e: FormEvent) => {
    e.preventDefault();
    onUpdateSiteContent({
      ...cmsDraft,
      updatedAt: new Date().toISOString(),
    });
    setCmsFeedback('Contenus du site vitrine mis à jour et publiés.');
  };

  const handlePublishRouteToShowcase = (r: RouteVoyageRecord) => {
    const nowIso = new Date().toISOString();
    const html = buildVoyageDocumentHtml(r);
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    onPublishNews({
      id: `pub-rte-${r.id}-${Date.now().toString(36).slice(-4)}`,
      title: `Voyage Europe ${r.routeCode} · ${r.originCity} → ${r.destinationCity}`,
      category: 'voyage',
      summary: `${r.routeType === 'regular' ? 'Ligne régulière' : 'Voyage ponctuel'} · ${r.distanceKm} km · ${r.scheduleOrDate}`,
      content: `Trajet ${r.originCity} (${r.originCountry}) vers ${r.destinationCity} (${r.destinationCountry}). Chauffeur : ${r.driverName || 'À affecter'}. Ensemble : ${r.vehiclePlate || '—'} ${r.trailerPlate ? `+ ${r.trailerPlate}` : ''}.`,
      mediaLabel: `Fiche ${r.routeCode}`,
      mediaPlatform: 'file',
      fileDataUrl: dataUrl,
      fileName: `${r.routeCode.toLowerCase()}.html`,
      capturedSource: 'entity',
      linkedEntityType: 'voyage',
      linkedEntityId: r.id,
      published: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setOpsFeedback(`Voyage ${r.routeCode} publié sur l’interface publique.`);
  };

  const handlePublishVehicleToShowcase = (v: VehicleRecord) => {
    const nowIso = new Date().toISOString();
    const html = buildVehicleDocumentHtml(v);
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    onPublishNews({
      id: `pub-veh-${v.id}-${Date.now().toString(36).slice(-4)}`,
      title: `Camion ${v.plateNumber} · ${v.model}`,
      category: 'camion',
      summary: `${getVehicleTypeLabel(v.type)} · Capacité ${formatWeight(v.capacityKg)}`,
      content: `Véhicule immatriculé ${v.plateNumber} (${v.model}) affecté à la flotte Espagne & Europe BOUA TRANS.${v.assignedDriverName ? ` Conducteur attitré : ${v.assignedDriverName}.` : ''}`,
      mediaLabel: `Flotte ${v.plateNumber}`,
      mediaPlatform: 'file',
      fileDataUrl: dataUrl,
      fileName: `camion_${v.plateNumber.toLowerCase()}.html`,
      capturedSource: 'entity',
      linkedEntityType: 'camion',
      linkedEntityId: v.id,
      published: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setFleetFeedback(`Véhicule ${v.plateNumber} publié sur la vitrine.`);
  };

  const buildInvoiceHtml = (inv: InvoiceRecord) =>
    `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${inv.invoiceNumber}</title><style>body{font-family:system-ui,sans-serif;padding:40px;max-width:740px;margin:auto;color:#0f172a;line-height:1.6}table{width:100%;border-collapse:collapse;margin-top:20px}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left}</style></head><body><h1>FACTURE ${inv.invoiceNumber}</h1><p><strong>BOUA TRANS SL</strong> — Avenida Castilla La Mancha 122, 45210 Yuncos (Toledo), Espagne · +34 632 60 71 01</p><p><strong>Client :</strong> ${inv.clientName}</p><p><strong>Trajet :</strong> ${inv.routeLabel} (${inv.distanceKm} km · ${formatWeight(inv.weightKg)})</p><p><strong>Prestation :</strong> ${getServiceLabel(inv.serviceType)}</p><table><tr><th>Montant HT</th><th>TVA (21 %)</th><th>Total TTC</th><th>Statut</th></tr><tr><td>${inv.htAmountEur.toFixed(2)} €</td><td>${inv.tvaAmountEur.toFixed(2)} €</td><td><strong>${inv.totalTtcEur.toFixed(2)} €</strong></td><td>${inv.status === 'paid' ? 'Acquittée' : 'En attente'}</td></tr></table></body></html>`;

  const invoiceToFactura = (inv: InvoiceRecord) =>
    createDefaultFacturaLassine({
      invoiceNumber: inv.invoiceNumber,
      clientName: inv.clientName,
      routeLabel: `${inv.routeLabel} (${inv.distanceKm} km · ${formatWeight(inv.weightKg)})`,
      priceEur: inv.totalTtcEur,
      issueDate: inv.issuedAt.slice(0, 10),
    });

  const handleDownloadInvoicePdfHtml = (inv: InvoiceRecord) => {
    downloadFacturaLassinePdf(invoiceToFactura(inv));
  };

  const handlePublishInvoiceToShowcase = (inv: InvoiceRecord) => {
    const nowIso = new Date().toISOString();
    const html = buildInvoiceHtml(inv);
    const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
    onPublishNews({
      id: `pub-inv-${inv.id}-${Date.now().toString(36).slice(-4)}`,
      title: `Facture ${inv.invoiceNumber} · ${inv.clientName}`,
      category: 'facture',
      summary: `${inv.routeLabel} · Total TTC ${inv.totalTtcEur.toFixed(2)} € (${inv.status === 'paid' ? 'Acquittée' : 'En attente'})`,
      content: `Facture de fret routier européen ${inv.invoiceNumber} émise par BOUA TRANS SL pour ${inv.clientName} (${inv.routeLabel}, ${inv.distanceKm} km, ${formatWeight(inv.weightKg)}).`,
      mediaLabel: inv.invoiceNumber,
      mediaPlatform: 'file',
      fileDataUrl: dataUrl,
      fileName: `${inv.invoiceNumber}.html`,
      capturedSource: 'entity',
      linkedEntityType: 'facture',
      linkedEntityId: inv.id,
      published: true,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setBillingFeedback(`Facture ${inv.invoiceNumber} publiée dans le flux public.`);
  };

  const handleChatSend = (e: FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const recipient = drivers.find((d) => d.id === activeThreadId)?.name || 'Partenaire Europe';
    onSendMessage({
      threadId: activeThreadId,
      senderId: 'admin',
      senderName: 'Dispatch BOUA TRANS',
      senderRole: 'admin',
      recipientName: recipient,
      text: chatInput.trim(),
    });
    setChatInput('');
  };

  const pendingQuotes = quotes.filter((q) => q.status === 'pending' || q.status === 'approved');
  const availableVehicles = vehicles.filter((v) => v.status !== 'maintenance');
  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = invStatusFilter === 'all' || inv.status === invStatusFilter;
    const q = invSearch.trim().toLowerCase();
    const matchesQuery =
      !q ||
      inv.clientName.toLowerCase().includes(q) ||
      inv.invoiceNumber.toLowerCase().includes(q) ||
      inv.routeLabel.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  const activeThreadMessages = messages.filter((m) => m.threadId === activeThreadId);

  const handleExportAdminView = async () => {
    if (!adminRef.current) return;
    setExportingAdminPdf(true);
    try {
      await exportElementToPdf(adminRef.current, `bouatrans_admin_${activeTab}.pdf`);
    } finally {
      setExportingAdminPdf(false);
    }
  };

  return (
    <main ref={adminRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Console Administration Sécurisée · Espagne & Europe (Base Yuncos, Tolède)
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white mt-1">
            Administration BOUA TRANS
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void handleExportAdminView()}
          disabled={exportingAdminPdf}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2.5 text-xs font-semibold hover:opacity-95 cursor-pointer disabled:opacity-60"
        >
          <Download className="h-4 w-4 text-orange-400 dark:text-white" />
          <span>{exportingAdminPdf ? 'Génération PDF...' : 'Exporter vue PDF'}</span>
        </button>
      </div>

      {/* Financial KPI Grid */}
      <section aria-label="Indicateurs financiers" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Chiffre d’affaires expéditions</p>
          <p className="font-mono text-2xl font-bold text-[#0B1F3A] dark:text-white mt-1 tabular-nums">
            {formatEur(summary.totalRevenueEur)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Factures encaissées</p>
          <p className="font-mono text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums">
            {formatEur(summary.collectedEur)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Coffre Médias & Publications</p>
          <p className="font-mono text-2xl font-bold text-orange-600 dark:text-orange-400 mt-1 tabular-nums">
            {mediaVault.length} / {publications.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <p className="text-xs text-slate-500 dark:text-slate-400">Expéditions actives / POD</p>
          <p className="font-mono text-2xl font-bold text-[#0B1F3A] dark:text-white mt-1 tabular-nums">
            {summary.activeShipmentsCount} · {summary.podRatePercent} %
          </p>
        </div>
      </section>

      {/* Admin Module Switcher */}
      <div
        role="tablist"
        aria-label="Modules d'administration"
        className="flex flex-nowrap overflow-x-auto max-w-full items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
      >
        {[
          { id: 'operations', label: `Opérations · Voyages (${routes.length})` },
          { id: 'fleet', label: `Flotte · Camions & Chauffeurs` },
          { id: 'billing', label: `Facturation & PDF (${invoices.length})` },
          {
            id: 'media',
            label: `Actualités, Infos, Caméra & Contenus (${publications.length})`,
          },
          {
            id: 'chat',
            label: `Messagerie${unreadChatCount > 0 ? ` (${unreadChatCount})` : ''}`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as AdminSectionTab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: OPERATIONS — QUOTES, DISPATCH, ROUTES & VOYAGES EUROPE, SCHEDULE */}
      {activeTab === 'operations' && (
        <div className="space-y-8">
          {opsFeedback && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
            >
              {opsFeedback}
            </div>
          )}

          {/* Routes & Voyages Europe */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Route className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>Créer une Route ou un Voyage Europe</span>
              </h2>
              <form onSubmit={handleAddRouteSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rte-code" className="block font-semibold mb-1">
                      Code ligne / voyage
                    </label>
                    <input
                      id="rte-code"
                      type="text"
                      value={rteCode}
                      onChange={(e) => setRteCode(e.target.value)}
                      placeholder="LINE-ES-FR-03"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="rte-type" className="block font-semibold mb-1">
                      Fréquence
                    </label>
                    <select
                      id="rte-type"
                      value={rteType}
                      onChange={(e) => setRteType(e.target.value as 'regular' | 'punctual')}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-semibold"
                    >
                      <option value="regular">Ligne Régulière</option>
                      <option value="punctual">Voyage Ponctuel</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rte-orig-country" className="block font-semibold mb-1">
                      Pays départ (UE)
                    </label>
                    <select
                      id="rte-orig-country"
                      value={rteOriginCountry}
                      onChange={(e) => setRteOriginCountry(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
                    >
                      {EUROPEAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rte-orig-city" className="block font-semibold mb-1">
                      Origine (Ville départ) *
                    </label>
                    <input
                      id="rte-orig-city"
                      type="text"
                      required
                      value={rteOriginCity}
                      onChange={(e) => setRteOriginCity(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rte-dest-country" className="block font-semibold mb-1">
                      Pays destination (UE)
                    </label>
                    <select
                      id="rte-dest-country"
                      value={rteDestCountry}
                      onChange={(e) => setRteDestCountry(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
                    >
                      {EUROPEAN_COUNTRIES.map((c) => (
                        <option key={c.code} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rte-dest-city" className="block font-semibold mb-1">
                      Destination (Ville arrivée) *
                    </label>
                    <input
                      id="rte-dest-city"
                      type="text"
                      required
                      value={rteDestCity}
                      onChange={(e) => setRteDestCity(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="rte-schedule" className="block font-semibold mb-1">
                      Date de départ *
                    </label>
                    <input
                      id="rte-schedule"
                      type="text"
                      required
                      value={rteSchedule}
                      onChange={(e) => setRteSchedule(e.target.value)}
                      placeholder="Ex : 2026-11-22 · 06:00"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="rte-trade-type" className="block font-semibold mb-1">
                      Type de commerce *
                    </label>
                    <input
                      id="rte-trade-type"
                      type="text"
                      required
                      list="rte-trade-options"
                      value={rteTradeType}
                      onChange={(e) => setRteTradeType(e.target.value)}
                      placeholder="Ex : Agroalimentaire, Industriel..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    />
                    <datalist id="rte-trade-options">
                      <option value="Fret général & Palettes" />
                      <option value="Agroalimentaire & Frais" />
                      <option value="Industriel & Automobile" />
                      <option value="Matériaux & Construction" />
                      <option value="Distribution & E-commerce" />
                    </datalist>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label htmlFor="rte-driver" className="block font-semibold mb-1">
                      Chauffeur
                    </label>
                    <select
                      id="rte-driver"
                      value={rteDriverId}
                      onChange={(e) => setRteDriverId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2"
                    >
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rte-truck" className="block font-semibold mb-1">
                      Camion
                    </label>
                    <select
                      id="rte-truck"
                      value={rteVehicleId}
                      onChange={(e) => setRteVehicleId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2 font-mono"
                    >
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plateNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="rte-trailer" className="block font-semibold mb-1">
                      Remorque
                    </label>
                    <select
                      id="rte-trailer"
                      value={rteTrailerId}
                      onChange={(e) => setRteTrailerId(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2 font-mono"
                    >
                      <option value="">Aucune</option>
                      {trailers.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.plateNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {rteError && (
                  <p role="alert" className="text-red-600 dark:text-red-400">
                    {rteError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 font-semibold cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Enregistrer la route / voyage</span>
                </button>
              </form>
            </div>

            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                  Suivi des Lignes Régulières & Voyages Europe ({routes.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {routes.map((r) => {
                  const isEditing = editingRouteId === r.id;
                  return (
                    <div key={r.id} className="p-4 px-6 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="font-mono font-bold text-[#0B1F3A] dark:text-white">
                            {r.routeCode} ·{' '}
                            <span className="font-sans text-orange-600 dark:text-orange-400">
                              {r.routeType === 'regular' ? 'Ligne régulière' : 'Voyage ponctuel'}
                            </span>
                          </p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">
                            {r.originCity} ({r.originCountry}) → {r.destinationCity} ({r.destinationCountry})
                          </p>
                          {r.tradeType && (
                            <span className="inline-block rounded border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 px-2 py-0.5 text-[11px] font-semibold text-sky-800 dark:text-sky-300">
                              {r.tradeType}
                            </span>
                          )}
                          <p className="text-slate-500 dark:text-slate-400 font-mono">
                            {r.distanceKm} km · {r.scheduleOrDate} · {r.driverName || 'À affecter'}{' '}
                            {r.vehiclePlate ? `· ${r.vehiclePlate}` : ''}{' '}
                            {r.trailerPlate ? `/ ${r.trailerPlate}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            aria-label={`État route ${r.routeCode}`}
                            value={r.status}
                            onChange={(e) =>
                              onUpdateRouteStatus(r.id, e.target.value as RouteVoyageRecord['status'])
                            }
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-semibold"
                          >
                            <option value="planned">Planifié</option>
                            <option value="in_progress">En cours</option>
                            <option value="completed">Terminé</option>
                            <option value="delayed">Retard signalé</option>
                          </select>

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
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                            <span>Télécharger</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePublishRouteToShowcase(r)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Share2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Publier Vitrine</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditing) {
                                setEditingRouteId(null);
                              } else {
                                setEditingRouteId(r.id);
                                setEditRouteCode(r.routeCode);
                                setEditRouteOrigin(r.originCity);
                                setEditRouteDest(r.destinationCity);
                                setEditRouteSchedule(r.scheduleOrDate);
                                setEditRouteTradeType(r.tradeType || '');
                                setEditRouteDistKm(r.distanceKm);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => onDeleteRoute(r.id)}
                            aria-label={`Supprimer ${r.routeCode}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 dark:border-red-900/60 px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      {isEditing && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 grid grid-cols-1 sm:grid-cols-6 gap-2">
                          <input
                            type="text"
                            value={editRouteCode}
                            onChange={(e) => setEditRouteCode(e.target.value)}
                            placeholder="Code"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
                          />
                          <input
                            type="text"
                            value={editRouteOrigin}
                            onChange={(e) => setEditRouteOrigin(e.target.value)}
                            placeholder="Origine"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                          />
                          <input
                            type="text"
                            value={editRouteDest}
                            onChange={(e) => setEditRouteDest(e.target.value)}
                            placeholder="Destination"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                          />
                          <input
                            type="text"
                            value={editRouteSchedule}
                            onChange={(e) => setEditRouteSchedule(e.target.value)}
                            placeholder="Date départ"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
                          />
                          <input
                            type="text"
                            value={editRouteTradeType}
                            onChange={(e) => setEditRouteTradeType(e.target.value)}
                            placeholder="Type commerce"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateRoute({
                                ...r,
                                routeCode: editRouteCode.trim() || r.routeCode,
                                originCity: editRouteOrigin.trim() || r.originCity,
                                destinationCity: editRouteDest.trim() || r.destinationCity,
                                scheduleOrDate: editRouteSchedule.trim() || r.scheduleOrDate,
                                tradeType: editRouteTradeType.trim() || r.tradeType,
                                distanceKm: Number(editRouteDistKm) || r.distanceKm,
                                updatedAt: new Date().toISOString(),
                              });
                              setEditingRouteId(null);
                              setOpsFeedback(`Voyage ${editRouteCode} mis à jour.`);
                            }}
                            className="rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-3 py-1.5 font-semibold cursor-pointer"
                          >
                            Sauvegarder
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Pending Quotes Conversion */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
              Devis clients à transformer en course ({pendingQuotes.length})
            </h2>
            {pendingQuotes.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Tous les devis ont déjà été convertis en expéditions.
              </p>
            ) : (
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {pendingQuotes.map((q) => (
                  <div
                    key={q.id}
                    className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {q.clientName} · {q.originCity} → {q.destinationCity}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {formatWeight(q.weightKg)} · {q.volumeM3} m³ ·{' '}
                        {formatEur(q.estimatedPriceEur)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onConvertQuoteToShipment(q.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-3.5 py-2 text-xs font-semibold cursor-pointer whitespace-nowrap"
                    >
                      <Check className="h-3.5 w-3.5" />
                      <span>Créer l’expédition</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Dispatch Table */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                Attribution des courses & suivi facturation expéditions
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4 font-semibold">Récépissé</th>
                    <th className="py-3 px-4 font-semibold">Corridor & Client</th>
                    <th className="py-3 px-4 font-semibold">Statut</th>
                    <th className="py-3 px-4 font-semibold">Chauffeur / Véhicule</th>
                    <th className="py-3 px-4 font-semibold text-right">Facturation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {shipments.map((s) => {
                    const statusMeta = getShipmentStatusMeta(s.status);
                    const selectedPair = assignChoices[s.id] || {
                      driverId: s.driverId || drivers[0]?.id || '',
                      vehicleId: s.vehicleId || availableVehicles[0]?.id || '',
                    };

                    return (
                      <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-3.5 px-4 font-mono text-xs font-bold">
                          {s.trackingNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {s.originCity} → {s.destinationCity}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {s.clientName} · {formatWeight(s.weightKg)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.label}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {s.status === 'pending_assignment' ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                aria-label={`Choisir chauffeur pour ${s.trackingNumber}`}
                                value={selectedPair.driverId}
                                onChange={(e) =>
                                  setAssignChoices((prev) => ({
                                    ...prev,
                                    [s.id]: { ...selectedPair, driverId: e.target.value },
                                  }))
                                }
                                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs"
                              >
                                {drivers.map((d) => (
                                  <option key={d.id} value={d.id}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                              <select
                                aria-label={`Choisir véhicule pour ${s.trackingNumber}`}
                                value={selectedPair.vehicleId}
                                onChange={(e) =>
                                  setAssignChoices((prev) => ({
                                    ...prev,
                                    [s.id]: { ...selectedPair, vehicleId: e.target.value },
                                  }))
                                }
                                className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs font-mono"
                              >
                                {availableVehicles.map((v) => (
                                  <option key={v.id} value={v.id}>
                                    {v.plateNumber}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  onAssignShipment(s.id, selectedPair.driverId, selectedPair.vehicleId)
                                }
                                className="rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer"
                              >
                                Attribuer
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-700 dark:text-slate-300">
                              {s.driverName || '—'} ·{' '}
                              <span className="font-mono">{s.vehiclePlate || '—'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right tabular-nums">
                          <div className="inline-flex items-center gap-3">
                            <span className="font-mono font-semibold">{formatEur(s.priceEur)}</span>
                            <button
                              type="button"
                              onClick={() => onToggleInvoicePaid(s.id)}
                              className={`rounded-md border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                                s.invoicePaid
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                                  : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              }`}
                            >
                              {s.invoicePaid ? 'Encaissée' : 'Marquer payée'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* Tableau Départs & Arrivées */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                Tableau des Départs & Arrivées (Planning quai Yuncos)
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500">
                    <th className="py-3 px-4 font-semibold">Récépissé & Axe</th>
                    <th className="py-3 px-4 font-semibold">Heure de départ</th>
                    <th className="py-3 px-4 font-semibold">Heure d’arrivée prévue</th>
                    <th className="py-3 px-4 font-semibold text-right">Validation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {shipments.map((s) => {
                    const draft = scheduleDrafts[s.id] || {
                      departure: s.departureSchedule || '2026-11-16 · 07:00',
                      arrival: s.estimatedDelivery,
                    };
                    return (
                      <tr key={s.id}>
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold block">
                            {s.trackingNumber}
                          </span>
                          <span className="text-xs text-slate-500">
                            {s.originCity} → {s.destinationCity}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <input
                            aria-label={`Départ pour ${s.trackingNumber}`}
                            type="text"
                            value={draft.departure}
                            onChange={(e) =>
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [s.id]: { ...draft, departure: e.target.value },
                              }))
                            }
                            className="w-full min-w-[150px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <input
                            aria-label={`Arrivée pour ${s.trackingNumber}`}
                            type="text"
                            value={draft.arrival}
                            onChange={(e) =>
                              setScheduleDrafts((prev) => ({
                                ...prev,
                                [s.id]: { ...draft, arrival: e.target.value },
                              }))
                            }
                            className="w-full min-w-[150px] rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono text-xs"
                          />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateShipmentSchedule(s.id, draft.departure, draft.arrival)
                            }
                            className="rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-3 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            Mettre à jour
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 2: FLEET — TRUCKS, TRAILERS, DRIVERS ASSIGNMENT & FUEL/MILEAGE */}
      {activeTab === 'fleet' && (
        <div className="space-y-8">
          {fleetFeedback && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
            >
              {fleetFeedback}
            </div>
          )}

          {/* Camions & Entretien */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <Truck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span>Parc Camions & Tracteurs ({vehicles.length})</span>
                </h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {vehicles.map((v) => {
                  const isEditingMaint = editingVehId === v.id;
                  const isEditingDetails = editingVehDetailsId === v.id;
                  return (
                    <div key={v.id} className="p-4 px-6 space-y-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                          <p className="font-mono font-bold text-[#0B1F3A] dark:text-white">
                            {v.plateNumber}{' '}
                            <span className="font-sans font-semibold text-slate-700 dark:text-slate-200">
                              · {v.model}
                            </span>
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {getVehicleTypeLabel(v.type)} · Charge {formatWeight(v.capacityKg)}
                            {typeof v.currentKm === 'number'
                              ? ` · ${v.currentKm.toLocaleString('fr-FR')} km`
                              : ''}
                            {v.assignedDriverName ? ` · Chauffeur : ${v.assignedDriverName}` : ''}
                            {v.assignedTrailerPlate
                              ? ` · Remorque : ${v.assignedTrailerPlate}`
                              : ''}
                          </p>
                          {(v.nextMaintenanceDate || v.maintenanceNote) && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                              Prochain entretien : {v.nextMaintenanceDate || '—'} ·{' '}
                              {v.maintenanceNote || ''}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs">
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
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                            <span>Télécharger</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePublishVehicleToShowcase(v)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Share2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Publier Vitrine</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingDetails) {
                                setEditingVehDetailsId(null);
                              } else {
                                setEditingVehDetailsId(v.id);
                                setEditVehPlate(v.plateNumber);
                                setEditVehModel(v.model);
                                setEditVehCapacity(v.capacityKg);
                                setEditVehKm(v.currentKm || 0);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Modifier</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingMaint) {
                                setEditingVehId(null);
                              } else {
                                setEditingVehId(v.id);
                                setEditMaintDate(v.nextMaintenanceDate || '2027-01-15');
                                setEditMaintNote(v.maintenanceNote || '');
                              }
                            }}
                            className="rounded-lg border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            Entretien
                          </button>
                          <select
                            aria-label={`Statut du véhicule ${v.plateNumber}`}
                            value={v.status}
                            onChange={(e) =>
                              onUpdateVehicleStatus(v.id, e.target.value as VehicleStatus)
                            }
                            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-semibold"
                          >
                            <option value="available">Disponible</option>
                            <option value="on_route">En mission</option>
                            <option value="maintenance">Maintenance</option>
                          </select>
                        </div>
                      </div>

                      {isEditingDetails && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                          <input
                            type="text"
                            value={editVehPlate}
                            onChange={(e) => setEditVehPlate(e.target.value)}
                            placeholder="Plaque"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
                          />
                          <input
                            type="text"
                            value={editVehModel}
                            onChange={(e) => setEditVehModel(e.target.value)}
                            placeholder="Modèle"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                          />
                          <input
                            type="number"
                            value={editVehCapacity}
                            onChange={(e) => setEditVehCapacity(Number(e.target.value))}
                            placeholder="Capacité kg"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
                          />
                          <input
                            type="number"
                            value={editVehKm}
                            onChange={(e) => setEditVehKm(Number(e.target.value))}
                            placeholder="Km"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateVehicle({
                                ...v,
                                plateNumber: editVehPlate.trim().toUpperCase() || v.plateNumber,
                                model: editVehModel.trim() || v.model,
                                capacityKg: Number(editVehCapacity) || v.capacityKg,
                                currentKm: Number(editVehKm) || v.currentKm,
                                updatedAt: new Date().toISOString(),
                              });
                              setEditingVehDetailsId(null);
                              setFleetFeedback(`Camion ${editVehPlate} mis à jour.`);
                            }}
                            className="rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-3 py-1.5 font-semibold cursor-pointer"
                          >
                            Sauvegarder
                          </button>
                        </div>
                      )}

                      {isEditingMaint && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <input
                            type="date"
                            value={editMaintDate}
                            onChange={(e) => setEditMaintDate(e.target.value)}
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-mono"
                          />
                          <input
                            type="text"
                            value={editMaintNote}
                            onChange={(e) => setEditMaintNote(e.target.value)}
                            placeholder="Note atelier / révision..."
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateVehicleMaintenance(v.id, editMaintDate, editMaintNote);
                              setEditingVehId(null);
                            }}
                            className="rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-3 py-1.5 font-semibold cursor-pointer"
                          >
                            Sauvegarder entretien
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Wrench className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>Immatriculer un Camion</span>
              </h2>
              <form onSubmit={handleAddVehicleSubmit} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="veh-plate" className="block font-semibold mb-1">
                    Plaque d’immatriculation (obligatoire) *
                  </label>
                  <input
                    id="veh-plate"
                    type="text"
                    required
                    value={newPlate}
                    onChange={(e) => setNewPlate(e.target.value)}
                    placeholder="Ex : E-5530-BTR"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="veh-model" className="block font-semibold mb-1">
                    Modèle tracteur / porteur
                  </label>
                  <input
                    id="veh-model"
                    type="text"
                    required
                    value={newModel}
                    onChange={(e) => setNewModel(e.target.value)}
                    placeholder="Ex : Scania R450"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="veh-type" className="block font-semibold mb-1">
                      Catégorie
                    </label>
                    <select
                      id="veh-type"
                      value={newType}
                      onChange={(e) => setNewType(e.target.value as VehicleType)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
                    >
                      <option value="van">Fourgon 3,5T</option>
                      <option value="truck_12t">Porteur 12T</option>
                      <option value="semi_40t">Tracteur 40T</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="veh-capacity" className="block font-semibold mb-1">
                      Capacité (kg)
                    </label>
                    <input
                      id="veh-capacity"
                      type="number"
                      min={500}
                      max={44000}
                      value={newCapacity}
                      onChange={(e) => setNewCapacity(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="veh-maint-date" className="block font-semibold mb-1">
                      Date prochain entretien
                    </label>
                    <input
                      id="veh-maint-date"
                      type="date"
                      value={newVehMaintDate}
                      onChange={(e) => setNewVehMaintDate(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-mono"
                    />
                  </div>
                  <div>
                    <label htmlFor="veh-maint-note" className="block font-semibold mb-1">
                      Note entretien
                    </label>
                    <input
                      id="veh-maint-note"
                      type="text"
                      value={newVehMaintNote}
                      onChange={(e) => setNewVehMaintNote(e.target.value)}
                      placeholder="Révision ITV..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
                    />
                  </div>
                </div>
                {vehicleError && (
                  <p role="alert" className="text-red-600 dark:text-red-400">
                    {vehicleError}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2.5 font-semibold cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Enregistrer le camion</span>
                </button>
              </form>
            </div>
          </section>

          {/* Remorques / Semi-remorques */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
                <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                  Parc Remorques & Semi-Remorques ({trailers.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {trailers.map((t) => (
                  <div
                    key={t.id}
                    className="p-4 px-6 flex flex-wrap items-center justify-between gap-4 text-sm"
                  >
                    <div>
                      <p className="font-mono font-bold text-[#0B1F3A] dark:text-white">
                        {t.plateNumber}{' '}
                        <span className="font-sans font-semibold text-slate-700 dark:text-slate-200">
                          · {t.model}
                        </span>
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getTrailerTypeLabel(t.trailerType)} · Charge utile{' '}
                        {formatWeight(t.capacityKg)}
                        {t.assignedVehiclePlate ? ` · Attelée à ${t.assignedVehiclePlate}` : ''}
                        {t.nextMaintenanceDate
                          ? ` · Entretien : ${t.nextMaintenanceDate}`
                          : ''}
                      </p>
                    </div>
                    <select
                      aria-label={`Statut remorque ${t.plateNumber}`}
                      value={t.status}
                      onChange={(e) =>
                        onUpdateTrailerStatus(t.id, e.target.value as VehicleStatus)
                      }
                      className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-1.5 text-xs font-semibold"
                    >
                      <option value="available">Disponible</option>
                      <option value="on_route">En route</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                Ajouter une Remorque
              </h2>
              <form onSubmit={handleAddTrailerSubmit} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="trl-plate" className="block font-semibold mb-1">
                    Plaque remorque (obligatoire) *
                  </label>
                  <input
                    id="trl-plate"
                    type="text"
                    required
                    value={trlPlate}
                    onChange={(e) => setTrlPlate(e.target.value)}
                    placeholder="Ex : R-8840-BTR"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="trl-model" className="block font-semibold mb-1">
                    Modèle remorque
                  </label>
                  <input
                    id="trl-model"
                    type="text"
                    required
                    value={trlModel}
                    onChange={(e) => setTrlModel(e.target.value)}
                    placeholder="Ex : Schmitz Tautliner Mega"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="trl-type" className="block font-semibold mb-1">
                      Type
                    </label>
                    <select
                      id="trl-type"
                      value={trlType}
                      onChange={(e) => setTrlType(e.target.value as TrailerType)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-2"
                    >
                      <option value="tautliner">Tautliner</option>
                      <option value="frigo">Frigorifique</option>
                      <option value="fourgon">Fourgon tôlé</option>
                      <option value="porte_conteneur">Porte-conteneur</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="trl-cap" className="block font-semibold mb-1">
                      Charge (kg)
                    </label>
                    <input
                      id="trl-cap"
                      type="number"
                      min={1000}
                      max={44000}
                      value={trlCapacity}
                      onChange={(e) => setTrlCapacity(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="trl-maint" className="block font-semibold mb-1">
                    Prochain entretien
                  </label>
                  <input
                    id="trl-maint"
                    type="date"
                    value={trlMaintDate}
                    onChange={(e) => setTrlMaintDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                {trlError && (
                  <p role="alert" className="text-red-600 dark:text-red-400">
                    {trlError}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2.5 font-semibold cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Enregistrer la remorque</span>
                </button>
              </form>
            </div>
          </section>

          {/* Chauffeurs Database & Affectation Camion + Remorque */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Users className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                  Base Chauffeurs & Affectation Camion / Remorque ({drivers.length})
                </h2>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {drivers.map((d) => {
                  const draft = driverFleetDrafts[d.id] || {
                    vehicleId: d.assignedVehicleId || vehicles[0]?.id || '',
                    trailerId: d.assignedTrailerId || '',
                  };
                  const isEditingDrv = editingDriverId === d.id;
                  return (
                    <div key={d.id} className="p-4 px-6 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-[#0B1F3A] dark:text-white">
                            {d.name}{' '}
                            <span className="font-mono font-normal text-slate-500">
                              · {d.phone}
                            </span>
                          </p>
                          <p className="text-slate-500 dark:text-slate-400">
                            {d.licenseType} · Hub {d.hubCity}
                          </p>
                          <p className="font-mono text-orange-600 dark:text-orange-400 font-semibold">
                            Ensemble actuel : {d.assignedVehiclePlate || 'Aucun camion'}{' '}
                            {d.assignedTrailerPlate ? `+ ${d.assignedTrailerPlate}` : ''}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
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
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                            <span>Fiche</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (isEditingDrv) {
                                setEditingDriverId(null);
                              } else {
                                setEditingDriverId(d.id);
                                setEditDrvName(d.name);
                                setEditDrvPhone(d.phone);
                                setEditDrvLicense(d.licenseType);
                                setEditDrvHub(d.hubCity);
                              }
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span>Modifier</span>
                          </button>

                          <select
                            aria-label={`Camion affecté à ${d.name}`}
                            value={draft.vehicleId}
                            onChange={(e) =>
                              setDriverFleetDrafts((prev) => ({
                                ...prev,
                                [d.id]: { ...draft, vehicleId: e.target.value },
                              }))
                            }
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono"
                          >
                            {vehicles.map((v) => (
                              <option key={v.id} value={v.id}>
                                {v.plateNumber}
                              </option>
                            ))}
                          </select>
                          <select
                            aria-label={`Remorque affectée à ${d.name}`}
                            value={draft.trailerId}
                            onChange={(e) =>
                              setDriverFleetDrafts((prev) => ({
                                ...prev,
                                [d.id]: { ...draft, trailerId: e.target.value },
                              }))
                            }
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 font-mono"
                          >
                            <option value="">Sans remorque</option>
                            {trailers.map((t) => (
                              <option key={t.id} value={t.id}>
                                {t.plateNumber}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              onAssignDriverFleet(d.id, draft.vehicleId, draft.trailerId)
                            }
                            className="rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-3 py-1.5 font-semibold cursor-pointer"
                          >
                            Affecter ensemble
                          </button>
                        </div>
                      </div>

                      {isEditingDrv && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 grid grid-cols-1 sm:grid-cols-5 gap-2">
                          <input
                            type="text"
                            value={editDrvName}
                            onChange={(e) => setEditDrvName(e.target.value)}
                            placeholder="Nom"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                          />
                          <input
                            type="text"
                            value={editDrvPhone}
                            onChange={(e) => setEditDrvPhone(e.target.value)}
                            placeholder="Téléphone"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 font-mono"
                          />
                          <input
                            type="text"
                            value={editDrvLicense}
                            onChange={(e) => setEditDrvLicense(e.target.value)}
                            placeholder="Permis"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                          />
                          <input
                            type="text"
                            value={editDrvHub}
                            onChange={(e) => setEditDrvHub(e.target.value)}
                            placeholder="Hub"
                            className="rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              onUpdateDriver({
                                ...d,
                                name: editDrvName.trim() || d.name,
                                phone: editDrvPhone.trim() || d.phone,
                                licenseType: editDrvLicense.trim() || d.licenseType,
                                hubCity: editDrvHub.trim() || d.hubCity,
                              });
                              setEditingDriverId(null);
                              setFleetFeedback(`Profil chauffeur ${editDrvName} mis à jour.`);
                            }}
                            className="rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-3 py-1.5 font-semibold cursor-pointer"
                          >
                            Sauvegarder
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                Ajouter un Chauffeur
              </h2>
              <form onSubmit={handleAddDriverSubmit} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="drv-name" className="block font-semibold mb-1">
                    Nom complet
                  </label>
                  <input
                    id="drv-name"
                    type="text"
                    required
                    value={drvName}
                    onChange={(e) => setDrvName(e.target.value)}
                    placeholder="Ex : Javier Morales"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="drv-phone" className="block font-semibold mb-1">
                    Téléphone européen
                  </label>
                  <input
                    id="drv-phone"
                    type="tel"
                    required
                    value={drvPhone}
                    onChange={(e) => setDrvPhone(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="drv-lic" className="block font-semibold mb-1">
                      Permis
                    </label>
                    <input
                      id="drv-lic"
                      type="text"
                      value={drvLicense}
                      onChange={(e) => setDrvLicense(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                  <div>
                    <label htmlFor="drv-hub" className="block font-semibold mb-1">
                      Base d’attache
                    </label>
                    <input
                      id="drv-hub"
                      type="text"
                      value={drvHub}
                      onChange={(e) => setDrvHub(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    />
                  </div>
                </div>
                {drvError && (
                  <p role="alert" className="text-red-600 dark:text-red-400">
                    {drvError}
                  </p>
                )}
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 font-semibold cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter le chauffeur</span>
                </button>
              </form>
            </div>
          </section>

          {/* Suivi Repostaje & Kilométrage Flotte */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <Fuel className="h-4 w-4 text-orange-600 dark:text-orange-400" />
              <span>Suivi Repostaje (Carburant) & Kilométrage Flotte</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs tabular-nums">
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-slate-500 block">Gasoil consommé</span>
                <span className="font-mono text-base font-bold">{fuelSummary.totalLiters} L</span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-slate-500 block">AdBlue</span>
                <span className="font-mono text-base font-bold">
                  {fuelSummary.totalAdBlueLiters} L
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-slate-500 block">Dépense carburant</span>
                <span className="font-mono text-base font-bold text-orange-600 dark:text-orange-400">
                  {fuelSummary.totalFuelEur.toFixed(2)} €
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-slate-500 block">Distance relevée</span>
                <span className="font-mono text-base font-bold">
                  {fuelSummary.totalDistanceKm.toLocaleString('fr-FR')} km
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-slate-500 block">Conso moyenne</span>
                <span className="font-mono text-base font-bold">
                  {fuelSummary.avgConsumptionL100} L/100
                </span>
              </div>
              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                <span className="text-slate-500 block">Coût moyen / km</span>
                <span className="font-mono text-base font-bold">
                  {fuelSummary.avgCostPerKm.toFixed(2)} €/km
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-500">
                    <th className="py-2.5 px-3 font-semibold">Véhicule / Chauffeur</th>
                    <th className="py-2.5 px-3 font-semibold">Station</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Litres & Montant</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Compteur Km</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Rendement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {fuelLogs.map((log) => {
                    const l100 = calculateFuelConsumptionL100(
                      log.liters,
                      log.previousKm,
                      log.odometerKm,
                    );
                    const cpk = calculateCostPerKm(log.amountEur, log.previousKm, log.odometerKm);
                    return (
                      <tr key={log.id}>
                        <td className="py-2.5 px-3">
                          <span className="font-mono font-bold block">{log.vehiclePlate}</span>
                          <span className="text-slate-500">{log.driverName}</span>
                        </td>
                        <td className="py-2.5 px-3">{log.station}</td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {log.liters} L · {log.amountEur.toFixed(2)} €
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {log.odometerKm.toLocaleString('fr-FR')} km
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums">
                          {l100} L/100 · {cpk.toFixed(2)} €/km
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* TAB 3: BILLING & PDF ARCHIVE */}
      {activeTab === 'billing' && (
        <div className="space-y-4">
          {billingFeedback && (
            <div
              role="status"
              className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 text-xs font-medium text-emerald-800 dark:text-emerald-200"
            >
              {billingFeedback}
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Auto Calculator */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>Calcul & Génération Automatique de Facture</span>
              </h2>
              <form onSubmit={handleCreateInvoiceSubmit} className="space-y-3 text-xs">
                <div>
                  <label htmlFor="inv-client" className="block font-semibold mb-1">
                    Client / Donneur d’ordre
                  </label>
                  <input
                    id="inv-client"
                    type="text"
                    value={invClientName}
                    onChange={(e) => setInvClientName(e.target.value)}
                    placeholder="Ex : AgroIbérica Distribution"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="inv-route" className="block font-semibold mb-1">
                    Trajet facturé (Espagne / Europe)
                  </label>
                  <input
                    id="inv-route"
                    type="text"
                    value={invRouteLabel}
                    onChange={(e) => setInvRouteLabel(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="inv-km" className="block font-semibold mb-1">
                      Kilomètres (km)
                    </label>
                    <input
                      id="inv-km"
                      type="number"
                      min={10}
                      max={10000}
                      value={invDistanceKm}
                      onChange={(e) => setInvDistanceKm(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="inv-weight" className="block font-semibold mb-1">
                      Masse brute (kg)
                    </label>
                    <input
                      id="inv-weight"
                      type="number"
                      min={10}
                      max={44000}
                      value={invWeightKg}
                      onChange={(e) => setInvWeightKg(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="inv-service" className="block font-semibold mb-1">
                      Service
                    </label>
                    <select
                      id="inv-service"
                      value={invServiceType}
                      onChange={(e) => setInvServiceType(e.target.value as ServiceType)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
                    >
                      <option value="standard">Routier Europe</option>
                      <option value="pallet">Palettes</option>
                      <option value="express">Express 24/48h</option>
                      <option value="moving">Déménagement</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="inv-cargo" className="block font-semibold mb-1">
                      Nature marchandise
                    </label>
                    <select
                      id="inv-cargo"
                      value={invCargoClass}
                      onChange={(e) => setInvCargoClass(e.target.value as FreightCargoClass)}
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2"
                    >
                      <option value="general">Fret général</option>
                      <option value="palletized">Palettisé Europe</option>
                      <option value="industrial">Industriel / Machine</option>
                      <option value="refrigerated">Sous température (Frigo)</option>
                      <option value="moving">Mobilier / Effets</option>
                    </select>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 space-y-1.5 tabular-nums">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Montant HT calculé</span>
                    <span className="font-mono font-semibold">
                      {liveInvoicePreview.htAmountEur.toFixed(2)} €
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">TVA Espagne (21 %)</span>
                    <span className="font-mono">{liveInvoicePreview.tvaAmountEur.toFixed(2)} €</span>
                  </div>
                  <div className="flex justify-between border-t border-slate-200 dark:border-slate-800 pt-1.5 font-bold text-sm text-[#0B1F3A] dark:text-orange-400">
                    <span>Total TTC Facture</span>
                    <span className="font-mono">{liveInvoicePreview.totalTtcEur.toFixed(2)} €</span>
                  </div>
                </div>

                {invError && (
                  <p role="alert" className="text-red-600 dark:text-red-400">
                    {invError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 font-semibold cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Générer & archiver la facture</span>
                </button>
              </form>
            </div>

            {/* Archive Table */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                  Archive des Factures ({filteredInvoices.length})
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      value={invSearch}
                      onChange={(e) => setInvSearch(e.target.value)}
                      placeholder="Rechercher client ou N°..."
                      className="pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs"
                    />
                  </div>
                  <select
                    aria-label="Filtrer par statut de paiement"
                    value={invStatusFilter}
                    onChange={(e) =>
                      setInvStatusFilter(e.target.value as 'all' | 'paid' | 'pending')
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-semibold"
                  >
                    <option value="all">Toutes</option>
                    <option value="paid">Acquittées</option>
                    <option value="pending">En attente</option>
                  </select>
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredInvoices.map((inv) => (
                  <div
                    key={inv.id}
                    className="p-4 px-6 flex flex-wrap items-center justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <p className="font-mono font-bold text-[#0B1F3A] dark:text-white">
                        {inv.invoiceNumber}{' '}
                        <span className="font-sans text-slate-700 dark:text-slate-200">
                          · {inv.clientName}
                        </span>
                      </p>
                      <p className="text-slate-500 dark:text-slate-400">
                        {inv.routeLabel} · {inv.distanceKm} km · {formatWeight(inv.weightKg)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 tabular-nums">
                      <span className="font-mono text-sm font-bold text-[#0B1F3A] dark:text-white">
                        {inv.totalTtcEur.toFixed(2)} €
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleArchiveInvoiceStatus(inv.id)}
                        className={`rounded-md border px-2.5 py-1 font-semibold cursor-pointer ${
                          inv.status === 'paid'
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {inv.status === 'paid' ? 'Payée' : 'À encaisser'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadInvoicePdfHtml(inv)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                        <span>Télécharger</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handlePublishInvoiceToShowcase(inv)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Share2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                        <span>Publier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveBillingFactura(invoiceToFactura(inv));
                          setPreviewInvoice(inv);
                        }}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Printer className="h-3.5 w-3.5" />
                        <span>Modèle Factura</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-4">
            <FacturaLassineEditor
              initialData={activeBillingFactura}
              onSaveFactura={(fac) => {
                setActiveBillingFactura(fac);
                onSaveFactura?.(fac);
                setBillingFeedback(`Modèle Factura ${fac.invoiceNumber || 'Lassine Diakite'} enregistré.`);
              }}
            />
          </div>
        </div>
      )}

      {/* TAB 4: ACTUALITES, INFOS, CAMERA VAULT, ZERO-OBSTACLE FILES & SITE CONTENT CMS */}
      {activeTab === 'media' && (
        <div className="space-y-8">
          {/* BLOCK A: ZERO-OBSTACLE MULTI-FILE DROP & PUBLICATION / EDITION FORM */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <div className="lg:col-span-5 space-y-5">
              {/* Instant Multi-File Zero-Obstacle Box */}
              <div className="rounded-xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/20 p-5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                    <Upload className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span>Publication Express Par Fichiers (Sans Blocage)</span>
                  </h2>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Sélectionnez une ou plusieurs photos, vidéos, factures, fiches voyage ou documents : publication immédiate sur la Vitrine et dans l’Administration.
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Rubrique de publication rapide Admin"
                    value={quickCatChoice}
                    onChange={(e) =>
                      setQuickCatChoice(e.target.value as PublicationCategory | 'auto')
                    }
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs font-semibold"
                  >
                    <option value="auto">Détection automatique</option>
                    {PUB_CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <label className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 text-xs font-semibold cursor-pointer">
                    <Upload className="h-3.5 w-3.5" />
                    <span>Choisir fichiers & publier</span>
                    <input
                      id="admin-quick-file-input"
                      type="file"
                      multiple
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html"
                      onChange={handleAdminInstantMultiFileUpload}
                      className="sr-only"
                    />
                  </label>
                </div>
              </div>

              {/* Structured / Edit Publication Form */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                    <Video className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span>
                      {editingPubId
                        ? 'Modifier la publication'
                        : 'Publier Actualité, Info, Média ou Document'}
                    </span>
                  </h2>
                  {editingPubId && (
                    <button
                      type="button"
                      onClick={resetPubForm}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                    >
                      Annuler
                    </button>
                  )}
                </div>

                <form onSubmit={handlePublishSubmit} className="space-y-3 text-xs">
                  <div>
                    <label htmlFor="pub-title" className="block font-semibold mb-1">
                      Titre (optionnel si fichier ou lien joint)
                    </label>
                    <input
                      id="pub-title"
                      type="text"
                      value={pubTitle}
                      onChange={(e) => setPubTitle(e.target.value)}
                      placeholder="Ex : Info Trafic Irún ou Convoi Yuncos → Milan"
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="pub-category" className="block font-semibold mb-1">
                        Rubrique
                      </label>
                      <select
                        id="pub-category"
                        value={pubCategory}
                        onChange={(e) => setPubCategory(e.target.value as PublicationCategory)}
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-semibold"
                      >
                        {PUB_CATEGORY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="pub-media-label" className="block font-semibold mb-1">
                        Légende / Étiquette
                      </label>
                      <input
                        id="pub-media-label"
                        type="text"
                        value={pubMediaLabel}
                        onChange={(e) => setPubMediaLabel(e.target.value)}
                        placeholder="Ex : Hub Yuncos"
                        className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="pub-social-url" className="block font-semibold mb-1">
                      Lien Vidéo / Réseau (YouTube, Facebook, TikTok, Instagram, X)
                    </label>
                    <input
                      id="pub-social-url"
                      type="url"
                      value={pubMediaUrl}
                      onChange={(e) => setPubMediaUrl(e.target.value)}
                      placeholder="https://youtube.com/watch?v=... | tiktok.com/... | instagram.com/..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs"
                    />
                    {pubMediaUrl.trim() && (
                      <p className="mt-1 text-[11px] text-orange-600 dark:text-orange-400 font-semibold">
                        Plateforme détectée : {parsedSocialPreview.label}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pub-media-file" className="block font-semibold mb-1">
                      Joindre un fichier (Photo, Vidéo, PDF, Facture, Doc)
                    </label>
                    <input
                      id="pub-media-file"
                      type="file"
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.html"
                      onChange={handlePubFormFileChange}
                      className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-md file:border file:border-slate-300 dark:file:border-slate-700 file:bg-slate-100 dark:file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                    />
                    {pubFileName && (
                      <p className="mt-1 text-[11px] font-mono text-slate-500">
                        Fichier prêt : {pubFileName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pub-summary" className="block font-semibold mb-1">
                      Résumé (optionnel)
                    </label>
                    <input
                      id="pub-summary"
                      type="text"
                      value={pubSummary}
                      onChange={(e) => setPubSummary(e.target.value)}
                      placeholder="Résumé court visible sur la vitrine..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    />
                  </div>

                  <div>
                    <label htmlFor="pub-content" className="block font-semibold mb-1">
                      Message / Détails (optionnel)
                    </label>
                    <textarea
                      id="pub-content"
                      rows={3}
                      value={pubContent}
                      onChange={(e) => setPubContent(e.target.value)}
                      placeholder="Rédigez une actualité, une info trafic ou note logistique..."
                      className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                    />
                  </div>

                  {pubError && (
                    <p role="alert" className="text-red-600 dark:text-red-400">
                      {pubError}
                    </p>
                  )}
                  {pubSuccess && (
                    <p
                      role="status"
                      className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg p-2.5"
                    >
                      {pubSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 font-semibold cursor-pointer"
                  >
                    <Megaphone className="h-4 w-4" />
                    <span>
                      {editingPubId
                        ? 'Enregistrer les modifications'
                        : 'Publier sur Vitrine & Admin'}
                    </span>
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Synchronized Publications List with Infinite Scroll, Edit, Download & Delete */}
            <div className="lg:col-span-7 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                    Publications Synchronisées Vitrine & Admin ({filteredAdminPubs.length})
                  </h2>
                  <span className="font-mono text-xs text-slate-500">
                    {visibleAdminPubsCount} / {totalAdminPubs}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setAdminPubFilter('all')}
                    className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                      adminPubFilter === 'all'
                        ? 'bg-[#0B1F3A] text-white dark:bg-orange-600'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    Tout ({publications.length})
                  </button>
                  {PUB_CATEGORY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setAdminPubFilter(opt.value)}
                      className={`px-2.5 py-1 rounded-md font-semibold cursor-pointer ${
                        adminPubFilter === opt.value
                          ? 'bg-[#0B1F3A] text-white dark:bg-orange-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {visibleAdminPubs.map((pub) => (
                  <div
                    key={pub.id}
                    className="px-6 py-4 flex flex-col sm:flex-row sm:items-start justify-between gap-4 text-sm"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {pub.mediaPreviewData && (
                        <img
                          src={pub.mediaPreviewData}
                          alt={pub.title}
                          className="h-14 w-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0"
                        />
                      )}
                      {pub.videoPreviewData && (
                        <video
                          src={pub.videoPreviewData}
                          className="h-14 w-14 rounded-lg object-cover border border-slate-200 dark:border-slate-700 shrink-0 bg-black"
                        />
                      )}
                      {!pub.mediaPreviewData && !pub.videoPreviewData && pub.fileName && (
                        <div className="h-14 w-14 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                        </div>
                      )}

                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-semibold text-orange-600 dark:text-orange-400">
                          {pub.category.toUpperCase()}
                          {pub.mediaPlatform && pub.mediaPlatform !== 'none'
                            ? ` · ${pub.mediaPlatform.toUpperCase()}`
                            : ''}{' '}
                          ·{' '}
                          <span className="font-mono text-slate-500">
                            {new Date(pub.createdAt).toLocaleDateString('fr-FR')}
                          </span>
                        </p>
                        <p className="font-semibold text-slate-900 dark:text-white truncate">
                          {pub.title}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                          {pub.summary}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs shrink-0">
                      <button
                        type="button"
                        onClick={() => onTogglePublicationPublished(pub.id)}
                        className={`rounded-md border px-2.5 py-1 font-semibold cursor-pointer ${
                          pub.published
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-slate-300 bg-slate-100 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {pub.published ? 'Publié' : 'Brouillon'}
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditPublication(pub)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Modifier</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          triggerFileDownload(
                            pub.videoPreviewData ||
                              pub.mediaPreviewData ||
                              pub.fileDataUrl ||
                              pub.mediaUrl,
                            pub.fileName || `${pub.id}.html`,
                            buildPublicationSheetHtml(pub),
                            `${pub.id}.html`,
                          )
                        }
                        className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                        <span>Télécharger</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeletePublication(pub.id)}
                        aria-label={`Supprimer publication ${pub.title}`}
                        className="inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900/60 px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {hasMoreAdminPubs && (
                <div
                  ref={adminPubSentinelRef}
                  className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                >
                  <span className="text-slate-500">
                    Affichage {visibleAdminPubsCount} sur {totalAdminPubs} publications
                  </span>
                  <button
                    type="button"
                    onClick={loadMoreAdminPubs}
                    className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    Charger plus
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* BLOCK B: CAMERA STUDIO + ADMIN MEDIA VAULT */}
          <section className="space-y-5">
            <CameraCaptureStudio
              onCaptureSaved={onCameraCaptureSaved}
              defaultPublishToShowcase={true}
            />

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                    <Camera className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span>Coffre Médias Administrateur — Photos & Vidéos stockées ({mediaVault.length})</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Toutes les captures photo/vidéo et importations sont stockées localement (IndexedDB) avec téléchargement en 1 clic.
                  </p>
                </div>
                <span className="font-mono text-xs text-slate-500">
                  {visibleVaultCount} / {totalVaultCount}
                </span>
              </div>

              {visibleVaultItems.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucune capture pour le moment. Utilisez la caméra ci-dessus pour prendre une photo ou enregistrer une vidéo.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleVaultItems.map((asset) => (
                    <article
                      key={asset.id}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-4 flex flex-col justify-between gap-3 text-xs"
                    >
                      <div className="space-y-2.5">
                        {asset.kind === 'photo' && asset.dataUrl && (
                          <img
                            src={asset.dataUrl}
                            alt={asset.title}
                            className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-800"
                          />
                        )}
                        {asset.kind === 'video' && asset.dataUrl && (
                          <video
                            src={asset.dataUrl}
                            controls
                            className="w-full h-40 object-cover rounded-lg border border-slate-200 dark:border-slate-800 bg-black"
                          />
                        )}
                        {asset.kind === 'document' && (
                          <div className="w-full h-24 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center justify-center gap-1 text-slate-500">
                            <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                            <span className="font-mono text-[11px] truncate max-w-[90%]">
                              {asset.fileName}
                            </span>
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white truncate">
                            {asset.title}
                          </p>
                          <p className="font-mono text-[11px] text-slate-500">
                            {asset.kind.toUpperCase()} · {formatFileSize(asset.sizeBytes) || 'Stocké'}{' '}
                            {asset.publishedToShowcase ? '· Vitrine OK' : '· Coffre Admin'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                        <button
                          type="button"
                          onClick={() => triggerFileDownload(asset.dataUrl, asset.fileName)}
                          className="inline-flex items-center gap-1 rounded-md bg-[#0B1F3A] dark:bg-orange-600 text-white px-2.5 py-1.5 font-semibold cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Télécharger</span>
                        </button>
                        {!asset.publishedToShowcase && (
                          <button
                            type="button"
                            onClick={() => onPublishVaultItem(asset)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 font-semibold cursor-pointer"
                          >
                            <Share2 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Publier Vitrine</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteVaultItem(asset.id)}
                          aria-label={`Supprimer média ${asset.title}`}
                          className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-200 dark:border-red-900/60 px-2 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {hasMoreVault && (
                <div
                  ref={vaultSentinelRef}
                  className="pt-3 flex items-center justify-between text-xs border-t border-slate-200 dark:border-slate-800"
                >
                  <span className="text-slate-500">
                    Coffre Médias : {visibleVaultCount} sur {totalVaultCount}
                  </span>
                  <button
                    type="button"
                    onClick={loadMoreVault}
                    className="rounded-md border border-slate-300 dark:border-slate-700 px-3 py-1.5 font-semibold cursor-pointer"
                  >
                    Charger plus de médias
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* BLOCK C: PUBLIC SITE CONTENT CMS EDITOR */}
          <section className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <Globe2 className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span>Éditeur des Contenus & Infos du Site Public (CMS)</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Modifiez librement la bannière d’information, les titres de la page d’accueil et les coordonnées affichées sur la vitrine et le pied de page.
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveSiteContent} className="space-y-4 text-xs">
              <div>
                <label htmlFor="cms-banner" className="block font-semibold mb-1">
                  Bannière Info Réseau (haut de page publique)
                </label>
                <input
                  id="cms-banner"
                  type="text"
                  value={cmsDraft.bannerText || ''}
                  onChange={(e) => setCmsDraft({ ...cmsDraft, bannerText: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="cms-hero-badge" className="block font-semibold mb-1">
                    Sur-titre Hub Yuncos
                  </label>
                  <input
                    id="cms-hero-badge"
                    type="text"
                    value={cmsDraft.heroBadge}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, heroBadge: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cms-hero-title" className="block font-semibold mb-1">
                    Titre Principal (Hero H1)
                  </label>
                  <input
                    id="cms-hero-title"
                    type="text"
                    value={cmsDraft.heroTitle}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, heroTitle: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-semibold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cms-hero-desc" className="block font-semibold mb-1">
                  Description de présentation
                </label>
                <textarea
                  id="cms-hero-desc"
                  rows={2}
                  value={cmsDraft.heroDescription}
                  onChange={(e) => setCmsDraft({ ...cmsDraft, heroDescription: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="cms-address" className="block font-semibold mb-1">
                    Adresse Base Logistique
                  </label>
                  <input
                    id="cms-address"
                    type="text"
                    value={cmsDraft.hqAddress}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, hqAddress: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
                <div>
                  <label htmlFor="cms-phone" className="block font-semibold mb-1">
                    Téléphone Direct
                  </label>
                  <input
                    id="cms-phone"
                    type="text"
                    value={cmsDraft.hqPhone}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, hqPhone: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor="cms-email" className="block font-semibold mb-1">
                    Email Exploitation
                  </label>
                  <input
                    id="cms-email"
                    type="email"
                    value={cmsDraft.hqEmail}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, hqEmail: e.target.value })}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cms-footer" className="block font-semibold mb-1">
                  Mention Pied de Page
                </label>
                <input
                  id="cms-footer"
                  type="text"
                  value={cmsDraft.footerNote || ''}
                  onChange={(e) => setCmsDraft({ ...cmsDraft, footerNote: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>

              {cmsFeedback && (
                <p
                  role="status"
                  className="text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg p-2.5 font-medium"
                >
                  {cmsFeedback}
                </p>
              )}

              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] hover:bg-[#13325C] dark:bg-orange-600 dark:hover:bg-orange-700 text-white px-5 py-2.5 font-semibold cursor-pointer"
              >
                <Check className="h-4 w-4" />
                <span>Publier les modifications sur le site</span>
              </button>
            </form>
          </section>
        </div>
      )}

      {/* TAB 5: REAL-TIME MESSAGING */}
      {activeTab === 'chat' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>Contacts & Chauffeurs</span>
              </h2>
            </div>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {drivers.map((d) => {
                const threadUnread = messages.filter(
                  (m) => m.threadId === d.id && !m.read && m.senderRole !== 'admin',
                ).length;
                const isSelected = activeThreadId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => {
                      setActiveThreadId(d.id);
                      onMarkThreadRead(d.id);
                    }}
                    className={`w-full text-left px-5 py-3.5 flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-orange-50/50 dark:bg-orange-950/20'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {d.name}
                      </p>
                      <p className="text-xs text-slate-500 font-mono">
                        {d.assignedVehiclePlate || d.hubCity}
                      </p>
                    </div>
                    {threadUnread > 0 && (
                      <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                        {threadUnread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between min-h-[420px]">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-display text-sm font-bold text-[#0B1F3A] dark:text-white">
                  Fil direct :{' '}
                  {drivers.find((d) => d.id === activeThreadId)?.name || 'Exploitation'}
                </p>
                <p className="text-xs text-slate-500">
                  Synchronisation temps réel Admin ↔ Cabine chauffeur
                </p>
              </div>
              <button
                type="button"
                onClick={() => onMarkThreadRead(activeThreadId)}
                className="text-xs font-semibold text-orange-600 dark:text-orange-400 hover:underline cursor-pointer"
              >
                Marquer lu
              </button>
            </div>

            <div className="flex-1 p-6 space-y-3 overflow-y-auto max-h-80">
              {activeThreadMessages.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Aucun message dans ce fil. Démarrez la conversation ci-dessous.
                </p>
              ) : (
                activeThreadMessages.map((msg) => {
                  const fromAdmin = msg.senderRole === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${fromAdmin ? 'items-end' : 'items-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-xl px-4 py-2.5 text-xs space-y-1 ${
                          fromAdmin
                            ? 'bg-[#0B1F3A] text-white dark:bg-orange-600'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        <p className="font-semibold opacity-85">{msg.senderName}</p>
                        <p className="leading-relaxed">{msg.text}</p>
                        <p className="font-mono text-[10px] opacity-70 text-right">
                          {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleChatSend}
              className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Écrire un message d’exploitation en temps réel..."
                aria-label="Message d'exploitation"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-sm"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Envoyer</span>
              </button>
            </form>
          </div>
        </section>
      )}

      {/* Printable / PDF-Ready Archive Invoice Modal using exact Lassine Diakite replica */}
      {previewInvoice && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="archive-inv-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <h3 id="archive-inv-title" className="font-display text-lg font-bold">
                Factura {previewInvoice.invoiceNumber} · LASSINE DIAKITE
              </h3>
              <button
                type="button"
                onClick={() => setPreviewInvoice(null)}
                aria-label="Fermer la facture"
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-6 max-h-[78vh] overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
              <FacturaLassineEditor
                initialData={invoiceToFactura(previewInvoice)}
                onSaveFactura={onSaveFactura}
                compactToolbar
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
