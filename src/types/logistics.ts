export type ServiceType = 'express' | 'standard' | 'pallet' | 'moving';

export type QuoteStatus = 'pending' | 'approved' | 'converted' | 'rejected';

export type ShipmentStatus =
  | 'pending_assignment'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered';

export type VehicleType = 'van' | 'truck_12t' | 'semi_40t';

export type VehicleStatus = 'available' | 'on_route' | 'maintenance';

export type TrailerType = 'tautliner' | 'frigo' | 'fourgon' | 'porte_conteneur';

export type UserRole = 'client' | 'driver' | 'admin';

export type ActivePortal = 'showcase' | 'client' | 'driver' | 'docs' | 'admin';

export type TransportDocType =
  | 'cmr'
  | 'deca'
  | 'facture'
  | 'travel_doc'
  | 'repostaje_ticket';

export type TransportDocStatus = 'valid' | 'expiring' | 'archived';

export type PublicationCategory =
  | 'actualite'
  | 'info'
  | 'media'
  | 'document'
  | 'facture'
  | 'voyage'
  | 'camion';

export type SocialMediaPlatform =
  | 'none'
  | 'youtube'
  | 'facebook'
  | 'tiktok'
  | 'instagram'
  | 'twitter'
  | 'video'
  | 'image'
  | 'file';

export type FreightCargoClass = 'general' | 'palletized' | 'refrigerated' | 'industrial' | 'moving';

export interface QuoteRecord {
  id: string;
  clientId: string;
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
  estimatedPriceEur: number;
  distanceKm: number;
  status: QuoteStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  source?: 'local' | 'firestore';
}

export interface ShipmentRecord {
  id: string;
  trackingNumber: string;
  quoteId?: string;
  clientId: string;
  clientName: string;
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  trailerId?: string;
  trailerPlate?: string;
  originCity: string;
  destinationCity: string;
  weightKg: number;
  volumeM3: number;
  serviceType: ServiceType;
  priceEur: number;
  status: ShipmentStatus;
  departureSchedule?: string;
  estimatedDelivery: string;
  invoiceNumber: string;
  invoicePaid: boolean;
  cmrNumber?: string;
  decaNumber?: string;
  checkpoints: string[];
  podSignedBy?: string;
  podSignatureData?: string;
  podPhotoLabel?: string;
  podDeliveredAt?: string;
  createdAt: string;
  updatedAt: string;
  source?: 'local' | 'firestore';
}

export interface PublicTrackingRecord {
  trackingNumber: string;
  shipmentId: string;
  originCity: string;
  destinationCity: string;
  status: ShipmentStatus;
  serviceType: ServiceType;
  estimatedDelivery: string;
  checkpoints: string[];
  updatedAt: string;
}

export interface VehicleRecord {
  id: string;
  plateNumber: string;
  model: string;
  type: VehicleType;
  capacityKg: number;
  currentKm?: number;
  status: VehicleStatus;
  assignedDriverId?: string;
  assignedDriverName?: string;
  assignedTrailerId?: string;
  assignedTrailerPlate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  maintenanceNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TrailerRecord {
  id: string;
  plateNumber: string;
  model: string;
  trailerType: TrailerType;
  capacityKg: number;
  status: VehicleStatus;
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  nextMaintenanceDate?: string;
  maintenanceNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DriverProfile {
  id: string;
  name: string;
  phone: string;
  licenseType: string;
  hubCity: string;
  status?: 'available' | 'on_route' | 'rest';
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  assignedTrailerId?: string;
  assignedTrailerPlate?: string;
}

export interface RouteVoyageRecord {
  id: string;
  routeCode: string;
  routeType: 'regular' | 'punctual';
  originCountry: string;
  originCity: string;
  destinationCountry: string;
  destinationCity: string;
  distanceKm: number;
  scheduleOrDate: string;
  tradeType?: string;
  status: 'planned' | 'in_progress' | 'completed' | 'delayed';
  driverId?: string;
  driverName?: string;
  vehicleId?: string;
  vehiclePlate?: string;
  trailerId?: string;
  trailerPlate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  clientName: string;
  routeLabel: string;
  distanceKm: number;
  weightKg: number;
  serviceType: ServiceType;
  cargoClass: FreightCargoClass;
  htAmountEur: number;
  tvaRate: number;
  tvaAmountEur: number;
  totalTtcEur: number;
  status: 'pending' | 'paid';
  linkedShipmentId?: string;
  issuedAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  senderRole: 'admin' | 'driver' | 'partner';
  recipientName: string;
  text: string;
  createdAt: string;
  read: boolean;
}

export interface AppNotification {
  id: string;
  type: 'message' | 'trip_status';
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
}

export interface TransportDocumentRecord {
  id: string;
  docType: TransportDocType;
  reference: string;
  title: string;
  ownerId: string;
  ownerName?: string;
  linkedTrackingNumber?: string;
  vehiclePlate?: string;
  expiryDate?: string;
  status: TransportDocStatus;
  fileName?: string;
  previewDataUrl?: string;
  scanFilter?: 'enhanced' | 'original';
  barcodeValue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface FuelMileageLog {
  id: string;
  vehiclePlate: string;
  driverId: string;
  driverName: string;
  station: string;
  liters: number;
  amountEur: number;
  odometerKm: number;
  previousKm: number;
  adBlueLiters?: number;
  receiptScanName?: string;
  createdAt: string;
}

export interface NewsPublication {
  id: string;
  title: string;
  category: PublicationCategory;
  summary: string;
  content: string;
  mediaLabel?: string;
  mediaPlatform?: SocialMediaPlatform;
  mediaUrl?: string;
  mediaPreviewData?: string;
  videoPreviewData?: string;
  fileDataUrl?: string;
  fileName?: string;
  fileMimeType?: string;
  fileSizeBytes?: number;
  capturedSource?: 'upload' | 'camera_photo' | 'camera_video' | 'social' | 'entity';
  linkedEntityType?: 'voyage' | 'camion' | 'chauffeur' | 'facture' | 'document';
  linkedEntityId?: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CapturedMediaItem {
  id: string;
  kind: 'photo' | 'video' | 'document';
  title: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  dataUrl: string;
  source: 'camera_photo' | 'camera_video' | 'upload';
  publishedToShowcase: boolean;
  linkedPubId?: string;
  createdAt: string;
}

export interface SiteContentConfig {
  heroBadge: string;
  heroTitle: string;
  heroDescription: string;
  bannerText?: string;
  hqAddress: string;
  hqPhone: string;
  hqEmail: string;
  footerNote?: string;
  updatedAt: string;
}

export interface QuoteCalculationInput {
  originCity: string;
  destinationCity: string;
  weightKg: number;
  volumeM3: number;
  serviceType: ServiceType;
}

export interface QuoteCalculationResult {
  distanceKm: number;
  estimatedPriceEur: number;
  estimatedTransitHours: number;
  recommendedVehicle: VehicleType;
}

export interface CmrDocumentData {
  id: string;
  cmrNumber: string;
  senderName: string;
  senderAddress: string;
  consigneeName: string;
  consigneeAddress: string;
  deliveryPlace: string;
  pickupPlace: string;
  pickupDate: string;
  carrierName: string;
  carrierDniLine: string;
  carrierPlate: string;
  goodsDescription: string;
  packagesCount: string;
  grossWeightKg: number;
  volumeM3: number;
  reservations: string;
  instructions: string;
  establishedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface FacturaLineItem {
  id: string;
  fecha: string;
  cant: string;
  concepto: string;
  precioUn: string;
}

export interface LassineFacturaData {
  id: string;
  issuerName: string;
  issuerNif: string;
  issuerAddressLine1: string;
  issuerAddressLine2: string;
  issuerTel: string;
  invoiceNumber: string;
  issueDate: string;
  period: string;
  clientName: string;
  clientNif: string;
  clientAddress: string;
  clientCityZip: string;
  clientTel: string;
  items: FacturaLineItem[];
  createdAt: string;
  updatedAt: string;
}

export interface DecaRecord {
  id: string;
  reference: string;
  shipperName: string;
  shipperNif: string;
  origin: string;
  destination: string;
  goodsDescription: string;
  registrationPlate: string;
  weightKg?: number;
  driverName?: string;
  publicPdfUrl: string;
  qrCodeDataUrl: string;
  createdAt: string;
}

