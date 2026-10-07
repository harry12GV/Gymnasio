import { jsPDF } from 'jspdf';

/**
 * Dibuja la marca de agua del logo (estrella dorada) en el centro del canvas del QR.
 * Cuando el cliente entregue el logo en PNG, se puede reemplazar por:
 *   img.src = '/assets/logo/logo-mark.png'
 */
export function drawWatermark(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const size = canvas.width;
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.09; // radio de la marca

  // Fondo blanco redondeado para que el QR siga siendo escaneable
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
  ctx.beginPath();
  ctx.roundRect(cx - r * 1.4, cy - r * 1.4, r * 2.8, r * 2.8, r * 0.5);
  ctx.fill();

  // Estrella dorada de 5 puntas
  ctx.fillStyle = '#D4AF37';
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + radius * Math.cos(angle);
    const py = cy + radius * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

interface CredentialData {
  memberName: string;
  documentId: string;
  qrToken: string;
  planName: string;
  endDate: string;
}

/** Plantilla compartida: dibuja una credencial en la página actual del documento. */
function drawCredentialPage(doc: jsPDF, qrDataUrl: string, opts: CredentialData): void {
  const { memberName, documentId, qrToken, planName, endDate } = opts;

  // Encabezado
  doc.setFillColor(10, 10, 10);
  doc.rect(0, 0, 80, 26, 'F');
  doc.setFillColor(212, 175, 55);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(15);
  doc.text('NEW START GYM', 40, 12, { align: 'center' });
  doc.setFontSize(8);
  doc.setTextColor(255, 215, 0);
  doc.text('CREDENCIAL DE ACCESO', 40, 19, { align: 'center' });

  // QR
  doc.addImage(qrDataUrl, 'PNG', 17, 32, 46, 46, undefined, 'FAST');

  // Datos
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(memberName, 40, 84, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(110, 110, 110);
  doc.text(`DNI ${documentId}`, 40, 89, { align: 'center' });
  doc.text(`${planName} — vence ${endDate}`, 40, 94, { align: 'center' });

  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text('Presentá este código en la entrada', 40, 103, { align: 'center' });
  doc.text(`ID: ${qrToken.slice(0, 16)}`, 40, 108, { align: 'center' });
}

/**
 * Descarga la credencial del socio en PDF: QR con marca de agua + datos.
 */
export function downloadQrCredential(opts: CredentialData & { canvas: HTMLCanvasElement }): void {
  const { canvas, ...data } = opts;
  const qrData = canvas.toDataURL('image/png');

  const doc = new jsPDF({ unit: 'mm', format: [80, 120] });
  drawCredentialPage(doc, qrData, data);
  doc.save(`credencial-qr-${data.documentId}.pdf`);
}

/**
 * Genera credenciales por lote en un solo PDF (una credencial por página 80×120mm).
 * Los canvases de los QR se renderizan en la página que invoca (ocultos) y se pasan ya listos.
 */
export function downloadQrCredentialsBatch(
  items: (CredentialData & { canvas: HTMLCanvasElement })[]
): void {
  if (items.length === 0) return;

  const doc = new jsPDF({ unit: 'mm', format: [80, 120] });

  items.forEach((it, i) => {
    if (i > 0) doc.addPage([80, 120], 'portrait');
    drawCredentialPage(doc, it.canvas.toDataURL('image/png'), it);
  });

  doc.save(`credenciales-${items.length}-socios.pdf`);
}
