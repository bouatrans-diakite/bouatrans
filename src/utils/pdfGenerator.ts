import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import type { CmrDocumentData, DecaRecord, LassineFacturaData } from '../types/logistics';
import {
  CMR_CARRIER_DNI_LINE,
  CMR_PREFILLED_CARRIER,
  computeFacturaLineTotal,
  computeFacturaTotals,
} from './logistics';

/**
 * Global PDF generator: converts any DOM element / component cleanly into a multi-page A4 PDF.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: '#ffffff',
    logging: false,
  });

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 8;
  const usableWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * usableWidth) / canvas.width;

  let heightLeft = imgHeight;
  let positionY = margin;

  pdf.addImage(imgData, 'PNG', margin, positionY, usableWidth, imgHeight, undefined, 'FAST');
  heightLeft -= pageHeight - margin * 2;

  while (heightLeft > 0) {
    pdf.addPage();
    positionY = margin - (imgHeight - heightLeft);
    pdf.addImage(imgData, 'PNG', margin, positionY, usableWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pageHeight - margin * 2;
  }

  const safeName = fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`;
  pdf.save(safeName);
}

/**
 * Generates an official A4 CMR PDF directly with prefilled carrier "LASSINE Diakité"
 * and literal "DNI : .................................." line.
 */
export function downloadCmrPdf(cmr: CmrDocumentData): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy: [number, number, number] = [27, 54, 93];
  const slate: [number, number, number] = [51, 65, 85];
  const border: [number, number, number] = [148, 163, 184];

  // Top Header Bar
  pdf.setFillColor(...navy);
  pdf.rect(12, 12, 186, 14, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('LETTRE DE VOITURE INTERNATIONALE · CMR', 16, 21);
  pdf.setFontSize(10);
  pdf.text(`N° ${cmr.cmrNumber}`, 194, 21, { align: 'right' });

  pdf.setTextColor(...slate);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(
    'Ce transport est soumis, nonobstant toute clause contraire, à la Convention relative au contrat de transport international de marchandises par route (CMR).',
    12,
    31,
    { maxWidth: 186 },
  );

  const drawBox = (
    x: number,
    y: number,
    w: number,
    h: number,
    title: string,
    lines: string[],
    highlight = false,
  ) => {
    pdf.setDrawColor(...border);
    pdf.setFillColor(highlight ? 255 : 255, highlight ? 247 : 255, highlight ? 245 : 255);
    pdf.rect(x, y, w, h, 'FD');

    pdf.setTextColor(...navy);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8);
    pdf.text(title, x + 3, y + 5.5);

    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9.5);
    let lineY = y + 11.5;
    for (const line of lines) {
      const wrapped = pdf.splitTextToSize(line || '—', w - 6);
      pdf.text(wrapped, x + 3, lineY);
      lineY += wrapped.length * 4.5;
    }
  };

  // Row 1: Box 1 (Expéditeur) & Box 16 (Transporteur - LASSINE Diakité + DNI : ..................................)
  drawBox(12, 38, 91, 34, '1. Expéditeur (nom, adresse, pays)', [
    cmr.senderName,
    cmr.senderAddress,
  ]);

  pdf.setDrawColor(...navy);
  pdf.setLineWidth(0.5);
  pdf.setFillColor(248, 250, 252);
  pdf.rect(107, 38, 91, 34, 'FD');
  pdf.setLineWidth(0.2);
  pdf.setTextColor(...navy);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('16. Transporteur (nom, adresse, pays)', 110, 43.5);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text(cmr.carrierName || CMR_PREFILLED_CARRIER, 110, 50.5);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.text(cmr.carrierDniLine || CMR_CARRIER_DNI_LINE, 110, 56.5);
  pdf.setFontSize(8.5);
  pdf.text('Av. Castilla La Mancha 122 · 45210 Yuncos (Toledo)', 110, 62.5);
  pdf.text(`Véhicule : ${cmr.carrierPlate || '—'} · Tél. +34 632 60 71 01`, 110, 67.5);

  // Row 2: Box 2 (Destinataire) & Box 17 (Transporteurs successifs / Références)
  drawBox(12, 75, 91, 30, '2. Destinataire (nom, adresse, pays)', [
    cmr.consigneeName,
    cmr.consigneeAddress,
  ]);
  drawBox(107, 75, 91, 30, '17. Transporteur effectif & Identification', [
    cmr.carrierName || CMR_PREFILLED_CARRIER,
    cmr.carrierDniLine || CMR_CARRIER_DNI_LINE,
    `Immatriculation : ${cmr.carrierPlate || 'À attribuer'}`,
  ]);

  // Row 3: Box 3 & Box 4
  drawBox(12, 108, 91, 24, '3. Lieu prévu pour la livraison (Arrivée)', [cmr.deliveryPlace]);
  drawBox(107, 108, 91, 24, '4. Lieu et date de prise en charge (Départ)', [
    cmr.pickupPlace,
    `Date : ${cmr.pickupDate}`,
  ]);

  // Row 4: Goods table (6-12)
  pdf.setFillColor(...navy);
  pdf.rect(12, 136, 186, 8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8);
  pdf.text('6-9. Nombre de colis & Nature de la marchandise', 15, 141.5);
  pdf.text('11. Poids brut (kg)', 142, 141.5);
  pdf.text('12. Cubage (m³)', 174, 141.5);

  pdf.setDrawColor(...border);
  pdf.setFillColor(255, 247, 245);
  pdf.rect(12, 144, 186, 36, 'FD');
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text(cmr.packagesCount || '—', 15, 151);
  pdf.text(pdf.splitTextToSize(cmr.goodsDescription || '—', 120), 15, 158);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${cmr.grossWeightKg} kg`, 144, 154);
  pdf.text(`${cmr.volumeM3} m³`, 176, 154);

  // Row 5: Instructions & Reservations
  drawBox(12, 184, 91, 28, '13. Instructions de l’expéditeur', [cmr.instructions]);
  drawBox(107, 184, 91, 28, '18. Réserves et observations du transporteur', [cmr.reservations]);

  // Row 6: Signatures (22, 23, 24)
  drawBox(12, 217, 60, 42, '22. Signature & timbre expéditeur', [
    `Établi à : ${cmr.establishedAt}`,
    '',
    'Signature :',
  ]);
  drawBox(75, 217, 60, 42, '23. Signature & timbre transporteur', [
    cmr.carrierName || CMR_PREFILLED_CARRIER,
    cmr.carrierDniLine || CMR_CARRIER_DNI_LINE,
    '',
    'Signature :',
  ]);
  drawBox(138, 217, 60, 42, '24. Marchandises reçues (Destinataire)', [
    `Lieu : ${cmr.deliveryPlace}`,
    'Date / Heure :',
    'Signature & cachet :',
  ]);

  pdf.setTextColor(100, 116, 139);
  pdf.setFontSize(8);
  pdf.text(
    'BOUA TRANS · LASSINE Diakité · Avenida Castilla La Mancha 122 · 45210 Yuncos (Toledo) - España · Tel.: +34 632 60 71 01',
    105,
    284,
    { align: 'center' },
  );

  pdf.save(`${cmr.cmrNumber || 'CMR-BOUATRANS'}.pdf`);
}

/**
 * Generates exact A4 PDF replica of the Lassine Diakite Invoice template.
 */
export function downloadFacturaLassinePdf(factura: LassineFacturaData): void {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy: [number, number, number] = [27, 54, 93];
  const cream: [number, number, number] = [255, 247, 245];
  const labelBg: [number, number, number] = [237, 242, 247];
  const lineGray: [number, number, number] = [212, 216, 224];

  // Top navy rule
  pdf.setFillColor(...navy);
  pdf.rect(14, 12, 182, 1.4, 'F');

  // Left Issuer Block
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13.5);
  pdf.text(factura.issuerName || 'LASSINE DIAKITE', 14, 24);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9.5);
  pdf.text('NIF:', 14, 30);
  pdf.setFillColor(...cream);
  pdf.rect(24, 26.2, 46, 5, 'F');
  if (factura.issuerNif) {
    pdf.text(factura.issuerNif, 25.5, 30);
  }
  pdf.text(factura.issuerAddressLine1 || 'Avenida Castilla La Mancha 122', 14, 36);
  pdf.text(factura.issuerAddressLine2 || '45210 Yuncos (Toledo) - España', 14, 41);
  pdf.text(`Tel.: ${factura.issuerTel || '+34 632 60 71 01'}`, 14, 46);

  // Right FACTURA Title & 3-row metadata table
  pdf.setTextColor(...navy);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('FACTURA', 196, 24, { align: 'right' });

  const metaRows = [
    ['Nº factura:', factura.invoiceNumber],
    ['Fecha de emisión:', factura.issueDate],
    ['Período:', factura.period],
  ];
  let metaY = 27.5;
  for (const [lbl, val] of metaRows) {
    pdf.setDrawColor(...lineGray);
    pdf.setFillColor(...labelBg);
    pdf.rect(128, metaY, 33, 6.2, 'FD');
    pdf.setFillColor(...cream);
    pdf.rect(161, metaY, 35, 6.2, 'FD');

    pdf.setTextColor(51, 65, 85);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.2);
    pdf.text(lbl, 130, metaY + 4.3);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.text(val || '', 163, metaY + 4.3);
    metaY += 6.2;
  }

  // DATOS DEL CLIENTE box
  const clientTop = 58;
  pdf.setFillColor(...navy);
  pdf.rect(14, clientTop, 94, 6.5, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.5);
  pdf.text('DATOS DEL CLIENTE', 16.5, clientTop + 4.5);

  const clientRows = [
    ['Nombre / Razón social:', factura.clientName],
    ['N.I.F. / C.I.F.:', factura.clientNif],
    ['Domicilio:', factura.clientAddress],
    ['C.P. / Localidad:', factura.clientCityZip],
    ['Tel.:', factura.clientTel],
  ];
  let cy = clientTop + 6.5;
  for (const [lbl, val] of clientRows) {
    pdf.setDrawColor(...lineGray);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(14, cy, 40, 6.4, 'FD');
    pdf.setFillColor(...cream);
    pdf.rect(54, cy, 54, 6.4, 'FD');

    pdf.setTextColor(51, 65, 85);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.text(lbl, 16, cy + 4.4);
    pdf.setTextColor(15, 23, 42);
    pdf.text(val || '', 56, cy + 4.4, { maxWidth: 50 });
    cy += 6.4;
  }

  // 5-column Items Table
  const tableTop = 104;
  const cols = [
    { label: 'FECHA', w: 24, align: 'left' as const },
    { label: 'CANT.', w: 16, align: 'center' as const },
    { label: 'CONCEPTO', w: 88, align: 'left' as const },
    { label: 'PRECIO UN.', w: 27, align: 'right' as const },
    { label: 'TOTAL', w: 27, align: 'right' as const },
  ];

  let cx = 14;
  pdf.setFillColor(...navy);
  pdf.rect(14, tableTop, 182, 6.8, 'F');
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.2);
  for (const col of cols) {
    const textX =
      col.align === 'right' ? cx + col.w - 2 : col.align === 'center' ? cx + col.w / 2 : cx + 2;
    pdf.text(col.label, textX, tableTop + 4.6, { align: col.align });
    cx += col.w;
  }

  const rowsToRender = factura.items.length >= 18 ? factura.items : [
    ...factura.items,
    ...Array.from({ length: 18 - factura.items.length }, (_, idx) => ({
      id: `pad-${idx}`,
      fecha: '',
      cant: '',
      concepto: '',
      precioUn: '',
    })),
  ].slice(0, 22);

  let ry = tableTop + 6.8;
  const rowH = 6.6;
  for (const row of rowsToRender) {
    cx = 14;
    const rowTotal = computeFacturaLineTotal(row);
    const values = [
      row.fecha,
      row.cant,
      row.concepto,
      row.precioUn ? `${row.precioUn} €` : '',
      rowTotal > 0 ? `${rowTotal.toFixed(2)} €` : '',
    ];

    for (let i = 0; i < cols.length; i += 1) {
      const col = cols[i];
      pdf.setDrawColor(...lineGray);
      pdf.setFillColor(...cream);
      pdf.rect(cx, ry, col.w, rowH, 'FD');
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', i === 4 ? 'bold' : 'normal');
      pdf.setFontSize(8.2);
      const val = values[i] || '';
      const textX =
        col.align === 'right' ? cx + col.w - 2 : col.align === 'center' ? cx + col.w / 2 : cx + 2;
      if (val) {
        pdf.text(val, textX, ry + 4.5, { align: col.align, maxWidth: col.w - 3 });
      }
      cx += col.w;
    }
    ry += rowH;
  }

  // Summary total box if any amount > 0
  const { subtotal } = computeFacturaTotals(factura.items);
  if (subtotal > 0) {
    pdf.setFillColor(...navy);
    pdf.rect(142, ry + 4, 27, 7.5, 'F');
    pdf.setDrawColor(...navy);
    pdf.setFillColor(...cream);
    pdf.rect(169, ry + 4, 27, 7.5, 'FD');

    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(8.5);
    pdf.text('TOTAL', 155.5, ry + 9, { align: 'center' });
    pdf.setTextColor(15, 23, 42);
    pdf.text(`${subtotal.toFixed(2)} €`, 194, ry + 9, { align: 'right' });
  }

  // Bottom footer matching reference image
  pdf.setDrawColor(...lineGray);
  pdf.line(14, 278, 196, 278);
  pdf.setTextColor(71, 85, 105);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.text(
    'Lassine Diakite · Avenida Castilla La Mancha 122 · 45210 Yuncos (Toledo) · Tel. +34 632 60 71 01',
    14,
    284,
  );
  pdf.text('Página 1', 196, 284, { align: 'right' });

  const fileSlug = (factura.invoiceNumber || 'Factura_Lassine_Diakite').replace(/[^a-zA-Z0-9_-]/g, '_');
  pdf.save(`${fileSlug}.pdf`);
}

/**
 * Client-side fallback DECA PDF generator embedding QR Code.
 */
export async function downloadDecaPdfClient(deca: DecaRecord): Promise<void> {
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const navy: [number, number, number] = [27, 54, 93];
  pdf.setFillColor(...navy);
  pdf.rect(14, 14, 182, 2, 'F');

  pdf.setTextColor(...navy);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(15);
  pdf.text('DOCUMENTO DE CONTROL ADMINISTRATIVO (DECA)', 14, 26);
  pdf.setFontSize(10);
  pdf.setTextColor(234, 88, 12);
  pdf.text(`BOUA TRANS · LASSINE DIAKITE · Réf. ${deca.reference}`, 14, 33);

  const rows: Array<[string, string]> = [
    ['Transporteur', 'LASSINE DIAKITE / BOUA TRANS SL (Yuncos, Toledo)'],
    ['Expéditeur', deca.shipperName],
    ['NIF / CIF', deca.shipperNif],
    ['Origine', deca.origin],
    ['Destination', deca.destination],
    ['Marchandises', deca.goodsDescription],
    ['Enregistrement', deca.registrationPlate],
    ['URL PDF Public', deca.publicPdfUrl],
  ];

  let y = 44;
  for (const [k, v] of rows) {
    pdf.setDrawColor(203, 213, 225);
    pdf.setFillColor(237, 242, 247);
    pdf.rect(14, y, 52, 10, 'FD');
    pdf.setFillColor(255, 247, 245);
    pdf.rect(66, y, 130, 10, 'FD');
    pdf.setTextColor(...navy);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text(k, 17, y + 6.5);
    pdf.setTextColor(15, 23, 42);
    pdf.setFont('helvetica', 'normal');
    pdf.text(v || '—', 69, y + 6.5, { maxWidth: 124 });
    y += 10;
  }

  const qrUrl =
    deca.qrCodeDataUrl ||
    (await QRCode.toDataURL(deca.publicPdfUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#0B1F3A', light: '#FFFFFF' },
    }));

  pdf.setDrawColor(...navy);
  pdf.rect(14, y + 10, 182, 54);
  pdf.addImage(qrUrl, 'PNG', 20, y + 14, 46, 46);
  pdf.setTextColor(...navy);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(11);
  pdf.text('CONTRÔLE ROUTIER & NUMÉRIQUE QR CODE', 72, y + 26);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(51, 65, 85);
  pdf.text(
    'Ce QR code pointe directement vers le téléchargement du DECA BOUA TRANS pour les contrôles routiers en Espagne et dans l’Union Européenne.',
    72,
    y + 34,
    { maxWidth: 118 },
  );

  pdf.save(`${deca.reference || deca.id}.pdf`);
}
