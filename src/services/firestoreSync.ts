import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, type User } from '../lib/firebase';
import type {
  ChatMessage,
  CmrDocumentData,
  DecaRecord,
  DriverProfile,
  FuelMileageLog,
  InvoiceRecord,
  NewsPublication,
  PublicTrackingRecord,
  QuoteRecord,
  RouteVoyageRecord,
  ShipmentRecord,
  ShipmentStatus,
  SiteContentConfig,
  TrailerRecord,
  TransportDocumentRecord,
  UserRole,
  VehicleRecord,
} from '../types/logistics';
import { BLUEPRINT_LIMITS } from '../utils/logistics';

function tsToIso(val: unknown): string {
  if (val && typeof val === 'object' && 'toDate' in val && typeof (val as Timestamp).toDate === 'function') {
    return (val as Timestamp).toDate().toISOString();
  }
  if (typeof val === 'string') return val;
  return new Date().toISOString();
}

export function isBootstrappedAdminEmail(email: string | null | undefined): boolean {
  return email?.toLowerCase() === 'bouatrans@gmail.com';
}

export async function ensureUserProfileInFirestore(user: User): Promise<UserRole> {
  const userRef = doc(db, 'users', user.uid);
  const privateRef = doc(db, 'users', user.uid, 'private', 'info');
  const assignedRole: UserRole = isBootstrappedAdminEmail(user.email) ? 'admin' : 'client';

  try {
    const existing = await getDoc(userRef);
    const safeName = (user.displayName || user.email?.split('@')[0] || 'Client Boua Trans')
      .trim()
      .slice(0, 100);

    if (!existing.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        displayName: safeName,
        role: assignedRole,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    await setDoc(
      privateRef,
      {
        uid: user.uid,
        email: (user.email || 'client@bouatrans.com').slice(0, BLUEPRINT_LIMITS.emailMax),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    if (existing.exists()) {
      const data = existing.data();
      return (data.role as UserRole) || assignedRole;
    }
    return assignedRole;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${user.uid}`);
  }
}

export async function saveQuoteToFirestore(quote: QuoteRecord, uid: string): Promise<void> {
  const path = `quotes/${quote.id}`;
  const payload: Record<string, unknown> = {
    clientId: uid,
    clientName: quote.clientName.trim().slice(0, BLUEPRINT_LIMITS.clientNameMax),
    clientEmail: quote.clientEmail.trim().slice(0, BLUEPRINT_LIMITS.emailMax),
    clientPhone: quote.clientPhone.trim().slice(0, BLUEPRINT_LIMITS.phoneMax),
    ...(quote.originCountry ? { originCountry: quote.originCountry.slice(0, 60) } : {}),
    originCity: quote.originCity.trim().slice(0, BLUEPRINT_LIMITS.cityMax),
    ...(quote.destinationCountry
      ? { destinationCountry: quote.destinationCountry.slice(0, 60) }
      : {}),
    destinationCity: quote.destinationCity.trim().slice(0, BLUEPRINT_LIMITS.cityMax),
    weightKg: Number(quote.weightKg),
    volumeM3: Number(quote.volumeM3),
    serviceType: quote.serviceType,
    estimatedPriceEur: Number(quote.estimatedPriceEur),
    distanceKm: Number(quote.distanceKm),
    status: 'pending',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (quote.notes && quote.notes.trim().length > 0) {
    payload.notes = quote.notes.trim().slice(0, BLUEPRINT_LIMITS.notesMax);
  }

  try {
    await setDoc(doc(db, 'quotes', quote.id), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function lookupPublicTrackingInFirestore(
  trackingNumber: string,
): Promise<PublicTrackingRecord | null> {
  const path = `publicTracking/${trackingNumber}`;
  try {
    const snap = await getDoc(doc(db, 'publicTracking', trackingNumber));
    if (!snap.exists()) return null;
    const d = snap.data();
    return {
      trackingNumber: String(d.trackingNumber),
      shipmentId: String(d.shipmentId),
      originCity: String(d.originCity),
      destinationCity: String(d.destinationCity),
      status: d.status as ShipmentStatus,
      serviceType: d.serviceType,
      estimatedDelivery: String(d.estimatedDelivery),
      checkpoints: Array.isArray(d.checkpoints) ? d.checkpoints.map(String) : [],
      updatedAt: tsToIso(d.updatedAt),
    };
  } catch (error) {
    console.warn(`Public tracking lookup fallback for ${path}:`, error);
    return null;
  }
}

export async function saveShipmentAndTrackingAsAdmin(
  shipment: ShipmentRecord,
): Promise<void> {
  const shipmentPath = `shipments/${shipment.id}`;
  const trackingPath = `publicTracking/${shipment.trackingNumber}`;
  try {
    await setDoc(doc(db, 'shipments', shipment.id), {
      trackingNumber: shipment.trackingNumber,
      ...(shipment.quoteId ? { quoteId: shipment.quoteId } : {}),
      clientId: shipment.clientId,
      clientName: shipment.clientName.slice(0, BLUEPRINT_LIMITS.clientNameMax),
      ...(shipment.driverId ? { driverId: shipment.driverId } : {}),
      ...(shipment.driverName ? { driverName: shipment.driverName } : {}),
      ...(shipment.vehicleId ? { vehicleId: shipment.vehicleId } : {}),
      originCity: shipment.originCity.slice(0, BLUEPRINT_LIMITS.cityMax),
      destinationCity: shipment.destinationCity.slice(0, BLUEPRINT_LIMITS.cityMax),
      weightKg: Number(shipment.weightKg),
      volumeM3: Number(shipment.volumeM3),
      serviceType: shipment.serviceType,
      priceEur: Number(shipment.priceEur),
      status: shipment.status,
      estimatedDelivery: shipment.estimatedDelivery.slice(0, 40),
      invoiceNumber: shipment.invoiceNumber.slice(0, 40),
      invoicePaid: Boolean(shipment.invoicePaid),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    await setDoc(doc(db, 'publicTracking', shipment.trackingNumber), {
      trackingNumber: shipment.trackingNumber,
      shipmentId: shipment.id,
      originCity: shipment.originCity.slice(0, BLUEPRINT_LIMITS.cityMax),
      destinationCity: shipment.destinationCity.slice(0, BLUEPRINT_LIMITS.cityMax),
      status: shipment.status,
      serviceType: shipment.serviceType,
      estimatedDelivery: shipment.estimatedDelivery.slice(0, 40),
      checkpoints: shipment.checkpoints.slice(0, 6),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${shipmentPath} & ${trackingPath}`);
  }
}

export async function updateShipmentStatusInFirestore(
  shipment: ShipmentRecord,
  updates: Partial<ShipmentRecord>,
): Promise<void> {
  const path = `shipments/${shipment.id}`;
  try {
    await updateDoc(doc(db, 'shipments', shipment.id), {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function saveVehicleInFirestore(vehicle: VehicleRecord): Promise<void> {
  const path = `vehicles/${vehicle.id}`;
  try {
    await setDoc(doc(db, 'vehicles', vehicle.id), {
      plateNumber: vehicle.plateNumber.slice(0, BLUEPRINT_LIMITS.plateMax),
      model: vehicle.model.slice(0, BLUEPRINT_LIMITS.modelMax),
      type: vehicle.type,
      capacityKg: Number(vehicle.capacityKg),
      status: vehicle.status,
      ...(vehicle.assignedDriverName
        ? { assignedDriverName: vehicle.assignedDriverName.slice(0, 100) }
        : {}),
      ...(vehicle.assignedTrailerPlate
        ? { assignedTrailerPlate: vehicle.assignedTrailerPlate.slice(0, 20) }
        : {}),
      ...(vehicle.nextMaintenanceDate
        ? { nextMaintenanceDate: vehicle.nextMaintenanceDate.slice(0, 40) }
        : {}),
      ...(vehicle.maintenanceNote
        ? { maintenanceNote: vehicle.maintenanceNote.slice(0, 200) }
        : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveTrailerInFirestore(trailer: TrailerRecord): Promise<void> {
  const path = `trailers/${trailer.id}`;
  try {
    await setDoc(doc(db, 'trailers', trailer.id), {
      plateNumber: trailer.plateNumber.slice(0, 20),
      model: trailer.model.slice(0, 80),
      trailerType: trailer.trailerType,
      capacityKg: Number(trailer.capacityKg),
      status: trailer.status,
      ...(trailer.assignedVehiclePlate
        ? { assignedVehiclePlate: trailer.assignedVehiclePlate.slice(0, 20) }
        : {}),
      ...(trailer.nextMaintenanceDate
        ? { nextMaintenanceDate: trailer.nextMaintenanceDate.slice(0, 40) }
        : {}),
      ...(trailer.maintenanceNote ? { maintenanceNote: trailer.maintenanceNote.slice(0, 200) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveDriverInFirestore(driver: DriverProfile): Promise<void> {
  const path = `drivers/${driver.id}`;
  try {
    await setDoc(doc(db, 'drivers', driver.id), {
      name: driver.name.slice(0, 100),
      phone: driver.phone.slice(0, 32),
      licenseType: driver.licenseType.slice(0, 60),
      hubCity: driver.hubCity.slice(0, 80),
      status: driver.status || 'available',
      ...(driver.assignedVehiclePlate
        ? { assignedVehiclePlate: driver.assignedVehiclePlate.slice(0, 20) }
        : {}),
      ...(driver.assignedTrailerPlate
        ? { assignedTrailerPlate: driver.assignedTrailerPlate.slice(0, 20) }
        : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveRouteInFirestore(route: RouteVoyageRecord): Promise<void> {
  const path = `routes/${route.id}`;
  try {
    await setDoc(doc(db, 'routes', route.id), {
      routeCode: route.routeCode.slice(0, 32),
      routeType: route.routeType,
      originCountry: route.originCountry.slice(0, 60),
      originCity: route.originCity.slice(0, 100),
      destinationCountry: route.destinationCountry.slice(0, 60),
      destinationCity: route.destinationCity.slice(0, 100),
      distanceKm: Number(route.distanceKm),
      scheduleOrDate: route.scheduleOrDate.slice(0, 80),
      ...(route.tradeType ? { tradeType: route.tradeType.slice(0, 100) } : {}),
      status: route.status,
      ...(route.driverName ? { driverName: route.driverName.slice(0, 100) } : {}),
      ...(route.vehiclePlate ? { vehiclePlate: route.vehiclePlate.slice(0, 20) } : {}),
      ...(route.trailerPlate ? { trailerPlate: route.trailerPlate.slice(0, 20) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveInvoiceInFirestore(invoice: InvoiceRecord): Promise<void> {
  const path = `invoices/${invoice.id}`;
  try {
    await setDoc(doc(db, 'invoices', invoice.id), {
      invoiceNumber: invoice.invoiceNumber.slice(0, 40),
      clientName: invoice.clientName.slice(0, 120),
      routeLabel: invoice.routeLabel.slice(0, 160),
      distanceKm: Number(invoice.distanceKm),
      weightKg: Number(invoice.weightKg),
      serviceType: invoice.serviceType,
      cargoClass: invoice.cargoClass,
      htAmountEur: Number(invoice.htAmountEur),
      tvaAmountEur: Number(invoice.tvaAmountEur),
      totalTtcEur: Number(invoice.totalTtcEur),
      status: invoice.status,
      issuedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveChatMessageInFirestore(
  message: ChatMessage,
  uid: string,
): Promise<void> {
  const path = `messages/${message.id}`;
  try {
    await setDoc(doc(db, 'messages', message.id), {
      threadId: message.threadId.slice(0, 128),
      senderId: uid,
      senderName: message.senderName.slice(0, 100),
      senderRole: message.senderRole,
      recipientName: message.recipientName.slice(0, 100),
      text: message.text.slice(0, 1000),
      read: Boolean(message.read),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeUserQuotes(
  uid: string,
  isAdminUser: boolean,
  onData: (quotes: QuoteRecord[]) => void,
): Unsubscribe {
  const quotesCol = collection(db, 'quotes');
  const q = isAdminUser ? quotesCol : query(quotesCol, where('clientId', '==', uid));
  const path = 'quotes';

  return onSnapshot(
    q,
    (snapshot) => {
      const list: QuoteRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          clientId: String(data.clientId),
          clientName: String(data.clientName),
          clientEmail: String(data.clientEmail),
          clientPhone: String(data.clientPhone),
          originCountry: data.originCountry ? String(data.originCountry) : undefined,
          originCity: String(data.originCity),
          destinationCountry: data.destinationCountry ? String(data.destinationCountry) : undefined,
          destinationCity: String(data.destinationCity),
          weightKg: Number(data.weightKg),
          volumeM3: Number(data.volumeM3),
          serviceType: data.serviceType,
          estimatedPriceEur: Number(data.estimatedPriceEur),
          distanceKm: Number(data.distanceKm),
          status: data.status,
          notes: data.notes ? String(data.notes) : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
          source: 'firestore',
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeUserShipments(
  uid: string,
  isAdminUser: boolean,
  onData: (shipments: ShipmentRecord[]) => void,
): Unsubscribe {
  const shipmentsCol = collection(db, 'shipments');
  const q = isAdminUser ? shipmentsCol : query(shipmentsCol, where('clientId', '==', uid));
  const path = 'shipments';

  return onSnapshot(
    q,
    (snapshot) => {
      const list: ShipmentRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          trackingNumber: String(data.trackingNumber),
          quoteId: data.quoteId ? String(data.quoteId) : undefined,
          clientId: String(data.clientId),
          clientName: String(data.clientName),
          driverId: data.driverId ? String(data.driverId) : undefined,
          driverName: data.driverName ? String(data.driverName) : undefined,
          vehicleId: data.vehicleId ? String(data.vehicleId) : undefined,
          originCity: String(data.originCity),
          destinationCity: String(data.destinationCity),
          weightKg: Number(data.weightKg),
          volumeM3: Number(data.volumeM3),
          serviceType: data.serviceType,
          priceEur: Number(data.priceEur),
          status: data.status,
          estimatedDelivery: String(data.estimatedDelivery),
          invoiceNumber: String(data.invoiceNumber),
          invoicePaid: Boolean(data.invoicePaid),
          checkpoints: ['Synchronisé Firestore'],
          podSignedBy: data.podSignedBy ? String(data.podSignedBy) : undefined,
          podSignatureData: data.podSignatureData ? String(data.podSignatureData) : undefined,
          podPhotoLabel: data.podPhotoLabel ? String(data.podPhotoLabel) : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
          source: 'firestore',
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeVehiclesAsAdmin(onData: (vehicles: VehicleRecord[]) => void): Unsubscribe {
  const path = 'vehicles';
  return onSnapshot(
    collection(db, 'vehicles'),
    (snapshot) => {
      const list: VehicleRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          plateNumber: String(data.plateNumber),
          model: String(data.model),
          type: data.type,
          capacityKg: Number(data.capacityKg),
          status: data.status,
          assignedDriverName: data.assignedDriverName
            ? String(data.assignedDriverName)
            : undefined,
          assignedTrailerPlate: data.assignedTrailerPlate
            ? String(data.assignedTrailerPlate)
            : undefined,
          nextMaintenanceDate: data.nextMaintenanceDate
            ? String(data.nextMaintenanceDate)
            : undefined,
          maintenanceNote: data.maintenanceNote ? String(data.maintenanceNote) : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeTrailersAsAdmin(onData: (trailers: TrailerRecord[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'trailers'),
    (snapshot) => {
      const list: TrailerRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          plateNumber: String(data.plateNumber),
          model: String(data.model),
          trailerType: data.trailerType,
          capacityKg: Number(data.capacityKg),
          status: data.status,
          assignedVehiclePlate: data.assignedVehiclePlate
            ? String(data.assignedVehiclePlate)
            : undefined,
          nextMaintenanceDate: data.nextMaintenanceDate
            ? String(data.nextMaintenanceDate)
            : undefined,
          maintenanceNote: data.maintenanceNote ? String(data.maintenanceNote) : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'trailers');
    },
  );
}

export function subscribeDriversAsAdmin(onData: (drivers: DriverProfile[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'drivers'),
    (snapshot) => {
      const list: DriverProfile[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: String(data.name),
          phone: String(data.phone),
          licenseType: String(data.licenseType),
          hubCity: String(data.hubCity),
          status: data.status || 'available',
          assignedVehiclePlate: data.assignedVehiclePlate
            ? String(data.assignedVehiclePlate)
            : undefined,
          assignedTrailerPlate: data.assignedTrailerPlate
            ? String(data.assignedTrailerPlate)
            : undefined,
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'drivers');
    },
  );
}

export function subscribeRoutesAsAdmin(onData: (routes: RouteVoyageRecord[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'routes'),
    (snapshot) => {
      const list: RouteVoyageRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          routeCode: String(data.routeCode),
          routeType: data.routeType,
          originCountry: String(data.originCountry),
          originCity: String(data.originCity),
          destinationCountry: String(data.destinationCountry),
          destinationCity: String(data.destinationCity),
          distanceKm: Number(data.distanceKm),
          scheduleOrDate: String(data.scheduleOrDate),
          tradeType: data.tradeType ? String(data.tradeType) : undefined,
          status: data.status,
          driverName: data.driverName ? String(data.driverName) : undefined,
          vehiclePlate: data.vehiclePlate ? String(data.vehiclePlate) : undefined,
          trailerPlate: data.trailerPlate ? String(data.trailerPlate) : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'routes');
    },
  );
}

export function subscribeInvoicesAsAdmin(onData: (invoices: InvoiceRecord[]) => void): Unsubscribe {
  return onSnapshot(
    collection(db, 'invoices'),
    (snapshot) => {
      const list: InvoiceRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          invoiceNumber: String(data.invoiceNumber),
          clientName: String(data.clientName),
          routeLabel: String(data.routeLabel),
          distanceKm: Number(data.distanceKm),
          weightKg: Number(data.weightKg),
          serviceType: data.serviceType,
          cargoClass: data.cargoClass,
          htAmountEur: Number(data.htAmountEur),
          tvaRate: 0.21,
          tvaAmountEur: Number(data.tvaAmountEur),
          totalTtcEur: Number(data.totalTtcEur),
          status: data.status,
          issuedAt: tsToIso(data.issuedAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'invoices');
    },
  );
}

export function subscribeChatMessages(
  uid: string,
  isAdminUser: boolean,
  onData: (messages: ChatMessage[]) => void,
): Unsubscribe {
  const msgCol = collection(db, 'messages');
  const q = isAdminUser ? msgCol : query(msgCol, where('senderId', '==', uid));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: ChatMessage[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          threadId: String(data.threadId),
          senderId: String(data.senderId),
          senderName: String(data.senderName),
          senderRole: data.senderRole,
          recipientName: String(data.recipientName),
          text: String(data.text),
          read: Boolean(data.read),
          createdAt: tsToIso(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, 'messages');
    },
  );
}

export async function saveTransportDocToFirestore(
  docItem: TransportDocumentRecord,
  uid: string,
): Promise<void> {
  const path = `transportDocs/${docItem.id}`;
  try {
    await setDoc(doc(db, 'transportDocs', docItem.id), {
      docType: docItem.docType,
      reference: docItem.reference.slice(0, 60),
      title: docItem.title.slice(0, 140),
      ownerId: uid,
      ...(docItem.linkedTrackingNumber
        ? { linkedTrackingNumber: docItem.linkedTrackingNumber.slice(0, 32) }
        : {}),
      ...(docItem.vehiclePlate ? { vehiclePlate: docItem.vehiclePlate.slice(0, 20) } : {}),
      status: docItem.status,
      ...(docItem.fileName ? { fileName: docItem.fileName.slice(0, 140) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function saveFuelLogToFirestore(
  log: FuelMileageLog,
  uid: string,
): Promise<void> {
  const path = `fuelLogs/${log.id}`;
  try {
    await setDoc(doc(db, 'fuelLogs', log.id), {
      vehiclePlate: log.vehiclePlate.slice(0, 20),
      driverId: uid,
      driverName: log.driverName.slice(0, 100),
      station: log.station.slice(0, 120),
      liters: Number(log.liters),
      amountEur: Number(log.amountEur),
      odometerKm: Number(log.odometerKm),
      previousKm: Number(log.previousKm),
      ...(typeof log.adBlueLiters === 'number'
        ? { adBlueLiters: Number(log.adBlueLiters) }
        : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function savePublicationToFirestore(pub: NewsPublication): Promise<void> {
  const path = `publications/${pub.id}`;
  try {
    await setDoc(doc(db, 'publications', pub.id), {
      title: pub.title.slice(0, 140),
      category: pub.category,
      summary: pub.summary.slice(0, 280),
      content: pub.content.slice(0, 2000),
      ...(pub.mediaLabel ? { mediaLabel: pub.mediaLabel.slice(0, 140) } : {}),
      ...(pub.mediaPlatform ? { mediaPlatform: pub.mediaPlatform } : {}),
      ...(pub.mediaUrl ? { mediaUrl: pub.mediaUrl.slice(0, 500) } : {}),
      ...(pub.fileName ? { fileName: pub.fileName.slice(0, 180) } : {}),
      ...(pub.fileMimeType ? { fileMimeType: pub.fileMimeType.slice(0, 120) } : {}),
      ...(typeof pub.fileSizeBytes === 'number' ? { fileSizeBytes: Number(pub.fileSizeBytes) } : {}),
      ...(pub.capturedSource ? { capturedSource: pub.capturedSource } : {}),
      ...(pub.linkedEntityType ? { linkedEntityType: pub.linkedEntityType } : {}),
      ...(pub.linkedEntityId ? { linkedEntityId: pub.linkedEntityId.slice(0, 128) } : {}),
      published: Boolean(pub.published),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveSiteContentToFirestore(content: SiteContentConfig): Promise<void> {
  const path = 'settings/siteContent';
  try {
    await setDoc(doc(db, 'settings', 'siteContent'), {
      heroBadge: content.heroBadge.slice(0, 180),
      heroTitle: content.heroTitle.slice(0, 220),
      heroDescription: content.heroDescription.slice(0, 600),
      ...(content.bannerText ? { bannerText: content.bannerText.slice(0, 280) } : {}),
      hqAddress: content.hqAddress.slice(0, 200),
      hqPhone: content.hqPhone.slice(0, 40),
      hqEmail: content.hqEmail.slice(0, 200),
      ...(content.footerNote ? { footerNote: content.footerNote.slice(0, 280) } : {}),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeSiteContent(onData: (content: SiteContentConfig) => void): Unsubscribe {
  const ref = doc(db, 'settings', 'siteContent');
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) return;
      const d = snap.data();
      onData({
        heroBadge: String(d.heroBadge || ''),
        heroTitle: String(d.heroTitle || ''),
        heroDescription: String(d.heroDescription || ''),
        bannerText: d.bannerText ? String(d.bannerText) : undefined,
        hqAddress: String(d.hqAddress || ''),
        hqPhone: String(d.hqPhone || ''),
        hqEmail: String(d.hqEmail || ''),
        footerNote: d.footerNote ? String(d.footerNote) : undefined,
        updatedAt: tsToIso(d.updatedAt),
      });
    },
    (error) => {
      console.warn('Site content subscription fallback:', error);
    },
  );
}

export function subscribeTransportDocs(
  uid: string,
  isAdminUser: boolean,
  onData: (docs: TransportDocumentRecord[]) => void,
): Unsubscribe {
  const docsCol = collection(db, 'transportDocs');
  const q = isAdminUser ? docsCol : query(docsCol, where('ownerId', '==', uid));
  const path = 'transportDocs';
  return onSnapshot(
    q,
    (snapshot) => {
      const list: TransportDocumentRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          docType: data.docType,
          reference: String(data.reference),
          title: String(data.title),
          ownerId: String(data.ownerId),
          linkedTrackingNumber: data.linkedTrackingNumber
            ? String(data.linkedTrackingNumber)
            : undefined,
          vehiclePlate: data.vehiclePlate ? String(data.vehiclePlate) : undefined,
          status: data.status,
          fileName: data.fileName ? String(data.fileName) : undefined,
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribeFuelLogs(
  uid: string,
  isAdminUser: boolean,
  onData: (logs: FuelMileageLog[]) => void,
): Unsubscribe {
  const fuelCol = collection(db, 'fuelLogs');
  const q = isAdminUser ? fuelCol : query(fuelCol, where('driverId', '==', uid));
  const path = 'fuelLogs';
  return onSnapshot(
    q,
    (snapshot) => {
      const list: FuelMileageLog[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          vehiclePlate: String(data.vehiclePlate),
          driverId: String(data.driverId),
          driverName: String(data.driverName),
          station: String(data.station),
          liters: Number(data.liters),
          amountEur: Number(data.amountEur),
          odometerKm: Number(data.odometerKm),
          previousKm: Number(data.previousKm),
          adBlueLiters:
            typeof data.adBlueLiters === 'number' ? Number(data.adBlueLiters) : undefined,
          createdAt: tsToIso(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export function subscribePublicPublications(
  onData: (pubs: NewsPublication[]) => void,
): Unsubscribe {
  const path = 'publications';
  const q = query(collection(db, 'publications'), where('published', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: NewsPublication[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: String(data.title),
          category: data.category,
          summary: String(data.summary),
          content: String(data.content),
          mediaLabel: data.mediaLabel ? String(data.mediaLabel) : undefined,
          mediaPlatform: data.mediaPlatform || 'none',
          mediaUrl: data.mediaUrl ? String(data.mediaUrl) : undefined,
          fileName: data.fileName ? String(data.fileName) : undefined,
          fileMimeType: data.fileMimeType ? String(data.fileMimeType) : undefined,
          fileSizeBytes: typeof data.fileSizeBytes === 'number' ? Number(data.fileSizeBytes) : undefined,
          capturedSource: data.capturedSource || undefined,
          linkedEntityType: data.linkedEntityType || undefined,
          linkedEntityId: data.linkedEntityId ? String(data.linkedEntityId) : undefined,
          published: Boolean(data.published),
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function saveCmrInFirestore(
  cmr: CmrDocumentData,
  uid: string,
): Promise<void> {
  const path = `cmrs/${cmr.id}`;
  try {
    await setDoc(doc(db, 'cmrs', cmr.id), {
      ownerId: uid,
      cmrNumber: cmr.cmrNumber.slice(0, 40),
      senderName: cmr.senderName.slice(0, 140),
      senderAddress: cmr.senderAddress.slice(0, 200),
      consigneeName: cmr.consigneeName.slice(0, 140),
      consigneeAddress: cmr.consigneeAddress.slice(0, 200),
      deliveryPlace: cmr.deliveryPlace.slice(0, 140),
      pickupPlace: cmr.pickupPlace.slice(0, 140),
      pickupDate: cmr.pickupDate.slice(0, 40),
      carrierName: cmr.carrierName.slice(0, 120),
      carrierDniLine: cmr.carrierDniLine.slice(0, 80),
      ...(cmr.carrierPlate ? { carrierPlate: cmr.carrierPlate.slice(0, 24) } : {}),
      goodsDescription: cmr.goodsDescription.slice(0, 280),
      packagesCount: cmr.packagesCount.slice(0, 80),
      grossWeightKg: Number(cmr.grossWeightKg),
      volumeM3: Number(cmr.volumeM3),
      ...(cmr.reservations ? { reservations: cmr.reservations.slice(0, 280) } : {}),
      ...(cmr.instructions ? { instructions: cmr.instructions.slice(0, 280) } : {}),
      ...(cmr.establishedAt ? { establishedAt: cmr.establishedAt.slice(0, 120) } : {}),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeCmrs(
  uid: string,
  isAdminUser: boolean,
  onData: (cmrs: CmrDocumentData[]) => void,
): Unsubscribe {
  const cmrsCol = collection(db, 'cmrs');
  const q = isAdminUser ? cmrsCol : query(cmrsCol, where('ownerId', '==', uid));
  const path = 'cmrs';
  return onSnapshot(
    q,
    (snapshot) => {
      const list: CmrDocumentData[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          cmrNumber: String(data.cmrNumber),
          senderName: String(data.senderName),
          senderAddress: String(data.senderAddress),
          consigneeName: String(data.consigneeName),
          consigneeAddress: String(data.consigneeAddress),
          deliveryPlace: String(data.deliveryPlace),
          pickupPlace: String(data.pickupPlace),
          pickupDate: String(data.pickupDate),
          carrierName: String(data.carrierName),
          carrierDniLine: String(data.carrierDniLine),
          carrierPlate: data.carrierPlate ? String(data.carrierPlate) : '',
          goodsDescription: String(data.goodsDescription),
          packagesCount: String(data.packagesCount),
          grossWeightKg: Number(data.grossWeightKg),
          volumeM3: Number(data.volumeM3),
          reservations: data.reservations ? String(data.reservations) : '',
          instructions: data.instructions ? String(data.instructions) : '',
          establishedAt: data.establishedAt ? String(data.establishedAt) : '',
          createdAt: tsToIso(data.createdAt),
          updatedAt: tsToIso(data.updatedAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

export async function saveDecaInFirestore(
  deca: DecaRecord,
  uid: string,
): Promise<void> {
  const path = `decas/${deca.id}`;
  try {
    await setDoc(doc(db, 'decas', deca.id), {
      ownerId: uid,
      reference: deca.reference.slice(0, 60),
      shipperName: deca.shipperName.slice(0, 140),
      shipperNif: deca.shipperNif.slice(0, 32),
      origin: deca.origin.slice(0, 140),
      destination: deca.destination.slice(0, 140),
      goodsDescription: deca.goodsDescription.slice(0, 280),
      registrationPlate: deca.registrationPlate.slice(0, 24),
      ...(typeof deca.weightKg === 'number' ? { weightKg: Number(deca.weightKg) } : {}),
      ...(deca.driverName ? { driverName: deca.driverName.slice(0, 120) } : {}),
      publicPdfUrl: deca.publicPdfUrl.slice(0, 300),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeDecas(
  uid: string,
  isAdminUser: boolean,
  onData: (decas: DecaRecord[]) => void,
): Unsubscribe {
  const decasCol = collection(db, 'decas');
  const q = isAdminUser ? decasCol : query(decasCol, where('ownerId', '==', uid));
  const path = 'decas';
  return onSnapshot(
    q,
    (snapshot) => {
      const list: DecaRecord[] = snapshot.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          reference: String(data.reference),
          shipperName: String(data.shipperName),
          shipperNif: String(data.shipperNif),
          origin: String(data.origin),
          destination: String(data.destination),
          goodsDescription: String(data.goodsDescription),
          registrationPlate: String(data.registrationPlate),
          weightKg: typeof data.weightKg === 'number' ? Number(data.weightKg) : undefined,
          driverName: data.driverName ? String(data.driverName) : undefined,
          publicPdfUrl: String(data.publicPdfUrl),
          qrCodeDataUrl: '',
          createdAt: tsToIso(data.createdAt),
        };
      });
      onData(list);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    },
  );
}

