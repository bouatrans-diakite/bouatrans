import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCostPerKm,
  calculateDynamicQuote,
  calculateFuelConsumptionL100,
  calculateInvoiceBreakdown,
  computeFinancialSummary,
  estimateRouteDistanceKm,
  EUROPEAN_COUNTRIES,
  generateCmrReference,
  generateDecaReference,
  isAllowedEuropeanCountry,
  parseSocialMediaUrl,
  sanitizeTrackingCode,
  summarizeFuelAndMileage,
  validateEuropeanPhone,
  validateFuelLogInput,
  validatePublicationInput,
  validateQuoteInput,
} from './logistics';
import type { QuoteRecord, ShipmentRecord } from '../types/logistics';

test('estimateRouteDistanceKm computes realistic Madrid to Paris road distance', () => {
  const km = estimateRouteDistanceKm('Madrid', 'Paris');
  assert.ok(km >= 1150 && km <= 1450, `Expected 1150-1450 km, got ${km}`);
});

test('EUROPEAN_COUNTRIES restricts destinations strictly to Spain and Europe (zero Africa)', () => {
  const names = EUROPEAN_COUNTRIES.map((c) => c.name);
  assert.ok(names.includes('Espagne (National)'));
  assert.ok(names.includes('France'));
  assert.ok(names.includes('Allemagne'));
  assert.equal(isAllowedEuropeanCountry('Espagne (National)'), true);
  assert.equal(isAllowedEuropeanCountry('Maroc'), false);
  assert.equal(isAllowedEuropeanCountry('Algérie'), false);
  assert.equal(isAllowedEuropeanCountry('Tunisie'), false);
});

test('validateEuropeanPhone accepts European prefixes and rejects non-European prefixes', () => {
  assert.equal(validateEuropeanPhone('+34 632 60 71 01'), true);
  assert.equal(validateEuropeanPhone('+33 6 12 34 56 78'), true);
  assert.equal(validateEuropeanPhone('0032 2 555 12 34'), true);
  assert.equal(validateEuropeanPhone('+49 170 1234567'), true);
  assert.equal(validateEuropeanPhone('+212 6 12 34 56 78'), false);
  assert.equal(validateEuropeanPhone('+213 555 12 34 56'), false);
  assert.equal(validateEuropeanPhone('12'), false);
});

test('parseSocialMediaUrl extracts embeds for YouTube, Facebook, TikTok, Instagram, and Twitter/X', () => {
  const yt = parseSocialMediaUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  assert.equal(yt.platform, 'youtube');
  assert.equal(yt.embedUrl, 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');

  const tt = parseSocialMediaUrl('https://www.tiktok.com/@bouatrans/video/7312345678901234567');
  assert.equal(tt.platform, 'tiktok');
  assert.equal(tt.embedUrl, 'https://www.tiktok.com/embed/v2/7312345678901234567');

  const ig = parseSocialMediaUrl('https://www.instagram.com/reel/C5AbCdEfGhI/');
  assert.equal(ig.platform, 'instagram');
  assert.equal(ig.embedUrl, 'https://www.instagram.com/p/C5AbCdEfGhI/embed');

  const fb = parseSocialMediaUrl('https://www.facebook.com/bouatrans/videos/1234567890/');
  assert.equal(fb.platform, 'facebook');
  assert.ok(fb.embedUrl?.includes('facebook.com/plugins/video.php'));

  const tw = parseSocialMediaUrl('https://x.com/bouatrans/status/1850000000000000000');
  assert.equal(tw.platform, 'twitter');
  assert.equal(tw.embedUrl, 'https://platform.twitter.com/embed/Tweet.html?id=1850000000000000000');
});

test('calculateInvoiceBreakdown computes HT, 21% TVA, and TTC deterministically', () => {
  const inv = calculateInvoiceBreakdown({
    distanceKm: 1000,
    weightKg: 10000,
    serviceType: 'standard',
    cargoClass: 'general',
  });
  // (1000*1.05 + 10*18 + 55) * 1.0 = 1285 HT, TVA 21% = 269.85, TTC = 1554.85
  assert.equal(inv.htAmountEur, 1285);
  assert.equal(inv.tvaAmountEur, 269.85);
  assert.equal(inv.totalTtcEur, 1554.85);
});

test('calculateDynamicQuote scales price with service type and weight', () => {
  const standard = calculateDynamicQuote({
    originCity: 'Yuncos (Toledo)',
    destinationCity: 'Lyon',
    weightKg: 800,
    volumeM3: 4,
    serviceType: 'standard',
  });
  const express = calculateDynamicQuote({
    originCity: 'Yuncos (Toledo)',
    destinationCity: 'Lyon',
    weightKg: 800,
    volumeM3: 4,
    serviceType: 'express',
  });

  assert.ok(express.estimatedPriceEur > standard.estimatedPriceEur);
  assert.ok(express.estimatedTransitHours < standard.estimatedTransitHours);
  assert.equal(standard.recommendedVehicle, 'van');

  const heavy = calculateDynamicQuote({
    originCity: 'Valence',
    destinationCity: 'Bruxelles',
    weightKg: 18000,
    volumeM3: 65,
    serviceType: 'standard',
  });
  assert.equal(heavy.recommendedVehicle, 'semi_40t');
});

test('validateQuoteInput rejects non-EU phone / country and accepts valid European input', () => {
  const invalid = validateQuoteInput({
    clientName: 'A',
    clientEmail: 'not-an-email',
    clientPhone: '+212 6 12 34 56 78',
    originCountry: 'Maroc',
    originCity: '',
    destinationCountry: 'France',
    destinationCity: 'Paris',
    weightKg: 0,
    volumeM3: 200,
    serviceType: 'express',
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.clientName);
  assert.ok(invalid.errors.clientEmail);
  assert.ok(invalid.errors.clientPhone);
  assert.ok(invalid.errors.originCountry);
  assert.ok(invalid.errors.originCity);
  assert.ok(invalid.errors.weightKg);
  assert.ok(invalid.errors.volumeM3);

  const valid = validateQuoteInput({
    clientName: 'Logistique Ibérique SARL',
    clientEmail: 'dispatch@iberique.fr',
    clientPhone: '+34 632 60 71 01',
    originCountry: 'Espagne (National)',
    originCity: 'Yuncos (Toledo)',
    destinationCountry: 'France',
    destinationCity: 'Paris',
    weightKg: 1200,
    volumeM3: 6,
    serviceType: 'express',
  });
  assert.equal(valid.valid, true);
  assert.deepEqual(valid.errors, {});
});

test('sanitizeTrackingCode strips unsafe characters and normalizes uppercase', () => {
  assert.equal(sanitizeTrackingCode('  bt-2026-841$ '), 'BT-2026-841');
});

test('computeFinancialSummary totals revenue, collected invoices, and active counts accurately', () => {
  const shipments: ShipmentRecord[] = [
    {
      id: 's1',
      trackingNumber: 'BT-1',
      clientId: 'c1',
      clientName: 'Client A',
      originCity: 'Madrid',
      destinationCity: 'Paris',
      weightKg: 500,
      volumeM3: 3,
      serviceType: 'express',
      priceEur: 1200,
      status: 'delivered',
      estimatedDelivery: '2026-11-15',
      invoiceNumber: 'FAC-1',
      invoicePaid: true,
      checkpoints: ['Livré'],
      createdAt: '2026-11-10',
      updatedAt: '2026-11-15',
    },
    {
      id: 's2',
      trackingNumber: 'BT-2',
      clientId: 'c1',
      clientName: 'Client B',
      originCity: 'Lyon',
      destinationCity: 'Barcelone',
      weightKg: 1000,
      volumeM3: 5,
      serviceType: 'standard',
      priceEur: 800,
      status: 'in_transit',
      estimatedDelivery: '2026-11-16',
      invoiceNumber: 'FAC-2',
      invoicePaid: false,
      checkpoints: ['En transit'],
      createdAt: '2026-11-14',
      updatedAt: '2026-11-15',
    },
  ];
  const quotes: QuoteRecord[] = [
    {
      id: 'q1',
      clientId: 'c1',
      clientName: 'Client C',
      clientEmail: 'c@example.com',
      clientPhone: '+33600000000',
      originCity: 'Madrid',
      destinationCity: 'Lyon',
      weightKg: 400,
      volumeM3: 2,
      serviceType: 'pallet',
      estimatedPriceEur: 650,
      distanceKm: 1200,
      status: 'pending',
      createdAt: '2026-11-15',
      updatedAt: '2026-11-15',
    },
  ];

  const summary = computeFinancialSummary(shipments, quotes);
  assert.equal(summary.totalRevenueEur, 2000);
  assert.equal(summary.collectedEur, 1200);
  assert.equal(summary.pendingInvoiceEur, 800);
  assert.equal(summary.deliveredCount, 1);
  assert.equal(summary.activeShipmentsCount, 1);
  assert.equal(summary.pendingQuotesCount, 1);
  assert.equal(summary.podRatePercent, 50);
});

test('CMR and DECA references derive deterministically from tracking numbers', () => {
  assert.equal(generateCmrReference('BT-2026-841'), 'CMR-2026-841');
  assert.equal(generateDecaReference('BT-2026-841'), 'DECA-ES-2026-841');
});

test('fuel consumption, cost per km, and fleet mileage summary calculate accurately', () => {
  assert.equal(calculateFuelConsumptionL100(300, 100000, 101000), 30);
  assert.equal(calculateCostPerKm(450, 100000, 101000), 0.45);
  assert.equal(calculateFuelConsumptionL100(100, 500, 500), 0);

  const summary = summarizeFuelAndMileage([
    { liters: 300, amountEur: 450, previousKm: 100000, odometerKm: 101000, adBlueLiters: 25 },
    { liters: 150, amountEur: 225, previousKm: 200000, odometerKm: 200500, adBlueLiters: 10 },
  ]);
  assert.equal(summary.totalLiters, 450);
  assert.equal(summary.totalAdBlueLiters, 35);
  assert.equal(summary.totalFuelEur, 675);
  assert.equal(summary.totalDistanceKm, 1500);
  assert.equal(summary.avgConsumptionL100, 30);
  assert.equal(summary.avgCostPerKm, 0.45);
});

test('validateFuelLogInput and validatePublicationInput enforce boundaries', () => {
  assert.equal(
    validateFuelLogInput({
      vehiclePlate: 'E-4829-LBT',
      station: 'Repsol Yuncos',
      liters: 250,
      amountEur: 390,
      previousKm: 142000,
      odometerKm: 141000,
    }).valid,
    false,
  );
  assert.equal(
    validateFuelLogInput({
      vehiclePlate: 'E-4829-LBT',
      station: 'Repsol Yuncos',
      liters: 250,
      amountEur: 390,
      previousKm: 141000,
      odometerKm: 141850,
    }).valid,
    true,
  );
  // Completely empty submission fails
  assert.equal(
    validatePublicationInput({
      title: '',
      summary: '',
      content: '',
    }).valid,
    false,
  );
  // File-only submission without title/summary/content succeeds immediately (no obstacle)
  assert.equal(
    validatePublicationInput({
      fileName: 'convoi_yuncos_lyon.mp4',
    }).valid,
    true,
  );
  // Normal text submission succeeds
  assert.equal(
    validatePublicationInput({
      title: 'Nouvelle liaison express Tolède - Lyon',
      summary: 'Départ quotidien à 06h00 depuis notre quai de Yuncos.',
      content: 'BOUA TRANS renforce sa ligne directe Espagne - Rhône-Alpes avec deux semi-remorques supplémentaires.',
    }).valid,
    true,
  );
});

import {
  buildVehicleDocumentHtml,
  buildVoyageDocumentHtml,
  DEFAULT_SITE_CONTENT,
  inferPublicationFromFile,
  normalizeQuickPublicationInput,
} from './logistics';

test('inferPublicationFromFile and normalizeQuickPublicationInput support zero-obstacle file-only publishing', () => {
  const img = inferPublicationFromFile({ name: 'camion_yuncos_40t.jpg', type: 'image/jpeg', size: 120400 });
  assert.equal(img.category, 'media');
  assert.equal(img.mediaPlatform, 'image');
  assert.equal(img.title, 'Camion yuncos 40t');

  const vid = inferPublicationFromFile({ name: 'trajet_madrid_paris.mp4', type: 'video/mp4', size: 4200000 });
  assert.equal(vid.category, 'media');
  assert.equal(vid.mediaPlatform, 'video');

  const inv = inferPublicationFromFile({ name: 'FAC-2026-0841.pdf', type: 'application/pdf', size: 54000 });
  assert.equal(inv.category, 'facture');
  assert.equal(inv.mediaPlatform, 'file');

  const normalized = normalizeQuickPublicationInput({
    fileName: 'route_lyon_milan.pdf',
    fileMimeType: 'application/pdf',
    hasMediaBlob: true,
  });
  assert.equal(normalized.valid, true);
  assert.equal(normalized.normalized?.category, 'voyage');
  assert.ok((normalized.normalized?.title.length || 0) > 3);
  assert.ok((normalized.normalized?.content.length || 0) > 10);
});

test('buildVoyageDocumentHtml and buildVehicleDocumentHtml escape HTML and include Yuncos HQ metadata', () => {
  const voyageHtml = buildVoyageDocumentHtml({
    id: 'rte-test',
    routeCode: 'LINE-ES-FR-01',
    routeType: 'regular',
    originCountry: 'Espagne (National)',
    originCity: 'Yuncos (Toledo)',
    destinationCountry: 'France',
    destinationCity: 'Lyon',
    distanceKm: 1125,
    scheduleOrDate: 'Quotidien 06:15',
    status: 'in_progress',
    driverName: 'Karim <Bouazza>',
    vehiclePlate: 'E-4829-LBT',
    createdAt: '2026-11-15T06:00:00Z',
    updatedAt: '2026-11-15T06:00:00Z',
  });
  assert.ok(voyageHtml.includes('LINE-ES-FR-01'));
  assert.ok(voyageHtml.includes('Karim &lt;Bouazza&gt;'));

  const vehicleHtml = buildVehicleDocumentHtml({
    id: 'veh-test',
    plateNumber: 'E-4829-LBT',
    model: 'Renault T-High 520',
    type: 'semi_40t',
    capacityKg: 24000,
    status: 'on_route',
    createdAt: '2026-11-15T06:00:00Z',
    updatedAt: '2026-11-15T06:00:00Z',
  });
  assert.ok(vehicleHtml.includes('E-4829-LBT'));
  assert.ok(DEFAULT_SITE_CONTENT.hqAddress.includes('Yuncos'));
});

import {
  buildDecaPublicPdfUrl,
  CMR_CARRIER_DNI_LINE,
  CMR_PREFILLED_CARRIER,
  computeFacturaLineTotal,
  computeFacturaTotals,
  createDefaultCmrData,
  createDefaultFacturaLassine,
  validateCmrInput,
  validateDecaInput,
  validateVoyageForm,
} from './logistics';

test('CMR defaults prefill LASSINE Diakité and blank DNI line, and validateCmrInput checks required fields', () => {
  const cmr = createDefaultCmrData({ trackingNumber: 'BT-2026-999', originCity: 'Yuncos', destinationCity: 'Lyon' });
  assert.equal(cmr.carrierName, 'LASSINE Diakité');
  assert.equal(cmr.carrierName, CMR_PREFILLED_CARRIER);
  assert.equal(cmr.carrierDniLine, 'DNI : ..................................');
  assert.equal(cmr.carrierDniLine, CMR_CARRIER_DNI_LINE);
  assert.equal(validateCmrInput(cmr).valid, true);
  assert.equal(validateCmrInput({ ...cmr, carrierName: '' }).valid, false);
  assert.equal(validateCmrInput({ ...cmr, senderName: '' }).valid, false);
});

test('Factura Lassine calculations handle decimal commas and prefill exact Yuncos issuer metadata', () => {
  const fac = createDefaultFacturaLassine({
    invoiceNumber: '2026-088',
    clientName: 'Transportes Ibéricos SA',
    routeLabel: 'Yuncos -> Paris',
    priceEur: 1450,
  });
  assert.equal(fac.issuerName, 'LASSINE DIAKITE');
  assert.equal(fac.issuerAddressLine1, 'Avenida Castilla La Mancha 122');
  assert.equal(fac.issuerAddressLine2, '45210 Yuncos (Toledo) - España');
  assert.equal(fac.issuerTel, '+34 632 60 71 01');

  assert.equal(
    computeFacturaLineTotal({ id: '1', fecha: '15/11/2026', cant: '2,5', concepto: 'Palettes', precioUn: '400' }),
    1000,
  );
  const totals = computeFacturaTotals([
    { id: '1', fecha: '15/11/2026', cant: '2', concepto: 'A', precioUn: '450,50' },
    { id: '2', fecha: '15/11/2026', cant: '1', concepto: 'B', precioUn: '99' },
  ]);
  assert.deepEqual(totals.lineTotals, [901, 99]);
  assert.equal(totals.subtotal, 1000);
});

test('validateVoyageForm enforces all 4 mandatory fields: Origine, Destination, Date de départ, Type de commerce', () => {
  const missing = validateVoyageForm({
    originCity: 'Yuncos',
    destinationCity: '',
    scheduleOrDate: '',
    tradeType: '',
  });
  assert.equal(missing.valid, false);
  assert.ok(missing.errors.destinationCity);
  assert.ok(missing.errors.scheduleOrDate);
  assert.ok(missing.errors.tradeType);

  const ok = validateVoyageForm({
    originCity: 'Yuncos (Toledo)',
    destinationCity: 'Lyon',
    scheduleOrDate: '2026-11-18 06:00',
    tradeType: 'Fret palettisé agroalimentaire',
  });
  assert.equal(ok.valid, true);
  assert.deepEqual(ok.errors, {});
});

test('validateDecaInput and buildDecaPublicPdfUrl validate required DECA fields and clean URLs', () => {
  assert.equal(
    validateDecaInput({
      shipperName: 'Ibérica',
      shipperNif: 'B12',
      origin: 'Yuncos',
      destination: 'Madrid',
      goodsDescription: 'Palettes',
      registrationPlate: 'E-4829-LBT',
    }).valid,
    false,
  );
  assert.equal(
    validateDecaInput({
      shipperName: 'AgroIbérica SL',
      shipperNif: 'B45123456',
      origin: 'Yuncos (Toledo)',
      destination: 'Barcelone',
      goodsDescription: '24 Palettes industrielles',
      registrationPlate: 'E-4829-LBT',
    }).valid,
    true,
  );
  assert.equal(
    buildDecaPublicPdfUrl('deca-bt-841$!', 'https://bouatrans.example.com/'),
    'https://bouatrans.example.com/api/deca/deca-bt-841/pdf',
  );
});
