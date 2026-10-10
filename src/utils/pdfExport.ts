import { Purchase, Sale, Farmer, Party, Payment, BusinessSettings } from '../types';
import { formatCurrency, formatWeight } from './weight';

/**
 * Exports tabular data as CSV (Excel compatible)
 */
export function exportToCSV(filename: string, rows: (string | number)[][]) {
  const processRow = (row: (string | number)[]) => {
    return row
      .map(val => {
        const text = String(val ?? '').replace(/"/g, '""');
        return `"${text}"`;
      })
      .join(',');
  };

  // Add UTF-8 BOM so Excel opens Bengali characters properly
  const csvContent = '\uFEFF' + rows.map(processRow).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Opens a full-page clean A4 print view for full invoice / reports
 */
export function printFullDocument(title: string, contentHtml: string) {
  const printWin = window.open('', '_blank', 'width=850,height=900');
  if (!printWin) {
    alert('দয়া করে ব্রাউজারে পপ-আপ অনুমোদন দিন।');
    return;
  }

  const html = `
    <!DOCTYPE html>
    <html lang="bn">
      <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; font-family: 'Hind Siliguri', sans-serif; }
          body { color: #1e293b; background: #fff; line-height: 1.5; font-size: 13px; }
          .header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 20px; }
          .business-name { font-size: 24px; font-weight: 700; color: #0f172a; margin: 0; }
          .subtext { font-size: 13px; color: #475569; margin: 2px 0; }
          .badge { display: inline-block; padding: 4px 12px; background: #f1f5f9; border-radius: 9999px; font-size: 12px; font-weight: 600; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin: 16px 0; }
          th { background: #f8fafc; text-align: left; padding: 8px 10px; border-bottom: 2px solid #cbd5e1; font-weight: 600; }
          td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .summary-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; margin-top: 15px; }
          .footer { margin-top: 40px; display: flex; justify-content: space-between; }
          .signature-box { border-top: 1px dotted #94a3b8; width: 160px; text-align: center; padding-top: 4px; font-size: 12px; }
          @media print {
            body { margin: 0; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        ${contentHtml}
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
}
