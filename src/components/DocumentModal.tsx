import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer, X, CheckCircle2, FileText, QrCode } from 'lucide-react';
import type { ShipmentRecord } from '../types/logistics';
import {
  buildDecaPublicPdfUrl,
  CMR_CARRIER_DNI_LINE,
  CMR_PREFILLED_CARRIER,
  createDefaultCmrData,
  createDefaultFacturaLassine,
  formatWeight,
  generateCmrReference,
  generateDecaReference,
  getServiceLabel,
} from '../utils/logistics';
import {
  downloadCmrPdf,
  downloadDecaPdfClient,
  exportElementToPdf,
} from '../utils/pdfGenerator';
import { FacturaLassineEditor } from './FacturaLassineEditor';

export type DocumentModalMode = 'invoice' | 'pod' | 'cmr' | 'deca' | null;

interface DocumentModalProps {
  shipment: ShipmentRecord | null;
  mode: DocumentModalMode;
  onClose: () => void;
}

export function DocumentModal({ shipment, mode, onClose }: DocumentModalProps) {
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [exporting, setExporting] = useState(false);

  const isInvoice = mode === 'invoice';
  const isCmr = mode === 'cmr';
  const isDeca = mode === 'deca';

  const cmrRef = shipment
    ? shipment.cmrNumber || generateCmrReference(shipment.trackingNumber)
    : '';
  const decaRef = shipment
    ? shipment.decaNumber || generateDecaReference(shipment.trackingNumber)
    : '';

  const decaId = shipment
    ? shipment.trackingNumber === 'BT-2026-841'
      ? 'deca-bt-841'
      : shipment.trackingNumber === 'BT-2026-842'
      ? 'deca-bt-842'
      : `deca-${shipment.id}`
    : '';

  const decaPublicUrl = useMemo(() => {
    if (!decaId) return '';
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    return buildDecaPublicPdfUrl(decaId, origin);
  }, [decaId]);

  useEffect(() => {
    if (!isDeca || !decaPublicUrl) return;
    let cancelled = false;
    QRCode.toDataURL(decaPublicUrl, {
      width: 240,
      margin: 2,
      color: { dark: '#0B1F3A', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        // Ignore QR fallback error
      });
    return () => {
      cancelled = true;
    };
  }, [isDeca, decaPublicUrl]);

  const initialFactura = useMemo(() => {
    if (!shipment) return undefined;
    return createDefaultFacturaLassine({
      invoiceNumber: shipment.invoiceNumber,
      clientName: shipment.clientName,
      routeLabel: `${shipment.originCity} → ${shipment.destinationCity} (${getServiceLabel(shipment.serviceType)})`,
      priceEur: shipment.priceEur,
      issueDate: shipment.createdAt.slice(0, 10),
    });
  }, [shipment]);

  const defaultCmr = useMemo(() => {
    if (!shipment) return null;
    return createDefaultCmrData(shipment);
  }, [shipment]);

  if (!shipment || !mode) return null;

  const modalHeading = isInvoice
    ? `Factura ${shipment.invoiceNumber} · LASSINE DIAKITE`
    : isCmr
    ? `Lettre de voiture CMR · ${cmrRef}`
    : isDeca
    ? `Documento de Control (DECA) · ${decaRef}`
    : `Preuve de livraison (POD) · ${shipment.trackingNumber}`;

  const handleExportViewPdf = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      const prefix = isInvoice
        ? shipment.invoiceNumber
        : isCmr
        ? cmrRef
        : isDeca
        ? decaRef
        : `POD-${shipment.trackingNumber}`;
      await exportElementToPdf(sheetRef.current, `${prefix}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadDirectPdf = () => {
    if (isCmr && defaultCmr) {
      downloadCmrPdf(defaultCmr);
      return;
    }
    if (isDeca) {
      void downloadDecaPdfClient({
        id: decaId,
        reference: decaRef,
        shipperName: shipment.clientName,
        shipperNif: 'B45000000',
        origin: shipment.originCity,
        destination: shipment.destinationCity,
        goodsDescription: `${getServiceLabel(shipment.serviceType)} · ${formatWeight(shipment.weightKg)}`,
        registrationPlate: shipment.vehiclePlate || 'E-4829-LBT',
        weightKg: shipment.weightKg,
        driverName: shipment.driverName,
        publicPdfUrl: decaPublicUrl,
        qrCodeDataUrl: qrDataUrl,
        createdAt: shipment.createdAt,
      });
      return;
    }
    void handleExportViewPdf();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="doc-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
    >
      <div
        className={`w-full ${
          isInvoice ? 'max-w-4xl' : 'max-w-2xl'
        } rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xl overflow-hidden`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            <h3 id="doc-modal-title" className="font-display text-lg font-bold">
              {modalHeading}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer le document"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 max-h-[78vh] overflow-y-auto bg-slate-50 dark:bg-slate-950/50">
          {isInvoice && initialFactura ? (
            <FacturaLassineEditor initialData={initialFactura} compactToolbar />
          ) : (
            <div
              ref={sheetRef}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5 text-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                <div>
                  <p className="font-display font-bold text-base text-[#0B1F3A] dark:text-white">
                    LASSINE DIAKITE · BOUA TRANS SL
                  </p>
                  <p className="text-slate-600 dark:text-slate-400">
                    Avenida Castilla La Mancha 122, 45210 Yuncos (Toledo) - España
                  </p>
                  <p className="text-slate-600 dark:text-slate-400 font-mono text-xs mt-1">
                    Tel.: +34 632 60 71 01 · bouatrans@gmail.com
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 dark:text-slate-400">Référence récépissé</p>
                  <p className="font-mono font-semibold text-base">{shipment.trackingNumber}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Chargeur / Client</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {shipment.clientName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Départ → Arrivée</p>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {shipment.originCity} → {shipment.destinationCity}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Prestation & fret</p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {getServiceLabel(shipment.serviceType)} · {formatWeight(shipment.weightKg)} ·{' '}
                    {shipment.volumeM3} m³
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Chauffeur / Véhicule</p>
                  <p className="text-slate-800 dark:text-slate-200">
                    {shipment.driverName || 'À attribuer'}{' '}
                    {shipment.vehiclePlate ? `(${shipment.vehiclePlate})` : ''}
                  </p>
                </div>
              </div>

              {isCmr && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-2.5 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Cases réglementaires CMR (Convention internationale route)
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-500 block">Case 3 · Prise en charge (Départ)</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        {shipment.originCity} · {shipment.departureSchedule || 'Horodatage quai'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Case 4 · Livraison prévue (Arrivée)</span>
                      <span className="font-mono text-slate-900 dark:text-slate-100">
                        {shipment.destinationCity} · {shipment.estimatedDelivery}
                      </span>
                    </div>
                    <div className="rounded-md border border-[#1B365D]/30 bg-white dark:bg-slate-900 p-2.5">
                      <span className="text-slate-500 block">Case 16 · Transporteur effectif</span>
                      <span className="font-bold text-slate-900 dark:text-white block">
                        {CMR_PREFILLED_CARRIER}
                      </span>
                      <span className="font-mono text-slate-700 dark:text-slate-300 block">
                        {CMR_CARRIER_DNI_LINE}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Case 24 · Réception / Réserves</span>
                      <span>
                        {shipment.podSignedBy
                          ? `Signé par ${shipment.podSignedBy}`
                          : 'En attente de signature destinataire'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {isDeca && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3 text-xs">
                  <p className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <QrCode className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    <span>Documento de Control Administrativo (Orden FOM/2861/2012 · Espagne)</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 items-center">
                    {qrDataUrl && (
                      <div className="rounded-lg border border-slate-300 bg-white p-2 shrink-0">
                        <img
                          src={qrDataUrl}
                          alt={`Code QR ${decaRef}`}
                          className="h-28 w-28 object-contain"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 w-full">
                      <div>
                        <span className="text-slate-500 block">Cargador contractual</span>
                        <span className="font-semibold">{shipment.clientName}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Transportista efectivo</span>
                        <span className="font-semibold">LASSINE DIAKITE / BOUA TRANS SL</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Matrícula / Vehículo</span>
                        <span className="font-mono">{shipment.vehiclePlate || 'À attribuer'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">Naturaleza y peso mercancía</span>
                        <span className="font-mono">
                          {formatWeight(shipment.weightKg)} · {shipment.volumeM3} m³
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {mode === 'pod' && (
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Livraison certifiée par signature numérique</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Réceptionnaire</span>
                      <span className="font-semibold text-sm text-slate-900 dark:text-white">
                        {shipment.podSignedBy || 'Non signé'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Justificatif photo</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {shipment.podPhotoLabel || 'Aucune photo'}
                      </span>
                    </div>
                  </div>
                  {shipment.podSignatureData ? (
                    <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-white p-3">
                      <p className="text-xs text-slate-500 mb-1">Signature client capturée :</p>
                      <img
                        src={shipment.podSignatureData}
                        alt={`Signature de ${shipment.podSignedBy || 'client'}`}
                        referrerPolicy="no-referrer"
                        className="h-24 w-auto object-contain"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500">
                      En attente de signature sur l’application chauffeur.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-200 dark:border-slate-800 px-6 py-4 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimer</span>
          </button>

          {!isInvoice && (
            <>
              <button
                type="button"
                onClick={() => void handleExportViewPdf()}
                disabled={exporting}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-60"
              >
                <Download className="h-4 w-4" />
                <span>{exporting ? 'Export...' : 'Exporter vue PDF'}</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadDirectPdf}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 px-4 py-2 text-xs font-semibold text-white hover:opacity-95 cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>
                  {isCmr
                    ? 'Télécharger le CMR (PDF)'
                    : isDeca
                    ? 'Télécharger PDF DECA'
                    : 'Télécharger PDF'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
