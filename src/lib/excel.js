import XLSX from "xlsx";

export function generateReportWorkbook({ sheets }) {
  const wb = XLSX.utils.book_new();

  sheets.forEach(({ name, rows }) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  });

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
}

