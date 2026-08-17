"use strict";

const PAGE_SIZE = 200;
const ADMIN_EMAIL = "wiechowscy@gmail.com";
const SOURCE_SPREADSHEET_ID = "1ujq-NrkerzbKIN8UOtGKis4HeophSZ4o9AwPNfC8NXM";
const SOURCE_SHEET_ID = 129267205;
const FIREBASE_VERSION = "12.16.0";
const CHART_COLORS = ["#2647df", "#128060", "#f26a21", "#18318f"];
const collator = new Intl.Collator("pl", { sensitivity: "base" });

const ui = {
  form: document.getElementById("schoolsFilters"),
  search: document.getElementById("schoolSearch"),
  province: document.getElementById("provinceFilter"),
  county: document.getElementById("countyFilter"),
  clear: document.getElementById("clearSchoolFilters"),
  count: document.getElementById("schoolsResultCount"),
  pageInfo: document.getElementById("schoolsPageInfo"),
  body: document.getElementById("schoolsTableBody"),
  tableWrap: document.querySelector(".schools-table-wrap"),
  empty: document.getElementById("schoolsEmpty"),
  error: document.getElementById("schoolsError"),
  pagination: document.getElementById("schoolsPagination"),
  pageNumber: document.getElementById("schoolsPageNumber"),
  previous: document.getElementById("schoolsPrevPage"),
  next: document.getElementById("schoolsNextPage"),
  totalCounter: document.getElementById("schoolsTotalCounter"),
  provincesCounter: document.getElementById("provincesTotalCounter"),
  largestProvinceCounter: document.getElementById("largestProvinceCounter"),
  largestProvinceLabel: document.getElementById("largestProvinceLabel"),
  provinceChart: document.getElementById("provinceChart"),
  sync: document.getElementById("syncSchoolsBtn"),
  syncStatus: document.getElementById("schoolsSyncStatus")
};

let schools = [];
let filteredSchools = [];
let currentPage = 1;
let onlineSchools = null;
let currentUser = null;

init().catch(showLoadError);

async function init() {
  bindEvents();

  const response = await fetch("/schools-data.json?v=20260814-1");
  if (!response.ok) throw new Error(`Błąd pobierania danych: ${response.status}`);

  applySchoolData(await response.json());
  initializeOnlineSchools().catch((error) => {
    console.warn("Nie udało się połączyć z aktualizowaną listą szkół.", error);
  });
}

function showLoadError(error) {
  console.error("Nie udało się wczytać listy szkół.", error);
  ui.count.textContent = "Lista szkół jest chwilowo niedostępna";
  ui.tableWrap.classList.add("hidden");
  ui.error.classList.remove("hidden");
}

function applySchoolData(entries) {
  const validEntries = Array.isArray(entries) ? entries.filter(isValidSchool) : [];
  if (!validEntries.length) return;

  schools = groupSchools(validEntries);
  currentPage = 1;
  populateProvinces();
  populateCounties();
  renderOverview();
  applyFilters();
}

function isValidSchool(school) {
  return school
    && typeof school.number === "string"
    && typeof school.name === "string"
    && school.name.trim();
}

function groupSchools(entries) {
  const groups = new Map();

  entries.forEach((school) => {
    const base = String(school.number).match(/\d+/)?.[0] || school.number;
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(school);
  });

  return [...groups.entries()].map(([base, variants]) => {
    const labeledVariants = variants.map((variant, index) => ({
      ...variant,
      label: variantLabel(variant.number, index),
      displayNumber: variants.length > 1
        ? `#${base} ${variantLabel(variant.number, index)}`
        : variant.number
    }));

    return {
      number: combineVariants(labeledVariants, "displayNumber", false),
      name: combineVariants(labeledVariants, "name"),
      city: combineVariants(labeledVariants, "city"),
      province: combineVariants(labeledVariants, "province"),
      type: combineVariants(labeledVariants, "type"),
      county: combineVariants(labeledVariants, "county"),
      variants: labeledVariants
    };
  });
}

function variantLabel(number, index) {
  const suffix = String(number).match(/\d+\s*([a-z])$/i)?.[1];
  return (suffix || String.fromCharCode(65 + index)).toUpperCase();
}

function combineVariants(variants, field, addLabels = true) {
  const values = variants.map((variant) => variant[field] || "—");
  if (values.every((value) => value === values[0])) return values[0];
  return variants.map((variant) => {
    const value = variant[field] || "—";
    return addLabels ? `${variant.label}: ${value}` : value;
  }).join("\n");
}

function populateProvinces() {
  const selectedProvince = ui.province.value;
  const placeholder = new Option("Wszystkie województwa", "");
  const provinces = [...new Set(schools.map((school) => school.variants[0]?.province).filter(Boolean))].sort(collator.compare);
  const options = provinces.map((province) => new Option(province, province));

  ui.province.replaceChildren(placeholder, ...options);
  if (provinces.includes(selectedProvince)) ui.province.value = selectedProvince;
}

function populateCounties() {
  const province = ui.province.value;
  const selectedCounty = ui.county.value;
  const placeholder = new Option(province ? "Wszystkie powiaty" : "Najpierw wybierz województwo", "");
  ui.county.replaceChildren(placeholder);
  ui.county.disabled = !province;

  if (!province) return;

  const counties = [...new Set(schools
    .map((school) => school.variants[0])
    .filter((school) => school?.province === province)
    .map((school) => school?.county)
    .filter(Boolean))].sort(collator.compare);
  ui.county.append(...counties.map((county) => new Option(county, county)));
  if (counties.includes(selectedCounty)) ui.county.value = selectedCounty;
}

function bindEvents() {
  ui.form.addEventListener("submit", (event) => event.preventDefault());
  ui.search.addEventListener("input", () => {
    currentPage = 1;
    applyFilters();
  });
  ui.province.addEventListener("change", () => {
    populateCounties();
    currentPage = 1;
    applyFilters();
  });
  ui.county.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });
  ui.clear.addEventListener("click", () => {
    ui.form.reset();
    populateCounties();
    currentPage = 1;
    applyFilters();
    ui.search.focus();
  });
  ui.previous.addEventListener("click", () => changePage(currentPage - 1));
  ui.next.addEventListener("click", () => changePage(currentPage + 1));
  ui.sync.addEventListener("click", syncSchoolsFromGoogle);
}

function renderOverview() {
  const counts = new Map();

  schools.forEach((school) => {
    const province = school.variants.find((variant) => variant.province)?.province;
    if (province) counts.set(province, (counts.get(province) || 0) + 1);
  });

  const provinceStats = [...counts.entries()]
    .map(([province, count]) => ({ province, count }))
    .sort((a, b) => b.count - a.count || collator.compare(a.province, b.province));
  const largest = provinceStats[0] || { province: "Brak danych", count: 0 };

  animateCounter(ui.totalCounter, schools.length);
  animateCounter(ui.provincesCounter, provinceStats.length);
  animateCounter(ui.largestProvinceCounter, largest.count);
  ui.largestProvinceLabel.textContent = `Najwięcej: ${largest.province}`;

  const maximum = Math.max(1, largest.count);
  ui.provinceChart.replaceChildren(...provinceStats.map((stat, index) => createChartRow(stat, maximum, index)));
}

function createChartRow(stat, maximum, index) {
  const row = document.createElement("div");
  row.className = "province-chart-row";

  const label = document.createElement("span");
  label.className = "province-chart-label";
  label.textContent = stat.province;
  label.title = stat.province;

  const track = document.createElement("span");
  track.className = "province-chart-track";
  track.setAttribute("aria-hidden", "true");

  const bar = document.createElement("span");
  bar.className = "province-chart-bar";
  bar.style.setProperty("--bar-width", `${(stat.count / maximum) * 100}%`);
  bar.style.setProperty("--bar-color", CHART_COLORS[index % CHART_COLORS.length]);
  track.append(bar);

  const value = document.createElement("strong");
  value.className = "province-chart-value";
  value.textContent = stat.count;

  row.append(label, track, value);
  return row;
}

function animateCounter(element, target) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    element.textContent = target;
    return;
  }

  const startedAt = performance.now();
  const duration = 650;

  function tick(now) {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - ((1 - progress) ** 3);
    element.textContent = Math.round(target * eased);
    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

async function initializeOnlineSchools() {
  const config = window.STATION_APP_CONFIG || {};
  if (!config.apiKey || !config.authDomain || !config.projectId || !config.appId) return;

  const { initializeApp } = await import(`https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-app.js`);
  const { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup } = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-auth.js`
  );
  const { doc, getDoc, getFirestore, serverTimestamp, setDoc } = await import(
    `https://www.gstatic.com/firebasejs/${FIREBASE_VERSION}/firebase-firestore.js`
  );

  const firebaseApp = initializeApp(config);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const schoolsDocument = doc(db, "publicData", "schools");
  onlineSchools = { auth, db, schoolsDocument, GoogleAuthProvider, serverTimestamp, setDoc, signInWithPopup };

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const isAdmin = Boolean(user?.emailVerified && normalize(user.email) === normalize(ADMIN_EMAIL));
    ui.sync.classList.toggle("hidden", !isAdmin);
    if (!isAdmin) ui.syncStatus.textContent = "";
  });

  const snapshot = await getDoc(schoolsDocument);
  if (snapshot.exists() && Array.isArray(snapshot.data().rows)) {
    applySchoolData(snapshot.data().rows);
  }
}

async function syncSchoolsFromGoogle() {
  if (!onlineSchools || !currentUser) return;

  ui.sync.disabled = true;
  ui.syncStatus.textContent = "Pobieram nowe wpisy…";

  try {
    const provider = new onlineSchools.GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await onlineSchools.signInWithPopup(onlineSchools.auth, provider);
    if (!result.user.emailVerified || normalize(result.user.email) !== normalize(ADMIN_EMAIL)) {
      throw new Error("Do aktualizacji listy potrzebne jest konto administratora.");
    }

    const credential = onlineSchools.GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error("Google nie przekazał dostępu do arkusza.");

    const rows = await fetchSchoolsFromGoogle(credential.accessToken);
    await onlineSchools.setDoc(onlineSchools.schoolsDocument, {
      rows,
      sourceRowCount: rows.length,
      updatedAt: onlineSchools.serverTimestamp(),
      updatedBy: result.user.email
    }, { merge: true });

    applySchoolData(rows);
    ui.syncStatus.textContent = `Zaktualizowano: ${schools.length} szkół.`;
  } catch (error) {
    console.error("Nie udało się zaktualizować listy szkół.", error);
    ui.syncStatus.textContent = syncErrorMessage(error);
  } finally {
    ui.sync.disabled = false;
  }
}

async function fetchSchoolsFromGoogle(accessToken) {
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SOURCE_SPREADSHEET_ID}?fields=sheets.properties`;
  const metadata = await googleApiRequest(metadataUrl, accessToken);
  const sourceSheet = metadata.sheets?.find((sheet) => sheet.properties?.sheetId === SOURCE_SHEET_ID);
  if (!sourceSheet?.properties?.title) throw new Error("Nie znaleziono właściwej zakładki w arkuszu.");

  const escapedTitle = sourceSheet.properties.title.replace(/'/g, "''");
  const range = encodeURIComponent(`'${escapedTitle}'!A:G`);
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SOURCE_SPREADSHEET_ID}/values/${range}`;
  const data = await googleApiRequest(valuesUrl, accessToken);
  const rows = parseSheetRows(data.values || []);

  if (!rows.length) throw new Error("Arkusz nie zawiera żadnych szkół.");
  return rows;
}

async function googleApiRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (response.ok) return response.json();

  const details = await response.json().catch(() => ({}));
  const error = new Error(details.error?.message || `Błąd usługi Google: ${response.status}`);
  error.status = response.status;
  throw error;
}

function parseSheetRows(values) {
  return values.slice(1).map((row) => ({
    number: formatSchoolNumber(row[0]),
    name: String(row[1] || "").trim(),
    city: String(row[3] || "").trim(),
    province: String(row[4] || "").trim(),
    type: String(row[5] || "").trim(),
    county: String(row[6] || "").trim()
  })).filter(isValidSchool);
}

function formatSchoolNumber(value) {
  const number = String(value || "").trim().replace(/^#/, "");
  return number ? `#${number}` : "";
}

function syncErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") return "Aktualizacja została anulowana.";
  if (error?.status === 403) return "Brak dostępu do arkusza lub usługa Arkuszy Google nie jest jeszcze włączona.";
  return error?.message || "Nie udało się pobrać nowych szkół.";
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pl")
    .replace(/ł/g, "l")
    .trim();
}

function applyFilters() {
  const query = normalize(ui.search.value);
  const province = ui.province.value;
  const county = ui.county.value;

  filteredSchools = schools.filter((school) => {
    const primary = school.variants[0] || {};
    const matchesProvince = !province || primary.province === province;
    const matchesCounty = !county || primary.county === county;
    const matchesQuery = !query || school.variants.some((variant) => {
      return normalize(`${variant.name} ${variant.city}`).includes(query);
    });
    return matchesProvince && matchesCounty && matchesQuery;
  });

  const pages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  currentPage = Math.min(currentPage, pages);
  render();
}

function render() {
  const start = (currentPage - 1) * PAGE_SIZE;
  const pageRows = filteredSchools.slice(start, start + PAGE_SIZE);
  const pages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));

  ui.body.replaceChildren(...pageRows.map(createRow));
  ui.count.textContent = resultLabel(filteredSchools.length);
  ui.pageInfo.textContent = filteredSchools.length
    ? `Wyświetlane ${start + 1}–${start + pageRows.length} z ${filteredSchools.length}`
    : "";
  ui.pageNumber.textContent = `Strona ${currentPage} z ${pages}`;
  ui.previous.disabled = currentPage === 1;
  ui.next.disabled = currentPage === pages;
  ui.empty.classList.toggle("hidden", filteredSchools.length !== 0);
  ui.tableWrap.classList.toggle("hidden", filteredSchools.length === 0);
  ui.pagination.classList.toggle("hidden", filteredSchools.length <= PAGE_SIZE);
}

function createRow(school) {
  const row = document.createElement("tr");
  const values = [
    ["Numer", school.number],
    ["Nazwa placówki", school.name],
    ["Miejscowość", school.city],
    ["Województwo", school.province],
    ["Typ placówki", school.type],
    ["Powiat", school.county]
  ];

  values.forEach(([label, value]) => {
    const cell = document.createElement("td");
    cell.dataset.label = label;
    cell.textContent = value || "—";
    row.append(cell);
  });

  return row;
}

function resultLabel(count) {
  if (count === 1) return "1 placówka";
  const lastTwo = count % 100;
  const last = count % 10;
  if (last >= 2 && last <= 4 && !(lastTwo >= 12 && lastTwo <= 14)) return `${count} placówki`;
  return `${count} placówek`;
}

function changePage(page) {
  const pages = Math.max(1, Math.ceil(filteredSchools.length / PAGE_SIZE));
  if (page < 1 || page > pages || page === currentPage) return;
  currentPage = page;
  render();
  document.querySelector(".schools-results-bar").scrollIntoView({ behavior: "smooth", block: "start" });
}
