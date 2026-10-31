# Sales Analytics Dashboard — Hands-On Project

Dashboard analitik penjualan interaktif yang menampilkan KPI, tren, dan distribusi dari **200 transaksi penjualan** tahun 2023.  
Dibangun menggunakan HTML, Tailwind CSS, Vanilla JavaScript, dan Chart.js — tanpa framework.

---

## 📁 Struktur File

```
HANDS-ON_PROJECT/
├── index.html          # Markup utama dashboard
├── style.css           # Custom styles (melengkapi Tailwind)
├── script.js           # Logic data, rendering chart, filter handler
├── sales_data.json     # Dataset (200 records, hasil konversi CSV)
└── 200_sales_data.csv  # Dataset mentah (sumber asli)
```

---

## 🚀 Cara Menjalankan

> Dashboard menggunakan `fetch()` untuk membaca JSON — **wajib server lokal**.

**VS Code Live Server (paling mudah):**
1. Buka folder `HANDS-ON_PROJECT/` di VS Code
2. Klik kanan `index.html` → **"Open with Live Server"**
3. Browser terbuka otomatis di `http://127.0.0.1:5500`

**Python:**
```bash
cd HANDS-ON_PROJECT
python -m http.server 5500
# Buka: http://localhost:5500
```

---

## 📊 Dataset

| Kolom | Keterangan |
|---|---|
| `Product_ID` | ID produk |
| `Sale_Date` | Tanggal transaksi (YYYY-MM-DD) |
| `Sales_Rep` | Nama sales representative |
| `Region` | Wilayah penjualan (North/South/East/West) |
| `Sales_Amount` | Nilai penjualan (USD) |
| `Quantity_Sold` | Jumlah unit terjual |
| `Product_Category` | Kategori produk (Furniture/Electronics/Food/Clothing) |
| `Unit_Cost` | Biaya per unit |
| `Unit_Price` | Harga jual per unit |
| `Customer_Type` | New / Returning |
| `Discount` | Diskon yang diberikan (0.00 – 0.30) |
| `Payment_Method` | Cash / Credit Card / Bank Transfer |
| `Sales_Channel` | Online / Retail |

---

## ✨ Fitur Dashboard

### KPI Cards
| KPI | Keterangan |
|---|---|
| Total Revenue | Total pendapatan dari transaksi terfilter |
| Total Transactions | Jumlah baris transaksi |
| Total Qty Sold | Total unit terjual |
| Avg Discount | Rata-rata diskon (%) |

### Visualisasi (10 Chart)
| # | Chart | Tipe |
|---|---|---|
| 1 | Sales Trend (Monthly) | Line Chart dengan gradient fill |
| 2 | Revenue per Region | Horizontal Bar Chart |
| 3 | Revenue per Product Category | Vertical Bar Chart |
| 4 | Sales per Sales Representative | Bar Chart (descending) |
| 5 | Customer Type Distribution | Doughnut Chart |
| 6 | Payment Method Usage | Doughnut Chart |
| 7 | Sales Channel Distribution | Doughnut Chart |
| 8 | Discount vs Sales Amount | Scatter Plot |
| 9 | Top 10 Highest Sales Transactions | Horizontal Bar Chart |
| 10 | Quantity Sold per Category | Vertical Bar Chart |

### Filter Dinamis
Semua chart dan KPI diperbarui secara real-time saat filter diubah — tanpa reload halaman.

| Filter | Nilai |
|---|---|
| Region | North, South, East, West |
| Product Category | Furniture, Electronics, Food, Clothing |
| Customer Type | New, Returning |
| Sales Channel | Online, Retail |

Tombol **↺ Reset Filters** mengembalikan semua filter ke kondisi awal.

---

## 🎨 UI/UX

- **Mobile-first** responsive (grid 2 → 4 kolom sesuai layar)
- **Tema**: Indigo modern, warna konsisten via palet tetap
- Hover effect + smooth shadow transition di setiap card
- Rounded corner, soft shadow, smooth animation (Chart.js 450ms)

---

## 🏗 Arsitektur Kode (`script.js`)

```
init()                    ← fetch JSON, populateFilters(), renderAll()
│
├── populateFilters()     ← isi <select> dari data nyata
├── applyFilters()        ← kembalikan subset data sesuai filter aktif
├── updateKPIs()          ← update 4 KPI card
│
├── renderTrend()         ← Chart 1
├── renderRegion()        ← Chart 2
├── renderCategory()      ← Chart 3
├── renderSalesRep()      ← Chart 4
├── renderCustomer()      ← Chart 5
├── renderPayment()       ← Chart 6
├── renderChannel()       ← Chart 7
├── renderScatter()       ← Chart 8
├── renderTop10()         ← Chart 9
└── renderQtyCategory()   ← Chart 10
```

Setiap chart renderer memanggil `destroyChart(key)` sebelum membuat instance baru — mencegah memory leak saat filter berubah.

---

## 📝 Catatan Teknis

- `sales_data.json` dikonversi dari `200_sales_data.csv` menggunakan PowerShell dengan encoding **UTF-8 tanpa BOM** agar `JSON.parse()` di browser tidak error.
- Field numerik (`Sales_Amount`, `Quantity_Sold`, `Discount`, dst.) sudah di-cast ke `Number` saat konversi.
