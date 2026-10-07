import { jsPDF } from 'jspdf';

interface ReceiptData {
  receiptCode: string;
  date: string;
  memberName: string;
  documentId: string;
  planName: string;
  method: string;
  amount: string | number;
  gymName?: string;
}

const METHOD_LABEL: Record<string, string> = {
  CASH: 'Efectivo',
  TRANSFER: 'Transferencia',
  CARD: 'Tarjeta',
  DIGITAL_WALLET: 'Billetera digital',
};

/** Dibuja el encabezado con logo vectorial (estrella + gorila simplificado) y datos del gimnasio. */
function drawHeader(doc: jsPDF, gymName: string) {
  const x = 105;
  // Estrella dorada
  doc.setFillColor(212, 175, 55);
  doc.triangle(x, 18, x - 2.2, 22.5, x - 6.5, 23.1, 'F');
  doc.triangle(x, 18, x + 2.2, 22.5, x + 6.5, 23.1, 'F');
  doc.triangle(x - 7.4, 25.2, x - 2.9, 25.2, x - 4.6, 30.2, 'F');
  doc.triangle(x + 7.4, 25.2, x + 2.9, 25.2, x + 4.6, 30.2, 'F');
  doc.triangle(x - 7.4, 25.2, x + 7.4, 25.2, x, 34.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(20);
  doc.text('NEW START GYM', x, 42, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.setFontSize(9);
  doc.text('Comprobante de pago', x, 48, { align: 'center' });
  doc.text(gymName, x, 53, { align: 'center' });
}

export function generateReceiptPdf(data: ReceiptData): void {
  const doc = new jsPDF({ unit: 'mm', format: [80, 140] }); // ticket 80mm
  const gymName = data.gymName ?? 'NEW START GYM';

  drawHeader(doc, gymName);

  let y = 62;
  const row = (label: string, value: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.setFontSize(8.5);
    doc.text(label, 10, y);
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(value, 70, y, { align: 'right' });
    y += 6.5;
  };

  doc.setDrawColor(212, 175, 55);
  doc.setLineWidth(0.4);
  doc.line(10, y - 3, 70, y - 3);

  row('Comprobante', data.receiptCode);
  row('Fecha', data.date);
  row('Socio', data.memberName);
  row('Documento', data.documentId);
  row('Concepto', data.planName);
  row('Método', METHOD_LABEL[data.method] ?? data.method);

  y += 2;
  doc.setFillColor(10, 10, 10);
  doc.roundedRect(10, y, 60, 11, 1.5, 1.5, 'F');
  doc.setTextColor(212, 175, 55);
  doc.setFontSize(12);
  doc.text('TOTAL', 14, y + 7);
  doc.text(`Bs ${Number(data.amount).toFixed(2)}`, 66, y + 7, { align: 'right' });

  y += 18;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(140, 140, 140);
  doc.text('¡Gracias por entrenar con nosotros!', 40, y, { align: 'center' });
  doc.text('Conservá este comprobante.', 40, y + 4, { align: 'center' });

  doc.save(`recibo-${data.receiptCode}.pdf`);
}
