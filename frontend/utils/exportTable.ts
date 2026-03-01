import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type ExportColumn = {
  key: string;
  label: string;
  visible?: boolean;
};

export function exportCopy(rows: Record<string, string>[], columns: ExportColumn[]): void {
  const visibleCols = columns.filter((c) => c.visible !== false);
  const header = visibleCols.map((c) => c.label).join("\t");
  const body = rows
    .map((row) => visibleCols.map((c) => row[c.key] ?? "").join("\t"))
    .join("\n");
  const text = header + "\n" + body;
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(() => alert("Copié dans le presse-papier."));
  } else {
    prompt("Copiez ce texte:", text);
  }
}

export function exportCSV(rows: Record<string, string>[], columns: ExportColumn[], filename: string): void {
  const visibleCols = columns.filter((c) => c.visible !== false);
  const header = visibleCols.map((c) => `"${(c.label || "").replace(/"/g, '""')}"`).join(";");
  const body = rows
    .map((row) =>
      visibleCols.map((c) => `"${String(row[c.key] ?? "").replace(/"/g, '""')}"`).join(";")
    )
    .join("\n");
  const csv = "\uFEFF" + header + "\n" + body;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportExcel(rows: Record<string, string>[], columns: ExportColumn[], filename: string): void {
  const visibleCols = columns.filter((c) => c.visible !== false);
  const header = visibleCols.map((c) => c.label);
  const data = [header, ...rows.map((row) => visibleCols.map((c) => row[c.key] ?? ""))];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Liste");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportPDF(rows: Record<string, string>[], columns: ExportColumn[], title: string, filename: string): void {
  const visibleCols = columns.filter((c) => c.visible !== false);
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(title, 14, 12);
  autoTable(doc, {
    head: [visibleCols.map((c) => c.label)],
    body: rows.map((row) => visibleCols.map((c) => row[c.key] ?? "")),
    startY: 18,
    styles: { fontSize: 8 },
  });
  doc.save(`${filename}.pdf`);
}

export function printTable(rows: Record<string, string>[], columns: ExportColumn[], title: string): void {
  const visibleCols = columns.filter((c) => c.visible !== false);
  const thead = visibleCols.map((c) => `<th>${escapeHtml(c.label)}</th>`).join("");
  const tbody = rows
    .map(
      (row) =>
        `<tr>${visibleCols.map((c) => `<td>${escapeHtml(String(row[c.key] ?? ""))}</td>`).join("")}</tr>`
    )
    .join("");
  const html = `
    <!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
    <style>body{font-family:Segoe UI,Arial,sans-serif;padding:20px;} table{border-collapse:collapse;width:100%;} th,td{border:1px solid #ddd;padding:8px;text-align:left;} th{background:#f5f5f5;}</style>
    </head><body><h2>${escapeHtml(title)}</h2><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></body></html>`;
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => {
      w.print();
      w.close();
    }, 250);
  }
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
