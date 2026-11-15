import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import {
  Camera,
  CheckCircle2,
  Clock,
  Eraser,
  FolderCheck,
  Fuel,
  Gauge,
  MessageSquare,
  Navigation,
  ScanLine,
  Send,
  Truck,
  UserCheck,
} from 'lucide-react';
import type {
  ChatMessage,
  DriverProfile,
  FuelMileageLog,
  ShipmentRecord,
  ShipmentStatus,
  TransportDocumentRecord,
  VehicleRecord,
} from '../types/logistics';
import {
  calculateCostPerKm,
  calculateFuelConsumptionL100,
  formatWeight,
  getServiceLabel,
  getShipmentStatusMeta,
  validateFuelLogInput,
} from '../utils/logistics';

interface DriverPortalProps {
  shipments: ShipmentRecord[];
  drivers: DriverProfile[];
  vehicles: VehicleRecord[];
  fuelLogs: FuelMileageLog[];
  travelDocs: TransportDocumentRecord[];
  messages: ChatMessage[];
  onUpdateShipmentStatus: (
    shipmentId: string,
    nextStatus: ShipmentStatus,
    checkpointNote: string,
  ) => void;
  onCompletePod: (
    shipmentId: string,
    payload: {
      signedBy: string;
      signatureData: string;
      photoLabel: string;
    },
  ) => void;
  onAddFuelLog: (log: FuelMileageLog) => void;
  onSendMessage: (payload: {
    threadId: string;
    senderId: string;
    senderName: string;
    senderRole: 'admin' | 'driver' | 'partner';
    recipientName: string;
    text: string;
  }) => void;
  onOpenScanner: () => void;
}

type DriverSubTab = 'missions' | 'repostaje' | 'voyage' | 'chat';

export function DriverPortal({
  shipments,
  drivers,
  vehicles,
  fuelLogs,
  travelDocs,
  messages,
  onUpdateShipmentStatus,
  onCompletePod,
  onAddFuelLog,
  onSendMessage,
  onOpenScanner,
}: DriverPortalProps) {
  const [subTab, setSubTab] = useState<DriverSubTab>('missions');
  const [selectedDriverId, setSelectedDriverId] = useState<string>(drivers[0]?.id || 'drv-karim');
  const [activeShipmentId, setActiveShipmentId] = useState<string | null>(null);
  const [signedBy, setSignedBy] = useState('');
  const [photoLabel, setPhotoLabel] = useState('');
  const [hasStroke, setHasStroke] = useState(false);
  const [podError, setPodError] = useState<string | null>(null);
  const [driverChatDraft, setDriverChatDraft] = useState('');

  const defaultVehicle = vehicles[0];
  const [fuelPlate, setFuelPlate] = useState<string>(defaultVehicle?.plateNumber || 'E-4829-LBT');
  const [fuelStation, setFuelStation] = useState('');
  const [fuelLiters, setFuelLiters] = useState<number>(220);
  const [fuelAmountEur, setFuelAmountEur] = useState<number>(345);
  const [fuelPrevKm, setFuelPrevKm] = useState<number>(defaultVehicle?.currentKm || 284650);
  const [fuelOdometerKm, setFuelOdometerKm] = useState<number>(
    (defaultVehicle?.currentKm || 284650) + 680,
  );
  const [fuelAdBlue, setFuelAdBlue] = useState<number>(18);
  const [fuelReceiptName, setFuelReceiptName] = useState('');
  const [fuelError, setFuelError] = useState<string | null>(null);
  const [fuelSuccess, setFuelSuccess] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  const activeDriver = drivers.find((d) => d.id === selectedDriverId) || drivers[0];
  const driverMissions = shipments.filter(
    (s) => s.driverId === activeDriver?.id || (!s.driverId && s.status !== 'pending_assignment'),
  );
  const driverMessages = messages.filter((m) => m.threadId === activeDriver?.id);

  const selectedMission =
    driverMissions.find((m) => m.id === activeShipmentId) ||
    driverMissions.find((m) => m.status !== 'delivered') ||
    driverMissions[0] ||
    null;

  useEffect(() => {
    setSignedBy('');
    setPhotoLabel('');
    setHasStroke(false);
    setPodError(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [selectedMission?.id]);

  const handleVehicleChange = (plate: string) => {
    setFuelPlate(plate);
    const v = vehicles.find((item) => item.plateNumber === plate);
    if (v?.currentKm) {
      setFuelPrevKm(v.currentKm);
      setFuelOdometerKm(v.currentKm + 600);
    }
  };

  const getPointerPos = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPointerPos(clientX, clientY);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = '#0B1F3A';
    ctx.lineWidth = 2.6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setHasStroke(true);
  };

  const handlePointerMove = (clientX: number, clientY: number) => {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getPointerPos(clientX, clientY);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = () => {
    drawingRef.current = false;
  };

  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasStroke(false);
  };

  const handlePhotoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoLabel(file.name);
    }
  };

  const handleValidatePod = () => {
    if (!selectedMission) return;
    if (signedBy.trim().length < 2) {
      setPodError('Indiquez le nom du réceptionnaire avant de valider.');
      return;
    }
    if (!hasStroke) {
      setPodError('La signature du client sur l’écran est requise.');
      return;
    }

    const canvas = canvasRef.current;
    const signatureData = canvas ? canvas.toDataURL('image/png') : '';
    const finalPhoto =
      photoLabel.trim() || `pod_${selectedMission.trackingNumber.toLowerCase()}.jpg`;

    setPodError(null);
    onCompletePod(selectedMission.id, {
      signedBy: signedBy.trim(),
      signatureData,
      photoLabel: finalPhoto,
    });
  };

  const handleFuelSubmit = (e: FormEvent) => {
    e.preventDefault();
    const validation = validateFuelLogInput({
      vehiclePlate: fuelPlate,
      station: fuelStation,
      liters: Number(fuelLiters),
      amountEur: Number(fuelAmountEur),
      previousKm: Number(fuelPrevKm),
      odometerKm: Number(fuelOdometerKm),
      adBlueLiters: Number(fuelAdBlue),
    });

    if (!validation.valid) {
      setFuelError(validation.error || 'Données carburant invalides.');
      setFuelSuccess(null);
      return;
    }

    setFuelError(null);
    const newLog: FuelMileageLog = {
      id: `fuel-${Date.now().toString(36)}`,
      vehiclePlate: fuelPlate,
      driverId: activeDriver?.id || 'drv-karim',
      driverName: activeDriver?.name || 'Karim Bouazza',
      station: fuelStation.trim(),
      liters: Number(fuelLiters),
      amountEur: Number(fuelAmountEur),
      previousKm: Number(fuelPrevKm),
      odometerKm: Number(fuelOdometerKm),
      adBlueLiters: Number(fuelAdBlue) || 0,
      receiptScanName:
        fuelReceiptName.trim() || `ticket_${fuelPlate.toLowerCase()}_${Date.now().toString().slice(-4)}.jpg`,
      createdAt: new Date().toISOString(),
    };

    onAddFuelLog(newLog);
    const nextBase = Number(fuelOdometerKm);
    setFuelPrevKm(nextBase);
    setFuelOdometerKm(nextBase + 600);
    setFuelStation('');
    setFuelReceiptName('');
    setFuelSuccess(
      `Repostaje enregistré : ${newLog.liters} L · Compteur ${nextBase.toLocaleString('fr-FR')} km`,
    );
  };

  const handleDriverChatSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!driverChatDraft.trim() || !activeDriver) return;
    onSendMessage({
      threadId: activeDriver.id,
      senderId: activeDriver.id,
      senderName: activeDriver.name,
      senderRole: 'driver',
      recipientName: 'Exploitation Yuncos',
      text: driverChatDraft.trim(),
    });
    setDriverChatDraft('');
  };

  const previewDist = Math.max(0, Number(fuelOdometerKm) - Number(fuelPrevKm));
  const previewL100 = calculateFuelConsumptionL100(
    Number(fuelLiters),
    Number(fuelPrevKm),
    Number(fuelOdometerKm),
  );
  const previewEurKm = calculateCostPerKm(
    Number(fuelAmountEur),
    Number(fuelPrevKm),
    Number(fuelOdometerKm),
  );

  const driverTravelDocs = travelDocs.filter((d) => d.docType === 'travel_doc');

  return (
    <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Application Mobile Chauffeur · Ensemble {activeDriver?.assignedVehiclePlate || '—'}{' '}
            {activeDriver?.assignedTrailerPlate ? `/ ${activeDriver.assignedTrailerPlate}` : ''}
          </p>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B1F3A] dark:text-white mt-1">
            Interface Chauffeur BOUA TRANS
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="driver-profile-select"
              className="text-xs font-semibold text-slate-600 dark:text-slate-300"
            >
              Chauffeur actif :
            </label>
            <select
              id="driver-profile-select"
              value={selectedDriverId}
              onChange={(e) => {
                setSelectedDriverId(e.target.value);
                setActiveShipmentId(null);
              }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {drivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.hubCity})
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={onOpenScanner}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-[#0B1F3A] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            <ScanLine className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400" />
            <span>Scanner CMR / Ticket</span>
          </button>
        </div>
      </div>

      {/* Driver Sub-navigation Tabs */}
      <div
        role="tablist"
        aria-label="Modules chauffeur"
        className="flex flex-nowrap overflow-x-auto max-w-full items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-fit"
      >
        {[
          { id: 'missions', label: `Missions · Départs/Arrivées (${driverMissions.length})` },
          { id: 'repostaje', label: `Repostaje & Kilométrage (${fuelLogs.length})` },
          { id: 'voyage', label: `Documents de voyage (${driverTravelDocs.length})` },
          { id: 'chat', label: `Messagerie Dispatch (${driverMessages.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            onClick={() => setSubTab(tab.id as DriverSubTab)}
            className={`px-3.5 py-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              subTab === tab.id
                ? 'bg-white dark:bg-slate-800 text-[#0B1F3A] dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MISSIONS, DEPARTS & ARRIVEES + POD */}
      {subTab === 'missions' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 space-y-3">
            <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
              Missions attribuées ({driverMissions.length})
            </h2>

            {driverMissions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                Aucune mission attribuée à {activeDriver?.name} pour le moment.
              </div>
            ) : (
              <div className="space-y-3">
                {driverMissions.map((mission) => {
                  const isSelected = selectedMission?.id === mission.id;
                  const statusMeta = getShipmentStatusMeta(mission.status);
                  return (
                    <button
                      key={mission.id}
                      type="button"
                      onClick={() => setActiveShipmentId(mission.id)}
                      className={`w-full text-left rounded-xl border p-4 transition-colors cursor-pointer space-y-2 ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/40 dark:bg-orange-950/20'
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[#0B1F3A] dark:text-white">
                          {mission.trackingNumber}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>
                      <p className="font-display text-sm font-bold text-slate-900 dark:text-white">
                        {mission.originCity} → {mission.destinationCity}
                      </p>
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                        <span>Départ : {mission.departureSchedule || 'Planifié'}</span>
                        <span>·</span>
                        <span>Arrivée : {mission.estimatedDelivery}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="lg:col-span-7">
            {selectedMission ? (
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                  <div>
                    <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
                      {selectedMission.trackingNumber} ·{' '}
                      {selectedMission.vehiclePlate || 'Véhicule assigné'}
                    </p>
                    <h2 className="font-display text-xl font-bold text-[#0B1F3A] dark:text-white mt-0.5">
                      {selectedMission.originCity} → {selectedMission.destinationCity}
                    </h2>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                      Client : {selectedMission.clientName} ·{' '}
                      {getServiceLabel(selectedMission.serviceType)} ·{' '}
                      {formatWeight(selectedMission.weightKg)} ({selectedMission.volumeM3} m³)
                    </p>
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(
                      selectedMission.originCity,
                    )}&destination=${encodeURIComponent(selectedMission.destinationCity)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-slate-800 hover:opacity-95 text-white px-4 py-2.5 text-xs font-semibold whitespace-nowrap"
                  >
                    <Navigation className="h-4 w-4 text-orange-400" />
                    <span>Itinéraire GPS</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-4 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">
                        Départ programmé ({selectedMission.originCity})
                      </span>
                      <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white">
                        {selectedMission.departureSchedule || 'À confirmer au quai'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">
                        Arrivée estimée ({selectedMission.destinationCity})
                      </span>
                      <span className="font-mono font-semibold text-sm text-slate-900 dark:text-white">
                        {selectedMission.estimatedDelivery}
                      </span>
                    </div>
                  </div>
                </div>

                {selectedMission.status !== 'delivered' && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Pointage Départs & Arrivées
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateShipmentStatus(
                            selectedMission.id,
                            'picked_up',
                            `${new Date().toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} — Départ effectué à ${selectedMission.originCity} par ${activeDriver?.name}`,
                          )
                        }
                        disabled={
                          selectedMission.status === 'picked_up' ||
                          selectedMission.status === 'in_transit'
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        <Truck className="h-3.5 w-3.5 text-indigo-500" />
                        <span>Confirmer départ / enlèvement</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateShipmentStatus(
                            selectedMission.id,
                            'in_transit',
                            `${new Date().toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} — En route vers ${selectedMission.destinationCity}`,
                          )
                        }
                        disabled={selectedMission.status === 'in_transit'}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 dark:border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 cursor-pointer"
                      >
                        <Navigation className="h-3.5 w-3.5 text-orange-500" />
                        <span>Passer en transit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onUpdateShipmentStatus(
                            selectedMission.id,
                            'in_transit',
                            `${new Date().toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })} — Arrivée quai destinataire ${selectedMission.destinationCity} (attente POD)`,
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 dark:border-emerald-800 px-3.5 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 cursor-pointer"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Signaler arrivée sur site</span>
                      </button>
                    </div>
                  </div>
                )}

                {selectedMission.status === 'delivered' ? (
                  <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 p-5 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold text-sm">
                      <CheckCircle2 className="h-5 w-5" />
                      <span>Livraison validée avec POD numérique</span>
                    </div>
                    <p className="text-xs text-emerald-700 dark:text-emerald-400">
                      Signé par : <strong>{selectedMission.podSignedBy}</strong> · Photo :{' '}
                      <span className="font-mono">{selectedMission.podPhotoLabel}</span>
                    </p>
                    {selectedMission.podSignatureData && (
                      <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-white p-3 inline-block">
                        <img
                          src={selectedMission.podSignatureData}
                          alt={`Signature client ${selectedMission.podSignedBy}`}
                          referrerPolicy="no-referrer"
                          className="h-20 w-auto object-contain"
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4 border-t border-slate-200 dark:border-slate-800 pt-5">
                    <h3 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                      <UserCheck className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <span>Validation de livraison (POD)</span>
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="pod-recipient"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Nom du réceptionnaire
                        </label>
                        <input
                          id="pod-recipient"
                          type="text"
                          value={signedBy}
                          onChange={(e) => setSignedBy(e.target.value)}
                          placeholder="Ex : Marc Lefèvre (Quai B)"
                          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="pod-photo-input"
                          className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                        >
                          Photo marchandise / bon émargé
                        </label>
                        <div className="flex items-center gap-2">
                          <label
                            htmlFor="pod-photo-input"
                            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer truncate"
                          >
                            <Camera className="h-4 w-4 text-orange-600 dark:text-orange-400 shrink-0" />
                            <span className="truncate">
                              {photoLabel || 'Prendre / joindre photo'}
                            </span>
                          </label>
                          <input
                            id="pod-photo-input"
                            type="file"
                            accept="image/*"
                            capture="environment"
                            onChange={handlePhotoUpload}
                            className="sr-only"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Signature du client sur écran
                        </span>
                        <button
                          type="button"
                          onClick={handleClearSignature}
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white cursor-pointer"
                        >
                          <Eraser className="h-3.5 w-3.5" />
                          <span>Effacer</span>
                        </button>
                      </div>
                      <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white overflow-hidden">
                        <canvas
                          ref={canvasRef}
                          width={520}
                          height={150}
                          data-testid="pod-signature-canvas"
                          onMouseDown={(e) => handlePointerDown(e.clientX, e.clientY)}
                          onMouseMove={(e) => handlePointerMove(e.clientX, e.clientY)}
                          onMouseUp={handlePointerUp}
                          onMouseLeave={handlePointerUp}
                          onTouchStart={(e) => {
                            const touch = e.touches[0];
                            if (touch) handlePointerDown(touch.clientX, touch.clientY);
                          }}
                          onTouchMove={(e) => {
                            const touch = e.touches[0];
                            if (touch) handlePointerMove(touch.clientX, touch.clientY);
                          }}
                          onTouchEnd={handlePointerUp}
                          className="w-full h-36 touch-none cursor-crosshair block"
                        />
                      </div>
                    </div>

                    {podError && (
                      <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                        {podError}
                      </p>
                    )}

                    <button
                      type="button"
                      onClick={handleValidatePod}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3 text-sm font-semibold transition-colors cursor-pointer"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Valider la livraison (POD)</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 p-10 text-center text-sm text-slate-500">
                Sélectionnez une mission dans la liste pour afficher la feuille de route.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REPOSTAJE & KILOMETRAGE */}
      {subTab === 'repostaje' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 space-y-5">
            <h2 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <Fuel className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span>Déclarer un plein (Repostaje) & Kilométrage</span>
            </h2>

            <form onSubmit={handleFuelSubmit} className="space-y-3.5 text-sm">
              <div>
                <label
                  htmlFor="fuel-vehicle"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Véhicule
                </label>
                <select
                  id="fuel-vehicle"
                  value={fuelPlate}
                  onChange={(e) => handleVehicleChange(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-xs font-semibold"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.plateNumber}>
                      {v.plateNumber} · {v.model}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="fuel-station"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1"
                >
                  Station-service / Aire d’autoroute
                </label>
                <input
                  id="fuel-station"
                  type="text"
                  value={fuelStation}
                  onChange={(e) => setFuelStation(e.target.value)}
                  placeholder="Ex : Repsol A-42 Yuncos"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label htmlFor="fuel-liters" className="block text-xs font-semibold mb-1">
                    Gasoil (L)
                  </label>
                  <input
                    id="fuel-liters"
                    type="number"
                    min={1}
                    step="0.1"
                    value={fuelLiters}
                    onChange={(e) => setFuelLiters(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="fuel-amount" className="block text-xs font-semibold mb-1">
                    Montant (€)
                  </label>
                  <input
                    id="fuel-amount"
                    type="number"
                    min={1}
                    step="0.01"
                    value={fuelAmountEur}
                    onChange={(e) => setFuelAmountEur(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="fuel-adblue" className="block text-xs font-semibold mb-1">
                    AdBlue (L)
                  </label>
                  <input
                    id="fuel-adblue"
                    type="number"
                    min={0}
                    step="0.5"
                    value={fuelAdBlue}
                    onChange={(e) => setFuelAdBlue(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="fuel-prev-km" className="block text-xs font-semibold mb-1">
                    Km précédent
                  </label>
                  <input
                    id="fuel-prev-km"
                    type="number"
                    min={0}
                    value={fuelPrevKm}
                    onChange={(e) => setFuelPrevKm(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="fuel-odometer" className="block text-xs font-semibold mb-1">
                    Kilométrage compteur
                  </label>
                  <input
                    id="fuel-odometer"
                    type="number"
                    min={1}
                    value={fuelOdometerKm}
                    onChange={(e) => setFuelOdometerKm(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 font-mono text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fuel-receipt" className="block text-xs font-semibold mb-1">
                  Justificatif ticket station (optionnel)
                </label>
                <input
                  id="fuel-receipt"
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setFuelReceiptName(e.target.files?.[0]?.name || '')}
                  className="w-full text-xs text-slate-600 dark:text-slate-300 file:mr-3 file:rounded-md file:border file:border-slate-300 dark:file:border-slate-700 file:bg-slate-100 dark:file:bg-slate-800 file:px-3 file:py-1.5 file:text-xs file:font-semibold"
                />
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 grid grid-cols-3 gap-2 text-center text-xs tabular-nums">
                <div>
                  <span className="text-slate-500 block">Trajet</span>
                  <span className="font-mono font-bold text-[#0B1F3A] dark:text-white">
                    {previewDist} km
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Conso</span>
                  <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                    {previewL100} L/100
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Coût km</span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {previewEurKm.toFixed(2)} €/km
                  </span>
                </div>
              </div>

              {fuelError && (
                <p role="alert" className="text-xs font-medium text-red-600 dark:text-red-400">
                  {fuelError}
                </p>
              )}
              {fuelSuccess && (
                <p
                  role="status"
                  className="text-xs font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg p-2.5"
                >
                  {fuelSuccess}
                </p>
              )}

              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white px-4 py-2.5 text-xs font-semibold cursor-pointer"
              >
                <Gauge className="h-4 w-4" />
                <span>Enregistrer Repostaje & Kilométrage</span>
              </button>
            </form>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                Historique des pleins & relevés kilométriques ({fuelLogs.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-xs text-slate-500">
                    <th className="py-3 px-4 font-semibold">Véhicule & Station</th>
                    <th className="py-3 px-4 font-semibold text-right">Volume</th>
                    <th className="py-3 px-4 font-semibold text-right">Compteur</th>
                    <th className="py-3 px-4 font-semibold text-right">Conso / Coût</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {fuelLogs.map((log) => {
                    const dist = Math.max(0, log.odometerKm - log.previousKm);
                    const l100 = calculateFuelConsumptionL100(
                      log.liters,
                      log.previousKm,
                      log.odometerKm,
                    );
                    const cpk = calculateCostPerKm(log.amountEur, log.previousKm, log.odometerKm);
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <span className="font-mono text-xs font-bold text-[#0B1F3A] dark:text-white block">
                            {log.vehiclePlate} · {log.driverName}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {log.station}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                          <span className="font-semibold block">{log.liters} L</span>
                          <span className="text-slate-500">{log.amountEur.toFixed(2)} €</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                          <span className="font-semibold block">
                            {log.odometerKm.toLocaleString('fr-FR')} km
                          </span>
                          <span className="text-slate-500">+{dist} km</span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-xs tabular-nums">
                          <span className="font-semibold text-orange-600 dark:text-orange-400 block">
                            {l100} L/100km
                          </span>
                          <span className="text-slate-500">{cpk.toFixed(2)} €/km</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DOCUMENTS DE VOYAGE CHAUFFEUR */}
      {subTab === 'voyage' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <FolderCheck className="h-5 w-5 text-orange-600 dark:text-orange-400" />
              <span>Documents de voyage obligatoires à bord</span>
            </h2>
            <button
              type="button"
              onClick={onOpenScanner}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0B1F3A] dark:bg-orange-600 text-white px-4 py-2 text-xs font-semibold cursor-pointer"
            >
              <ScanLine className="h-4 w-4" />
              <span>Ouvrir Scanner CMR · DECA</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {driverTravelDocs.map((docItem) => (
              <div
                key={docItem.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-orange-600 dark:text-orange-400">
                    {docItem.reference}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
                      docItem.status === 'expiring'
                        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                    }`}
                  >
                    {docItem.status === 'expiring' ? 'À renouveler' : 'Conforme'}
                  </span>
                </div>
                <p className="font-semibold text-sm text-slate-900 dark:text-white">
                  {docItem.title}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Véh. {docItem.vehiclePlate || 'Flotte'} · Échéance :{' '}
                  {docItem.expiryDate || 'Permanent'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: MESSAGERIE TEMPS REEL AVEC EXPLOITATION */}
      {subTab === 'chat' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between min-h-[380px]">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            <div>
              <h2 className="font-display text-base font-bold text-[#0B1F3A] dark:text-white">
                Messagerie Directe · {activeDriver?.name} ↔ Exploitation Yuncos
              </h2>
              <p className="text-xs text-slate-500">
                Recevez les consignes de quai et signalez les passages frontières en direct.
              </p>
            </div>
          </div>

          <div className="flex-1 p-6 space-y-3 overflow-y-auto max-h-72">
            {driverMessages.length === 0 ? (
              <p className="text-xs text-slate-500">
                Aucun échange pour {activeDriver?.name}. Envoyez un message au dispatch ci-dessous.
              </p>
            ) : (
              driverMessages.map((msg) => {
                const isSelf = msg.senderRole === 'driver';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[82%] rounded-xl px-4 py-2.5 text-xs space-y-1 ${
                        isSelf
                          ? 'bg-[#0B1F3A] text-white dark:bg-orange-600'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                      }`}
                    >
                      <p className="font-semibold opacity-85">{msg.senderName}</p>
                      <p className="leading-relaxed">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <form
            onSubmit={handleDriverChatSubmit}
            className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={driverChatDraft}
              onChange={(e) => setDriverChatDraft(e.target.value)}
              placeholder="Message rapide vers l’exploitation Yuncos..."
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
      )}
    </main>
  );
}
