import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import QRCode from 'qrcode';
import {
  Camera,
  CheckCircle2,
  Download,
  ExternalLink,
  FileCheck,
  QrCode,
  Upload,
  X,
} from 'lucide-react';
import type { DecaRecord, TransportDocumentRecord, VehicleRecord } from '../types/logistics';
import {
  buildDecaPublicPdfUrl,
  buildTransportDocHtml,
  triggerFileDownload,
  validateDecaInput,
} from '../utils/logistics';
import { downloadDecaPdfClient } from '../utils/pdfGenerator';

interface DecaQrStudioProps {
  decas: DecaRecord[];
  vehicles: VehicleRecord[];
  travelDocs: TransportDocumentRecord[];
  onAddDeca: (deca: DecaRecord) => void;
  onScanTravelDocFile: (fileName: string, dataUrl: string) => void;
  highlightedDecaId?: string | null;
}

export function DecaQrStudio({
  decas,
  vehicles,
  travelDocs,
  onAddDeca,
  onScanTravelDocFile,
  highlightedDecaId,
}: DecaQrStudioProps) {
  const [shipperName, setShipperName] = useState('AgroIbérica Distribution SL');
  const [shipperNif, setShipperNif] = useState('B45901234');
  const [origin, setOrigin] = useState('Yuncos (Toledo), Espagne');
  const [destination, setDestination] = useState('Lyon, France');
  const [goodsDescription, setGoodsDescription] = useState('24 Palettes agroalimentaires');
  const [registrationPlate, setRegistrationPlate] = useState(
    vehicles[0]?.plateNumber || 'E-4829-LBT',
  );
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const [qrModalDeca, setQrModalDeca] = useState<DecaRecord | null>(null);
  const [qrPreviewMap, setQrPreviewMap] = useState<Record<string, string>>({});
  const [scannedDocName, setScannedDocName] = useState<string | null>(null);
  const [scannedDocDataUrl, setScannedDocDataUrl] = useState<string | null>(null);

  // Ensure every DECA has a QR data URL ready locally too
  useEffect(() => {
    let cancelled = false;
    const originBase = typeof window !== 'undefined' ? window.location.origin : '';
    const generateMissing = async () => {
      for (const d of decas) {
        if (d.qrCodeDataUrl || qrPreviewMap[d.id]) continue;
        const targetUrl =
          d.publicPdfUrl.startsWith('http') || !originBase
            ? d.publicPdfUrl
            : `${originBase}${d.publicPdfUrl}`;
        try {
          const dataUrl = await QRCode.toDataURL(targetUrl, {
            width: 280,
            margin: 2,
            color: { dark: '#0B1F3A', light: '#FFFFFF' },
          });
          if (!cancelled) {
            setQrPreviewMap((prev) => ({ ...prev, [d.id]: dataUrl }));
          }
        } catch {
          // Ignore QR generation fallback
        }
      }
    };
    void generateMissing();
    return () => {
      cancelled = true;
    };
  }, [decas, qrPreviewMap]);

  useEffect(() => {
    if (!highlightedDecaId) return;
    const found = decas.find((d) => d.id === highlightedDecaId);
    if (found) setQrModalDeca(found);
  }, [highlightedDecaId, decas]);

  const handleMobileScannerUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      setScannedDocName(file.name);
      setScannedDocDataUrl(result);
      onScanTravelDocFile(file.name, result);
      setFeedback(`Document de voyage « ${file.name} » scanné et archivé.`);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateDecaSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const check = validateDecaInput({
      shipperName,
      shipperNif,
      origin,
      destination,
      goodsDescription,
      registrationPlate,
    });
    if (!check.valid) {
      setFormError(check.error || 'Formulaire DECA incomplet.');
      return;
    }
    setFormError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/deca/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipperName: shipperName.trim(),
          shipperNif: shipperNif.trim(),
          origin: origin.trim(),
          destination: destination.trim(),
          goodsDescription: goodsDescription.trim(),
          registrationPlate: registrationPlate.trim(),
        }),
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { deca: DecaRecord };
      onAddDeca(data.deca);
      setFeedback(
        `DECA ${data.deca.reference} généré avec QR code et PDF stocké sur le serveur.`,
      );
      setQrModalDeca(data.deca);
    } catch {
      // Client-side fallback if backend unavailable
      const fallbackId = `deca-${Date.now().toString(36)}`;
      const originBase = typeof window !== 'undefined' ? window.location.origin : '';
      const publicPdfUrl = buildDecaPublicPdfUrl(fallbackId, originBase);
      const qrCodeDataUrl = await QRCode.toDataURL(publicPdfUrl, {
        width: 300,
        margin: 2,
        color: { dark: '#0B1F3A', light: '#FFFFFF' },
      });
      const fallbackRecord: DecaRecord = {
        id: fallbackId,
        reference: `DECA-ES-${new Date().getFullYear()}-${fallbackId.slice(-4).toUpperCase()}`,
        shipperName: shipperName.trim(),
        shipperNif: shipperNif.trim().toUpperCase(),
        origin: origin.trim(),
        destination: destination.trim(),
        goodsDescription: goodsDescription.trim(),
        registrationPlate: registrationPlate.trim().toUpperCase(),
        publicPdfUrl,
        qrCodeDataUrl,
        createdAt: new Date().toISOString(),
      };
      onAddDeca(fallbackRecord);
      setQrModalDeca(fallbackRecord);
      setFeedback(`DECA ${fallbackRecord.reference} généré avec QR Code prêt.`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenOrDownloadDecaPdf = async (deca: DecaRecord) => {
    try {
      const pdfUrl = deca.publicPdfUrl || buildDecaPublicPdfUrl(deca.id);
      const res = await fetch(pdfUrl);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/pdf')) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = `${deca.reference}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
        return;
      }
    } catch {
      // Fall back to client-side jsPDF generation
    }
    await downloadDecaPdfClient(deca);
  };

  const getQrImageForDeca = (deca: DecaRecord): string =>
    deca.qrCodeDataUrl || qrPreviewMap[deca.id] || '';

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: DECA Generator + Mobile Scanner */}
        <div className="lg:col-span-5 space-y-5">
          {/* Mobile Camera/File Scanner */}
          <div className="rounded-2xl border border-orange-200 dark:border-orange-900/60 bg-orange-50/70 dark:bg-orange-950/20 p-5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Camera className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span>Scanner Mobile de Documents de Voyage</span>
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              Capturez directement un document de voyage papier (DECA, CMR, permis, licence UE) ou importez un PDF depuis votre appareil.
            </p>
            <label
              htmlFor="deca-mobile-scan-input"
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-xs font-semibold cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              <span>Scanner / Importer photo ou PDF</span>
              <input
                id="deca-mobile-scan-input"
                type="file"
                accept="image/*,application/pdf"
                capture="environment"
                onChange={handleMobileScannerUpload}
                className="sr-only"
              />
            </label>
            {scannedDocName && (
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-xs space-y-2">
                <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                  Document capturé : <span className="font-mono">{scannedDocName}</span>
                </p>
                {scannedDocDataUrl?.startsWith('data:image/') && (
                  <img
                    src={scannedDocDataUrl}
                    alt={scannedDocName}
                    className="max-h-36 rounded border border-slate-200 object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {/* DECA Creation Form */}
          <form
            onSubmit={handleGenerateDecaSubmit}
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-3.5 text-xs"
          >
            <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span>Générer un DECA Officiel + Code QR</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="deca-shipper" className="block font-semibold mb-1">
                  Expéditeur *
                </label>
                <input
                  id="deca-shipper"
                  type="text"
                  required
                  value={shipperName}
                  onChange={(e) => setShipperName(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="deca-nif" className="block font-semibold mb-1">
                  NIF / CIF *
                </label>
                <input
                  id="deca-nif"
                  type="text"
                  required
                  value={shipperNif}
                  onChange={(e) => setShipperNif(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="deca-origin" className="block font-semibold mb-1">
                  Origine *
                </label>
                <input
                  id="deca-origin"
                  type="text"
                  required
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="deca-destination" className="block font-semibold mb-1">
                  Destination *
                </label>
                <input
                  id="deca-destination"
                  type="text"
                  required
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label htmlFor="deca-goods" className="block font-semibold mb-1">
                Marchandises *
              </label>
              <input
                id="deca-goods"
                type="text"
                required
                value={goodsDescription}
                onChange={(e) => setGoodsDescription(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>

            <div>
              <label htmlFor="deca-plate" className="block font-semibold mb-1">
                Enregistrement (Immatriculation) *
              </label>
              <input
                id="deca-plate"
                type="text"
                required
                value={registrationPlate}
                onChange={(e) => setRegistrationPlate(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
              />
            </div>

            {formError && (
              <p role="alert" className="text-red-600 dark:text-red-400 font-medium">
                {formError}
              </p>
            )}

            {feedback && (
              <div
                role="status"
                className="flex items-center gap-2 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-2 text-emerald-700 dark:text-emerald-300"
              >
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{feedback}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2.5 font-semibold hover:opacity-95 cursor-pointer disabled:opacity-60"
            >
              <QrCode className="h-4 w-4" />
              <span>{submitting ? 'Génération PDF & QR...' : 'Générer le DECA + Code QR'}</span>
            </button>
          </form>
        </div>

        {/* Right: Table of Generated DECAs & Travel Docs */}
        <div className="lg:col-span-7 space-y-5">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <FileCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                <span>Documents DECA Générés avec QR Code ({decas.length})</span>
              </h3>
            </div>

            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {decas.map((deca) => (
                <div
                  key={deca.id}
                  className="p-4 px-6 flex flex-wrap items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <p className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      {deca.reference} · {deca.registrationPlate}
                    </p>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {deca.origin} → {deca.destination}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      Expéditeur : <strong>{deca.shipperName}</strong> (NIF {deca.shipperNif}) ·{' '}
                      {deca.goodsDescription}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void handleOpenOrDownloadDecaPdf(deca)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B365D] text-white px-3 py-2 font-semibold hover:bg-[#132948] cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5 text-orange-400" />
                      <span>Afficher/Télécharger le DeCA</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setQrModalDeca(deca)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-2 font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      <QrCode className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                      <span>Afficher le code QR</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scanned Travel Documents Snapshot */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-white">
              Documents de voyage numérisés ({travelDocs.length})
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {travelDocs.slice(0, 6).map((docItem) => (
                <div
                  key={docItem.id}
                  className="py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <p className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      {docItem.reference}
                    </p>
                    <p className="font-semibold text-slate-900 dark:text-white">{docItem.title}</p>
                  </div>
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
                    className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                  >
                    <Download className="h-3.5 w-3.5 text-orange-600" />
                    <span>Télécharger</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* High-Contrast Roadside Inspection QR Code Modal */}
      {qrModalDeca && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="deca-qr-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between bg-[#1B365D] text-white px-6 py-4">
              <div>
                <p className="text-[11px] text-orange-300 font-semibold uppercase tracking-wide">
                  Contrôle Routier & Numérique DECA
                </p>
                <h3 id="deca-qr-modal-title" className="font-display text-lg font-bold">
                  {qrModalDeca.reference}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setQrModalDeca(null)}
                aria-label="Fermer le code QR"
                className="rounded-lg p-1.5 text-white/80 hover:bg-white/10 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-center">
              <div className="mx-auto w-fit rounded-xl border-2 border-[#1B365D] bg-white p-4">
                {getQrImageForDeca(qrModalDeca) ? (
                  <img
                    src={getQrImageForDeca(qrModalDeca)}
                    alt={`Code QR pour ${qrModalDeca.reference}`}
                    data-testid="deca-qr-image"
                    className="h-56 w-56 object-contain"
                  />
                ) : (
                  <div className="h-56 w-56 flex items-center justify-center text-xs text-slate-500">
                    Génération du QR Code...
                  </div>
                )}
              </div>

              <div className="text-left rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3.5 text-xs space-y-1">
                <p>
                  <strong>Corridor :</strong> {qrModalDeca.origin} → {qrModalDeca.destination}
                </p>
                <p>
                  <strong>Expéditeur :</strong> {qrModalDeca.shipperName} (NIF {qrModalDeca.shipperNif})
                </p>
                <p>
                  <strong>Véhicule :</strong>{' '}
                  <span className="font-mono">{qrModalDeca.registrationPlate}</span>
                </p>
                <p className="break-all text-[11px] text-slate-500 pt-1">
                  URL PDF : <span className="font-mono">{qrModalDeca.publicPdfUrl}</span>
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => void handleOpenOrDownloadDecaPdf(qrModalDeca)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B365D] text-white px-4 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  <Download className="h-4 w-4 text-orange-400" />
                  <span>Télécharger PDF DECA</span>
                </button>
                <a
                  href={qrModalDeca.publicPdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Ouvrir lien PDF</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
