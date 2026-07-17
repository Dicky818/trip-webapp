/**
 * Travel Booklet PDF Export
 * Generates a comprehensive travel booklet with itinerary, expenses, and trip details.
 * Dynamically loads Noto Sans TC font for CJK character support.
 */
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Trip, Expense, ItineraryItem, Flight, Accommodation, TripMember, Settlement } from '../api/supabaseApi';

interface ExportData {
  trip: Trip;
  expenses: Expense[];
  itinerary: ItineraryItem[];
  flights: Flight[];
  accommodations: Accommodation[];
  members: TripMember[];
  settlement: Settlement | null;
}

// Cache the font data so we only fetch once per session
let cachedFontBase64: string | null = null;

/**
 * Load the Noto Sans TC subset font for CJK support.
 * The font is fetched from the public/fonts directory on-demand.
 */
async function loadCJKFont(): Promise<string> {
  if (cachedFontBase64) return cachedFontBase64;

  // Determine base path (GitHub Pages uses /trip-webapp/ prefix)
  const basePath = import.meta.env.BASE_URL || '/';
  const fontUrl = `${basePath}fonts/NotoSansTC-subset.ttf`;

  const response = await fetch(fontUrl);
  if (!response.ok) {
    throw new Error(`Failed to load CJK font: ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  // Convert ArrayBuffer to base64 string
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  cachedFontBase64 = btoa(binary);
  return cachedFontBase64;
}

/**
 * Register the CJK font with a jsPDF document instance.
 */
function registerCJKFont(doc: jsPDF, fontBase64: string): void {
  doc.addFileToVFS('NotoSansTC-subset.ttf', fontBase64);
  doc.addFont('NotoSansTC-subset.ttf', 'NotoSansTC', 'normal');
  // Register same font as 'bold' since autoTable uses bold for headers by default
  doc.addFont('NotoSansTC-subset.ttf', 'NotoSansTC', 'bold');
}

// Helper: format currency amount
function formatAmount(amount: string | number, currency: string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '-';
  return `${currency} ${num.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Helper: format date
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' });
  } catch {
    return dateStr;
  }
}

export async function generateTravelBooklet(data: ExportData): Promise<void> {
  const { trip, expenses, itinerary, flights, accommodations, members, settlement } = data;

  // Load CJK font first
  const fontBase64 = await loadCJKFont();

  // Create PDF - A4 size
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Register and set CJK font
  registerCJKFont(doc, fontBase64);
  doc.setFont('NotoSansTC');

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // ═══════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════
  doc.setFillColor(30, 64, 175); // blue-800
  doc.rect(0, 0, pageWidth, pageHeight, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('NotoSansTC', 'normal');
  doc.setFontSize(32);
  doc.text(trip.Trip_Name, pageWidth / 2, pageHeight / 3, { align: 'center' });

  doc.setFontSize(14);
  doc.text(`${formatDate(trip.Start_Date)} ~ ${formatDate(trip.End_Date)}`, pageWidth / 2, pageHeight / 3 + 15, { align: 'center' });

  doc.setFontSize(11);
  const memberNames = members.map(m => m.Member_Name).join(' / ');
  doc.text(memberNames, pageWidth / 2, pageHeight / 3 + 30, { align: 'center' });

  doc.setFontSize(9);
  doc.setTextColor(180, 200, 255);
  doc.text(`Base Currency: ${trip.Base_Currency}`, pageWidth / 2, pageHeight - 30, { align: 'center' });
  doc.text(`Generated: ${new Date().toLocaleDateString('zh-TW')}`, pageWidth / 2, pageHeight - 22, { align: 'center' });

  // ═══════════════════════════════════════════
  // ITINERARY SECTION
  // ═══════════════════════════════════════════
  doc.addPage();
  y = margin;
  doc.setTextColor(30, 64, 175);
  doc.setFont('NotoSansTC', 'normal');
  doc.setFontSize(20);
  doc.text('行程表 Itinerary', margin, y);
  y += 12;

  // Group itinerary by day
  const dayGroups: Record<number, ItineraryItem[]> = {};
  itinerary.forEach(item => {
    const day = Number(item.Day_Number);
    if (!dayGroups[day]) dayGroups[day] = [];
    dayGroups[day].push(item);
  });

  const sortedDays = Object.keys(dayGroups).map(Number).sort((a, b) => a - b);

  for (const dayNum of sortedDays) {
    const items = dayGroups[dayNum].sort((a, b) => Number(a.Sort_Order) - Number(b.Sort_Order));
    const dayDate = items[0]?.Date ? formatDate(items[0].Date) : '';

    // Check if we need a new page
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    // Day header
    doc.setFillColor(240, 245, 255);
    doc.roundedRect(margin, y - 4, contentWidth, 10, 2, 2, 'F');
    doc.setTextColor(30, 64, 175);
    doc.setFont('NotoSansTC', 'normal');
    doc.setFontSize(12);
    doc.text(`Day ${dayNum}  ${dayDate}`, margin + 4, y + 3);
    y += 14;

    // Activities
    doc.setTextColor(50, 50, 50);
    doc.setFontSize(9);

    for (const item of items) {
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }

      const time = item.Time || '--:--';
      const name = item.Activity_Name || item.Activity || '';
      const location = item.Location ? ` @ ${item.Location}` : '';

      doc.setTextColor(100, 100, 100);
      doc.setFont('NotoSansTC', 'normal');
      doc.text(time, margin + 4, y);
      doc.setTextColor(30, 30, 30);
      doc.text(`${name}${location}`, margin + 20, y);

      if (item.Note) {
        y += 4;
        doc.setTextColor(130, 130, 130);
        doc.setFontSize(8);
        const noteLines = doc.splitTextToSize(item.Note, contentWidth - 24);
        doc.text(noteLines, margin + 20, y);
        y += noteLines.length * 3.5;
        doc.setFontSize(9);
      }
      y += 6;
    }
    y += 4;
  }

  // ═══════════════════════════════════════════
  // FLIGHTS SECTION
  // ═══════════════════════════════════════════
  if (flights.length > 0) {
    doc.addPage();
    y = margin;
    doc.setTextColor(30, 64, 175);
    doc.setFont('NotoSansTC', 'normal');
    doc.setFontSize(20);
    doc.text('航班 Flights', margin, y);
    y += 10;

    const flightRows = flights.map(f => [
      f.Flight_No,
      f.Airline,
      `${f.Departure_Location} -> ${f.Arrival_Location}`,
      formatDate(f.Flight_Date),
      `${f.Departure_Time || '-'} - ${f.Arrival_Time || '-'}`,
      f.Status || '-'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['航班號', '航空公司', '路線', '日期', '時間', '狀態']],
      body: flightRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2, font: 'NotoSansTC' },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], font: 'NotoSansTC' },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // ACCOMMODATIONS SECTION
  // ═══════════════════════════════════════════
  if (accommodations.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(30, 64, 175);
    doc.setFont('NotoSansTC', 'normal');
    doc.setFontSize(20);
    doc.text('住宿 Accommodations', margin, y);
    y += 10;

    const accRows = accommodations.map(a => [
      a.Name,
      a.Address || '-',
      formatDate(a.Check_In_Date),
      formatDate(a.Check_Out_Date),
      a.Price ? formatAmount(a.Price, trip.Base_Currency) : '-'
    ]);

    autoTable(doc, {
      startY: y,
      head: [['名稱', '地址', '入住', '退房', '價格']],
      body: accRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 8, cellPadding: 2, font: 'NotoSansTC' },
      headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], font: 'NotoSansTC' },
      alternateRowStyles: { fillColor: [245, 248, 255] },
    });
    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // ═══════════════════════════════════════════
  // EXPENSES SECTION
  // ═══════════════════════════════════════════
  doc.addPage();
  y = margin;
  doc.setTextColor(30, 64, 175);
  doc.setFont('NotoSansTC', 'normal');
  doc.setFontSize(20);
  doc.text('費用明細 Expenses', margin, y);
  y += 5;

  // Summary stats
  const totalBase = expenses.reduce((sum, e) => sum + (parseFloat(String(e.Base_Amount)) || 0), 0);
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`總計: ${formatAmount(totalBase, trip.Base_Currency)} | ${expenses.length} 筆`, margin, y + 5);
  y += 12;

  // Group expenses by date
  const expensesByDate: Record<string, Expense[]> = {};
  expenses.forEach(e => {
    const date = e.Date || 'Unknown';
    if (!expensesByDate[date]) expensesByDate[date] = [];
    expensesByDate[date].push(e);
  });

  const sortedDates = Object.keys(expensesByDate).sort();

  const expenseRows = sortedDates.flatMap(date =>
    expensesByDate[date].map(e => [
      formatDate(date),
      `${e.Main_Category}/${e.Sub_Category}`,
      e.Note || '-',
      formatAmount(e.Original_Amount, e.Currency),
      e.Currency !== trip.Base_Currency ? formatAmount(e.Base_Amount, trip.Base_Currency) : '',
      e.Payer,
      e.Splitters || '-'
    ])
  );

  autoTable(doc, {
    startY: y,
    head: [['日期', '類別', '備註', '金額', `${trip.Base_Currency}`, '付款人', '分攤']],
    body: expenseRows,
    margin: { left: margin, right: margin },
    styles: { fontSize: 7, cellPadding: 1.5, font: 'NotoSansTC' },
    headStyles: { fillColor: [30, 64, 175], textColor: [255, 255, 255], fontSize: 7, font: 'NotoSansTC' },
    alternateRowStyles: { fillColor: [245, 248, 255] },
    columnStyles: {
      0: { cellWidth: 18 },
      1: { cellWidth: 22 },
      2: { cellWidth: 30 },
      3: { cellWidth: 22 },
      4: { cellWidth: 22 },
      5: { cellWidth: 18 },
      6: { cellWidth: 28 },
    },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ═══════════════════════════════════════════
  // SETTLEMENT SECTION
  // ═══════════════════════════════════════════
  if (settlement && settlement.settlements && settlement.settlements.length > 0) {
    if (y > pageHeight - 60) {
      doc.addPage();
      y = margin;
    }
    doc.setTextColor(30, 64, 175);
    doc.setFont('NotoSansTC', 'normal');
    doc.setFontSize(20);
    doc.text('結算 Settlement', margin, y);
    y += 10;

    // Category breakdown
    if (settlement.categoryStats) {
      doc.setFontSize(11);
      doc.setTextColor(50, 50, 50);
      doc.text('分類統計', margin, y);
      y += 6;

      const catRows = Object.entries(settlement.categoryStats)
        .sort(([, a], [, b]) => b - a)
        .map(([cat, amount]) => [cat, formatAmount(amount, trip.Base_Currency)]);

      autoTable(doc, {
        startY: y,
        head: [['類別', '總計']],
        body: catRows,
        margin: { left: margin, right: margin },
        styles: { fontSize: 9, cellPadding: 2, font: 'NotoSansTC' },
        headStyles: { fillColor: [100, 116, 139], textColor: [255, 255, 255], font: 'NotoSansTC' },
        tableWidth: 80,
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }

    // Suggested transfers
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.setFont('NotoSansTC', 'normal');
    doc.text('建議轉帳', margin, y);
    y += 6;

    const transferRows = settlement.settlements.map((t) => [
      t.from,
      t.to,
      formatAmount(t.amount, trip.Base_Currency)
    ]);

    autoTable(doc, {
      startY: y,
      head: [['付款方', '收款方', '金額']],
      body: transferRows,
      margin: { left: margin, right: margin },
      styles: { fontSize: 9, cellPadding: 2, font: 'NotoSansTC' },
      headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255], font: 'NotoSansTC' },
      tableWidth: 100,
    });
  }

  // ═══════════════════════════════════════════
  // SAVE PDF
  // ═══════════════════════════════════════════
  const fileName = `${trip.Trip_Name}_Travel_Booklet_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
}
