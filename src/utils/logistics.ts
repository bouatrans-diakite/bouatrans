import type {
  CmrDocumentData,
  DecaRecord,
  DriverProfile,
  FacturaLineItem,
  FreightCargoClass,
  LassineFacturaData,
  NewsPublication,
  PublicationCategory,
  QuoteCalculationInput,
  QuoteCalculationResult,
  QuoteRecord,
  RouteVoyageRecord,
  ServiceType,
  ShipmentRecord,
  ShipmentStatus,
  SiteContentConfig,
  SocialMediaPlatform,
  TrailerType,
  TransportDocumentRecord,
  VehicleRecord,
  VehicleType,
} from '../types/logistics';

export const BLUEPRINT_LIMITS = {
  idPattern: /^[a-zA-Z0-9_-]+$/,
  trackingPattern: /^[A-Z0-9-]+$/,
  clientNameMax: 120,
  emailMax: 200,
  phoneMax: 32,
  cityMax: 100,
  notesMax: 500,
  plateMax: 20,
  modelMax: 80,
  weightMaxKg: 44000,
  volumeMaxM3: 120,
} as const;

export interface EuropeanCountry {
  code: string;
  name: string;
  phonePrefix: string;
  sampleCities: string[];
}

/**
 * BOUA TRANS operates exclusively within Spain (national) and Europe (international).
 * Non-European and African destinations are strictly excluded.
 */
export const EUROPEAN_COUNTRIES: EuropeanCountry[] = [
  {
    code: 'ES',
    name: 'Espagne (National)',
    phonePrefix: '+34',
    sampleCities: ['Yuncos (Toledo)', 'Madrid', 'Barcelone', 'Valence', 'Bilbao', 'Séville', 'Saragosse', 'Murcie'],
  },
  {
    code: 'FR',
    name: 'France',
    phonePrefix: '+33',
    sampleCities: ['Paris', 'Lyon', 'Marseille', 'Bordeaux', 'Toulouse', 'Lille', 'Nantes', 'Strasbourg'],
  },
  {
    code: 'PT',
    name: 'Portugal',
    phonePrefix: '+351',
    sampleCities: ['Lisbonne', 'Porto', 'Braga', 'Coimbra'],
  },
  {
    code: 'BE',
    name: 'Belgique',
    phonePrefix: '+32',
    sampleCities: ['Bruxelles', 'Anvers', 'Liège', 'Gand'],
  },
  {
    code: 'NL',
    name: 'Pays-Bas',
    phonePrefix: '+31',
    sampleCities: ['Rotterdam', 'Amsterdam', 'Utrecht', 'Eindhoven'],
  },
  {
    code: 'LU',
    name: 'Luxembourg',
    phonePrefix: '+352',
    sampleCities: ['Luxembourg', 'Bettembourg', 'Esch-sur-Alzette'],
  },
  {
    code: 'DE',
    name: 'Allemagne',
    phonePrefix: '+49',
    sampleCities: ['Francfort', 'Munich', 'Stuttgart', 'Cologne', 'Hambourg', 'Berlin'],
  },
  {
    code: 'IT',
    name: 'Italie',
    phonePrefix: '+39',
    sampleCities: ['Milan', 'Turin', 'Bologne', 'Vérone', 'Rome'],
  },
  {
    code: 'CH',
    name: 'Suisse',
    phonePrefix: '+41',
    sampleCities: ['Genève', 'Bâle', 'Zurich', 'Lausanne'],
  },
  {
    code: 'AT',
    name: 'Autriche',
    phonePrefix: '+43',
    sampleCities: ['Vienne', 'Salzbourg', 'Linz', 'Graz'],
  },
  {
    code: 'PL',
    name: 'Pologne',
    phonePrefix: '+48',
    sampleCities: ['Varsovie', 'Wrocław', 'Cracovie', 'Poznań'],
  },
  {
    code: 'CZ',
    name: 'République tchèque',
    phonePrefix: '+420',
    sampleCities: ['Prague', 'Brno', 'Ostrava'],
  },
  {
    code: 'DK',
    name: 'Danemark',
    phonePrefix: '+45',
    sampleCities: ['Copenhague', 'Aarhus', 'Odense'],
  },
  {
    code: 'SE',
    name: 'Suède',
    phonePrefix: '+46',
    sampleCities: ['Stockholm', 'Göteborg', 'Malmö'],
  },
  {
    code: 'IE',
    name: 'Irlande',
    phonePrefix: '+353',
    sampleCities: ['Dublin', 'Cork'],
  },
  {
    code: 'GB',
    name: 'Royaume-Uni',
    phonePrefix: '+44',
    sampleCities: ['Londres', 'Birmingham', 'Manchester'],
  },
];

interface CityCoord {
  name: string;
  countryCode: string;
  lat: number;
  lon: number;
}

export const EUROPEAN_HUBS: CityCoord[] = [
  { name: 'Yuncos (Toledo)', countryCode: 'ES', lat: 40.1436, lon: -3.8722 },
  { name: 'Madrid', countryCode: 'ES', lat: 40.4168, lon: -3.7038 },
  { name: 'Barcelone', countryCode: 'ES', lat: 41.3874, lon: 2.1686 },
  { name: 'Valence', countryCode: 'ES', lat: 39.4699, lon: -0.3763 },
  { name: 'Bilbao', countryCode: 'ES', lat: 43.263, lon: -2.935 },
  { name: 'Séville', countryCode: 'ES', lat: 37.3891, lon: -5.9845 },
  { name: 'Saragosse', countryCode: 'ES', lat: 41.6488, lon: -0.8891 },
  { name: 'Lisbonne', countryCode: 'PT', lat: 38.7223, lon: -9.1393 },
  { name: 'Porto', countryCode: 'PT', lat: 41.1579, lon: -8.6291 },
  { name: 'Bordeaux', countryCode: 'FR', lat: 44.8378, lon: -0.5792 },
  { name: 'Toulouse', countryCode: 'FR', lat: 43.6047, lon: 1.4442 },
  { name: 'Lyon', countryCode: 'FR', lat: 45.764, lon: 4.8357 },
  { name: 'Marseille', countryCode: 'FR', lat: 43.2965, lon: 5.3698 },
  { name: 'Paris', countryCode: 'FR', lat: 48.8566, lon: 2.3522 },
  { name: 'Lille', countryCode: 'FR', lat: 50.6292, lon: 3.0573 },
  { name: 'Bruxelles', countryCode: 'BE', lat: 50.8503, lon: 4.3517 },
  { name: 'Rotterdam', countryCode: 'NL', lat: 51.9244, lon: 4.4777 },
  { name: 'Milan', countryCode: 'IT', lat: 45.4642, lon: 9.19 },
  { name: 'Francfort', countryCode: 'DE', lat: 50.1109, lon: 8.6821 },
  { name: 'Munich', countryCode: 'DE', lat: 48.1351, lon: 11.582 },
  { name: 'Genève', countryCode: 'CH', lat: 46.2044, lon: 6.1432 },
  { name: 'Vienne', countryCode: 'AT', lat: 48.2082, lon: 16.3738 },
];

function normalizeCityKey(city: string): string {
  return city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function findCityCoord(cityName: string): CityCoord | null {
  const key = normalizeCityKey(cityName);
  if (!key) return null;
  for (const hub of EUROPEAN_HUBS) {
    const hubKey = normalizeCityKey(hub.name);
    if (hubKey === key || hubKey.includes(key) || key.includes(hubKey.split(' ')[0])) {
      return hub;
    }
  }
  return null;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function estimateRouteDistanceKm(originCity: string, destinationCity: string): number {
  const a = findCityCoord(originCity);
  const b = findCityCoord(destinationCity);

  if (a && b) {
    if (a.name === b.name) return 45;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h =
      sinLat * sinLat +
      Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLon * sinLon;
    const crowFlies = 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    return Math.max(45, Math.round(crowFlies * 1.22));
  }

  const normA = normalizeCityKey(originCity);
  const normB = normalizeCityKey(destinationCity);
  if (normA === normB && normA.length > 0) return 45;

  let hash = 0;
  const combined = `${normA}|${normB}`;
  for (let i = 0; i < combined.length; i += 1) {
    hash = (hash * 31 + combined.charCodeAt(i)) % 1400;
  }
  return 280 + hash;
}

export function recommendVehicleType(weightKg: number, volumeM3: number): VehicleType {
  if (weightKg <= 1400 && volumeM3 <= 14) return 'van';
  if (weightKg <= 10500 && volumeM3 <= 42) return 'truck_12t';
  return 'semi_40t';
}

export function calculateDynamicQuote(input: QuoteCalculationInput): QuoteCalculationResult {
  const safeWeight = Math.min(Math.max(Number(input.weightKg) || 1, 1), BLUEPRINT_LIMITS.weightMaxKg);
  const safeVolume = Math.min(Math.max(Number(input.volumeM3) || 0.5, 0.1), BLUEPRINT_LIMITS.volumeMaxM3);
  const distanceKm = estimateRouteDistanceKm(input.originCity, input.destinationCity);

  const serviceMultipliers: Record<ServiceType, number> = {
    express: 1.38,
    standard: 1.0,
    pallet: 1.12,
    moving: 1.28,
  };

  const baseHandlingFee = input.serviceType === 'express' ? 95 : input.serviceType === 'moving' ? 160 : 65;
  const distanceRatePerKm =
    safeWeight <= 1400 ? 0.68 : safeWeight <= 10500 ? 1.15 : 1.58;

  const weightSurcharge = safeWeight * 0.085;
  const volumeSurcharge = safeVolume * 14.5;
  const multiplier = serviceMultipliers[input.serviceType];

  const rawTotal =
    (baseHandlingFee + distanceKm * distanceRatePerKm + weightSurcharge + volumeSurcharge) *
    multiplier;

  const estimatedPriceEur = Math.max(95, Math.round(rawTotal));

  const averageSpeedKmh = input.serviceType === 'express' ? 74 : 58;
  const handlingHours = input.serviceType === 'express' ? 3 : 8;
  const estimatedTransitHours = Math.max(4, Math.round(distanceKm / averageSpeedKmh) + handlingHours);

  return {
    distanceKm,
    estimatedPriceEur,
    estimatedTransitHours,
    recommendedVehicle: recommendVehicleType(safeWeight, safeVolume),
  };
}

const ALLOWED_EUROPEAN_COUNTRY_NAMES = new Set(EUROPEAN_COUNTRIES.map((c) => c.name));

/**
 * Validates European phone numbers (E.164 prefixes for EU/EEA/CH/UK or national 9-10 digits).
 * Rejects non-European prefixes (e.g. +212, +213, +216, +1, etc.).
 */
export function validateEuropeanPhone(rawPhone: string): boolean {
  const compact = rawPhone.trim().replace(/[\s().-]/g, '');
  if (!compact || compact.length < 9 || compact.length > 18) return false;

  const normalized = compact.startsWith('00') ? `+${compact.slice(2)}` : compact;

  if (normalized.startsWith('+')) {
    // European ITU zone 3 (+30..+399) and zone 4 (+40..+499)
    return /^\+(3[0-9]|4[0-9])[0-9]{7,13}$/.test(normalized);
  }

  // Local European numbers starting with 0 (France/Belgium/Germany/UK/Italy) or 6/7/9 (Spain 9 digits)
  return /^(0[1-9][0-9]{7,10}|[6789][0-9]{8})$/.test(normalized);
}

export function isAllowedEuropeanCountry(countryName?: string): boolean {
  if (!countryName) return true;
  return ALLOWED_EUROPEAN_COUNTRY_NAMES.has(countryName);
}

export interface QuoteFormInput {
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  originCountry?: string;
  originCity: string;
  destinationCountry?: string;
  destinationCity: string;
  weightKg: number;
  volumeM3: number;
  serviceType: ServiceType;
  notes?: string;
}

export interface QuoteValidationResult {
  valid: boolean;
  errors: Partial<Record<keyof QuoteFormInput, string>>;
}

export function validateQuoteInput(input: QuoteFormInput): QuoteValidationResult {
  const errors: Partial<Record<keyof QuoteFormInput, string>> = {};

  const name = input.clientName.trim();
  if (name.length < 2 || name.length > BLUEPRINT_LIMITS.clientNameMax) {
    errors.clientName = 'Indiquez un nom ou une raison sociale (2 à 120 caractères).';
  }

  const email = input.clientEmail.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > BLUEPRINT_LIMITS.emailMax) {
    errors.clientEmail = 'Adresse email professionnelle ou personnelle invalide.';
  }

  const phone = input.clientPhone.trim();
  if (!validateEuropeanPhone(phone)) {
    errors.clientPhone =
      'Indicatif téléphonique européen requis (ex. +34 632 60 71 01, +33 6..., +32..., +49...).';
  }

  if (input.originCountry && !isAllowedEuropeanCountry(input.originCountry)) {
    errors.originCountry = 'Pays de départ limité à l’Espagne et à l’Europe.';
  }

  if (input.destinationCountry && !isAllowedEuropeanCountry(input.destinationCountry)) {
    errors.destinationCountry = 'Destination exclusivement en Espagne ou en Europe.';
  }

  const origin = input.originCity.trim();
  if (origin.length < 2 || origin.length > BLUEPRINT_LIMITS.cityMax) {
    errors.originCity = 'Précisez la ville de départ (Espagne / Europe).';
  }

  const dest = input.destinationCity.trim();
  if (dest.length < 2 || dest.length > BLUEPRINT_LIMITS.cityMax) {
    errors.destinationCity = "Précisez la ville d'arrivée (Espagne / Europe).";
  }

  if (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > BLUEPRINT_LIMITS.weightMaxKg) {
    errors.weightKg = `Poids requis entre 1 et ${BLUEPRINT_LIMITS.weightMaxKg} kg.`;
  }

  if (!Number.isFinite(input.volumeM3) || input.volumeM3 <= 0 || input.volumeM3 > BLUEPRINT_LIMITS.volumeMaxM3) {
    errors.volumeM3 = `Volume requis entre 0,1 et ${BLUEPRINT_LIMITS.volumeMaxM3} m³.`;
  }

  if (input.notes && input.notes.trim().length > BLUEPRINT_LIMITS.notesMax) {
    errors.notes = `Les remarques ne doivent pas dépasser ${BLUEPRINT_LIMITS.notesMax} caractères.`;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export interface ParsedSocialMedia {
  platform: SocialMediaPlatform;
  embedUrl: string | null;
  originalUrl: string;
  label: string;
}

export function parseSocialMediaUrl(rawUrl: string): ParsedSocialMedia {
  const url = rawUrl.trim();
  if (!url) {
    return { platform: 'none', embedUrl: null, originalUrl: '', label: 'Aucun média' };
  }

  // YouTube (watch, youtu.be, shorts, embed)
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/,
  );
  if (ytMatch) {
    return {
      platform: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}`,
      originalUrl: url,
      label: 'YouTube',
    };
  }

  // TikTok (@user/video/ID or tiktok.com/embed)
  const tiktokMatch = url.match(/tiktok\.com\/(?:@[\w.-]+\/video\/|embed\/v2\/)(\d+)/);
  if (tiktokMatch) {
    return {
      platform: 'tiktok',
      embedUrl: `https://www.tiktok.com/embed/v2/${tiktokMatch[1]}`,
      originalUrl: url,
      label: 'TikTok',
    };
  }

  // Instagram (reel or p)
  const igMatch = url.match(/instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)/);
  if (igMatch) {
    return {
      platform: 'instagram',
      embedUrl: `https://www.instagram.com/p/${igMatch[1]}/embed`,
      originalUrl: url,
      label: 'Instagram',
    };
  }

  // Facebook video / reel / watch
  if (/facebook\.com|fb\.watch/i.test(url)) {
    return {
      platform: 'facebook',
      embedUrl: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=false`,
      originalUrl: url,
      label: 'Facebook',
    };
  }

  // Twitter / X
  const xMatch = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/);
  if (xMatch) {
    return {
      platform: 'twitter',
      embedUrl: `https://platform.twitter.com/embed/Tweet.html?id=${xMatch[1]}`,
      originalUrl: url,
      label: 'Twitter / X',
    };
  }

  // Direct video file or data URL
  if (/\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(url) || url.startsWith('data:video/')) {
    return {
      platform: 'video',
      embedUrl: url,
      originalUrl: url,
      label: 'Vidéo directe',
    };
  }

  // Direct photo URL or data URL
  if (/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(url) || url.startsWith('data:image/')) {
    return {
      platform: 'image',
      embedUrl: url,
      originalUrl: url,
      label: 'Photo',
    };
  }

  return {
    platform: 'none',
    embedUrl: null,
    originalUrl: url,
    label: 'Lien externe',
  };
}

export interface InvoiceCalculationInput {
  distanceKm: number;
  weightKg: number;
  serviceType: ServiceType;
  cargoClass: FreightCargoClass;
  tvaRate?: number;
}

export interface InvoiceCalculationResult {
  htAmountEur: number;
  tvaRate: number;
  tvaAmountEur: number;
  totalTtcEur: number;
}

export function calculateInvoiceBreakdown(
  input: InvoiceCalculationInput,
): InvoiceCalculationResult {
  const km = Math.max(10, Number(input.distanceKm) || 100);
  const weight = Math.max(10, Number(input.weightKg) || 500);
  const tvaRate = input.tvaRate ?? 0.21;

  const serviceRate: Record<ServiceType, number> = {
    standard: 1.05,
    pallet: 1.15,
    express: 1.42,
    moving: 1.32,
  };

  const cargoMultiplier: Record<FreightCargoClass, number> = {
    general: 1.0,
    palletized: 1.06,
    industrial: 1.14,
    refrigerated: 1.24,
    moving: 1.18,
  };

  const baseKmCost = km * serviceRate[input.serviceType];
  const tonnageSurcharge = (weight / 1000) * 18;
  const fixedHandling = input.serviceType === 'express' ? 75 : 55;
  const htRaw = (baseKmCost + tonnageSurcharge + fixedHandling) * cargoMultiplier[input.cargoClass];

  const htAmountEur = Math.round(htRaw * 100) / 100;
  const tvaAmountEur = Math.round(htAmountEur * tvaRate * 100) / 100;
  const totalTtcEur = Math.round((htAmountEur + tvaAmountEur) * 100) / 100;

  return {
    htAmountEur,
    tvaRate,
    tvaAmountEur,
    totalTtcEur,
  };
}

export function sanitizeTrackingCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 32);
}

export function formatEur(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatWeight(kg: number): string {
  return `${new Intl.NumberFormat('fr-FR').format(Math.round(kg))} kg`;
}

export function getServiceLabel(serviceType: ServiceType): string {
  const labels: Record<ServiceType, string> = {
    express: 'Messagerie Express 24/48h',
    standard: 'Transport Routier Europe',
    pallet: 'Affrètement & Palettes',
    moving: 'Déménagement Dédié',
  };
  return labels[serviceType];
}

export function getVehicleTypeLabel(type: VehicleType): string {
  const labels: Record<VehicleType, string> = {
    van: 'Fourgon Express (3,5T)',
    truck_12t: 'Porteur Hayon (12T)',
    semi_40t: 'Semi-Remorque Tautliner (40T)',
  };
  return labels[type];
}

export function getTrailerTypeLabel(type: TrailerType): string {
  const labels: Record<TrailerType, string> = {
    tautliner: 'Semi-remorque Tautliner (Bâchée)',
    frigo: 'Semi-remorque Frigorifique',
    fourgon: 'Fourgon Tôlé Sécurisé',
    porte_conteneur: 'Châssis Porte-Conteneur',
  };
  return labels[type];
}

export function getShipmentStatusMeta(status: ShipmentStatus): {
  label: string;
  stepIndex: number;
  badgeClass: string;
} {
  switch (status) {
    case 'pending_assignment':
      return {
        label: 'À attribuer',
        stepIndex: 0,
        badgeClass:
          'text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-300 dark:bg-amber-950/50 dark:border-amber-800/70',
      };
    case 'assigned':
      return {
        label: 'Chauffeur assigné',
        stepIndex: 1,
        badgeClass:
          'text-sky-700 bg-sky-50 border-sky-200 dark:text-sky-300 dark:bg-sky-950/50 dark:border-sky-800/70',
      };
    case 'picked_up':
      return {
        label: 'Enlèvement effectué',
        stepIndex: 2,
        badgeClass:
          'text-indigo-700 bg-indigo-50 border-indigo-200 dark:text-indigo-300 dark:bg-indigo-950/50 dark:border-indigo-800/70',
      };
    case 'in_transit':
      return {
        label: 'En transit',
        stepIndex: 3,
        badgeClass:
          'text-orange-700 bg-orange-50 border-orange-200 dark:text-orange-300 dark:bg-orange-950/50 dark:border-orange-800/70',
      };
    case 'delivered':
      return {
        label: 'Livré · POD validé',
        stepIndex: 4,
        badgeClass:
          'text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-300 dark:bg-emerald-950/50 dark:border-emerald-800/70',
      };
  }
}

export interface FinancialSummary {
  totalRevenueEur: number;
  collectedEur: number;
  pendingInvoiceEur: number;
  deliveredCount: number;
  activeShipmentsCount: number;
  pendingQuotesCount: number;
  podRatePercent: number;
}

export function computeFinancialSummary(
  shipments: ShipmentRecord[],
  quotes: QuoteRecord[],
): FinancialSummary {
  let totalRevenueEur = 0;
  let collectedEur = 0;
  let pendingInvoiceEur = 0;
  let deliveredCount = 0;

  for (const s of shipments) {
    totalRevenueEur += s.priceEur;
    if (s.invoicePaid) {
      collectedEur += s.priceEur;
    } else {
      pendingInvoiceEur += s.priceEur;
    }
    if (s.status === 'delivered') {
      deliveredCount += 1;
    }
  }

  const activeShipmentsCount = shipments.length - deliveredCount;
  const pendingQuotesCount = quotes.filter((q) => q.status === 'pending').length;
  const podRatePercent =
    shipments.length === 0 ? 100 : Math.round((deliveredCount / shipments.length) * 100);

  return {
    totalRevenueEur,
    collectedEur,
    pendingInvoiceEur,
    deliveredCount,
    activeShipmentsCount,
    pendingQuotesCount,
    podRatePercent,
  };
}

export function generateCmrReference(trackingNumber: string): string {
  const clean = sanitizeTrackingCode(trackingNumber).replace(/^BT-/, '');
  return `CMR-${clean || '2026-000'}`;
}

export function generateDecaReference(trackingNumber: string): string {
  const clean = sanitizeTrackingCode(trackingNumber).replace(/^BT-/, '');
  return `DECA-ES-${clean || '2026-000'}`;
}

export function calculateFuelConsumptionL100(
  liters: number,
  previousKm: number,
  odometerKm: number,
): number {
  const distance = odometerKm - previousKm;
  if (distance <= 0 || liters <= 0) return 0;
  return Math.round(((liters / distance) * 100) * 10) / 10;
}

export function calculateCostPerKm(
  amountEur: number,
  previousKm: number,
  odometerKm: number,
): number {
  const distance = odometerKm - previousKm;
  if (distance <= 0 || amountEur <= 0) return 0;
  return Math.round((amountEur / distance) * 100) / 100;
}

export interface FuelMileageSummary {
  totalLiters: number;
  totalAdBlueLiters: number;
  totalFuelEur: number;
  totalDistanceKm: number;
  avgConsumptionL100: number;
  avgCostPerKm: number;
}

export function summarizeFuelAndMileage(
  logs: Array<{
    liters: number;
    amountEur: number;
    odometerKm: number;
    previousKm: number;
    adBlueLiters?: number;
  }>,
): FuelMileageSummary {
  let totalLiters = 0;
  let totalAdBlueLiters = 0;
  let totalFuelEur = 0;
  let totalDistanceKm = 0;

  for (const log of logs) {
    totalLiters += Math.max(0, Number(log.liters) || 0);
    totalAdBlueLiters += Math.max(0, Number(log.adBlueLiters) || 0);
    totalFuelEur += Math.max(0, Number(log.amountEur) || 0);
    const delta = Math.max(0, (Number(log.odometerKm) || 0) - (Number(log.previousKm) || 0));
    totalDistanceKm += delta;
  }

  return {
    totalLiters: Math.round(totalLiters * 10) / 10,
    totalAdBlueLiters: Math.round(totalAdBlueLiters * 10) / 10,
    totalFuelEur: Math.round(totalFuelEur * 100) / 100,
    totalDistanceKm: Math.round(totalDistanceKm),
    avgConsumptionL100:
      totalDistanceKm > 0 ? Math.round(((totalLiters / totalDistanceKm) * 100) * 10) / 10 : 0,
    avgCostPerKm:
      totalDistanceKm > 0 ? Math.round((totalFuelEur / totalDistanceKm) * 100) / 100 : 0,
  };
}

export interface FuelLogFormInput {
  vehiclePlate: string;
  station: string;
  liters: number;
  amountEur: number;
  previousKm: number;
  odometerKm: number;
  adBlueLiters?: number;
}

export function validateFuelLogInput(input: FuelLogFormInput): {
  valid: boolean;
  error?: string;
} {
  if (input.vehiclePlate.trim().length < 4) {
    return { valid: false, error: 'Sélectionnez un véhicule valide.' };
  }
  if (input.station.trim().length < 2 || input.station.trim().length > 120) {
    return { valid: false, error: 'Indiquez la station-service (ex. Repsol Yuncos).' };
  }
  if (!Number.isFinite(input.liters) || input.liters <= 0 || input.liters > 2000) {
    return { valid: false, error: 'Volume carburant invalide (1 à 2000 L).' };
  }
  if (!Number.isFinite(input.amountEur) || input.amountEur <= 0 || input.amountEur > 10000) {
    return { valid: false, error: 'Montant TTC invalide.' };
  }
  if (
    !Number.isFinite(input.previousKm) ||
    !Number.isFinite(input.odometerKm) ||
    input.odometerKm <= input.previousKm
  ) {
    return {
      valid: false,
      error: 'Le kilométrage actuel doit être supérieur au kilométrage précédent.',
    };
  }
  return { valid: true };
}

export const DEFAULT_SITE_CONTENT: SiteContentConfig = {
  heroBadge:
    'Base Logistique Yuncos (Tolède, Espagne) · Réseau National Espagne & International Europe',
  heroTitle: 'Votre fret routier en Espagne et dans toute l’Europe, au départ de Tolède.',
  heroDescription:
    'Basée stratégiquement à Yuncos (Tolède), BOUA TRANS assure le transport national espagnol et les liaisons routières européennes vers la France, le Portugal, le Benelux, l’Italie et l’Allemagne, avec devis instantané, suivi CMR/DECA et POD numérique.',
  bannerText:
    'Départs quotidiens Yuncos (Toledo) ↔ France, Portugal, Belgique, Pays-Bas, Italie & Allemagne · Service Express 24/48h.',
  hqAddress: 'Avenida Castilla La Mancha 122, 45210 Yuncos, Toledo, Espagne',
  hqPhone: '+34 632 60 71 01',
  hqEmail: 'bouatrans@gmail.com',
  footerNote: 'Réseau exclusif Espagne (National) & Europe (International) · Licence UE',
  updatedAt: '2026-11-15T08:00:00Z',
};

function cleanFileTitle(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, '');
  const spaced = withoutExt.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!spaced) return 'Fichier BOUA TRANS';
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function inferPublicationFromFile(
  fileMeta: { name: string; type: string; size?: number },
  preferredCategory: PublicationCategory | 'auto' = 'auto',
): {
  title: string;
  category: PublicationCategory;
  mediaPlatform: SocialMediaPlatform;
  summary: string;
  content: string;
  mediaLabel: string;
} {
  const name = fileMeta.name || 'document_bouatrans';
  const lower = name.toLowerCase();
  const mime = (fileMeta.type || '').toLowerCase();
  const baseTitle = cleanFileTitle(name).slice(0, 140);

  const isVideo =
    mime.startsWith('video/') || /\.(mp4|webm|mov|avi|mkv|ogg)$/i.test(lower);
  const isImage =
    mime.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif|avif|svg)$/i.test(lower);

  let category: PublicationCategory =
    preferredCategory !== 'auto' ? preferredCategory : 'document';

  if (preferredCategory === 'auto') {
    if (isVideo || isImage) {
      category = 'media';
    } else if (/facture|invoice|fac[-_]/i.test(lower)) {
      category = 'facture';
    } else if (/voyage|route|trajet|ligne|line[-_]/i.test(lower)) {
      category = 'voyage';
    } else if (/camion|remorque|truck|vehicule|flotte/i.test(lower)) {
      category = 'camion';
    } else if (/info|trafic|alerte|bulletin/i.test(lower)) {
      category = 'info';
    } else if (/actu|news|communique/i.test(lower)) {
      category = 'actualite';
    } else {
      category = 'document';
    }
  }

  const mediaPlatform: SocialMediaPlatform = isVideo ? 'video' : isImage ? 'image' : 'file';
  const sizeLabel = fileMeta.size ? ` (${formatFileSize(fileMeta.size)})` : '';
  const typeDesc = isVideo
    ? 'Vidéo importée'
    : isImage
    ? 'Photo importée'
    : 'Fichier / Document partagé';

  return {
    title: baseTitle,
    category,
    mediaPlatform,
    summary: `${typeDesc} · ${name}${sizeLabel}`.slice(0, 280),
    content: `${typeDesc} sans blocage via BOUA TRANS (${name}${sizeLabel}). Disponible en visualisation et téléchargement direct sur l’interface publique et l’administration.`.slice(
      0,
      2000,
    ),
    mediaLabel: name.slice(0, 140),
  };
}

export interface QuickPublicationDraft {
  title?: string;
  category?: PublicationCategory;
  summary?: string;
  content?: string;
  mediaLabel?: string;
  mediaUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  hasMediaBlob?: boolean;
}

export function normalizeQuickPublicationInput(input: QuickPublicationDraft): {
  valid: boolean;
  error?: string;
  normalized?: {
    title: string;
    category: PublicationCategory;
    summary: string;
    content: string;
    mediaLabel: string;
    mediaPlatform: SocialMediaPlatform;
  };
} {
  const titleRaw = (input.title || '').trim();
  const summaryRaw = (input.summary || '').trim();
  const contentRaw = (input.content || '').trim();
  const urlRaw = (input.mediaUrl || '').trim();
  const fileNameRaw = (input.fileName || '').trim();

  if (!titleRaw && !summaryRaw && !contentRaw && !urlRaw && !fileNameRaw && !input.hasMediaBlob) {
    return {
      valid: false,
      error: 'Choisissez un fichier, un lien vidéo/photo ou saisissez un titre pour publier.',
    };
  }

  const inferred = fileNameRaw
    ? inferPublicationFromFile(
        {
          name: fileNameRaw,
          type: input.fileMimeType || '',
          size: input.fileSizeBytes,
        },
        input.category || 'auto',
      )
    : null;

  const parsedSocial = urlRaw ? parseSocialMediaUrl(urlRaw) : null;
  const fallbackTitle =
    inferred?.title ||
    (parsedSocial && parsedSocial.platform !== 'none'
      ? `Publication ${parsedSocial.label} · BOUA TRANS`
      : contentRaw.slice(0, 60) || summaryRaw.slice(0, 60) || 'Publication BOUA TRANS');

  const finalTitle = (titleRaw || fallbackTitle).slice(0, 140);
  const finalSummary = (
    summaryRaw ||
    inferred?.summary ||
    contentRaw.slice(0, 160) ||
    `Publication ${finalTitle}`
  ).slice(0, 280);
  const finalContent = (
    contentRaw ||
    inferred?.content ||
    summaryRaw ||
    `Publication partagée par BOUA TRANS : ${finalTitle}`
  ).slice(0, 2000);

  const finalCategory: PublicationCategory =
    input.category || inferred?.category || (parsedSocial?.platform !== 'none' ? 'media' : 'actualite');

  const finalPlatform: SocialMediaPlatform =
    inferred?.mediaPlatform || parsedSocial?.platform || 'none';

  const finalLabel = (
    (input.mediaLabel || '').trim() ||
    inferred?.mediaLabel ||
    (parsedSocial && parsedSocial.platform !== 'none'
      ? `Média ${parsedSocial.label}`
      : 'BOUA TRANS Exploitation')
  ).slice(0, 140);

  return {
    valid: true,
    normalized: {
      title: finalTitle,
      category: finalCategory,
      summary: finalSummary,
      content: finalContent,
      mediaLabel: finalLabel,
      mediaPlatform: finalPlatform,
    },
  };
}

export function validatePublicationInput(input: {
  title?: string;
  summary?: string;
  content?: string;
  fileName?: string;
  mediaUrl?: string;
  hasMediaBlob?: boolean;
}): { valid: boolean; error?: string } {
  const result = normalizeQuickPublicationInput(input);
  return { valid: result.valid, error: result.error };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function buildVoyageDocumentHtml(route: RouteVoyageRecord): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(route.routeCode)}</title><style>body{font-family:system-ui,sans-serif;padding:36px;max-width:740px;margin:auto;color:#0f172a;line-height:1.6}h1{color:#0B1F3A;margin-bottom:4px}.meta{color:#475569;font-size:13px;margin-bottom:20px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:14px}</style></head><body><h1>FICHE VOYAGE · ${escapeHtml(route.routeCode)}</h1><p class="meta">BOUA TRANS SL — Avenida Castilla La Mancha 122, 45210 Yuncos (Toledo), Espagne · +34 632 60 71 01</p><table><tr><th>Type</th><td>${route.routeType === 'regular' ? 'Ligne régulière Europe' : 'Voyage ponctuel Europe'}</td></tr><tr><th>Origine</th><td>${escapeHtml(route.originCity)} (${escapeHtml(route.originCountry)})</td></tr><tr><th>Destination</th><td>${escapeHtml(route.destinationCity)} (${escapeHtml(route.destinationCountry)})</td></tr><tr><th>Distance estimée</th><td>${route.distanceKm} km</td></tr><tr><th>Planification</th><td>${escapeHtml(route.scheduleOrDate)}</td></tr><tr><th>Chauffeur</th><td>${escapeHtml(route.driverName || 'À affecter')}</td></tr><tr><th>Camion / Remorque</th><td>${escapeHtml(route.vehiclePlate || '—')} ${route.trailerPlate ? `/ ${escapeHtml(route.trailerPlate)}` : ''}</td></tr><tr><th>Statut</th><td>${escapeHtml(route.status)}</td></tr></table></body></html>`;
}

export function buildVehicleDocumentHtml(vehicle: VehicleRecord): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(vehicle.plateNumber)}</title><style>body{font-family:system-ui,sans-serif;padding:36px;max-width:740px;margin:auto;color:#0f172a;line-height:1.6}h1{color:#0B1F3A}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:14px}</style></head><body><h1>FICHE VÉHICULE · ${escapeHtml(vehicle.plateNumber)}</h1><p>BOUA TRANS SL — Parc Flotte Espagne & Europe (Yuncos, Tolède)</p><table><tr><th>Immatriculation</th><td>${escapeHtml(vehicle.plateNumber)}</td></tr><tr><th>Modèle</th><td>${escapeHtml(vehicle.model)}</td></tr><tr><th>Catégorie</th><td>${escapeHtml(getVehicleTypeLabel(vehicle.type))}</td></tr><tr><th>Capacité</th><td>${formatWeight(vehicle.capacityKg)}</td></tr><tr><th>Kilométrage</th><td>${typeof vehicle.currentKm === 'number' ? `${vehicle.currentKm.toLocaleString('fr-FR')} km` : '—'}</td></tr><tr><th>Chauffeur attitré</th><td>${escapeHtml(vehicle.assignedDriverName || 'Non affecté')}</td></tr><tr><th>Remorque attelée</th><td>${escapeHtml(vehicle.assignedTrailerPlate || 'Aucune')}</td></tr><tr><th>Prochain entretien</th><td>${escapeHtml(vehicle.nextMaintenanceDate || '—')} (${escapeHtml(vehicle.maintenanceNote || 'RAS')})</td></tr></table></body></html>`;
}

export function buildDriverDocumentHtml(driver: DriverProfile): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(driver.name)}</title><style>body{font-family:system-ui,sans-serif;padding:36px;max-width:740px;margin:auto;color:#0f172a;line-height:1.6}h1{color:#0B1F3A}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:14px}</style></head><body><h1>FICHE CHAUFFEUR · ${escapeHtml(driver.name)}</h1><p>BOUA TRANS SL — Yuncos (Toledo), Espagne</p><table><tr><th>Nom</th><td>${escapeHtml(driver.name)}</td></tr><tr><th>Téléphone</th><td>${escapeHtml(driver.phone)}</td></tr><tr><th>Qualifications</th><td>${escapeHtml(driver.licenseType)}</td></tr><tr><th>Base d’attache</th><td>${escapeHtml(driver.hubCity)}</td></tr><tr><th>Camion affecté</th><td>${escapeHtml(driver.assignedVehiclePlate || 'Aucun')}</td></tr><tr><th>Remorque affectée</th><td>${escapeHtml(driver.assignedTrailerPlate || 'Aucune')}</td></tr></table></body></html>`;
}

export function buildTransportDocHtml(docItem: TransportDocumentRecord): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(docItem.reference)}</title><style>body{font-family:system-ui,sans-serif;padding:36px;max-width:740px;margin:auto;color:#0f172a;line-height:1.6}h1{color:#0B1F3A}table{width:100%;border-collapse:collapse}td,th{border:1px solid #cbd5e1;padding:10px;text-align:left;font-size:14px}</style></head><body><h1>DOCUMENT TRANSPORT · ${escapeHtml(docItem.reference)}</h1><p>BOUA TRANS SL — Avenida Castilla La Mancha 122, Yuncos (Toledo), Espagne</p><table><tr><th>Type</th><td>${escapeHtml(docItem.docType.toUpperCase())}</td></tr><tr><th>Intitulé</th><td>${escapeHtml(docItem.title)}</td></tr><tr><th>Récépissé</th><td>${escapeHtml(docItem.linkedTrackingNumber || '—')}</td></tr><tr><th>Véhicule</th><td>${escapeHtml(docItem.vehiclePlate || '—')}</td></tr><tr><th>Échéance</th><td>${escapeHtml(docItem.expiryDate || 'Permanent')}</td></tr><tr><th>Statut</th><td>${escapeHtml(docItem.status)}</td></tr></table></body></html>`;
}

export function buildPublicationSheetHtml(pub: NewsPublication): string {
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>${escapeHtml(pub.title)}</title><style>body{font-family:system-ui,sans-serif;padding:36px;max-width:740px;margin:auto;color:#0f172a;line-height:1.6}h1{color:#0B1F3A}.tag{color:#ea580c;font-weight:700;font-size:12px;text-transform:uppercase}</style></head><body><p class="tag">BOUA TRANS · ${escapeHtml(pub.category)}</p><h1>${escapeHtml(pub.title)}</h1><p><strong>${escapeHtml(pub.summary)}</strong></p><p>${escapeHtml(pub.content)}</p>${pub.mediaUrl ? `<p>Lien média : <a href="${escapeHtml(pub.mediaUrl)}">${escapeHtml(pub.mediaUrl)}</a></p>` : ''}<hr/><p style="font-size:12px;color:#64748b">BOUA TRANS SL — Yuncos (Toledo), Espagne · +34 632 60 71 01</p></body></html>`;
}

export function triggerFileDownload(
  urlOrData: string | undefined,
  fileName: string,
  fallbackHtml?: string,
  fallbackHtmlName?: string,
): void {
  if (typeof document === 'undefined') return;

  const downloadBlob = (blob: Blob, targetName: string) => {
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = targetName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  };

  if (urlOrData && (urlOrData.startsWith('data:') || urlOrData.startsWith('blob:'))) {
    const link = document.createElement('a');
    link.href = urlOrData;
    link.download = fileName || 'fichier_bouatrans';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  if (urlOrData && (urlOrData.startsWith('/') || urlOrData.startsWith('http'))) {
    fetch(urlOrData)
      .then((res) => {
        if (!res.ok) throw new Error('Fetch failed');
        return res.blob();
      })
      .then((blob) => downloadBlob(blob, fileName || 'media_bouatrans'))
      .catch(() => {
        if (fallbackHtml) {
          downloadBlob(
            new Blob([fallbackHtml], { type: 'text/html;charset=utf-8' }),
            fallbackHtmlName || `${fileName || 'fiche'}.html`,
          );
        }
      });
    return;
  }

  if (fallbackHtml) {
    downloadBlob(
      new Blob([fallbackHtml], { type: 'text/html;charset=utf-8' }),
      fallbackHtmlName || `${fileName || 'fiche_bouatrans'}.html`,
    );
  }
}

export const CMR_PREFILLED_CARRIER = 'LASSINE Diakité';
export const CMR_CARRIER_DNI_LINE = 'DNI : ..................................';

export function createDefaultCmrData(shipment?: Partial<ShipmentRecord>): CmrDocumentData {
  const nowIso = new Date().toISOString();
  const cmrNum =
    shipment?.cmrNumber ||
    (shipment?.trackingNumber
      ? generateCmrReference(shipment.trackingNumber)
      : `CMR-2026-${Math.floor(100 + Math.random() * 899)}`);

  return {
    id: `cmr-${Date.now().toString(36)}`,
    cmrNumber: cmrNum,
    senderName: shipment?.clientName || 'AgroIbérica Distribution SL',
    senderAddress: shipment?.originCity
      ? `${shipment.originCity}, Espagne`
      : 'Yuncos (Toledo), Espagne',
    consigneeName: 'Plateforme Réception Europe',
    consigneeAddress: shipment?.destinationCity || 'Lyon Saint-Exupéry, France',
    deliveryPlace: shipment?.destinationCity || 'Lyon, France',
    pickupPlace: shipment?.originCity || 'Yuncos (Toledo), Espagne',
    pickupDate: shipment?.departureSchedule || new Date().toISOString().slice(0, 10),
    carrierName: CMR_PREFILLED_CARRIER,
    carrierDniLine: CMR_CARRIER_DNI_LINE,
    carrierPlate: shipment?.vehiclePlate || 'E-4829-LBT',
    goodsDescription: shipment?.serviceType
      ? `${getServiceLabel(shipment.serviceType)} · Fret palettisé`
      : 'Marchandises palettisées · Fret routier UE',
    packagesCount: '24 Europalettes',
    grossWeightKg: shipment?.weightKg || 1850,
    volumeM3: shipment?.volumeM3 || 11.5,
    reservations: 'RAS — Prise en charge conforme',
    instructions: 'Livraison quai destinataire · Retour CMR signé sous 48h',
    establishedAt: `Yuncos (Toledo), le ${new Date().toLocaleDateString('fr-FR')}`,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export function validateCmrInput(cmr: Partial<CmrDocumentData>): { valid: boolean; error?: string } {
  if (!cmr.cmrNumber || cmr.cmrNumber.trim().length < 3) {
    return { valid: false, error: 'Indiquez un numéro de CMR valide.' };
  }
  if (!cmr.senderName || cmr.senderName.trim().length < 2) {
    return { valid: false, error: "Indiquez le nom de l'expéditeur (Case 1)." };
  }
  if (!cmr.consigneeName || cmr.consigneeName.trim().length < 2) {
    return { valid: false, error: 'Indiquez le nom du destinataire (Case 2).' };
  }
  if (!cmr.pickupPlace || cmr.pickupPlace.trim().length < 2) {
    return { valid: false, error: 'Indiquez le lieu de prise en charge (Case 4).' };
  }
  if (!cmr.deliveryPlace || cmr.deliveryPlace.trim().length < 2) {
    return { valid: false, error: 'Indiquez le lieu de livraison (Case 3).' };
  }
  if (!cmr.carrierName || cmr.carrierName.trim().length < 2) {
    return { valid: false, error: 'Indiquez le nom du transporteur (Case 16).' };
  }
  return { valid: true };
}

export function computeFacturaLineTotal(item: FacturaLineItem): number {
  const cant = Number(String(item.cant || '').replace(',', '.'));
  const precio = Number(String(item.precioUn || '').replace(',', '.'));
  if (!Number.isFinite(cant) || !Number.isFinite(precio) || cant <= 0 || precio <= 0) {
    return 0;
  }
  return Math.round(cant * precio * 100) / 100;
}

export function computeFacturaTotals(items: FacturaLineItem[]): {
  lineTotals: number[];
  subtotal: number;
} {
  const lineTotals = items.map((item) => computeFacturaLineTotal(item));
  const subtotal = Math.round(lineTotals.reduce((acc, v) => acc + v, 0) * 100) / 100;
  return { lineTotals, subtotal };
}

export function createEmptyFacturaRows(count = 14): FacturaLineItem[] {
  return Array.from({ length: count }, (_, idx) => ({
    id: `row-${Date.now().toString(36)}-${idx}`,
    fecha: '',
    cant: '',
    concepto: '',
    precioUn: '',
  }));
}

export function createDefaultFacturaLassine(seed?: {
  invoiceNumber?: string;
  clientName?: string;
  routeLabel?: string;
  priceEur?: number;
  issueDate?: string;
}): LassineFacturaData {
  const nowIso = new Date().toISOString();
  const baseRows = createEmptyFacturaRows(14);
  if (seed?.routeLabel || seed?.priceEur) {
    baseRows[0] = {
      id: 'row-initial-1',
      fecha: seed.issueDate || new Date().toLocaleDateString('es-ES'),
      cant: '1',
      concepto: seed.routeLabel || 'Transporte nacional / internacional carretera UE',
      precioUn: seed.priceEur ? String(seed.priceEur) : '',
    };
  }

  return {
    id: `fac-lassine-${Date.now().toString(36)}`,
    issuerName: 'LASSINE DIAKITE',
    issuerNif: '',
    issuerAddressLine1: 'Avenida Castilla La Mancha 122',
    issuerAddressLine2: '45210 Yuncos (Toledo) - España',
    issuerTel: '+34 632 60 71 01',
    invoiceNumber: seed?.invoiceNumber || '',
    issueDate: seed?.issueDate || '',
    period: '',
    clientName: seed?.clientName || '',
    clientNif: '',
    clientAddress: '',
    clientCityZip: '',
    clientTel: '',
    items: baseRows,
    createdAt: nowIso,
    updatedAt: nowIso,
  };
}

export interface VoyageFormInput {
  originCity: string;
  destinationCity: string;
  scheduleOrDate: string;
  tradeType: string;
}

export function validateVoyageForm(input: VoyageFormInput): {
  valid: boolean;
  errors: Partial<Record<keyof VoyageFormInput, string>>;
  error?: string;
} {
  const errors: Partial<Record<keyof VoyageFormInput, string>> = {};
  if (!input.originCity || input.originCity.trim().length < 2) {
    errors.originCity = 'Origine obligatoire (Espagne / Europe).';
  }
  if (!input.destinationCity || input.destinationCity.trim().length < 2) {
    errors.destinationCity = 'Destination obligatoire (Espagne / Europe).';
  }
  if (!input.scheduleOrDate || input.scheduleOrDate.trim().length < 2) {
    errors.scheduleOrDate = 'Date de départ obligatoire.';
  }
  if (!input.tradeType || input.tradeType.trim().length < 2) {
    errors.tradeType = 'Type de commerce obligatoire.';
  }
  const firstError =
    errors.originCity || errors.destinationCity || errors.scheduleOrDate || errors.tradeType;
  return {
    valid: Object.keys(errors).length === 0,
    errors,
    error: firstError,
  };
}

export interface DecaFormInput {
  shipperName: string;
  shipperNif: string;
  origin: string;
  destination: string;
  goodsDescription: string;
  registrationPlate: string;
}

export function validateDecaInput(input: DecaFormInput): {
  valid: boolean;
  error?: string;
} {
  if (!input.shipperName || input.shipperName.trim().length < 2) {
    return { valid: false, error: "Indiquez le nom de l'expéditeur." };
  }
  if (!input.shipperNif || input.shipperNif.trim().length < 4) {
    return { valid: false, error: 'Indiquez un NIF / CIF valide.' };
  }
  if (!input.origin || input.origin.trim().length < 2) {
    return { valid: false, error: "Indiquez le lieu d'origine." };
  }
  if (!input.destination || input.destination.trim().length < 2) {
    return { valid: false, error: 'Indiquez la destination.' };
  }
  if (!input.goodsDescription || input.goodsDescription.trim().length < 2) {
    return { valid: false, error: 'Décrivez la nature des marchandises.' };
  }
  if (!input.registrationPlate || input.registrationPlate.trim().length < 3) {
    return { valid: false, error: "Indiquez l'enregistrement / immatriculation du véhicule." };
  }
  return { valid: true };
}

export function buildDecaPublicPdfUrl(id: string, baseOrigin?: string): string {
  const safeId = id.trim().replace(/[^a-zA-Z0-9_-]/g, '');
  const prefix = baseOrigin ? baseOrigin.replace(/\/+$/, '') : '';
  return `${prefix}/api/deca/${safeId}/pdf`;
}

export function ensureSeededDecaFallback(
  input: DecaFormInput & { id: string; reference: string; createdAt: string; publicPdfUrl: string; qrCodeDataUrl: string; weightKg?: number; driverName?: string },
): DecaRecord {
  return {
    id: input.id,
    reference: input.reference,
    shipperName: input.shipperName.trim(),
    shipperNif: input.shipperNif.trim().toUpperCase(),
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    goodsDescription: input.goodsDescription.trim(),
    registrationPlate: input.registrationPlate.trim().toUpperCase(),
    weightKg: input.weightKg,
    driverName: input.driverName,
    publicPdfUrl: input.publicPdfUrl,
    qrCodeDataUrl: input.qrCodeDataUrl,
    createdAt: input.createdAt,
  };
}

