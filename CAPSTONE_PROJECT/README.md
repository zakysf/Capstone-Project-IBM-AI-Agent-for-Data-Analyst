# Netflix Catalogue Analytics Dashboard — Capstone Project

Dashboard analitik katalog Netflix untuk **Content Strategy Team**, menganalisis **8.807 judul** (Movies & TV Shows) dari dataset `netflix_titles.csv`.  
Dibangun menggunakan HTML, Tailwind CSS, Vanilla JavaScript, dan Chart.js — tanpa framework, dengan tema dark mode merah-hitam ala Netflix.

---

## 📁 Struktur File

```
CAPSTONE_PROJECT/
├── index.html           # Markup utama dashboard
├── style.css            # Custom styles (melengkapi Tailwind, tema Netflix)
├── script.js            # Logic data, 9 chart, filter, table, insights
├── netflix_data.json    # Dataset bersih (8.807 records, hasil konversi CSV)
├── netflix_titles.csv   # Dataset mentah (sumber asli)
└── convert_csv.js       # Skrip Node.js untuk regenerasi netflix_data.json
```

---

## 🚀 Cara Menjalankan

> Dashboard menggunakan `fetch()` untuk membaca JSON — **wajib server lokal**.

**VS Code Live Server (paling mudah):**
1. Buka folder `CAPSTONE_PROJECT/` di VS Code
2. Klik kanan `index.html` → **"Open with Live Server"**
3. Browser terbuka otomatis di `http://127.0.0.1:5500`

**Python:**
```bash
cd CAPSTONE_PROJECT
python -m http.server 5500
# Buka: http://localhost:5500
```

**Regenerasi JSON dari CSV (opsional):**
```bash
cd CAPSTONE_PROJECT
node convert_csv.js
# Output: netflix_data.json (baru, bersih, tanpa BOM)
```

---

## 📊 Dataset

**Sumber:** `netflix_titles.csv` · 8.807 baris · 12 kolom

| Kolom | Keterangan | Penanganan Khusus |
|---|---|---|
| `show_id` | ID unik judul | — |
| `type` | Movie / TV Show | — |
| `title` | Judul konten | — |
| `director` | Sutradara | Kosong → `"Unknown"` |
| `cast` | Pemeran | Kosong → `"Unknown"`, multi-value → array |
| `country` | Negara produksi | Kosong → `"Unknown"`, multi-value → array |
| `date_added` | Tanggal ditambahkan ke Netflix | Diparse → `year_added` (integer) |
| `release_year` | Tahun rilis | Cast ke integer |
| `rating` | Rating usia | Kosong → `"Not Rated"` |
| `duration` | Durasi (min / musim) | Diparse → `duration_min` atau `duration_seasons` |
| `listed_in` | Genre | Multi-value → array |
| `description` | Sinopsis | — |

### Data Cleaning yang Diterapkan
- **Nilai kosong** pada `director`, `cast`, `country` → diisi `"Unknown"`
- **Multi-value fields** (`cast`, `country`, `listed_in`) dipisah berdasarkan koma → disimpan sebagai array JSON
- **Single-item arrays** yang di-collapse PowerShell menjadi string → dinormalisasi kembali ke array di JavaScript saat load (`normalizeArrayFields()`)
- **BOM stripping**: file JSON disimpan tanpa UTF-8 BOM; script.js juga mengstrip `\uFEFF` secara defensif

---

## ✨ Fitur Dashboard

### Key Insights (5 poin otomatis)
Dihitung dari data yang sedang terfilter:
- Persentase Movies vs total katalog
- Negara #1 dengan jumlah judul terbanyak
- Genre paling dominan
- Rata-rata durasi movie (menit)
- Tahun dengan penambahan judul terbanyak

### KPI Cards (5 kartu)
| KPI | Keterangan |
|---|---|
| Total Titles | Total judul dalam katalog terfilter |
| Movies | Jumlah + persentase Movie |
| TV Shows | Jumlah + persentase TV Show |
| Countries | Jumlah negara unik (dari field `countries`) |
| Avg Movie Duration | Rata-rata durasi movie dalam menit |

### Visualisasi (9 Chart)
| # | Chart | Tipe |
|---|---|---|
| 1 | Movie vs TV Show | Doughnut Chart |
| 2 | Titles Added per Year | Line Chart dengan gradient fill |
| 3 | Top 10 Countries by Titles | **Polar Area Chart** |
| 4 | Top 10 Genres | Horizontal Bar Chart |
| 5 | Rating Distribution | Bar Chart |
| 6 | Release Year Distribution | Histogram |
| 7 | Movie Duration Distribution | Histogram (bucket 15 menit) |
| 8 | Top 10 Directors by Titles | Horizontal Bar Chart |
| 9 | Top 10 Actors by Appearances | Horizontal Bar Chart |

> **Catatan Chart #3:** Polar Area Chart dipilih menggantikan Bar Chart untuk menampilkan perbandingan kontribusi antarnegara secara lebih visual dan proporsional. Legend menampilkan nama negara beserta jumlah judulnya.

### Title Browser (Tabel)
- **Search** by title (debounced 250ms)
- **Pagination** 15 baris per halaman
- Kolom: Title · Type (badge berwarna) · Release Year · Rating · Duration · Country
- Tabel diperbarui otomatis saat filter diubah

### Filter Dinamis (6 filter)
| Filter | Keterangan |
|---|---|
| Type | Movie / TV Show |
| Country | Negara produksi (dari field `countries`) |
| Genre | Genre (dari field `genres`) |
| Rating | Rating usia |
| Release Year Min | Batas bawah tahun rilis |
| Release Year Max | Batas atas tahun rilis |

Tombol **↺ Reset All** mengembalikan semua filter ke kondisi awal.

### Dark / Light Mode
- Tombol toggle di header kanan atas (☀ / 🌙)
- Seluruh chart di-re-render saat mode berganti agar warna grid menyesuaikan

---

## 🎨 UI/UX

- **Dark mode default** — tema merah (`#E50914`) dan hitam (`#141414`) ala Netflix
- **Light mode** tersedia via toggle — semua warna menyesuaikan otomatis
- Mobile-first responsive (grid 2 → 3 → 5 kolom KPI, 1 → 2 kolom chart)
- Hover effect + smooth shadow transition di setiap card
- Scrollbar custom dengan aksen merah saat hover

---

## 🏗 Arsitektur Kode (`script.js`)

```
init()                      ← fetch JSON, normalizeArrayFields(), populateFilters(), renderAll()
│
├── normalizeArrayFields()  ← fix single-item arrays yang di-collapse PowerShell
├── populateFilters()       ← isi <select> dari nilai unik data nyata
├── applyFilters()          ← kembalikan subset data sesuai 6 filter aktif
│
├── renderInsights()        ← 5 Key Insight otomatis
├── updateKPIs()            ← update 5 KPI card
│
├── renderTypeChart()       ← Chart 1: Doughnut
├── renderTrendChart()      ← Chart 2: Line
├── renderCountriesChart()  ← Chart 3: Polar Area ★
├── renderGenresChart()     ← Chart 4: Horizontal Bar
├── renderRatingChart()     ← Chart 5: Bar
├── renderReleaseYearChart()← Chart 6: Histogram
├── renderDurationChart()   ← Chart 7: Histogram
├── renderDirectorsChart()  ← Chart 8: Horizontal Bar
└── renderActorsChart()     ← Chart 9: Horizontal Bar
```

Helper utama:
- `countBy(arr, key)` — hitung kemunculan nilai scalar
- `countFlat(arr, arrayKey)` — hitung kemunculan nilai dalam array fields (dengan guard `Array.isArray`)
- `topN(countObj, n)` — ambil N entry teratas dari hasil count
- `destroyChart(key)` — destroy instance sebelum re-render (mencegah memory leak)
- `baseOpts()` — shared Chart.js options yang menyesuaikan dark/light mode

---

## 🐛 Troubleshooting

| Error | Penyebab | Solusi |
|---|---|---|
| `Data load error` | Dibuka via `file://` bukan server | Gunakan Live Server / Python server |
| `forEach is not a function` | Array field ter-serialize sebagai string | Sudah diatasi oleh `normalizeArrayFields()` di `script.js` |
| `Unexpected token` saat `JSON.parse` | File JSON tersimpan dengan UTF-8 BOM | Sudah diatasi: JSON disimpan tanpa BOM + strip `\uFEFF` defensif di `script.js` |
| Chart kosong setelah filter | Data hasil filter = 0 | Normal — tidak ada data yang cocok dengan kombinasi filter |

---

## 📝 Catatan Teknis

- `netflix_data.json` diregenerasi dari CSV menggunakan PowerShell dengan `System.Text.UTF8Encoding($false)` (tanpa BOM).
- Seluruh array field (`directors`, `cast`, `countries`, `genres`) divalidasi `Array.isArray()` di setiap titik akses untuk menangani inkonsistensi serialisasi PowerShell.
- `convert_csv.js` adalah alternatif Node.js yang menghasilkan JSON bersih tanpa masalah BOM maupun collapsing array.
