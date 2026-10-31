/* =====================================================================
   convert_csv.js — CSV → JSON converter for netflix_titles.csv
   ---------------------------------------------------------------------
   Cara penggunaan (Node.js):
     1. Pastikan Node.js sudah terinstall
     2. Letakkan file ini di folder yang sama dengan netflix_titles.csv
     3. Jalankan: node convert_csv.js
     4. Output: netflix_data.json (siap dipakai oleh dashboard)

   Catatan: Script ini menggunakan built-in fs & path, tanpa dependensi
   eksternal sehingga tidak perlu npm install.
   ===================================================================== */

const fs   = require("fs");
const path = require("path");

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Parse CSV dengan benar (menangani nilai yang dibungkus tanda kutip) */
function parseCSV(content) {
  const lines = content.split("\n").filter(l => l.trim());
  const headers = splitCSVLine(lines[0]);
  return lines.slice(1).map(line => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => { obj[h.trim()] = (values[i] || "").trim(); });
    return obj;
  });
}

function splitCSVLine(line) {
  const result = [];
  let cur = "", inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && line[i+1] === '"') { cur += '"'; i++; }
    else if (ch === '"')  { inQuote = !inQuote; }
    else if (ch === ',' && !inQuote) { result.push(cur); cur = ""; }
    else { cur += ch; }
  }
  result.push(cur);
  return result;
}

/** Pisahkan string multi-nilai (dipisah koma) menjadi array, trim setiap item */
function splitMulti(str, fallback = "Unknown") {
  if (!str || !str.trim()) return [fallback];
  return str.split(",").map(s => s.trim()).filter(Boolean);
}

/** Ekstrak tahun dari string tanggal seperti "September 25, 2021" */
function extractYear(dateStr) {
  if (!dateStr || !dateStr.trim()) return null;
  const m = dateStr.match(/,\s*(\d{4})\s*$/);
  return m ? parseInt(m[1]) : null;
}

// ── Main conversion ───────────────────────────────────────────────────────────
const csvPath  = path.join(__dirname, "netflix_titles.csv");
const jsonPath = path.join(__dirname, "netflix_data.json");

console.log("Reading:", csvPath);
const raw  = fs.readFileSync(csvPath, "utf8");
const rows = parseCSV(raw);
console.log(`Parsed ${rows.length} rows`);

const cleaned = rows.map(r => {
  const durMin     = r.type === "Movie"   && /(\d+)\s*min/.test(r.duration)    ? parseInt(RegExp.$1) : null;
  const durSeasons = r.type === "TV Show" && /(\d+)\s*Season/.test(r.duration) ? parseInt(RegExp.$1) : null;

  return {
    show_id         : r.show_id,
    type            : r.type,
    title           : r.title,
    directors       : splitMulti(r.director),
    cast            : splitMulti(r.cast),
    countries       : splitMulti(r.country),
    date_added      : r.date_added,
    year_added      : extractYear(r.date_added),
    release_year    : r.release_year ? parseInt(r.release_year) : null,
    rating          : r.rating.trim() || "Not Rated",
    duration_raw    : r.duration,
    duration_min    : durMin,
    duration_seasons: durSeasons,
    genres          : splitMulti(r.listed_in),
    description     : r.description,
  };
});

fs.writeFileSync(jsonPath, JSON.stringify(cleaned, null, 2), "utf8");
console.log(`✅ Written ${cleaned.length} records → ${jsonPath}`);
