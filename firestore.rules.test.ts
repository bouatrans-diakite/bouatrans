import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rules = fs.readFileSync(path.resolve(process.cwd(), 'firestore.rules'), 'utf8');
const blueprint = JSON.parse(
  fs.readFileSync(path.resolve(process.cwd(), 'firebase-blueprint.json'), 'utf8'),
);

test('firestore.rules enforces rules_version 2 and global default-deny catch-all', () => {
  assert.match(rules, /rules_version\s*=\s*'2';/);
  assert.match(rules, /match\s*\/\{document=\*\*\}\s*\{\s*allow\s+read,\s*write:\s*if\s+false;\s*\}/);
});

test('firestore.rules covers every collection defined in firebase-blueprint.json', () => {
  const expectedMatches = [
    'match /admins/{uid}',
    'match /users/{uid}',
    'match /private/{docId}',
    'match /quotes/{quoteId}',
    'match /shipments/{shipmentId}',
    'match /publicTracking/{trackingNumber}',
    'match /vehicles/{vehicleId}',
    'match /trailers/{trailerId}',
    'match /drivers/{driverId}',
    'match /routes/{routeId}',
    'match /invoices/{invoiceId}',
    'match /messages/{messageId}',
    'match /transportDocs/{docId}',
    'match /fuelLogs/{logId}',
    'match /publications/{pubId}',
    'match /settings/{docId}',
    'match /cmrs/{cmrId}',
    'match /decas/{decaId}',
  ];
  for (const m of expectedMatches) {
    assert.ok(rules.includes(m), `Missing rules match block: ${m}`);
  }
  assert.equal(Object.keys(blueprint.firestore).length, 18);
});

test('Dirty Dozen security checks: verified email, role lock, hasOnly, terminal state lock, no blanket list', () => {
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  assert.ok(rules.includes("incoming().role == 'client' || isAdmin()"));
  assert.ok(rules.includes('isValidQuote(incoming())'));
  assert.ok(rules.includes('isValidCmrDocument(incoming())'));
  assert.ok(rules.includes('isValidDecaControl(incoming())'));
  assert.ok(rules.includes('data.keys().hasOnly(['));
  assert.ok(rules.includes('incoming().clientId == request.auth.uid'));
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));
  assert.match(rules, /match\s+\/publicTracking\/\{trackingNumber\}[\s\S]*?allow\s+list:\s+if\s+false;/);
  assert.match(rules, /match\s+\/private\/\{docId\}[\s\S]*?allow\s+list:\s+if\s+false;/);
  assert.ok(!rules.match(/allow\s+(read|list)\s*:\s*if\s+isSignedIn\(\)\s*;/));
  assert.ok(rules.includes("existing().driverId == request.auth.uid"));
  assert.ok(rules.includes("existing().status != 'delivered'"));
  assert.ok(rules.includes('isValidId('));
  assert.ok(rules.includes('isValidTrackingCode('));
  assert.ok(rules.includes('.size() <='));
});
