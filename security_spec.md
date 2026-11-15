# Security Specification — BOUA TRANS Firestore Rules

## 1. Data Invariants
1. **Identity & Role Integrity**: Users cannot self-assign `admin` or `driver` roles during registration (`/users/{uid}` creation forces `role == 'client'`). Only verified admins (`isAdmin()`, bootstrapped via `bouatrans@gmail.com` with `email_verified == true` or `/admins/{uid}`) can elevate roles or write to `/admins`.
2. **PII Isolation**: User emails, phone numbers, and company names in `/users/{uid}/private/{docId}` are readable and writable only by the owner (`uid == request.auth.uid`) or an Admin. Public `/users/{uid}` stores only `displayName` and `role`.
3. **Public Tracking vs. Private Shipments**: `/publicTracking/{trackingNumber}` allows single-document `get` lookups (no `list` scraping) and contains zero PII (no names, emails, phones, prices, or signatures). Full `/shipments/{shipmentId}` records require `clientId == request.auth.uid`, `driverId == request.auth.uid`, or `isAdmin()`.
4. **Action-Based Updates & Terminal Locking**:
   - Once a `Quote` reaches `converted` or `rejected`, non-admin updates are blocked.
   - Once a `Shipment` reaches `delivered`, non-admin updates are blocked (POD cannot be overwritten by drivers or clients after completion).
   - Drivers can only update `status`, `podSignedBy`, `podSignatureData`, `podPhotoLabel`, and `updatedAt` on shipments explicitly assigned to their `driverId == request.auth.uid`.
5. **Temporal Integrity & Immutability**: `createdAt` and `clientId` are immutable after creation; `createdAt` on create and `updatedAt` on update must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Privilege Escalation on Registration**: Creating `/users/attacker` with `{ uid: "attacker", displayName: "Hack", role: "admin", createdAt: serverTimestamp, updatedAt: serverTimestamp }` -> `PERMISSION_DENIED`.
2. **Unverified Admin Email Spoof**: Accessing `/vehicles` with token `{ email: "bouatrans@gmail.com", email_verified: false }` -> `PERMISSION_DENIED`.
3. **Shadow Ghost Field on Quote Creation**: Creating `/quotes/q1` with extra `isPaid: true` field -> `PERMISSION_DENIED` (`hasOnly` check).
4. **Identity Spoofing on Quote**: Creating `/quotes/q1` as `uid_A` with `clientId: "uid_B"` -> `PERMISSION_DENIED`.
5. **Client Timestamp Forgery**: Creating `/quotes/q1` with `createdAt: "2020-01-01T00:00:00Z"` instead of `request.time` -> `PERMISSION_DENIED`.
6. **Collection Scraping on PublicTracking**: Calling `list` on `/publicTracking` -> `PERMISSION_DENIED`.
7. **PII Read Leak on Private Profile**: User A calling `get` on `/users/userB/private/info` -> `PERMISSION_DENIED`.
8. **Blanket List Scraping on Shipments**: User A calling `list` on `/shipments` without `where("clientId", "==", uid)` -> `PERMISSION_DENIED`.
9. **Unauthorized Driver POD Injection**: Driver B attempting to update `podSignedBy` on a shipment assigned to Driver A -> `PERMISSION_DENIED`.
10. **Terminal State Tampering**: Driver attempting to reopen a `delivered` shipment back to `in_transit` -> `PERMISSION_DENIED`.
11. **ID Poisoning**: Creating `/quotes/` with a 300-character invalid ID containing `$` or `/` -> `PERMISSION_DENIED`.
12. **Value Poisoning on Shipment Update**: Driver updating `podSignedBy` with a 10,000-character string or non-string number -> `PERMISSION_DENIED`.
13. **CMR & DECA Integrity**: `/cmrs/{cmrId}` and `/decas/{decaId}` enforce verified `ownerId` ownership, strict `hasAll`/`hasOnly` schemas, server-timestamp creation (`request.time`), and single-doc `get` verification on `/decas/{decaId}` without public `list` scraping.

