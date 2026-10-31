/* =====================================================================
   script.js — Netflix Catalogue Analytics Dashboard
   IBM Capstone Project · Vanilla JS · Chart.js · netflix_data.json
   ---------------------------------------------------------------------
   Architecture:
     1. fetch()  — load netflix_data.json once
     2. populateFilters() — build <select> options from real data
     3. applyFilters()    — return filtered subset
     4. renderAll()       — update KPIs + all charts + table
     5. Event listeners  — filters, search, pagination, theme toggle
   ===================================================================== */

"use strict";

// ── Theme palette ────────────────────────────────────────────────────────────
const NF_RED   = "#E50914";
const NF_GRAY  = "#808080";
const NF_TEXT  = "#e5e5e5";

// Multi-colour palette for bar / histogram charts
const PALETTE = [
  "#E50914","#e87c87","#ff6b6b","#ffa94d","#ffd43b",
  "#69db7c","#4dabf7","#748ffc","#da77f2","#f783ac",
];

// Shades for donut
const DONUT_COLORS = ["#E50914","#4dabf7","#69db7c","#ffd43b","#da77f2","#ffa94d"];

// ── Chart instance registry ──────────────────────────────────────────────────
const charts = {};

// ── State ────────────────────────────────────────────────────────────────────
let currentPage = 1;
const PAGE_SIZE = 15;
let filteredData = [];       // currently filtered rows (for table)
let tableSearchQuery = "";   // live search string

// ── Utilities ────────────────────────────────────────────────────────────────

/** Destroy a Chart.js instance by key */
function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

/** Count by key in an array of objects */
function countBy(arr, key) {
  return arr.reduce((acc, r) => { acc[r[key]] = (acc[r[key]] || 0) + 1; return acc; }, {});
}

/** Count occurrences across array-valued fields (e.g. genres, countries) */
function countFlat(arr, arrayKey) {
  const acc = {};
  arr.forEach(r => {
    // Guard: PowerShell ConvertTo-Json may serialize single-item arrays as strings
    const val = r[arrayKey];
    const items = Array.isArray(val) ? val : (val ? [val] : []);
    items.forEach(v => { acc[v] = (acc[v] || 0) + 1; });
  });
  return acc;
}

/** Return top N entries from a count object, sorted descending */
function topN(countObj, n) {
  return Object.entries(countObj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

/** Shared Chart.js options */
function baseOpts(extra = {}) {
  const isDark = document.documentElement.classList.contains("dark");
  const gridColor = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const tickColor = isDark ? NF_GRAY : "#555";

  return {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400, easing: "easeInOutQuart" },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#1a1a1a" : "#fff",
        titleColor: isDark ? "#e5e5e5" : "#141414",
        bodyColor: isDark ? "#c0c0c0" : "#555",
        borderColor: isDark ? "#3a3a3a" : "#e0e0e0",
        borderWidth: 1,
        padding: 10,
        cornerRadius: 6,
        boxPadding: 4,
      },
    },
    scales: {
      x: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
      y: { grid: { color: gridColor }, ticks: { color: tickColor, font: { size: 11 } } },
      ...((extra.scales) || {}),
    },
    ...extra,
  };
}

// ── Populate filter <select> elements ────────────────────────────────────────
function populateFilters(all) {
  // Type
  const types = [...new Set(all.map(d => d.type))].sort();
  fillSelect("f-type",    types);

  // Country — flatten multi-value array
  const countries = Object.keys(countFlat(all, "countries"))
    .filter(c => c !== "Unknown")
    .sort();
  fillSelect("f-country", countries);

  // Genre
  const genres = Object.keys(countFlat(all, "genres"))
    .filter(g => g !== "Unknown")
    .sort();
  fillSelect("f-genre", genres);

  // Rating
  const ratings = [...new Set(all.map(d => d.rating))].sort();
  fillSelect("f-rating", ratings);

  // Release year bounds
  const years = all.map(d => d.release_year).filter(Boolean);
  const minY = Math.min(...years), maxY = Math.max(...years);
  document.getElementById("f-year-min").placeholder = String(minY);
  document.getElementById("f-year-max").placeholder = String(maxY);
  document.getElementById("f-year-min").min = minY;
  document.getElementById("f-year-max").max = maxY;
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  while (sel.options.length > 1) sel.remove(1);
  values.forEach(v => {
    const o = document.createElement("option");
    o.value = v; o.textContent = v;
    sel.appendChild(o);
  });
}

// ── Apply active filters ──────────────────────────────────────────────────────
function applyFilters(all) {
  const type    = document.getElementById("f-type").value;
  const country = document.getElementById("f-country").value;
  const genre   = document.getElementById("f-genre").value;
  const rating  = document.getElementById("f-rating").value;
  const yMin    = parseInt(document.getElementById("f-year-min").value) || null;
  const yMax    = parseInt(document.getElementById("f-year-max").value) || null;

  return all.filter(r => {
    if (type    !== "all" && r.type   !== type)  return false;
    // Ensure fields are arrays before calling .includes() — guards against string-serialized single-item arrays
    const rCountries = Array.isArray(r.countries) ? r.countries : (r.countries ? [r.countries] : []);
    const rGenres    = Array.isArray(r.genres)    ? r.genres    : (r.genres    ? [r.genres]    : []);
    if (country !== "all" && !rCountries.includes(country))  return false;
    if (genre   !== "all" && !rGenres.includes(genre))       return false;
    if (rating  !== "all" && r.rating !== rating)            return false;
    if (yMin !== null && r.release_year < yMin)              return false;
    if (yMax !== null && r.release_year > yMax)              return false;
    return true;
  });
}

// ── Key Insights (auto-generated from data) ───────────────────────────────────
function renderInsights(data) {
  const container = document.getElementById("insights-container");
  container.innerHTML = "";

  const movies   = data.filter(d => d.type === "Movie");
  const tvshows  = data.filter(d => d.type === "TV Show");

  // Insight 1: content split
  const moviePct = data.length ? ((movies.length / data.length) * 100).toFixed(1) : 0;
  addInsight(container, `${moviePct}% Movies`,
    `Out of ${data.length.toLocaleString()} titles, ${movies.length.toLocaleString()} are Movies and ${tvshows.length.toLocaleString()} are TV Shows.`);

  // Insight 2: top country
  const countryCounts = countFlat(data, "countries");
  delete countryCounts["Unknown"];
  const topCountry = topN(countryCounts, 1)[0];
  if (topCountry) {
    addInsight(container, `#1 Country: ${topCountry[0]}`,
      `${topCountry[0]} leads with ${topCountry[1].toLocaleString()} titles — ${((topCountry[1]/data.length)*100).toFixed(1)}% of the catalogue.`);
  }

  // Insight 3: top genre
  const genreCounts = countFlat(data, "genres");
  const topGenre = topN(genreCounts, 1)[0];
  if (topGenre) {
    addInsight(container, `Top Genre: ${topGenre[0]}`,
      `"${topGenre[0]}" is the most common genre with ${topGenre[1].toLocaleString()} appearances.`);
  }

  // Insight 4: avg movie duration
  const movieDurations = movies.map(d => d.duration_min).filter(Boolean);
  if (movieDurations.length) {
    const avg = (movieDurations.reduce((a, b) => a + b, 0) / movieDurations.length).toFixed(0);
    addInsight(container, `Avg Movie: ${avg} min`,
      `Based on ${movieDurations.length.toLocaleString()} movies with known duration, average runtime is ${avg} minutes.`);
  }

  // Insight 5: most productive year (year_added)
  const yearCounts = {};
  data.forEach(r => { if (r.year_added) yearCounts[r.year_added] = (yearCounts[r.year_added] || 0) + 1; });
  const topYear = Object.entries(yearCounts).sort((a,b)=>b[1]-a[1])[0];
  if (topYear) {
    addInsight(container, `Peak Year: ${topYear[0]}`,
      `${topYear[0]} saw the most additions with ${topYear[1].toLocaleString()} new titles added to the platform.`);
  }
}

function addInsight(container, num, text) {
  const div = document.createElement("div");
  div.className = "insight-card";
  div.innerHTML = `<div class="insight-num">${num}</div><p>${text}</p>`;
  container.appendChild(div);
}

// ── KPIs ─────────────────────────────────────────────────────────────────────
function updateKPIs(data) {
  const movies  = data.filter(d => d.type === "Movie");
  const tvshows = data.filter(d => d.type === "TV Show");
  const uniqueCountries = new Set(
    data.flatMap(d => Array.isArray(d.countries) ? d.countries : (d.countries ? [d.countries] : []))
        .filter(c => c !== "Unknown")
  ).size;
  const durations = movies.map(d => d.duration_min).filter(Boolean);
  const avgDur = durations.length ? Math.round(durations.reduce((a,b)=>a+b,0)/durations.length) : 0;

  set("kpi-total",        data.length.toLocaleString());
  set("kpi-movies",       movies.length.toLocaleString());
  set("kpi-movies-pct",   data.length ? ((movies.length/data.length)*100).toFixed(1)+"% of catalogue" : "—");
  set("kpi-tvshows",      tvshows.length.toLocaleString());
  set("kpi-tvshows-pct",  data.length ? ((tvshows.length/data.length)*100).toFixed(1)+"% of catalogue" : "—");
  set("kpi-countries",    uniqueCountries.toLocaleString());
  set("kpi-avg-duration", avgDur ? avgDur + " min" : "—");
  set("record-count",     data.length.toLocaleString() + " titles");
}

function set(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── Chart 1: Movie vs TV Show (doughnut) ─────────────────────────────────────
function renderTypeChart(data) {
  destroyChart("type");
  const counts = countBy(data, "type");
  const labels = Object.keys(counts);
  const values = labels.map(k => counts[k]);

  charts.type = new Chart(document.getElementById("chart-type").getContext("2d"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: [NF_RED, "#4dabf7"], borderWidth: 0, hoverOffset: 10 }] },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: "60%",
      animation: { duration: 400 },
      plugins: {
        legend: { display: true, position: "bottom", labels: { color: NF_TEXT, font: { size: 11 }, padding: 14 } },
        tooltip: { ...baseOpts().plugins.tooltip },
      },
    },
  });
}

// ── Chart 2: Titles Added per Year (line chart) ───────────────────────────────
function renderTrendChart(data) {
  destroyChart("trend");
  const yearCounts = {};
  data.forEach(r => { if (r.year_added) yearCounts[r.year_added] = (yearCounts[r.year_added]||0)+1; });
  const labels = Object.keys(yearCounts).sort();
  const values = labels.map(k => yearCounts[k]);

  const ctx = document.getElementById("chart-trend").getContext("2d");
  const grad = ctx.createLinearGradient(0,0,0,280);
  grad.addColorStop(0, "rgba(229,9,20,0.35)");
  grad.addColorStop(1, "rgba(229,9,20,0)");

  charts.trend = new Chart(ctx, {
    type: "line",
    data: { labels, datasets: [{ label: "Titles Added", data: values, borderColor: NF_RED, backgroundColor: grad,
      borderWidth: 2.5, fill: true, tension: 0.38, pointRadius: 4, pointHoverRadius: 6,
      pointBackgroundColor: NF_RED }] },
    options: baseOpts(),
  });
}

// ── Chart 3: Top 10 Countries (horizontal bar) ───────────────────────────────
function renderCountriesChart(data) {
  destroyChart("countries");
  const counts = countFlat(data, "countries");
  delete counts["Unknown"];
  const top = topN(counts, 10);
  const labels = top.map(e => e[0]);
  const values = top.map(e => e[1]);

  const isDark = document.documentElement.classList.contains("dark");
  const gridColor = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const tickColor = isDark ? NF_GRAY : "#555";

  charts.countries = new Chart(document.getElementById("chart-countries").getContext("2d"), {
    type: "polarArea",
    data: {
      labels,
      datasets: [{
        data            : values,
        backgroundColor : PALETTE.map(c => c + "cc"),  // 80% opacity fill
        borderColor     : PALETTE,
        borderWidth     : 1.5,
        hoverBackgroundColor: PALETTE,
      }],
    },
    options: {
      responsive         : true,
      maintainAspectRatio: false,
      animation          : { duration: 450, easing: "easeInOutQuart" },
      scales: {
        r: {
          ticks       : { display: false },           // hide radial numbers — too cluttered
          grid        : { color: gridColor },
          angleLines  : { color: gridColor },
          pointLabels : { display: false },
        },
      },
      plugins: {
        legend: {
          display  : true,
          position : "right",
          labels   : {
            color      : isDark ? NF_TEXT : "#1a1a1a",
            font       : { size: 11 },
            padding    : 10,
            boxWidth   : 12,
            boxHeight  : 12,
            borderRadius: 3,
            // Append count to each label for quick reading
            generateLabels: chart => {
              const ds = chart.data.datasets[0];
              return chart.data.labels.map((lbl, i) => ({
                text        : `${lbl} (${ds.data[i].toLocaleString()})`,
                fillStyle   : ds.backgroundColor[i],
                strokeStyle : ds.borderColor[i],
                lineWidth   : 1,
                index       : i,
              }));
            },
          },
        },
        tooltip: {
          backgroundColor : isDark ? "#1a1a1a" : "#fff",
          titleColor      : isDark ? NF_TEXT   : "#141414",
          bodyColor       : isDark ? "#c0c0c0" : "#555",
          borderColor     : isDark ? "#3a3a3a" : "#e0e0e0",
          borderWidth     : 1,
          padding         : 10,
          cornerRadius    : 6,
          callbacks       : {
            label: ctx => ` ${ctx.label}: ${ctx.raw.toLocaleString()} titles`,
          },
        },
      },
    },
  });
}

// ── Chart 4: Top 10 Genres (horizontal bar) ──────────────────────────────────
function renderGenresChart(data) {
  destroyChart("genres");
  const counts = countFlat(data, "genres");
  delete counts["Unknown"];
  const top = topN(counts, 10);
  const labels = top.map(e=>e[0]);
  const values = top.map(e=>e[1]);

  charts.genres = new Chart(document.getElementById("chart-genres").getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderRadius: 5, borderSkipped: false }] },
    options: baseOpts({ indexAxis: "y", scales: { x: { ...baseOpts().scales.x }, y: { grid:{display:false}, ticks:{color:NF_GRAY,font:{size:11}} } } }),
  });
}

// ── Chart 5: Rating Distribution (bar) ───────────────────────────────────────
function renderRatingChart(data) {
  destroyChart("rating");
  const counts = countBy(data, "rating");
  const entries = Object.entries(counts).sort((a,b)=>b[1]-a[1]);
  const labels = entries.map(e=>e[0]);
  const values = entries.map(e=>e[1]);

  charts.rating = new Chart(document.getElementById("chart-rating").getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderRadius: 5, borderSkipped: false }] },
    options: baseOpts(),
  });
}

// ── Chart 6: Release Year Distribution (histogram) ────────────────────────────
function renderReleaseYearChart(data) {
  destroyChart("release-year");
  const yearCounts = {};
  data.forEach(r => { if (r.release_year) yearCounts[r.release_year] = (yearCounts[r.release_year]||0)+1; });
  const labels = Object.keys(yearCounts).sort();
  const values = labels.map(k => yearCounts[k]);

  charts["release-year"] = new Chart(document.getElementById("chart-release-year").getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: "rgba(229,9,20,0.6)", borderColor: NF_RED,
      borderWidth: 1, borderRadius: 2 }] },
    options: baseOpts({ scales: {
      x: { ...baseOpts().scales.x, ticks: { maxTicksLimit: 12, color: NF_GRAY, font:{size:10} } },
      y: { ...baseOpts().scales.y },
    }}),
  });
}

// ── Chart 7: Movie Duration Distribution (histogram) ─────────────────────────
function renderDurationChart(data) {
  destroyChart("duration");
  const durations = data.filter(d=>d.type==="Movie" && d.duration_min).map(d=>d.duration_min);

  if (!durations.length) {
    destroyChart("duration");
    return;
  }

  // Build buckets of 15 min width
  const bucketSize = 15;
  const maxDur = Math.max(...durations);
  const buckets = {};
  for (let start = 0; start <= maxDur; start += bucketSize) {
    const label = `${start}–${start+bucketSize-1}`;
    buckets[label] = 0;
  }
  durations.forEach(d => {
    const bucket = Math.floor(d / bucketSize) * bucketSize;
    const label = `${bucket}–${bucket+bucketSize-1}`;
    buckets[label] = (buckets[label] || 0) + 1;
  });

  const labels = Object.keys(buckets);
  const values = labels.map(k => buckets[k]);

  charts.duration = new Chart(document.getElementById("chart-duration").getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ label: "Movies", data: values, backgroundColor: "rgba(229,9,20,0.55)",
      borderColor: NF_RED, borderWidth: 1, borderRadius: 2, categoryPercentage: 1, barPercentage: 1 }] },
    options: baseOpts({ scales: {
      x: { ...baseOpts().scales.x, ticks: { maxTicksLimit: 16, color: NF_GRAY, font:{size:10} } },
      y: { ...baseOpts().scales.y },
    }}),
  });
}

// ── Chart 8: Top 10 Directors (horizontal bar) ───────────────────────────────
function renderDirectorsChart(data) {
  destroyChart("directors");
  const counts = countFlat(data, "directors");
  delete counts["Unknown"];
  const top = topN(counts, 10);
  const labels = top.map(e=>e[0]);
  const values = top.map(e=>e[1]);

  charts.directors = new Chart(document.getElementById("chart-directors").getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderRadius: 5, borderSkipped: false }] },
    options: baseOpts({ indexAxis: "y", scales: {
      x: { ...baseOpts().scales.x },
      y: { grid:{display:false}, ticks:{ color: NF_GRAY, font:{size:11} } }
    }}),
  });
}

// ── Chart 9: Top 10 Actors (horizontal bar) ──────────────────────────────────
function renderActorsChart(data) {
  destroyChart("actors");
  const counts = countFlat(data, "cast");
  delete counts["Unknown"];
  const top = topN(counts, 10);
  const labels = top.map(e=>e[0]);
  const values = top.map(e=>e[1]);

  charts.actors = new Chart(document.getElementById("chart-actors").getContext("2d"), {
    type: "bar",
    data: { labels, datasets: [{ data: values, backgroundColor: PALETTE, borderRadius: 5, borderSkipped: false }] },
    options: baseOpts({ indexAxis: "y", scales: {
      x: { ...baseOpts().scales.x },
      y: { grid:{display:false}, ticks:{ color: NF_GRAY, font:{size:11} } }
    }}),
  });
}

// ── Table: build rows for current page ───────────────────────────────────────
function renderTable() {
  const query = tableSearchQuery.trim().toLowerCase();

  // Search filter on top of already-filtered data
  const searched = query
    ? filteredData.filter(r => r.title.toLowerCase().includes(query))
    : filteredData;

  const total = searched.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  currentPage = Math.min(currentPage, totalPages);

  const start = (currentPage - 1) * PAGE_SIZE;
  const end   = Math.min(start + PAGE_SIZE, total);
  const slice = searched.slice(start, end);

  // Build rows
  const tbody = document.getElementById("tbl-body");
  tbody.innerHTML = "";
  slice.forEach(r => {
    const badge = r.type === "Movie"
      ? `<span class="badge-movie">Movie</span>`
      : `<span class="badge-tvshow">TV Show</span>`;
    const dur = r.type === "Movie"
      ? (r.duration_min ? r.duration_min + " min" : r.duration_raw || "—")
      : (r.duration_seasons ? r.duration_seasons + (r.duration_seasons===1?" Season":" Seasons") : r.duration_raw || "—");
    const countriesArr = Array.isArray(r.countries) ? r.countries : (r.countries ? [r.countries] : []);
    const country = countriesArr.filter(c=>c!=="Unknown").slice(0,2).join(", ") || "Unknown";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td title="${r.title}">${r.title}</td>
      <td>${badge}</td>
      <td>${r.release_year || "—"}</td>
      <td>${r.rating}</td>
      <td>${dur}</td>
      <td>${country}</td>`;
    tbody.appendChild(tr);
  });

  // Pagination controls
  set("pg-from",  total ? start+1 : 0);
  set("pg-to",    end);
  set("pg-total", total.toLocaleString());
  set("pg-info",  `Page ${currentPage} / ${totalPages}`);
  set("tbl-count", total.toLocaleString() + " titles");
  document.getElementById("pg-prev").disabled = currentPage <= 1;
  document.getElementById("pg-next").disabled = currentPage >= totalPages;
}

// ── Master render ─────────────────────────────────────────────────────────────
function renderAll(allData) {
  filteredData = applyFilters(allData);

  renderInsights(filteredData);
  updateKPIs(filteredData);
  renderTypeChart(filteredData);
  renderTrendChart(filteredData);
  renderCountriesChart(filteredData);
  renderGenresChart(filteredData);
  renderRatingChart(filteredData);
  renderReleaseYearChart(filteredData);
  renderDurationChart(filteredData);
  renderDirectorsChart(filteredData);
  renderActorsChart(filteredData);

  currentPage = 1;
  tableSearchQuery = "";
  document.getElementById("tbl-search").value = "";
  renderTable();
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────
// ── Normalize array fields that PowerShell may serialize as plain strings ────
// ConvertTo-Json collapses single-element arrays to strings; fix that here.
function normalizeArrayFields(data) {
  const ARRAY_FIELDS = ["directors", "cast", "countries", "genres"];
  data.forEach(r => {
    ARRAY_FIELDS.forEach(field => {
      if (!Array.isArray(r[field])) {
        // null / undefined → ["Unknown"], string → wrap in array
        r[field] = r[field] ? [r[field]] : ["Unknown"];
      }
    });
  });
}

(async function init() {
  try {
    const res = await fetch("netflix_data.json");
    if (!res.ok) throw new Error(`HTTP ${res.status} — pastikan Live Server dibuka dari folder CAPSTONE_PROJECT/`);
    // Strip UTF-8 BOM (\uFEFF) jika ada — defensif terhadap editor yg menyimpan dengan BOM
    const raw = (await res.text()).replace(/^\uFEFF/, "");
    const allData = JSON.parse(raw);

    // Fix single-element arrays collapsed to strings by PowerShell ConvertTo-Json
    normalizeArrayFields(allData);

    // One-time setup
    populateFilters(allData);
    renderAll(allData);

    // ── Filter listeners ──
    ["f-type","f-country","f-genre","f-rating"].forEach(id => {
      document.getElementById(id).addEventListener("change", () => renderAll(allData));
    });
    ["f-year-min","f-year-max"].forEach(id => {
      document.getElementById(id).addEventListener("input", () => renderAll(allData));
    });

    // ── Reset button ──
    document.getElementById("btn-reset").addEventListener("click", () => {
      ["f-type","f-country","f-genre","f-rating"].forEach(id => {
        document.getElementById(id).value = "all";
      });
      document.getElementById("f-year-min").value = "";
      document.getElementById("f-year-max").value = "";
      renderAll(allData);
    });

    // ── Table search (debounced 250 ms) ──
    let searchTimer;
    document.getElementById("tbl-search").addEventListener("input", e => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        tableSearchQuery = e.target.value;
        currentPage = 1;
        renderTable();
      }, 250);
    });

    // ── Pagination ──
    document.getElementById("pg-prev").addEventListener("click", () => { currentPage--; renderTable(); });
    document.getElementById("pg-next").addEventListener("click", () => { currentPage++; renderTable(); });

    // ── Dark / Light mode toggle ──
    document.getElementById("btn-theme").addEventListener("click", () => {
      const html = document.documentElement;
      const isDark = html.classList.toggle("dark");
      document.getElementById("btn-theme").textContent = isDark ? "☀" : "🌙";
      // Re-render all charts to apply new grid colours
      renderAll(allData);
    });

  } catch (err) {
    console.error("Failed to load netflix_data.json:", err);
    set("record-count", "⚠ Data load error");
    document.getElementById("insights-container").innerHTML =
      `<div class="insight-card"><div class="insight-num">Error</div><p>${err.message}</p></div>`;
  }
})();
