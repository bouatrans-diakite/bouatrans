import express, { type Request, type Response } from 'express';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { createServer as createViteServer } from 'vite';

interface DecaServerRecord {
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
  createdAt: string;
  publicPdfUrl: string;
  qrCodeDataUrl: string;
  pdfFileName: string;
}

const PORT = Number(process.env.PORT) || 3000;
const STORAGE_DIR = path.resolve(process.cwd(), '.deca-storage');
const INDEX_FILE = path.join(STORAGE_DIR, 'deca-index.json');

fs.mkdirSync(STORAGE_DIR, { recursive: true });

function loadDecaIndex(): DecaServerRecord[] {
  try {
    if (fs.existsSync(INDEX_FILE)) {
      const raw = fs.readFileSync(INDEX_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as DecaServerRecord[];
      }
    }
  } catch (err) {
    console.warn('DECA index read fallback:', err);
  }
  return [];
}

function saveDecaIndex(items: DecaServerRecord[]): void {
  fs.writeFileSync(INDEX_FILE, JSON.stringify(items, null, 2), 'utf8');
}

function resolveBaseUrl(req?: Request): string {
  const envUrl = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (envUrl && envUrl !== 'MY_APP_URL') {
    return envUrl;
  }
  if (req) {
    const forwardedProto = req.get('x-forwarded-proto');
    const proto = forwardedProto ? forwardedProto.split(',')[0].trim() : req.protocol || 'http';
    const host = req.get('x-forwarded-host') || req.get('host') || `localhost:${PORT}`;
    return `${proto}://${host}`;
  }
  return `http://localhost:${PORT}`;
}

async function buildDecaPdfBuffer(record: DecaServerRecord, qrPngBuffer: Buffer): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 42,
      info: {
        Title: `DECA ${record.reference} - BOUA TRANS`,
        Author: 'LASSINE DIAKITE / BOUA TRANS SL',
      },
    });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', (err) => reject(err));

    const navy = '#1B365D';
    const orange = '#EA580C';
    const slate = '#334155';
    const muted = '#64748B';

    // Top rule
    doc.rect(42, 42, 511, 4).fill(navy);

    // Header
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(16).text('BOUA TRANS · LASSINE DIAKITE', 42, 60);
    doc
      .fillColor(slate)
      .font('Helvetica')
      .fontSize(9.5)
      .text('Avenida Castilla La Mancha 122 · 45210 Yuncos (Toledo) - España', 42, 82)
      .text('Tel.: +34 632 60 71 01 · bouatrans@gmail.com', 42, 95);

    doc.fillColor(navy).font('Helvetica-Bold').fontSize(15).text('DOCUMENTO DE CONTROL (DECA)', 310, 60, {
      align: 'right',
      width: 243,
    });
    doc
      .fillColor(orange)
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('Orden FOM/2861/2012 · Transporte por Carretera', 310, 82, {
        align: 'right',
        width: 243,
      });

    // Reference Box
    doc.roundedRect(42, 122, 511, 56, 4).fillAndStroke('#F8FAFC', '#CBD5E1');
    doc.fillColor(navy).font('Helvetica-Bold').fontSize(11).text(`Référence DECA : ${record.reference}`, 56, 134);
    doc
      .fillColor(slate)
      .font('Helvetica')
      .fontSize(9.5)
      .text(`Date d'émission : ${new Date(record.createdAt).toLocaleString('fr-FR')}`, 56, 154)
      .text(`Identifiant contrôle : ${record.id}`, 320, 154, { align: 'right', width: 218 });

    // Transporteur & Expéditeur
    let y = 198;
    const drawRow = (label: string, value: string) => {
      doc.rect(42, y, 175, 28).fillAndStroke('#EDF2F7', '#CBD5E1');
      doc.rect(217, y, 336, 28).fillAndStroke('#FFF7F5', '#CBD5E1');
      doc.fillColor(navy).font('Helvetica-Bold').fontSize(9.5).text(label, 52, y + 9, { width: 155 });
      doc.fillColor('#0F172A').font('Helvetica').fontSize(10).text(value || '—', 227, y + 9, { width: 316 });
      y += 28;
    };

    drawRow('Transporteur effectif', 'LASSINE DIAKITE / BOUA TRANS SL (Yuncos, Toledo)');
    drawRow('Expéditeur / Cargador', record.shipperName);
    drawRow('NIF / CIF Expéditeur', record.shipperNif);
    drawRow('Lieu de prise en charge (Origine)', record.origin);
    drawRow('Lieu de livraison (Destination)', record.destination);
    drawRow('Nature des marchandises', record.goodsDescription);
    drawRow('Enregistrement / Immatriculation', record.registrationPlate);
    drawRow('Masse brute / Conducteur', `${record.weightKg ? `${record.weightKg} kg` : 'N/D'} · ${record.driverName || 'Équipe BOUA TRANS'}`);

    // QR Code roadside inspection box
    y += 24;
    doc.roundedRect(42, y, 511, 165, 6).fillAndStroke('#FFFFFF', navy);
    doc.image(qrPngBuffer, 58, y + 18, { width: 128, height: 128 });

    doc
      .fillColor(navy)
      .font('Helvetica-Bold')
      .fontSize(12)
      .text('CONTRÔLE ROUTIER & NUMÉRIQUE PAR CODE QR', 205, y + 26, { width: 332 });
    doc
      .fillColor(slate)
      .font('Helvetica')
      .fontSize(9.5)
      .text(
        'Scannez ce code QR lors des contrôles routiers en Espagne et dans l’Union Européenne pour télécharger directement l’exemplaire PDF authentifié sur le serveur BOUA TRANS.',
        205,
        y + 48,
        { width: 332, lineGap: 3 },
      );

    doc
      .fillColor(muted)
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .text('URL publique de téléchargement PDF :', 205, y + 104, { width: 332 });
    doc
      .fillColor(orange)
      .font('Helvetica')
      .fontSize(8.5)
      .text(record.publicPdfUrl, 205, y + 118, { width: 332 });

    // Footer
    doc
      .fillColor(muted)
      .font('Helvetica')
      .fontSize(8.5)
      .text(
        'BOUA TRANS · Lassine Diakité · Avenida Castilla La Mancha 122 · 45210 Yuncos (Toledo) · Tel. +34 632 60 71 01',
        42,
        772,
        { align: 'center', width: 511 },
      );

    doc.end();
  });
}

async function createAndStoreDeca(
  input: {
    id?: string;
    reference?: string;
    shipperName: string;
    shipperNif: string;
    origin: string;
    destination: string;
    goodsDescription: string;
    registrationPlate: string;
    weightKg?: number;
    driverName?: string;
    createdAt?: string;
  },
  baseUrl: string,
): Promise<DecaServerRecord> {
  const safeId =
    input.id && /^[a-zA-Z0-9_-]+$/.test(input.id)
      ? input.id
      : `deca-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  const reference =
    input.reference?.trim() || `DECA-ES-${new Date().getFullYear()}-${safeId.slice(-4).toUpperCase()}`;
  const publicPdfUrl = `${baseUrl}/api/deca/${safeId}/pdf`;

  const qrCodeDataUrl = await QRCode.toDataURL(publicPdfUrl, {
    width: 320,
    margin: 2,
    color: { dark: '#0B1F3A', light: '#FFFFFF' },
  });
  const qrPngBuffer = await QRCode.toBuffer(publicPdfUrl, {
    width: 320,
    margin: 2,
    color: { dark: '#0B1F3A', light: '#FFFFFF' },
  });

  const pdfFileName = `${safeId}.pdf`;
  const record: DecaServerRecord = {
    id: safeId,
    reference,
    shipperName: input.shipperName.trim(),
    shipperNif: input.shipperNif.trim().toUpperCase(),
    origin: input.origin.trim(),
    destination: input.destination.trim(),
    goodsDescription: input.goodsDescription.trim(),
    registrationPlate: input.registrationPlate.trim().toUpperCase(),
    weightKg: input.weightKg,
    driverName: input.driverName?.trim(),
    createdAt: input.createdAt || new Date().toISOString(),
    publicPdfUrl,
    qrCodeDataUrl,
    pdfFileName,
  };

  const pdfBuffer = await buildDecaPdfBuffer(record, qrPngBuffer);
  fs.writeFileSync(path.join(STORAGE_DIR, pdfFileName), pdfBuffer);

  const current = loadDecaIndex().filter((item) => item.id !== record.id);
  saveDecaIndex([record, ...current]);
  return record;
}

async function ensureSeedDecas(): Promise<void> {
  const existing = loadDecaIndex();
  const baseUrl = resolveBaseUrl();
  const seeds = [
    {
      id: 'deca-bt-841',
      reference: 'DECA-ES-2026-841',
      shipperName: 'AgroIbérica Distribution SL',
      shipperNif: 'B45901234',
      origin: 'Yuncos (Toledo), Espagne',
      destination: 'Lyon Saint-Exupéry, France',
      goodsDescription: '24 Palettes agroalimentaires filmées · Lot BT-2026-841',
      registrationPlate: 'E-4829-LBT / R-3812-BCT',
      weightKg: 1850,
      driverName: 'Karim Bouazza',
      createdAt: '2026-11-15T06:05:00Z',
    },
    {
      id: 'deca-bt-842',
      reference: 'DECA-ES-2026-842',
      shipperName: 'Maison Valéry Mobilier',
      shipperNif: 'B28774190',
      origin: 'Madrid, Espagne',
      destination: 'Paris Rungis, France',
      goodsDescription: '4 Europalettes mobilier manufacturé',
      registrationPlate: 'E-9104-MTR',
      weightKg: 620,
      driverName: 'Mateo García',
      createdAt: '2026-11-15T08:00:00Z',
    },
  ];

  for (const seed of seeds) {
    const alreadyExists = existing.some((item) => item.id === seed.id);
    const pdfExists = fs.existsSync(path.join(STORAGE_DIR, `${seed.id}.pdf`));
    if (!alreadyExists || !pdfExists) {
      await createAndStoreDeca(seed, baseUrl);
    }
  }
}

async function startServer() {
  await ensureSeedDecas();

  const app = express();
  app.set('trust proxy', true);
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'bouatrans-deca-api' });
  });

  app.get('/api/deca', (req: Request, res: Response) => {
    const baseUrl = resolveBaseUrl(req);
    const items = loadDecaIndex().map((item) => ({
      ...item,
      publicPdfUrl: `${baseUrl}/api/deca/${item.id}/pdf`,
    }));
    res.json({ items });
  });

  app.post('/api/deca/generate', async (req: Request, res: Response) => {
    try {
      const body = (req.body || {}) as Record<string, unknown>;
      const shipperName = String(body.shipperName || '').trim();
      const shipperNif = String(body.shipperNif || '').trim();
      const origin = String(body.origin || '').trim();
      const destination = String(body.destination || '').trim();
      const goodsDescription = String(body.goodsDescription || '').trim();
      const registrationPlate = String(body.registrationPlate || '').trim();

      if (
        shipperName.length < 2 ||
        shipperNif.length < 4 ||
        origin.length < 2 ||
        destination.length < 2 ||
        goodsDescription.length < 2 ||
        registrationPlate.length < 3
      ) {
        res.status(400).json({
          error:
            'Champs obligatoires manquants : Expéditeur, NIF, Origine, Destination, Marchandises et Enregistrement.',
        });
        return;
      }

      const baseUrl = resolveBaseUrl(req);
      const record = await createAndStoreDeca(
        {
          id: typeof body.id === 'string' ? body.id : undefined,
          reference: typeof body.reference === 'string' ? body.reference : undefined,
          shipperName,
          shipperNif,
          origin,
          destination,
          goodsDescription,
          registrationPlate,
          weightKg: typeof body.weightKg === 'number' ? body.weightKg : Number(body.weightKg) || undefined,
          driverName: typeof body.driverName === 'string' ? body.driverName : undefined,
        },
        baseUrl,
      );

      res.status(201).json({ deca: record });
    } catch (err) {
      console.error('DECA generate error:', err);
      res.status(500).json({ error: 'Impossible de générer le document DECA PDF.' });
    }
  });

  app.get('/api/deca/:id/pdf', async (req: Request, res: Response) => {
    const id = String(req.params.id || '');
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
      res.status(400).json({ error: 'Identifiant DECA invalide.' });
      return;
    }

    const pdfPath = path.join(STORAGE_DIR, `${id}.pdf`);
    if (fs.existsSync(pdfPath)) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="DECA-${id}.pdf"`);
      fs.createReadStream(pdfPath).pipe(res);
      return;
    }

    const item = loadDecaIndex().find((d) => d.id === id);
    if (!item) {
      res.status(404).json({ error: 'Document DECA introuvable.' });
      return;
    }

    try {
      const baseUrl = resolveBaseUrl(req);
      const refreshedUrl = `${baseUrl}/api/deca/${item.id}/pdf`;
      const qrPngBuffer = await QRCode.toBuffer(refreshedUrl, {
        width: 320,
        margin: 2,
        color: { dark: '#0B1F3A', light: '#FFFFFF' },
      });
      const pdfBuffer = await buildDecaPdfBuffer({ ...item, publicPdfUrl: refreshedUrl }, qrPngBuffer);
      fs.writeFileSync(pdfPath, pdfBuffer);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="DECA-${id}.pdf"`);
      res.send(pdfBuffer);
    } catch (err) {
      console.error('DECA PDF recovery error:', err);
      res.status(500).json({ error: 'Erreur lors de la récupération du PDF DECA.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BOUA TRANS server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
