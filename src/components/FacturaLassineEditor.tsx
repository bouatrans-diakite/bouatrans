import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, FileText, Plus, RotateCcw, Save, Trash2 } from 'lucide-react';
import type { FacturaLineItem, LassineFacturaData } from '../types/logistics';
import {
  computeFacturaLineTotal,
  computeFacturaTotals,
  createDefaultFacturaLassine,
} from '../utils/logistics';
import { downloadFacturaLassinePdf, exportElementToPdf } from '../utils/pdfGenerator';

interface FacturaLassineEditorProps {
  initialData?: LassineFacturaData;
  onSaveFactura?: (factura: LassineFacturaData) => void;
  compactToolbar?: boolean;
}

export function FacturaLassineEditor({
  initialData,
  onSaveFactura,
  compactToolbar = false,
}: FacturaLassineEditorProps) {
  const [factura, setFactura] = useState<LassineFacturaData>(
    () => initialData || createDefaultFacturaLassine(),
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const sheetRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (initialData) {
      setFactura(initialData);
    }
  }, [initialData]);

  const totals = useMemo(() => computeFacturaTotals(factura.items), [factura.items]);

  const updateField = <K extends keyof LassineFacturaData>(key: K, value: LassineFacturaData[K]) => {
    setFactura((prev) => ({
      ...prev,
      [key]: value,
      updatedAt: new Date().toISOString(),
    }));
  };

  const updateRow = (rowId: string, field: keyof FacturaLineItem, value: string) => {
    setFactura((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === rowId ? { ...item, [field]: value } : item)),
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleAddRow = () => {
    setFactura((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          id: `row-${Date.now().toString(36)}-${prev.items.length}`,
          fecha: '',
          cant: '',
          concepto: '',
          precioUn: '',
        },
      ],
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleRemoveRow = (rowId: string) => {
    setFactura((prev) => {
      if (prev.items.length <= 1) return prev;
      return {
        ...prev,
        items: prev.items.filter((item) => item.id !== rowId),
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleReset = () => {
    setFactura(createDefaultFacturaLassine());
    setFeedback('Modèle vierge réinitialisé.');
  };

  const handleCaptureSheetPdf = async () => {
    if (!sheetRef.current) return;
    setExporting(true);
    try {
      await exportElementToPdf(
        sheetRef.current,
        `${factura.invoiceNumber || 'Factura_Lassine_Diakite'}_vue.pdf`,
      );
      setFeedback('Export PDF de la vue généré.');
    } finally {
      setExporting(false);
    }
  };

  const handleSave = () => {
    if (onSaveFactura) {
      onSaveFactura({ ...factura, updatedAt: new Date().toISOString() });
      setFeedback(`Facture ${factura.invoiceNumber || 'brouillon'} enregistrée.`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-[#1B365D] dark:text-orange-400" />
          <span className="text-xs font-semibold text-[#0B1F3A] dark:text-white">
            Modèle officiel rellenable · LASSINE DIAKITE
          </span>
          {totals.subtotal > 0 && (
            <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400 tabular-nums ml-2">
              Total calculé : {totals.subtotal.toFixed(2)} €
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddRow}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Ajouter ligne</span>
          </button>

          {!compactToolbar && (
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Réinitialiser</span>
            </button>
          )}

          {onSaveFactura && (
            <button
              type="button"
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#1B365D] px-3 py-1.5 text-xs font-semibold text-[#1B365D] dark:text-white dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Enregistrer Facture</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleCaptureSheetPdf()}
            disabled={exporting}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{exporting ? 'Export...' : 'Exporter vue PDF'}</span>
          </button>

          <button
            type="button"
            onClick={() => downloadFacturaLassinePdf(factura)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#1B365D] hover:bg-[#132948] text-white px-3.5 py-1.5 text-xs font-semibold cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Télécharger Factura PDF</span>
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="status"
          className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2 text-xs font-medium text-emerald-800 dark:text-emerald-200"
        >
          {feedback}
        </div>
      )}

      {/* Paper Replica Sheet — forced white paper + navy + pale cream cells */}
      <div className="overflow-x-auto pb-2">
        <div
          ref={sheetRef}
          data-testid="factura-lassine-sheet"
          className="mx-auto min-w-[700px] max-w-[820px] bg-white text-slate-900 border border-slate-300 shadow-sm p-8 sm:p-10 space-y-6"
        >
          {/* Top Navy Horizontal Rule */}
          <div className="h-1 w-full bg-[#1B365D]" />

          {/* Header: Issuer left + FACTURA metadata right */}
          <div className="flex items-start justify-between gap-6">
            <div className="space-y-1 text-[13px] leading-snug">
              <p className="text-lg font-extrabold tracking-tight text-slate-900">
                {factura.issuerName}
              </p>
              <div className="flex items-center gap-2">
                <label htmlFor="fac-issuer-nif" className="font-medium text-slate-700">
                  NIF:
                </label>
                <input
                  id="fac-issuer-nif"
                  type="text"
                  value={factura.issuerNif}
                  onChange={(e) => updateField('issuerNif', e.target.value)}
                  placeholder="N.I.F."
                  className="w-40 bg-[#FFF7F5] border border-slate-200 px-2 py-0.5 text-xs font-mono text-slate-900 focus:outline-none focus:border-[#1B365D]"
                />
              </div>
              <p className="text-slate-800">{factura.issuerAddressLine1}</p>
              <p className="text-slate-800">{factura.issuerAddressLine2}</p>
              <p className="text-slate-800">Tel.: {factura.issuerTel}</p>
            </div>

            <div className="w-[300px] space-y-2">
              <h2 className="text-right text-xl font-extrabold tracking-wide text-[#1B365D]">
                FACTURA
              </h2>
              <table className="w-full border-collapse border border-slate-300 text-xs">
                <tbody>
                  <tr>
                    <th className="w-36 border border-slate-300 bg-[#EDF2F7] px-2.5 py-1.5 text-left font-bold text-slate-700">
                      <label htmlFor="fac-num">Nº factura:</label>
                    </th>
                    <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                      <input
                        id="fac-num"
                        type="text"
                        value={factura.invoiceNumber}
                        onChange={(e) => updateField('invoiceNumber', e.target.value)}
                        placeholder="FAC-2026-..."
                        className="w-full bg-transparent px-2 py-1.5 font-mono text-xs text-slate-900 focus:outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-slate-300 bg-[#EDF2F7] px-2.5 py-1.5 text-left font-bold text-slate-700">
                      <label htmlFor="fac-date">Fecha de emisión:</label>
                    </th>
                    <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                      <input
                        id="fac-date"
                        type="text"
                        value={factura.issueDate}
                        onChange={(e) => updateField('issueDate', e.target.value)}
                        placeholder="DD/MM/AAAA"
                        className="w-full bg-transparent px-2 py-1.5 font-mono text-xs text-slate-900 focus:outline-none"
                      />
                    </td>
                  </tr>
                  <tr>
                    <th className="border border-slate-300 bg-[#EDF2F7] px-2.5 py-1.5 text-left font-bold text-slate-700">
                      <label htmlFor="fac-period">Período:</label>
                    </th>
                    <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                      <input
                        id="fac-period"
                        type="text"
                        value={factura.period}
                        onChange={(e) => updateField('period', e.target.value)}
                        placeholder="Mes / Año"
                        className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* DATOS DEL CLIENTE Box */}
          <div className="max-w-[430px]">
            <div className="bg-[#1B365D] px-3 py-1.5 text-xs font-bold tracking-wide text-white">
              DATOS DEL CLIENTE
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <tbody>
                <tr>
                  <th className="w-40 border border-slate-300 bg-white px-2.5 py-1.5 text-left font-medium text-slate-700">
                    <label htmlFor="fac-cli-name">Nombre / Razón social:</label>
                  </th>
                  <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                    <input
                      id="fac-cli-name"
                      type="text"
                      value={factura.clientName}
                      onChange={(e) => updateField('clientName', e.target.value)}
                      className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-white px-2.5 py-1.5 text-left font-medium text-slate-700">
                    <label htmlFor="fac-cli-nif">N.I.F. / C.I.F.:</label>
                  </th>
                  <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                    <input
                      id="fac-cli-nif"
                      type="text"
                      value={factura.clientNif}
                      onChange={(e) => updateField('clientNif', e.target.value)}
                      className="w-full bg-transparent px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-white px-2.5 py-1.5 text-left font-medium text-slate-700">
                    <label htmlFor="fac-cli-addr">Domicilio:</label>
                  </th>
                  <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                    <input
                      id="fac-cli-addr"
                      type="text"
                      value={factura.clientAddress}
                      onChange={(e) => updateField('clientAddress', e.target.value)}
                      className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-white px-2.5 py-1.5 text-left font-medium text-slate-700">
                    <label htmlFor="fac-cli-city">C.P. / Localidad:</label>
                  </th>
                  <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                    <input
                      id="fac-cli-city"
                      type="text"
                      value={factura.clientCityZip}
                      onChange={(e) => updateField('clientCityZip', e.target.value)}
                      className="w-full bg-transparent px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none"
                    />
                  </td>
                </tr>
                <tr>
                  <th className="border border-slate-300 bg-white px-2.5 py-1.5 text-left font-medium text-slate-700">
                    <label htmlFor="fac-cli-tel">Tel.:</label>
                  </th>
                  <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                    <input
                      id="fac-cli-tel"
                      type="text"
                      value={factura.clientTel}
                      onChange={(e) => updateField('clientTel', e.target.value)}
                      className="w-full bg-transparent px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:outline-none"
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 5-Column Line Items Table */}
          <table className="w-full border-collapse border border-slate-300 text-xs">
            <thead>
              <tr className="bg-[#1B365D] text-white">
                <th className="w-24 border border-[#1B365D] px-2 py-2 text-left font-bold">FECHA</th>
                <th className="w-16 border border-[#1B365D] px-2 py-2 text-center font-bold">CANT.</th>
                <th className="border border-[#1B365D] px-2 py-2 text-left font-bold">CONCEPTO</th>
                <th className="w-28 border border-[#1B365D] px-2 py-2 text-right font-bold">PRECIO UN.</th>
                <th className="w-28 border border-[#1B365D] px-2 py-2 text-right font-bold">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {factura.items.map((item, idx) => {
                const rowTotal = computeFacturaLineTotal(item);
                return (
                  <tr key={item.id} className="group">
                    <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                      <input
                        type="text"
                        aria-label={`Fecha ligne ${idx + 1}`}
                        value={item.fecha}
                        onChange={(e) => updateRow(item.id, 'fecha', e.target.value)}
                        className="w-full bg-transparent px-2 py-1.5 font-mono text-xs text-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                      <input
                        type="text"
                        aria-label={`Cantidad ligne ${idx + 1}`}
                        value={item.cant}
                        onChange={(e) => updateRow(item.id, 'cant', e.target.value)}
                        className="w-full bg-transparent px-1.5 py-1.5 text-center font-mono text-xs text-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                      <input
                        type="text"
                        aria-label={`Concepto ligne ${idx + 1}`}
                        value={item.concepto}
                        onChange={(e) => updateRow(item.id, 'concepto', e.target.value)}
                        className="w-full bg-transparent px-2 py-1.5 text-xs text-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="border border-slate-300 bg-[#FFF7F5] p-0">
                      <input
                        type="text"
                        aria-label={`Precio unitario ligne ${idx + 1}`}
                        value={item.precioUn}
                        onChange={(e) => updateRow(item.id, 'precioUn', e.target.value)}
                        className="w-full bg-transparent px-2 py-1.5 text-right font-mono text-xs text-slate-900 focus:outline-none"
                      />
                    </td>
                    <td className="border border-slate-300 bg-[#FFF7F5] px-2 py-1.5 text-right font-mono font-semibold text-slate-900 tabular-nums">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{rowTotal > 0 ? `${rowTotal.toFixed(2)} €` : ''}</span>
                        {factura.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(item.id)}
                            aria-label={`Supprimer ligne ${idx + 1}`}
                            className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 transition-opacity cursor-pointer"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Summary Row */}
          {totals.subtotal > 0 && (
            <div className="flex justify-end">
              <div className="inline-flex items-center border border-[#1B365D] text-xs font-bold">
                <span className="bg-[#1B365D] px-4 py-2 text-white">TOTAL FACTURA</span>
                <span
                  data-testid="factura-total-amount"
                  className="bg-[#FFF7F5] px-5 py-2 font-mono text-sm text-slate-900 tabular-nums"
                >
                  {totals.subtotal.toFixed(2)} €
                </span>
              </div>
            </div>
          )}

          {/* Reference Footer */}
          <div className="border-t border-slate-300 pt-3 flex items-center justify-between text-[11px] text-slate-600">
            <span>
              Lassine Diakite · Avenida Castilla La Mancha 122 · 45210 Yuncos (Toledo) · Tel. +34 632 60 71 01
            </span>
            <span className="font-semibold">Página 1</span>
          </div>
        </div>
      </div>
    </div>
  );
}
