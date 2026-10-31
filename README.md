# IBM Capstone — Data Analyst Portfolio

Repository ini berisi dua proyek analitik data yang dibangun sebagai bagian dari **IBM Data Analyst Capstone**.  
Setiap proyek menghasilkan dashboard interaktif berbasis web menggunakan **HTML · Tailwind CSS · Vanilla JavaScript · Chart.js**.

---

## 📁 Struktur Repository

```
IBM_Capstone_DataAnalysist/
│
├── HANDS-ON_PROJECT/          # Dashboard Penjualan (Sales Analytics)
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── sales_data.json        # Data hasil konversi dari CSV
│   └── 200_sales_data.csv     # Dataset mentah
│
├── CAPSTONE_PROJECT/          # Dashboard Katalog Netflix
│   ├── index.html
│   ├── style.css
│   ├── script.js
│   ├── netflix_data.json      # Data hasil konversi + cleaning
│   ├── netflix_titles.csv     # Dataset mentah
│   └── convert_csv.js         # Skrip Node.js untuk regenerasi JSON
│
└── README.md                  # (file ini)
```

---

## 🚀 Cara Menjalankan

Kedua dashboard menggunakan `fetch()` untuk membaca file JSON, sehingga **wajib dijalankan melalui server lokal** (tidak bisa dibuka langsung via `file://`).

### Opsi 1 — VS Code Live Server (direkomendasikan)
1. Install ekstensi **Live Server** di VS Code
2. Klik kanan pada `index.html` di dalam folder proyek yang diinginkan
3. Pilih **"Open with Live Server"**

### Opsi 2 — Python HTTP Server
```bash
# Masuk ke folder proyek terlebih dahulu
cd HANDS-ON_PROJECT   # atau CAPSTONE_PROJECT
python -m http.server 5500
# Buka browser: http://localhost:5500
```

### Opsi 3 — Node.js
```bash
npx serve HANDS-ON_PROJECT   # atau CAPSTONE_PROJECT
```

---

## 📊 Ringkasan Proyek

| | HANDS-ON PROJECT | CAPSTONE PROJECT |
|---|---|---|
| **Topik** | Sales Analytics | Netflix Catalogue Analysis |
| **Dataset** | 200 transaksi penjualan | 8.807 judul Netflix |
| **KPI** | 4 kartu | 5 kartu |
| **Visualisasi** | 10 chart | 9 chart |
| **Fitur Khusus** | — | Search & paginated table, Dark/Light mode |
| **Filter** | 4 filter | 6 filter |
| **Tema** | Indigo modern | Merah-hitam Netflix |

---

## 🛠 Tech Stack

- **HTML5** — Markup semantik
- **Tailwind CSS** (CDN) — Utility-first styling, responsive grid
- **Vanilla JavaScript** — Logic, data processing, event handling
- **Chart.js 4** (CDN) — Semua visualisasi chart
- **JSON** — Sumber data (pre-processed dari CSV)

---

## 📝 Catatan

- Semua visualisasi mengambil data langsung dari file JSON — **tidak ada data dummy**.
- Data cleaning (nilai kosong, multi-value fields, parsing tanggal) dilakukan saat konversi CSV → JSON.
- Untuk CAPSTONE PROJECT, `convert_csv.js` tersedia sebagai skrip Node.js jika ingin meregenerasi `netflix_data.json` dari CSV.
