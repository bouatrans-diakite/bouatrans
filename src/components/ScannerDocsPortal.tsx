import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Camera,
  CheckCircle2,
  Download,
  FileCheck,
  FileText,
  FolderCheck,
  Plus,
  QrCode,
  ScanLine,
  Upload,
} from 'lucide-react';
import type {
  CmrDocumentData,
  DecaRecord,
  LassineFacturaData,
  ShipmentRecord,
  TransportDocType,
  TransportDocumentRecord,
  VehicleRecord,
} from '../types/logistics';
import {
  buildTransportDocHtml,
  createDefaultFacturaLassine,
  formatEur,
  formatWeight,
  generateCmrReference,
  generateDecaReference,
  getServiceLabel,
  triggerFileDownload,
} from '../utils/logistics';
import { downloadFacturaLassinePdf, exportElementToPdf } from '../utils/pdfGenerator';
import { CmrEditorStudio } from './CmrEditorStudio';
import { DecaQrStudio } from './DecaQrStudio';
import { DocumentModal, type DocumentModalMode } from './DocumentModal';
import { FacturaLassineEditor } from './FacturaLassineEditor';

interface ScannerDocsPortalProps {
  shipments: ShipmentRecord[];
  vehicles: VehicleRecord[];
  transportDocs: TransportDocumentRecord[];
  savedCmrs: CmrDocumentData[];
  decas: DecaRecord[];
  savedFacturas: LassineFacturaData[];
  highlightedDecaId?: string | null;
  onAddTransportDoc: (doc: TransportDocumentRecord) => void;
  onToggleInvoicePaid: (shipmentId: string) => void;
  onSaveCmr: (cmr: CmrDocumentData) => void;
  onAddDeca: (deca: DecaRecord) => void;
  onSaveFactura: (factura: LassineFacturaData) => void;
}

type DocsSubTab = 'scanner' | 'cmr_deca' | 'factures' | 'voyage';

export function ScannerDocsPortal({
  shipments,
  vehicles,
  transportDocs,
  savedCmrs,
  decas,
  savedFacturas,
  highlightedDecaId,
  onAddTransportDoc,
  onToggleInvoicePaid,
  onSaveCmr,
  onAddDeca,
  onSaveFactura,
}: ScannerDocsPortalProps) {
  const [subTab, setSubTab] = useState<DocsSubTab>('scanner');
  const [selectedFactura, setSelectedFactura] = useState<LassineFacturaData | undefined>(
    () => savedFacturas[0],
  );
  const [exportingView, setExportingView] = useState(false);
  const portalRef = useRef<HTMLElement | null>(null);
  const [modalState, setModalState] = useState<{
    shipment: ShipmentRecord | null;
    mode: DocumentModalMode;
  }>({ shipment: null, mode: null });

  // Scanner state
  const [scanDocType, setScanDocType] = useState<TransportDocType>('cmr');
  const [scanRef, setScanRef] = useState('');
  const [scanTitle, setScanTitle] = useState('');
  const [scanTracking, setScanTracking] = useState(shipments[0]?.trackingNumber || '');
  const [scanPlate, setScanPlate] = useState(vehicles[0]?.plateNumber || '');
  const [scanFilter, setScanFilter] = useState<'enhanced' | 'original'>('enhanced');
  const [previewDataUrl, setPreviewDataUrl] = useState<string>('');
  const [scannedFileName, setScannedFileName] = useState<string>('');
  const [detectedBarcode, setDetectedBarcode] = useState<string>('');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanMessage, setScanMessage] = useState<string | null>(null);

  // Travel doc form
  const [travelRef, setTravelRef] = useState('');
  const [travelTitle, setTravelTitle] = useState('');
  const [travelPlate, setTravelPlate] = useState(vehicles[0]?.plateNumber || '');
  const [travelExpiry, setTravelExpiry] = useState('2027-06-30');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleStartCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Caméra non détectée dans ce navigateur. Utilisez l’import fichier ou la simulation de scan.',
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      }, 50);
    } catch {
      setCameraError(
        'Accès caméra indisponible ou refusé. Importez une photo/PDF ou utilisez la capture de document.',
      );
    }
  };

  const handleCaptureCameraFrame = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 420;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    if (scanFilter === 'enhanced') {
      ctx.filter = 'grayscale(100%) contrast(145%)';
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setPreviewDataUrl(dataUrl);
    setScannedFileName(`scan_${scanDocType}_${Date.now().toString(36)}.jpg`);
    stopCamera();
  };

  const handleFileImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setScannedFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSimulateBarcodeOrDocScan = () => {
    const sampleCode = scanTracking || 'BT-2026-841';
    const generatedRef =
      scanDocType === 'cmr'
        ? generateCmrReference(sampleCode)
        : scanDocType === 'deca'
        ? generateDecaReference(sampleCode)
        : `SCAN-${Date.now().toString().slice(-5)}`;
    setScanRef(generatedRef);
    setScanTitle(
      scanDocType === 'cmr'
        ? `CMR numérisé · ${sampleCode}`
        : scanDocType === 'deca'
        ? `DECA numérisé · ${sampleCode}`
        : scanDocType === 'facture'
        ? `Facture scannée · ${sampleCode}`
        : scanDocType === 'repostaje_ticket'
        ? `Ticket Repostaje · ${scanPlate}`
        : `Document de voyage · ${scanPlate}`,
    );
    setDetectedBarcode(sampleCode);
    setScannedFileName(`${generatedRef.toLowerCase()}.jpg`);

    // Generate clean crisp vector scan preview
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="420" height="220" viewBox="0 0 420 220"><rect width="420" height="220" fill="#f8fafc" stroke="#cbd5e1" stroke-width="2"/><rect x="18" y="18" width="384" height="36" fill="#0B1F3A"/><text x="28" y="41" fill="#ffffff" font-family="sans-serif" font-size="14" font-weight="bold">BOUA TRANS · SCAN ${scanDocType.toUpperCase()}</text><text x="24" y="84" fill="#0f172a" font-family="monospace" font-size="13">REF: ${generatedRef}</text><text x="24" y="108" fill="#334155" font-family="monospace" font-size="12">EXP: ${sampleCode} | VEH: ${scanPlate || 'FLOTTE'}</text><rect x="24" y="132" width="180" height="44" fill="#e2e8f0"/><text x="34" y="159" fill="#0f172a" font-family="monospace" font-size="12">||| |||| ||| || ||||</text><text x="24" y="198" fill="#16a34a" font-family="sans-serif" font-size="11" font-weight="bold">DOCUMENT NUMERISE VALIDE</text></svg>`;
    setPreviewDataUrl(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
  };

  const handleSaveScannedDoc = (e: FormEvent) => {
    e.preventDefault();
    const ref =
      scanRef.trim() ||
      (scanDocType === 'cmr'
        ? generateCmrReference(scanTracking || 'BT-2026-000')
        : `DOC-${Date.now().toString(36).toUpperCase()}`);
    const title = scanTitle.trim() || `Document ${scanDocType.toUpperCase()} (${ref})`;
    const nowIso = new Date().toISOString();

    onAddTransportDoc({
      id: `doc-${Date.now().toString(36)}`,
      docType: scanDocType,
      reference: ref,
      title,
      ownerId: 'demo-client',
      linkedTrackingNumber: scanTracking || undefined,
      vehiclePlate: scanPlate || undefined,
      status: 'valid',
      fileName: scannedFileName || `${ref.toLowerCase()}.jpg`,
      previewDataUrl: previewDataUrl || undefined,
      scanFilter,
      barcodeValue: detectedBarcode || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    });

    setScanMessage(`Document ${ref} enregistré dans les archives BOUA TRANS.`);
    setScanRef('');
    setScanTitle('');
  };

  const handleAddTravelDoc = (e: FormEvent) => {
    e.preventDefault();
    if (travelRef.trim().length < 3 || travelTitle.trim().length < 2) return;
    const nowIso = new Date().toISOString();
    onAddTransportDoc({
      id: `doc-trav-${Date.now().toString(36)}`,
      docType: 'travel_doc',
      reference: travelRef.trim().toUpperCase(),
      title: travelTitle.trim(),
      ownerId: 'demo-client',
      vehiclePlate: travelPlate || undefined,
      expiryDate: travelExpiry,
      status: 'valid',
      fileName: `${travelRef.trim().toLowerCase()}.pdf`,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
    setTravelRef('');
    setTravelTitle('');
  };

  const handleQuickScannedTravelFile = (fileName: string, dataUrl: string) => {
    const nowIso = new Date().toISOString();
    onAddTransportDoc({
      id: `doc-scan-${Date.now().toString(36)}`,
      docType: 'travel_doc',
      reference: `SCAN-${Date.now().toString().slice(-5)}`,
      title: `Document scanné · ${fileName}`,
      ownerId: 'demo-client',
      vehiclePlate: scanPlate || vehicles[0]?.plateNumber,
      status: 'valid',
      fileName,
      previewDataUrl: dataUrl,
      scanFilter: 'enhanced',
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  };

  const handleExportPortalView = async () => {
    if (!portalRef.current) return;
    setExportingView(true);
    try {
      await exportElementToPdf(portalRef.current, `bouatrans_docs_${subTab}.pdf`);
    } finally {
      setExportingView(false);
    }
  };

  const travelDocs = transportDocs.filter((d) => d.docType === 'travel_doc');
  const cmrDecaDocs = transportDocs.filter((d) => d.docType === 'cmr' || d.docType === 'deca');

  return (
    <main ref={portalRef} className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Pôle Documentaire · Numérisation, CMR, DECA QR & Facturation
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white mt-1">
            Scanner, CMR, DECA, Factures & Documents de voyage
          </h1>
        </div>
        <button
          type="button"
          onClick={() => void handleExportPortalView()}
          disabled={exportingView}
          className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2.5 text-xs font-semibold hover:opacity-95 cursor-pointer disabled:opacity-60"
        >
          <Download className="h-4 w-4 text-orange-400 dark:text-white" />
          <span>{exportingView ? 'Génération PDF...' : 'Exporter vue PDF'}</span>
        </button>
      </div>

      {/* Sub-navigation tabs */}
      <div
        role="tablist"
        aria-label="Modules documentaires"
        className="flex flex-wrap items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit"
      >
        {[
          { id: 'scanner', label: `Scanner & DeCA QR (${decas.length})` },
          { id: 'cmr_deca', label: `Rédacteur CMR (${savedCmrs.length})` },
          { id: 'factures', label: `Facture Lassine Diakite (${shipments.length + savedFacturas.length})` },
          { id: 'voyage', label: `Documents de voyage (${travelDocs.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => setSubTab(tab.id as DocsSubTab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: SCANNER & DECA QR */}
      {subTab === 'scanner' && (
        <div className="space-y-8">
          <DecaQrStudio
            decas={decas}
            vehicles={vehicles}
            travelDocs={travelDocs}
            onAddDeca={onAddDeca}
            onScanTravelDocFile={handleQuickScannedTravelFile}
            highlightedDecaId={highlightedDecaId}
          />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <ScanLine className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span>Numériser un document ou code-barres</span>
              </h2>
              <button
                type="button"
                onClick={handleSimulateBarcodeOrDocScan}
                className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 px-3 py-1.5 text-xs font-semibold text-orange-700 dark:text-orange-300 hover:bg-orange-100 cursor-pointer"
              >
                <QrCode className="h-3.5 w-3.5" />
                <span>Capture rapide</span>
              </button>
            </div>

            {/* Camera & File Controls */}
            <div className="flex flex-wrap gap-2.5">
              {!cameraActive ? (
                <button
                  type="button"
                  onClick={() => void handleStartCamera()}
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-slate-800 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  <Camera className="h-4 w-4 text-orange-400" />
                  <span>Ouvrir caméra scanner</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCaptureCameraFrame}
                  className="inline-flex items-center gap-2 rounded-lg bg-orange-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Capturer la page</span>
                </button>
              )}

              <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                <Upload className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>Importer photo / PDF</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={handleFileImport}
                  className="sr-only"
                />
              </label>
            </div>

            {cameraError && (
              <p className="text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                {cameraError}
              </p>
            )}

            {cameraActive && (
              <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700 bg-black">
                <video ref={videoRef} autoPlay playsInline className="w-full h-56 object-cover" />
              </div>
            )}

            {previewDataUrl && (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Aperçu numérisé : {scannedFileName}</span>
                  {detectedBarcode && (
                    <span className="font-mono text-emerald-600 dark:text-emerald-400">
                      Code lu : {detectedBarcode}
                    </span>
                  )}
                </div>
                <img
                  src={previewDataUrl}
                  alt="Aperçu document scanné"
                  referrerPolicy="no-referrer"
                  className={`w-full max-h-52 object-contain rounded-lg bg-white ${
                    scanFilter === 'enhanced' ? 'grayscale contrast-125' : ''
                  }`}
                />
              </div>
            )}

            <form onSubmit={handleSaveScannedDoc} className="space-y-3 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="scan-doc-type"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Type de document
                  </label>
                  <select
                    id="scan-doc-type"
                    value={scanDocType}
                    onChange={(e) => setScanDocType(e.target.value as TransportDocType)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold"
                  >
                    <option value="cmr">CMR (Lettre de voiture)</option>
                    <option value="deca">DECA (Control Espagne)</option>
                    <option value="facture">Facture transport</option>
                    <option value="travel_doc">Document de voyage</option>
                    <option value="repostaje_ticket">Ticket Repostaje</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="scan-filter"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Traitement scan
                  </label>
                  <select
                    id="scan-filter"
                    value={scanFilter}
                    onChange={(e) => setScanFilter(e.target.value as 'enhanced' | 'original')}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                  >
                    <option value="enhanced">Document N&B contrasté</option>
                    <option value="original">Couleur originale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="scan-ref"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Référence document
                  </label>
                  <input
                    id="scan-ref"
                    type="text"
                    value={scanRef}
                    onChange={(e) => setScanRef(e.target.value)}
                    placeholder="Ex : CMR-2026-841"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="scan-tracking"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Récépissé lié
                  </label>
                  <select
                    id="scan-tracking"
                    value={scanTracking}
                    onChange={(e) => setScanTracking(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs"
                  >
                    {shipments.map((s) => (
                      <option key={s.id} value={s.trackingNumber}>
                        {s.trackingNumber} ({s.originCity} → {s.destinationCity})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="scan-title"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Intitulé du document
                  </label>
                  <input
                    id="scan-title"
                    type="text"
                    value={scanTitle}
                    onChange={(e) => setScanTitle(e.target.value)}
                    placeholder="Ex : CMR signé départ quai Yuncos"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label
                    htmlFor="scan-plate"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                  >
                    Véhicule associé
                  </label>
                  <select
                    id="scan-plate"
                    value={scanPlate}
                    onChange={(e) => setScanPlate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {scanMessage && (
                <div
                  role="status"
                  className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  <span>{scanMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                Archiver le document scanné
              </button>
            </form>
          </div>

          {/* Right: Scanned Archives List */}
          <div className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h2 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-white">
              Archives numérisées ({transportDocs.length})
            </h2>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {transportDocs.map((docItem) => (
                <div key={docItem.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-xs font-mono text-orange-600 dark:text-orange-400">
                      {docItem.docType.toUpperCase()} · {docItem.reference}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {docItem.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {docItem.linkedTrackingNumber ? `Exp. ${docItem.linkedTrackingNumber} · ` : ''}
                      {docItem.vehiclePlate ? `Véh. ${docItem.vehiclePlate} · ` : ''}
                      <span className="font-mono">{docItem.fileName || 'Archive numérique'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() =>
                        triggerFileDownload(
                          docItem.previewDataUrl,
                          docItem.fileName || `${docItem.reference.toLowerCase()}.html`,
                          buildTransportDocHtml(docItem),
                          `${docItem.reference.toLowerCase()}.html`,
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      <span>Télécharger</span>
                    </button>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${
                        docItem.status === 'expiring'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                      }`}
                    >
                      {docItem.status === 'expiring' ? 'À renouveler' : 'Validé'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      )}

      {/* TAB 2: CMR & DECA */}
      {subTab === 'cmr_deca' && (
        <div className="space-y-8">
          <CmrEditorStudio
            shipments={shipments}
            savedCmrs={savedCmrs}
            onSaveCmr={onSaveCmr}
          />
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">Récépissé</th>
                  <th className="py-3 px-4 font-semibold">Corridor & Marchandise</th>
                  <th className="py-3 px-4 font-semibold">Réf. CMR</th>
                  <th className="py-3 px-4 font-semibold">Réf. DECA</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {shipments.map((s) => {
                  const cmr = s.cmrNumber || generateCmrReference(s.trackingNumber);
                  const deca = s.decaNumber || generateDecaReference(s.trackingNumber);
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                      <td className="py-3.5 px-4 font-mono font-bold text-xs">{s.trackingNumber}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold block">
                          {s.originCity} → {s.destinationCity}
                        </span>
                        <span className="text-xs text-slate-500">
                          {s.clientName} · {formatWeight(s.weightKg)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs">{cmr}</td>
                      <td className="py-3.5 px-4 font-mono text-xs">{deca}</td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setModalState({ shipment: s, mode: 'cmr' })}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <FileText className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                            <span>Ouvrir CMR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalState({ shipment: s, mode: 'deca' })}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <FileCheck className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span>Ouvrir DECA</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
            <h3 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-white mb-3">
              Copies CMR & DECA scannées ({cmrDecaDocs.length})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {cmrDecaDocs.map((d) => (
                <div
                  key={d.id}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 p-3 text-xs flex flex-col justify-between gap-2"
                >
                  <div className="space-y-1">
                    <p className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      {d.reference}
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">{d.title}</p>
                    <p className="font-mono text-slate-500">{d.fileName}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      triggerFileDownload(
                        d.previewDataUrl,
                        d.fileName || `${d.reference.toLowerCase()}.html`,
                        buildTransportDocHtml(d),
                        `${d.reference.toLowerCase()}.html`,
                      )
                    }
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    <span>Télécharger fichier</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: FACTURES LASSINE DIAKITE */}
      {subTab === 'factures' && (
        <div className="space-y-8">
          <FacturaLassineEditor
            initialData={selectedFactura}
            onSaveFactura={(fac) => {
              onSaveFactura(fac);
              setSelectedFactura(fac);
            }}
          />

          {savedFacturas.length > 0 && (
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
              <h3 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-white">
                Factures Lassine Diakite enregistrées ({savedFacturas.length})
              </h3>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {savedFacturas.map((fac) => (
                  <div
                    key={fac.id}
                    className="py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-mono font-bold text-orange-600 dark:text-orange-400">
                        {fac.invoiceNumber || 'Brouillon'} · {fac.issueDate || 'Date libre'}
                      </p>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {fac.clientName || 'Client non renseigné'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedFactura(fac)}
                        className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        Charger
                      </button>
                      <button
                        type="button"
                        onClick={() => downloadFacturaLassinePdf(fac)}
                        className="inline-flex items-center gap-1 rounded-md bg-[#1B365D] text-white px-2.5 py-1 font-semibold cursor-pointer"
                      >
                        <Download className="h-3 w-3" />
                        <span>PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500">
                  <th className="py-3 px-4 font-semibold">N° Facture</th>
                  <th className="py-3 px-4 font-semibold">Client & Trajet</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant</th>
                  <th className="py-3 px-4 font-semibold">Règlement</th>
                  <th className="py-3 px-4 font-semibold text-right">Document</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                    <td className="py-3.5 px-4 font-mono font-bold text-xs">{s.invoiceNumber}</td>
                    <td className="py-3.5 px-4">
                      <span className="font-semibold block">{s.clientName}</span>
                      <span className="text-xs text-slate-500">
                        {s.trackingNumber} · {s.originCity} → {s.destinationCity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums">
                      {formatEur(s.priceEur)}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        type="button"
                        onClick={() => onToggleInvoicePaid(s.id)}
                        className={`rounded-md border px-2.5 py-1 text-xs font-semibold cursor-pointer ${
                          s.invoicePaid
                            ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        }`}
                      >
                        {s.invoicePaid ? 'Payée' : 'À encaisser'}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedFactura(
                              createDefaultFacturaLassine({
                                invoiceNumber: s.invoiceNumber,
                                clientName: s.clientName,
                                routeLabel: `${s.originCity} → ${s.destinationCity} (${getServiceLabel(s.serviceType)})`,
                                priceEur: s.priceEur,
                                issueDate: s.createdAt.slice(0, 10),
                              }),
                            )
                          }
                          className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                        >
                          Éditer modèle
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalState({ shipment: s, mode: 'invoice' })}
                          className="inline-flex items-center gap-1 rounded-md bg-[#1B365D] text-white px-3 py-1.5 text-xs font-semibold hover:bg-[#132948] cursor-pointer"
                        >
                          <FileText className="h-3.5 w-3.5 text-orange-400" />
                          <span>Télécharger / Voir</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: DOCUMENTS DE VOYAGE */}
      {subTab === 'voyage' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-8 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
            <div className="px-6 py-4 flex items-center gap-2">
              <FolderCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                Dossier de bord & Documents réglementaires de voyage
              </h2>
            </div>
            {travelDocs.map((d) => (
              <div key={d.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                    {d.reference} · {d.vehiclePlate || 'Flotte UE'}
                  </p>
                  <p className="font-semibold text-sm text-slate-900 dark:text-white">{d.title}</p>
                  <p className="text-xs text-slate-500">
                    Titulaire : {d.ownerName || 'BOUA TRANS'} · Échéance :{' '}
                    <span className="font-mono">{d.expiryDate || 'Permanent'}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      triggerFileDownload(
                        d.previewDataUrl,
                        d.fileName || `${d.reference.toLowerCase()}.html`,
                        buildTransportDocHtml(d),
                        `${d.reference.toLowerCase()}.html`,
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                    <span>Télécharger</span>
                  </button>
                  <span
                    className={`rounded-md border px-2.5 py-1 text-xs font-semibold ${
                      d.status === 'expiring'
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {d.status === 'expiring' ? 'Renouvellement proche' : 'Conforme'}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4">
            <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
              Ajouter un document de voyage
            </h3>
            <form onSubmit={handleAddTravelDoc} className="space-y-3 text-sm">
              <div>
                <label htmlFor="trav-ref" className="block text-xs font-semibold mb-1">
                  Référence / N° certificat
                </label>
                <input
                  id="trav-ref"
                  type="text"
                  required
                  value={travelRef}
                  onChange={(e) => setTravelRef(e.target.value)}
                  placeholder="Ex : ASSUR-UE-2026"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs"
                />
              </div>
              <div>
                <label htmlFor="trav-title" className="block text-xs font-semibold mb-1">
                  Désignation (Permis, ADR, ITV, Assurance…)
                </label>
                <input
                  id="trav-title"
                  type="text"
                  required
                  value={travelTitle}
                  onChange={(e) => setTravelTitle(e.target.value)}
                  placeholder="Ex : Carte verte internationale UE"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="trav-plate" className="block text-xs font-semibold mb-1">
                    Véhicule
                  </label>
                  <select
                    id="trav-plate"
                    value={travelPlate}
                    onChange={(e) => setTravelPlate(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-mono text-xs"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.plateNumber}>
                        {v.plateNumber}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="trav-expiry" className="block text-xs font-semibold mb-1">
                    Date d’expiration
                  </label>
                  <input
                    id="trav-expiry"
                    type="date"
                    value={travelExpiry}
                    onChange={(e) => setTravelExpiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-2 font-mono text-xs"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Ajouter au dossier de bord</span>
              </button>
            </form>
            <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
              <label
                htmlFor="voyage-mobile-scan"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/30 px-3 py-2 text-xs font-semibold text-orange-700 dark:text-orange-300 hover:bg-orange-100 cursor-pointer"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>Scanner un document de voyage (Photo / PDF)</span>
                <input
                  id="voyage-mobile-scan"
                  type="file"
                  accept="image/*,application/pdf"
                  capture="environment"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === 'string') {
                        handleQuickScannedTravelFile(file.name, reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                  className="sr-only"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      <DocumentModal
        shipment={modalState.shipment}
        mode={modalState.mode}
        onClose={() => setModalState({ shipment: null, mode: null })}
      />
    </main>
  );
}
