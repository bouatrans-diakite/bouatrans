import { useState } from 'react';
import { FileCheck, FileCheck2, FileSpreadsheet, FileText, Package, Plus, Truck } from 'lucide-react';
import type { QuoteRecord, ShipmentRecord } from '../types/logistics';
import {
  formatEur,
  formatWeight,
  getServiceLabel,
  getShipmentStatusMeta,
} from '../utils/logistics';
import { DocumentModal, type DocumentModalMode } from './DocumentModal';

interface ClientPortalProps {
  shipments: ShipmentRecord[];
  quotes: QuoteRecord[];
  onGoToCalculator: () => void;
}

type ClientTab = 'shipments' | 'quotes';

export function ClientPortal({ shipments, quotes, onGoToCalculator }: ClientPortalProps) {
  const [activeTab, setActiveTab] = useState<ClientTab>('shipments');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'delivered'>('all');
  const [modalState, setModalState] = useState<{
    shipment: ShipmentRecord | null;
    mode: DocumentModalMode;
  }>({ shipment: null, mode: null });

  const filteredShipments = shipments.filter((s) => {
    if (statusFilter === 'active') return s.status !== 'delivered';
    if (statusFilter === 'delivered') return s.status === 'delivered';
    return true;
  });

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Espace Client · Expéditions & Documents
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white mt-1">
            Portail Client BOUA TRANS
          </h1>
        </div>
        <button
          type="button"
          onClick={onGoToCalculator}
          className="inline-flex items-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-sm font-semibold transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle demande de devis</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Sections du portail client"
          className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'shipments'}
            onClick={() => setActiveTab('shipments')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'shipments'
                ? 'bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mes Expéditions ({shipments.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'quotes'}
            onClick={() => setActiveTab('quotes')}
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'quotes'
                ? 'bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Mes Demandes de Devis ({quotes.length})
          </button>
        </div>

        {activeTab === 'shipments' && (
          <div className="inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            {[
              { id: 'all', label: 'Toutes' },
              { id: 'active', label: 'En cours' },
              { id: 'delivered', label: 'Livrées' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatusFilter(f.id as 'all' | 'active' | 'delivered')}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-[#0B1F3A] text-white dark:bg-orange-600'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {activeTab === 'shipments' ? (
        filteredShipments.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-3">
            <Package className="h-8 w-8 mx-auto text-slate-400" />
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Aucune expédition ne correspond à ce filtre.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500 dark:text-slate-400">
                  <th className="py-3 px-4 font-semibold">Récépissé</th>
                  <th className="py-3 px-4 font-semibold">Corridor</th>
                  <th className="py-3 px-4 font-semibold">Fret</th>
                  <th className="py-3 px-4 font-semibold">Statut</th>
                  <th className="py-3 px-4 font-semibold text-right">Montant TTC</th>
                  <th className="py-3 px-4 font-semibold text-right">Documents</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredShipments.map((s) => {
                  const meta = getShipmentStatusMeta(s.status);
                  return (
                    <tr
                      key={s.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 px-4">
                        <span className="font-mono font-semibold text-[#0B1F3A] dark:text-white block">
                          {s.trackingNumber}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {s.clientName}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-900 dark:text-slate-100 block">
                          {s.originCity} → {s.destinationCity}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          ETA : {s.estimatedDelivery}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 tabular-nums">
                        <span className="font-mono text-xs text-slate-800 dark:text-slate-200 block">
                          {formatWeight(s.weightKg)} · {s.volumeM3} m³
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {getServiceLabel(s.serviceType)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${meta.badgeClass}`}
                        >
                          <Truck className="h-3.5 w-3.5" />
                          <span>{meta.label}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold tabular-nums">
                        {formatEur(s.priceEur)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="inline-flex flex-wrap justify-end items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setModalState({ shipment: s, mode: 'cmr' })}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            <FileSpreadsheet className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                            <span>CMR</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalState({ shipment: s, mode: 'deca' })}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            <FileCheck className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                            <span>DECA</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalState({ shipment: s, mode: 'invoice' })}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            <FileText className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
                            <span>Facture</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setModalState({ shipment: s, mode: 'pod' })}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-300 dark:border-slate-700 px-2.5 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer whitespace-nowrap"
                          >
                            <FileCheck2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>POD</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : quotes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Vous n’avez pas encore soumis de demande de devis.
          </p>
          <button
            type="button"
            onClick={onGoToCalculator}
            className="rounded-lg bg-orange-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
          >
            Créer mon premier devis
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quotes.map((q) => (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    {q.id} · {q.source === 'firestore' ? 'Synchronisé Firestore' : 'Session locale'}
                  </p>
                  <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white mt-0.5">
                    {q.originCity} → {q.destinationCity}
                  </h3>
                </div>
                <span className="font-mono text-lg font-bold text-orange-600 dark:text-orange-400 tabular-nums">
                  {formatEur(q.estimatedPriceEur)}
                </span>
              </div>

              <div className="text-xs text-slate-600 dark:text-slate-300 flex flex-wrap gap-x-4 gap-y-1">
                <span>{getServiceLabel(q.serviceType)}</span>
                <span>·</span>
                <span className="font-mono">
                  {formatWeight(q.weightKg)} / {q.volumeM3} m³
                </span>
                <span>·</span>
                <span className="font-mono">{q.distanceKm} km</span>
              </div>

              {q.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 italic">« {q.notes} »</p>
              )}

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">{q.clientName}</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Statut :{' '}
                  {q.status === 'pending'
                    ? 'En étude exploitation'
                    : q.status === 'approved'
                    ? 'Approuvé'
                    : q.status === 'converted'
                    ? 'Converti en expédition'
                    : 'Refusé'}
                </span>
              </div>
            </div>
          ))}
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
