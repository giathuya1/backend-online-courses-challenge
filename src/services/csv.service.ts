// src/services/csv.service.ts

interface ParsedCsv {
    headers: string[];
    rows: Record<string, string>[];
  }
  
  export function parseCsvBuffer(buffer: Buffer): ParsedCsv {
    const text = buffer.toString('utf8').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length === 0) return { headers: [], rows: [] };
  
    const headers = lines[0].split(',').map((h) => h.trim());
    const rows: Record<string, string>[] = [];
  
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',');
      const obj: Record<string, string> = {};
      headers.forEach((h, idx) => { obj[h] = (cols[idx] ?? '').trim(); });
      rows.push(obj);
    }
    return { headers, rows };
  }
  
  export function toCsvStreamRow(values: (string | number | null | undefined)[]): string {
    const escaped = values.map((v) => {
      const s = v == null ? '' : String(v);
      if (/[,"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    });
    return escaped.join(',') + '\n';
  }