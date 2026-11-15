import { useRef, useState, type FormEvent } from 'react';
import { CheckCircle2, Download, Eye, FileText, Save, X } from 'lucide-react';
import type { CmrDocumentData, ShipmentRecord } from '../types/logistics';
import {
  CMR_CARRIER_DNI_LINE,
  CMR_PREFILLED_CARRIER,
  createDefaultCmrData,
  validateCmrInput,
} from '../utils/logistics';
import { downloadCmrPdf, exportElementToPdf } from '../utils/pdfGenerator';

interface CmrEditorStudioProps {
  shipments: ShipmentRecord[];
  savedCmrs: CmrDocumentData[];
  onSaveCmr: (cmr: CmrDocumentData) => void;
}

export function CmrEditorStudio({
  shipments,
  savedCmrs,
  onSaveCmr,
}: CmrEditorStudioProps) {
  const [cmr, setCmr] = useState<CmrDocumentData>(() =>
    createDefaultCmrData(shipments[0]),
  );
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const previewSheetRef = useRef<HTMLDivElement | null>(null);

  const updateField = <K extends keyof CmrDocumentData>(key: K, value: CmrDocumentData[K]) => {
    setCmr((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleLoadFromShipment = (shipmentId: string) => {
    const found = shipments.find((s) => s.id === shipmentId);
    if (!found) return;
    setCmr(createDefaultCmrData(found));
    setFeedback(`Données chargées depuis l’expédition ${found.trackingNumber}.`);
  };

  const handleSubmitSave = (e: FormEvent) => {
    e.preventDefault();
    const check = validateCmrInput(cmr);
    if (!check.valid) {
      setFormError(check.error || 'Champs CMR invalides.');
      return;
    }
    setFormError(null);
    const saved: CmrDocumentData = {
      ...cmr,
      carrierName: cmr.carrierName.trim() || CMR_PREFILLED_CARRIER,
      carrierDniLine: cmr.carrierDniLine || CMR_CARRIER_DNI_LINE,
      updatedAt: new Date().toISOString(),
    };
    onSaveCmr(saved);
    setFeedback(`CMR ${saved.cmrNumber} enregistré et archivé.`);
  };

  const handleDirectDownloadPdf = () => {
    const check = validateCmrInput(cmr);
    if (!check.valid) {
      setFormError(check.error || 'Vérifiez les champs obligatoires avant le téléchargement PDF.');
      return;
    }
    setFormError(null);
    downloadCmrPdf(cmr);
    setFeedback(`PDF ${cmr.cmrNumber} téléchargé.`);
  };

  const renderCmrPaper = (forModal = false) => (
    <div
      ref={forModal ? previewSheetRef : undefined}
      data-testid="cmr-paper-preview"
      className="bg-white text-slate-900 border border-slate-300 rounded-xl p-6 space-y-4 text-xs shadow-xs"
    >
      <div className="bg-[#1B365D] text-white px-4 py-3 rounded-lg flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-bold text-sm tracking-wide">
            LETTRE DE VOITURE INTERNATIONALE · CMR
          </p>
          <p className="text-[11px] text-slate-200">
            Convention relative au contrat de transport international par route
          </p>
        </div>
        <span className="font-mono font-bold text-sm">{cmr.cmrNumber}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="border border-slate-300 rounded-lg p-3 space-y-1">
          <p className="font-bold text-[#1B365D] uppercase text-[10px]">
            1. Expéditeur (nom, adresse, pays)
          </p>
          <p className="font-semibold text-sm">{cmr.senderName}</p>
          <p className="text-slate-600">{cmr.senderAddress}</p>
        </div>

        <div className="border-2 border-[#1B365D] bg-slate-50 rounded-lg p-3 space-y-1">
          <p className="font-bold text-[#1B365D] uppercase text-[10px]">
            16. Transporteur (nom, adresse, identification)
          </p>
          <p className="font-extrabold text-sm text-slate-900">{cmr.carrierName}</p>
          <p className="font-mono text-xs text-slate-800">{cmr.carrierDniLine}</p>
          <p className="text-slate-600">
            Avenida Castilla La Mancha 122 · 45210 Yuncos (Toledo) - España
          </p>
          <p className="font-mono text-[11px] text-slate-700">
            Véhicule : {cmr.carrierPlate || '—'} · Tel.: +34 632 60 71 01
          </p>
        </div>

        <div className="border border-slate-300 rounded-lg p-3 space-y-1">
          <p className="font-bold text-[#1B365D] uppercase text-[10px]">
            2. Destinataire (nom, adresse, pays)
          </p>
          <p className="font-semibold text-sm">{cmr.consigneeName}</p>
          <p className="text-slate-600">{cmr.consigneeAddress}</p>
        </div>

        <div className="border border-slate-300 rounded-lg p-3 space-y-1">
          <p className="font-bold text-[#1B365D] uppercase text-[10px]">
            3 & 4. Prise en charge & Livraison prévue
          </p>
          <p>
            <strong>Départ :</strong> {cmr.pickupPlace} ({cmr.pickupDate})
          </p>
          <p>
            <strong>Arrivée :</strong> {cmr.deliveryPlace}
          </p>
        </div>
      </div>

      <div className="border border-slate-300 rounded-lg overflow-hidden">
        <div className="bg-[#1B365D] text-white px-3 py-2 font-bold grid grid-cols-12 gap-2 text-[11px]">
          <span className="col-span-3">6. Colis / Mode</span>
          <span className="col-span-5">9. Nature de la marchandise</span>
          <span className="col-span-2 text-right">11. Poids brut</span>
          <span className="col-span-2 text-right">12. Cubage</span>
        </div>
        <div className="bg-[#FFF7F5] px-3 py-3 grid grid-cols-12 gap-2 items-center">
          <span className="col-span-3 font-medium">{cmr.packagesCount}</span>
          <span className="col-span-5">{cmr.goodsDescription}</span>
          <span className="col-span-2 text-right font-mono font-bold">{cmr.grossWeightKg} kg</span>
          <span className="col-span-2 text-right font-mono font-bold">{cmr.volumeM3} m³</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="border border-slate-300 rounded-lg p-3 min-h-[76px]">
          <p className="font-bold text-[#1B365D] text-[10px] uppercase mb-1">
            22. Signature expéditeur
          </p>
          <p className="text-slate-600">{cmr.establishedAt}</p>
        </div>
        <div className="border border-slate-300 rounded-lg p-3 min-h-[76px]">
          <p className="font-bold text-[#1B365D] text-[10px] uppercase mb-1">
            23. Signature transporteur
          </p>
          <p className="font-bold text-slate-900">{cmr.carrierName}</p>
          <p className="font-mono text-[9.5px] tracking-tight text-slate-700 whitespace-nowrap overflow-hidden">
            {cmr.carrierDniLine}
          </p>
        </div>
        <div className="border border-slate-300 rounded-lg p-3 min-h-[76px]">
          <p className="font-bold text-[#1B365D] text-[10px] uppercase mb-1">
            24. Réception destinataire
          </p>
          <p className="text-slate-600">{cmr.reservations}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: CMR Writer Form */}
        <form
          onSubmit={handleSubmitSave}
          className="lg:col-span-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-4 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <h2 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span>Rédacteur & Générateur CMR</span>
            </h2>

            {shipments.length > 0 && (
              <select
                aria-label="Charger depuis une expédition"
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) handleLoadFromShipment(e.target.value);
                }}
                className="rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-xs font-mono"
              >
                <option value="">Importer une expédition...</option>
                {shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.trackingNumber} ({s.originCity} → {s.destinationCity})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cmr-number" className="block font-semibold mb-1">
                Numéro CMR
              </label>
              <input
                id="cmr-number"
                type="text"
                value={cmr.cmrNumber}
                onChange={(e) => updateField('cmrNumber', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label htmlFor="cmr-plate" className="block font-semibold mb-1">
                Immatriculation véhicule
              </label>
              <input
                id="cmr-plate"
                type="text"
                value={cmr.carrierPlate}
                onChange={(e) => updateField('carrierPlate', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
              />
            </div>
          </div>

          {/* Prefilled Carrier Box */}
          <div className="rounded-xl border border-sky-200 dark:border-sky-900 bg-sky-50/70 dark:bg-sky-950/30 p-3.5 space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="cmr-carrier-name" className="block font-semibold mb-1">
                  16. Transporteur (pré-rempli)
                </label>
                <input
                  id="cmr-carrier-name"
                  type="text"
                  value={cmr.carrierName}
                  onChange={(e) => updateField('carrierName', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-bold"
                />
              </div>
              <div>
                <label htmlFor="cmr-carrier-dni" className="block font-semibold mb-1">
                  Ligne d’identification vierge
                </label>
                <input
                  id="cmr-carrier-dni"
                  type="text"
                  value={cmr.carrierDniLine}
                  onChange={(e) => updateField('carrierDniLine', e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cmr-sender" className="block font-semibold mb-1">
                1. Expéditeur
              </label>
              <input
                id="cmr-sender"
                type="text"
                value={cmr.senderName}
                onChange={(e) => updateField('senderName', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="cmr-sender-addr" className="block font-semibold mb-1">
                Adresse expéditeur
              </label>
              <input
                id="cmr-sender-addr"
                type="text"
                value={cmr.senderAddress}
                onChange={(e) => updateField('senderAddress', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="cmr-consignee" className="block font-semibold mb-1">
                2. Destinataire
              </label>
              <input
                id="cmr-consignee"
                type="text"
                value={cmr.consigneeName}
                onChange={(e) => updateField('consigneeName', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="cmr-consignee-addr" className="block font-semibold mb-1">
                Adresse destinataire
              </label>
              <input
                id="cmr-consignee-addr"
                type="text"
                value={cmr.consigneeAddress}
                onChange={(e) => updateField('consigneeAddress', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cmr-pickup" className="block font-semibold mb-1">
                4. Prise en charge (Origine)
              </label>
              <input
                id="cmr-pickup"
                type="text"
                value={cmr.pickupPlace}
                onChange={(e) => updateField('pickupPlace', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="cmr-delivery" className="block font-semibold mb-1">
                3. Livraison (Destination)
              </label>
              <input
                id="cmr-delivery"
                type="text"
                value={cmr.deliveryPlace}
                onChange={(e) => updateField('deliveryPlace', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="cmr-date" className="block font-semibold mb-1">
                Date prise en charge
              </label>
              <input
                id="cmr-date"
                type="text"
                value={cmr.pickupDate}
                onChange={(e) => updateField('pickupDate', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="cmr-packages" className="block font-semibold mb-1">
                6. Nombre de colis
              </label>
              <input
                id="cmr-packages"
                type="text"
                value={cmr.packagesCount}
                onChange={(e) => updateField('packagesCount', e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
              />
            </div>
            <div>
              <label htmlFor="cmr-weight" className="block font-semibold mb-1">
                11. Poids brut (kg)
              </label>
              <input
                id="cmr-weight"
                type="number"
                value={cmr.grossWeightKg}
                onChange={(e) => updateField('grossWeightKg', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
              />
            </div>
            <div>
              <label htmlFor="cmr-volume" className="block font-semibold mb-1">
                12. Cubage (m³)
              </label>
              <input
                id="cmr-volume"
                type="number"
                step="0.1"
                value={cmr.volumeM3}
                onChange={(e) => updateField('volumeM3', Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono"
              />
            </div>
          </div>

          <div>
            <label htmlFor="cmr-goods" className="block font-semibold mb-1">
              9. Nature de la marchandise
            </label>
            <input
              id="cmr-goods"
              type="text"
              value={cmr.goodsDescription}
              onChange={(e) => updateField('goodsDescription', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="cmr-res" className="block font-semibold mb-1">
              18. Réserves & Instructions
            </label>
            <input
              id="cmr-res"
              type="text"
              value={cmr.reservations}
              onChange={(e) => updateField('reservations', e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2"
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

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => setShowPreviewModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#0B1F3A] dark:border-slate-600 px-3.5 py-2.5 font-semibold text-[#0B1F3A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Eye className="h-4 w-4" />
              <span>Prévisualiser le CMR</span>
            </button>

            <button
              type="button"
              onClick={handleDirectDownloadPdf}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B1F3A] hover:bg-[#132948] text-white px-4 py-2.5 font-semibold cursor-pointer"
            >
              <Download className="h-4 w-4 text-orange-400" />
              <span>Télécharger le CMR (PDF)</span>
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 font-semibold cursor-pointer"
            >
              <Save className="h-4 w-4" />
              <span>Enregistrer CMR</span>
            </button>
          </div>
        </form>

        {/* Right: Live CMR Sheet & Saved List */}
        <div className="lg:col-span-6 space-y-5">
          {renderCmrPaper(false)}

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3">
            <h3 className="font-display text-sm font-bold text-[#0B1F3A] dark:text-white">
              CMR enregistrés ({savedCmrs.length})
            </h3>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {savedCmrs.map((item) => (
                <div
                  key={item.id}
                  className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <p className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      {item.cmrNumber} · {item.carrierName}
                    </p>
                    <p className="text-slate-600 dark:text-slate-300">
                      {item.pickupPlace} → {item.deliveryPlace} ({item.grossWeightKg} kg)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCmr(item)}
                      className="rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1 font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Charger
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadCmrPdf(item)}
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
        </div>
      </div>

      {/* Preview Modal */}
      {showPreviewModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cmr-preview-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4"
        >
          <div className="w-full max-w-4xl rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 px-6 py-4">
              <h3 id="cmr-preview-modal-title" className="font-display text-lg font-bold">
                Prévisualisation CMR · {cmr.cmrNumber}
              </h3>
              <button
                type="button"
                onClick={() => setShowPreviewModal(false)}
                aria-label="Fermer la prévisualisation CMR"
                className="rounded-lg p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 max-h-[75vh] overflow-y-auto bg-slate-100 dark:bg-slate-950">
              {renderCmrPaper(true)}
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  if (previewSheetRef.current) {
                    void exportElementToPdf(previewSheetRef.current, `${cmr.cmrNumber}-capture.pdf`);
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-4 w-4" />
                <span>Exporter vue PDF</span>
              </button>
              <button
                type="button"
                onClick={() => downloadCmrPdf(cmr)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B365D] text-white px-4 py-2 text-xs font-semibold cursor-pointer"
              >
                <Download className="h-4 w-4 text-orange-400" />
                <span>Télécharger le CMR (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
