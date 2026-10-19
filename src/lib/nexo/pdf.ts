import { qrPayload, money, labelGrid, LETTER_MM } from "./money";
import type { SaleDoc } from "./types";

async function qrData(text: string) {
  const QR = await import("qrcode");
  return QR.toDataURL(text, { margin: 0, width: 512, errorCorrectionLevel: "M" });
}

export async function downloadPdf(build: () => Promise<Blob>, filename: string) {
  const blob = await build();
  const file = new File([blob], filename, { type: "application/pdf" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return;
    } catch {
      /* user cancelled or share failed — fall through to download */
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function paintLogo(doc: import("jspdf").jsPDF, logo: string | null, x: number, y: number, size: number) {
  if (!logo) return false;
  const format = logo.startsWith("data:image/png") ? "PNG" : logo.startsWith("data:image/jpeg") || logo.startsWith("data:image/jpg") ? "JPEG" : null;
  if (!format) return false;
  try {
    doc.addImage(logo, format, x, y, size, size);
    return true;
  } catch {
    return false;
  }
}

function methodLabel(method: string) {
  if (method === "cash") return "Efectivo";
  if (method === "transfer") return "Transferencia";
  if (method === "card") return "Tarjeta";
  if (method === "credit") return "Fiado";
  return method;
}

export async function invoiceBlob(sale: SaleDoc, format: "58" | "80" | "letter") {
  const { jsPDF } = await import("jspdf");
  const currency = sale.business.currency;
  const qr = await qrData(`nexo:v:${sale.id}`);
  if (format === "letter") {
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const hasLogo = paintLogo(doc, sale.business.logo, 16, 12, 16);
    const textX = hasLogo ? 36 : 16;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(sale.business.name, textX, 18);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text([sale.business.address, sale.business.phone, sale.business.taxId].filter(Boolean), textX, 26);
    doc.setFont("helvetica", "bold");
    doc.text(sale.kind === "return" ? "NOTA DE CRÉDITO" : "COMPROBANTE", 200, 18, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(sale.number, 200, 24, { align: "right" });
    doc.text(new Date(sale.createdAt).toLocaleString("es-NI"), 200, 30, { align: "right" });
    doc.text(`Cliente: ${sale.customerName}`, 16, 48);
    doc.text(`Atendió: ${sale.cashierName}`, 16, 54);
    let y = 66;
    doc.setFont("helvetica", "bold");
    doc.text("Cant.", 16, y);
    doc.text("Descripción", 32, y);
    doc.text("Importe", 200, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 6;
    for (const item of sale.items) {
      doc.text(String(item.qty), 16, y);
      doc.text(item.name.slice(0, 48), 32, y);
      doc.text(money(item.lineTotalCents, currency), 200, y, { align: "right" });
      y += 6;
      if (y > 250) {
        doc.addPage();
        y = 20;
      }
    }
    y += 4;
    const rows = [
      ["Subtotal", sale.subtotalCents],
      ["Descuento", sale.discountCents],
      ["Impuesto", sale.taxCents],
      ["Total", sale.totalCents],
    ] as const;
    for (const [label, amount] of rows) {
      doc.text(label, 140, y);
      doc.text(money(amount, currency), 200, y, { align: "right" });
      y += 6;
    }
    for (const pay of sale.payments) {
      doc.text(`${methodLabel(pay.method)}${pay.status === "pending" ? " (pendiente)" : ""}`, 16, y);
      doc.text(money(pay.amountCents, currency), 80, y);
      y += 6;
    }
    if (sale.changeCents > 0) {
      doc.text(`Recibido ${money(sale.cashTenderedCents, currency)} · Cambio ${money(sale.changeCents, currency)}`, 16, y);
      y += 8;
    }
    doc.addImage(qr, "PNG", 16, y, 28, 28);
    doc.setFontSize(8);
    doc.text("Comprobante interno. No es factura fiscal electrónica de la DGI.", 48, y + 10);
    doc.text("El código consulta esta venta dentro de NEXO POS.", 48, y + 15);
    return doc.output("blob");
  }
  const width = format === "58" ? 58 : 80;
  const withLogo = Boolean(sale.business.logo);
  const height = (withLogo ? 108 : 90) + sale.items.length * 8 + sale.payments.length * 6;
  const doc = new jsPDF({ unit: "mm", format: [width, height] });
  let y = 8;
  if (paintLogo(doc, sale.business.logo, (width - 16) / 2, y, 16)) y += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(sale.business.name, width / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  for (const line of [sale.business.address, sale.business.phone, sale.business.taxId].filter(Boolean)) {
    doc.text(line, width / 2, y, { align: "center" });
    y += 4;
  }
  doc.text(sale.number, width / 2, y, { align: "center" });
  y += 4;
  doc.text(new Date(sale.createdAt).toLocaleString("es-NI"), width / 2, y, { align: "center" });
  y += 5;
  doc.text(sale.customerName, 4, y);
  y += 5;
  for (const item of sale.items) {
    doc.text(`${item.qty} ${item.name}`.slice(0, 32), 4, y);
    y += 4;
    doc.text(money(item.lineTotalCents, currency), width - 4, y, { align: "right" });
    y += 4;
  }
  doc.setFont("helvetica", "bold");
  doc.text(`Total ${money(sale.totalCents, currency)}`, width / 2, y, { align: "center" });
  y += 5;
  doc.setFont("helvetica", "normal");
  for (const pay of sale.payments) {
    doc.text(`${methodLabel(pay.method)} ${money(pay.amountCents, currency)}`, 4, y);
    y += 4;
  }
  if (sale.changeCents > 0) {
    doc.text(`Cambio ${money(sale.changeCents, currency)}`, 4, y);
    y += 4;
  }
  doc.addImage(qr, "PNG", (width - 24) / 2, y, 24, 24);
  y += 28;
  doc.setFontSize(7);
  doc.text("Comprobante interno, no fiscal.", width / 2, y, { align: "center" });
  return doc.output("blob");
}

export type LabelOptions = {
  businessName: string;
  currency: string;
  cols: number;
  rows: number;
  marginMm: number;
  gapX: number;
  gapY: number;
  showPhoto: boolean;
  showName: boolean;
  showPrice: boolean;
  showQr: boolean;
  showBarcode: boolean;
  showBusiness: boolean;
  copies: number;
  products: { id: string; name: string; priceCents: number; photo: string | null; barcode: string }[];
};

export async function labelsBlob(options: LabelOptions) {
  const { jsPDF } = await import("jspdf");
  const JsBarcode = (await import("jsbarcode")).default;
  const grid = labelGrid(options);
  const slots = options.products.flatMap((product) => Array.from({ length: options.copies }, () => product));
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  let page = 0;
  for (let index = 0; index < slots.length; index += 1) {
    const cellIndex = index % grid.cells.length;
    if (index > 0 && cellIndex === 0) {
      doc.addPage();
      page += 1;
    }
    const cell = grid.cells[cellIndex];
    const product = slots[index];
    doc.setDrawColor(180);
    doc.rect(cell.x, cell.y, cell.w, cell.h);
    let cursor = cell.y + 3;
    if (options.showBusiness) {
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.text(options.businessName.slice(0, 28), cell.x + cell.w / 2, cursor, { align: "center" });
      cursor += 3.5;
    }
    const hasPhoto = options.showPhoto && Boolean(product.photo?.startsWith("data:image/"));
    const visualSize = Math.min(cell.w * (hasPhoto && options.showQr ? 0.34 : 0.44), cell.h * 0.44, 22);
    if (options.showQr || hasPhoto) {
      if (hasPhoto && product.photo) {
        try {
          const photoX = options.showQr ? cell.x + cell.w / 2 - visualSize - 2 : cell.x + (cell.w - visualSize) / 2;
          doc.addImage(product.photo, photoX, cursor, visualSize, visualSize);
        } catch {
          // An unreadable image must not prevent printing the QR label.
        }
      }
      if (options.showQr) {
        const image = await qrData(qrPayload(product.id));
        const qrX = hasPhoto ? cell.x + cell.w / 2 + 2 : cell.x + (cell.w - visualSize) / 2;
        doc.addImage(image, "PNG", qrX, cursor, visualSize, visualSize);
      }
      cursor += visualSize + 1.5;
    }
    if (options.showName) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(product.name.slice(0, 32), cell.x + cell.w / 2, cursor, { align: "center", maxWidth: cell.w - 3 });
      cursor += 4;
    }
    if (options.showPrice) {
      doc.setFontSize(11);
      doc.text(money(product.priceCents, options.currency), cell.x + cell.w / 2, cursor + 1, { align: "center" });
      cursor += 5;
    }
    if (options.showBarcode && product.barcode && cursor < cell.y + cell.h - 8) {
      try {
        const canvas = document.createElement("canvas");
        JsBarcode(canvas, product.barcode, { format: "CODE128", displayValue: false, margin: 0, height: 24 });
        doc.addImage(canvas.toDataURL("image/png"), "PNG", cell.x + 2, cursor, cell.w - 4, 7);
      } catch {
        /* skip invalid barcode */
      }
    }
    void page;
    void LETTER_MM;
  }
  if (!slots.length) {
    doc.setFontSize(12);
    doc.text("Seleccione productos para imprimir.", 20, 20);
  }
  return doc.output("blob");
}
