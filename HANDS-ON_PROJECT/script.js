/* =====================================================================
   script.js — Sales Analytics Dashboard
   Loads data from sales_data.json, renders KPIs + 10 Chart.js charts,
   and reacts to 4 filter dropdowns dynamically.
   ===================================================================== */

"use strict";

// ── Colour palette used across charts ───────────────────────────────────────
const COLORS = {
  indigo : "#6366f1",
  emerald: "#10b981",
  amber  : "#f59e0b",
  rose   : "#f43f5e",
  sky    : "#0ea5e9",
  violet : "#8b5cf6",
  teal   : "#14b8a6",
  orange : "#f97316",
  lime   : "#84cc16",
  pink   : "#ec4899",
};

const COLOR_ARRAY = Object.values(COLORS);

// ── Chart instance registry (so we can destroy & re-create on filter) ────────
const chartInstances = {};

// ── Utility helpers ──────────────────────────────────────────────────────────

/** Format a number as compact USD currency, e.g. $1.23M */
function fmtCurrency(value) {
  if (value >= 1_000_000) return "$" + (value / 1_000_000).toFixed(2) + "M";
  if (value >= 1_000)     return "$" + (value / 1_000).toFixed(1) + "K";
  return "$" + value.toFixed(2);
}

/** Format a number with thousand separators */
function fmtNumber(value) {
  return value.toLocaleString("en-US");
}

/** Group array of objects by a key, summing a numeric field */
function groupSum(data, groupKey, sumKey) {
  return data.reduce((acc, row) => {
    const k = row[groupKey];
    acc[k] = (acc[k] || 0) + row[sumKey];
    return acc;
  }, {});
}

/** Group array and count occurrences */
function groupCount(data, groupKey) {
  return data.reduce((acc, row) => {
    const k = row[groupKey];
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}

/** Destroy a Chart.js instance by its registered key and remove canvas state */
function destroyChart(key) {
  if (chartInstances[key]) {
    chartInstances[key].destroy();
    delete chartInstances[key];
  }
}

/** Shared Chart.js defaults applied to all charts */
function baseOptions(extraOptions = {}) {
  return {
    responsive : true,
    maintainAspectRatio: false,
    animation  : { duration: 450, easing: "easeInOutQuart" },
    plugins: {
      legend: { display: false },  // legends overridden per chart
      tooltip: {
        backgroundColor: "#1f2937",
        titleColor: "#f9fafb",
        bodyColor: "#e5e7eb",
        padding: 10,
        cornerRadius: 8,
        displayColors: true,
        boxPadding: 4,
      },
    },
    ...extraOptions,
  };
}

// ── Populate filter <select> elements with unique values ─────────────────────
function populateFilters(allData) {
  const selectors = {
    "filter-region"  : "Region",
    "filter-category": "Product_Category",
    "filter-customer": "Customer_Type",
    "filter-channel" : "Sales_Channel",
  };

  for (const [id, field] of Object.entries(selectors)) {
    const select = document.getElementById(id);
    // Keep the first "All …" option, remove any previously added options
    while (select.options.length > 1) select.remove(1);

    const unique = [...new Set(allData.map(d => d[field]))].sort();
    unique.forEach(val => {
      const opt = document.createElement("option");
      opt.value = val;
      opt.textContent = val;
      select.appendChild(opt);
    });
  }
}

// ── Apply active filters and return the filtered subset ──────────────────────
function applyFilters(allData) {
  const region   = document.getElementById("filter-region").value;
  const category = document.getElementById("filter-category").value;
  const customer = document.getElementById("filter-customer").value;
  const channel  = document.getElementById("filter-channel").value;

  return allData.filter(row =>
    (region   === "all" || row.Region           === region)   &&
    (category === "all" || row.Product_Category === category) &&
    (customer === "all" || row.Customer_Type    === customer) &&
    (channel  === "all" || row.Sales_Channel    === channel)
  );
}

// ── Update KPI cards ─────────────────────────────────────────────────────────
function updateKPIs(data) {
  const totalRevenue = data.reduce((s, r) => s + r.Sales_Amount, 0);
  const totalQty     = data.reduce((s, r) => s + r.Quantity_Sold, 0);
  const avgDiscount  = data.length ? data.reduce((s, r) => s + r.Discount, 0) / data.length : 0;

  document.getElementById("kpi-revenue").textContent      = fmtCurrency(totalRevenue);
  document.getElementById("kpi-transactions").textContent = fmtNumber(data.length);
  document.getElementById("kpi-qty").textContent          = fmtNumber(totalQty);
  document.getElementById("kpi-discount").textContent     = (avgDiscount * 100).toFixed(1) + "%";
  document.getElementById("record-count").textContent     = fmtNumber(data.length) + " records";
}

// ── Chart 1: Sales Trend (monthly line chart) ─────────────────────────────────
function renderTrend(data) {
  destroyChart("trend");

  // Build monthly totals sorted by date
  const monthly = {};
  data.forEach(row => {
    const month = row.Sale_Date.slice(0, 7); // "2023-01"
    monthly[month] = (monthly[month] || 0) + row.Sales_Amount;
  });
  const labels = Object.keys(monthly).sort();
  const values = labels.map(k => monthly[k]);

  const ctx = document.getElementById("chart-trend").getContext("2d");

  // Gradient fill
  const gradient = ctx.createLinearGradient(0, 0, 0, 280);
  gradient.addColorStop(0, "rgba(99,102,241,0.25)");
  gradient.addColorStop(1, "rgba(99,102,241,0)");

  chartInstances.trend = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [{
        label    : "Revenue",
        data     : values,
        borderColor     : COLORS.indigo,
        backgroundColor : gradient,
        borderWidth     : 2.5,
        pointRadius     : 4,
        pointHoverRadius: 6,
        pointBackgroundColor: COLORS.indigo,
        fill    : true,
        tension : 0.38,
      }],
    },
    options: baseOptions({
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: {
          grid: { color: "#f3f4f6" },
          ticks: { font: { size: 11 }, callback: v => fmtCurrency(v) },
        },
      },
      plugins: {
        ...baseOptions().plugins,
        legend: { display: false },
        tooltip: {
          ...baseOptions().plugins.tooltip,
          callbacks: { label: ctx => " $" + ctx.parsed.y.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",") },
        },
      },
    }),
  });
}

// ── Chart 2: Revenue per Region (horizontal bar) ──────────────────────────────
function renderRegion(data) {
  destroyChart("region");

  const grouped = groupSum(data, "Region", "Sales_Amount");
  const labels  = Object.keys(grouped).sort();
  const values  = labels.map(k => grouped[k]);

  chartInstances.region = new Chart(
    document.getElementById("chart-region").getContext("2d"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label          : "Revenue",
          data           : values,
          backgroundColor: [COLORS.indigo, COLORS.emerald, COLORS.amber, COLORS.sky],
          borderRadius   : 6,
          borderSkipped  : false,
        }],
      },
      options: baseOptions({
        indexAxis: "y",
        scales: {
          x: {
            grid: { color: "#f3f4f6" },
            ticks: { callback: v => fmtCurrency(v), font: { size: 11 } },
          },
          y: { grid: { display: false }, ticks: { font: { size: 12 } } },
        },
      }),
    }
  );
}

// ── Chart 3: Revenue per Product Category (vertical bar) ─────────────────────
function renderCategory(data) {
  destroyChart("category");

  const grouped = groupSum(data, "Product_Category", "Sales_Amount");
  const labels  = Object.keys(grouped).sort();
  const values  = labels.map(k => grouped[k]);

  chartInstances.category = new Chart(
    document.getElementById("chart-category").getContext("2d"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label          : "Revenue",
          data           : values,
          backgroundColor: [COLORS.violet, COLORS.teal, COLORS.orange, COLORS.pink, COLORS.lime],
          borderRadius   : 6,
          borderSkipped  : false,
        }],
      },
      options: baseOptions({
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: {
            grid: { color: "#f3f4f6" },
            ticks: { font: { size: 11 }, callback: v => fmtCurrency(v) },
          },
        },
      }),
    }
  );
}

// ── Chart 4: Sales per Sales Representative (bar) ─────────────────────────────
function renderSalesRep(data) {
  destroyChart("salesrep");

  const grouped = groupSum(data, "Sales_Rep", "Sales_Amount");
  const entries = Object.entries(grouped).sort((a, b) => b[1] - a[1]);
  const labels  = entries.map(e => e[0]);
  const values  = entries.map(e => e[1]);

  chartInstances.salesrep = new Chart(
    document.getElementById("chart-salesrep").getContext("2d"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label          : "Revenue",
          data           : values,
          backgroundColor: COLOR_ARRAY.slice(0, labels.length),
          borderRadius   : 6,
          borderSkipped  : false,
        }],
      },
      options: baseOptions({
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
          y: {
            grid: { color: "#f3f4f6" },
            ticks: { font: { size: 11 }, callback: v => fmtCurrency(v) },
          },
        },
      }),
    }
  );
}

// ── Chart 5: Customer Type Distribution (doughnut) ────────────────────────────
function renderCustomer(data) {
  destroyChart("customer");

  const grouped = groupCount(data, "Customer_Type");
  const labels  = Object.keys(grouped);
  const values  = labels.map(k => grouped[k]);

  chartInstances.customer = new Chart(
    document.getElementById("chart-customer").getContext("2d"),
    {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data           : values,
          backgroundColor: [COLORS.indigo, COLORS.emerald],
          borderWidth    : 0,
          hoverOffset    : 8,
        }],
      },
      options: {
        ...baseOptions(),
        cutout: "62%",
        plugins: {
          ...baseOptions().plugins,
          legend: { display: true, position: "bottom", labels: { font: { size: 11 }, padding: 14 } },
        },
      },
    }
  );
}

// ── Chart 6: Payment Method Usage (doughnut) ──────────────────────────────────
function renderPayment(data) {
  destroyChart("payment");

  const grouped = groupCount(data, "Payment_Method");
  const labels  = Object.keys(grouped);
  const values  = labels.map(k => grouped[k]);

  chartInstances.payment = new Chart(
    document.getElementById("chart-payment").getContext("2d"),
    {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data           : values,
          backgroundColor: [COLORS.amber, COLORS.sky, COLORS.violet],
          borderWidth    : 0,
          hoverOffset    : 8,
        }],
      },
      options: {
        ...baseOptions(),
        cutout: "62%",
        plugins: {
          ...baseOptions().plugins,
          legend: { display: true, position: "bottom", labels: { font: { size: 11 }, padding: 14 } },
        },
      },
    }
  );
}

// ── Chart 7: Sales Channel Distribution (doughnut) ───────────────────────────
function renderChannel(data) {
  destroyChart("channel");

  const grouped = groupCount(data, "Sales_Channel");
  const labels  = Object.keys(grouped);
  const values  = labels.map(k => grouped[k]);

  chartInstances.channel = new Chart(
    document.getElementById("chart-channel").getContext("2d"),
    {
      type: "doughnut",
      data: {
        labels,
        datasets: [{
          data           : values,
          backgroundColor: [COLORS.rose, COLORS.teal],
          borderWidth    : 0,
          hoverOffset    : 8,
        }],
      },
      options: {
        ...baseOptions(),
        cutout: "62%",
        plugins: {
          ...baseOptions().plugins,
          legend: { display: true, position: "bottom", labels: { font: { size: 11 }, padding: 14 } },
        },
      },
    }
  );
}

// ── Chart 8: Discount vs Sales Amount (scatter) ───────────────────────────────
function renderScatter(data) {
  destroyChart("scatter");

  // Each point: x = Discount (0–0.30), y = Sales_Amount
  const points = data.map(row => ({
    x: +(row.Discount * 100).toFixed(1),   // convert to percentage
    y: +row.Sales_Amount.toFixed(2),
  }));

  chartInstances.scatter = new Chart(
    document.getElementById("chart-scatter").getContext("2d"),
    {
      type: "scatter",
      data: {
        datasets: [{
          label          : "Transaction",
          data           : points,
          backgroundColor: "rgba(99,102,241,0.45)",
          borderColor    : "rgba(99,102,241,0.7)",
          borderWidth    : 1,
          pointRadius    : 5,
          pointHoverRadius: 7,
        }],
      },
      options: baseOptions({
        scales: {
          x: {
            title: { display: true, text: "Discount (%)", font: { size: 11 }, color: "#6b7280" },
            ticks: { callback: v => v + "%", font: { size: 10 } },
            grid : { color: "#f3f4f6" },
          },
          y: {
            title: { display: true, text: "Sales Amount ($)", font: { size: 11 }, color: "#6b7280" },
            ticks: { callback: v => fmtCurrency(v), font: { size: 10 } },
            grid : { color: "#f3f4f6" },
          },
        },
        plugins: {
          ...baseOptions().plugins,
          tooltip: {
            ...baseOptions().plugins.tooltip,
            callbacks: {
              label: ctx => ` Discount: ${ctx.parsed.x}%  |  Sales: $${ctx.parsed.y.toLocaleString()}`,
            },
          },
        },
      }),
    }
  );
}

// ── Chart 9: Top 10 Highest Sales (horizontal bar) ────────────────────────────
function renderTop10(data) {
  destroyChart("top10");

  // Sort descending, take top 10
  const top = [...data]
    .sort((a, b) => b.Sales_Amount - a.Sales_Amount)
    .slice(0, 10);

  const labels = top.map(r => `#${r.Product_ID} – ${r.Sales_Rep}`);
  const values = top.map(r => r.Sales_Amount);

  chartInstances.top10 = new Chart(
    document.getElementById("chart-top10").getContext("2d"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label          : "Sales Amount",
          data           : values,
          backgroundColor: COLOR_ARRAY.slice(0, 10),
          borderRadius   : 6,
          borderSkipped  : false,
        }],
      },
      options: baseOptions({
        indexAxis: "y",
        scales: {
          x: {
            grid: { color: "#f3f4f6" },
            ticks: { callback: v => fmtCurrency(v), font: { size: 10 } },
          },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } },
        },
      }),
    }
  );
}

// ── Chart 10: Quantity Sold per Category (bar) ────────────────────────────────
function renderQtyCategory(data) {
  destroyChart("qty-category");

  const grouped = groupSum(data, "Product_Category", "Quantity_Sold");
  const labels  = Object.keys(grouped).sort();
  const values  = labels.map(k => grouped[k]);

  chartInstances["qty-category"] = new Chart(
    document.getElementById("chart-qty-category").getContext("2d"),
    {
      type: "bar",
      data: {
        labels,
        datasets: [{
          label          : "Quantity Sold",
          data           : values,
          backgroundColor: [COLORS.emerald, COLORS.sky, COLORS.amber, COLORS.rose, COLORS.violet],
          borderRadius   : 6,
          borderSkipped  : false,
        }],
      },
      options: baseOptions({
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 12 } } },
          y: {
            grid: { color: "#f3f4f6" },
            ticks: { font: { size: 11 }, callback: v => fmtNumber(v) },
          },
        },
      }),
    }
  );
}

// ── Master render — called every time a filter changes ───────────────────────
function renderAll(allData) {
  const filtered = applyFilters(allData);

  updateKPIs(filtered);
  renderTrend(filtered);
  renderRegion(filtered);
  renderCategory(filtered);
  renderSalesRep(filtered);
  renderCustomer(filtered);
  renderPayment(filtered);
  renderChannel(filtered);
  renderScatter(filtered);
  renderTop10(filtered);
  renderQtyCategory(filtered);
}

// ── Bootstrap: fetch JSON, wire up filters, first render ─────────────────────
(async function init() {
  try {
    const res  = await fetch("sales_data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const allData = await res.json();

    // Populate filter options from real data
    populateFilters(allData);

    // Initial render with no filters applied
    renderAll(allData);

    // Wire up filter dropdowns — re-render on every change
    ["filter-region", "filter-category", "filter-customer", "filter-channel"].forEach(id => {
      document.getElementById(id).addEventListener("change", () => renderAll(allData));
    });

    // Reset button — clear all selects back to "all", then re-render
    document.getElementById("btn-reset").addEventListener("click", () => {
      ["filter-region", "filter-category", "filter-customer", "filter-channel"].forEach(id => {
        document.getElementById(id).value = "all";
      });
      renderAll(allData);
    });

  } catch (err) {
    console.error("Failed to load sales_data.json:", err);
    document.getElementById("record-count").textContent = "⚠ Data load error";
  }
})();
