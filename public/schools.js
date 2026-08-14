"use strict";

const PAGE_SIZE = 100;
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
  next: document.getElementById("schoolsNextPage")
};

let schools = [];
let filteredSchools = [];
let currentPage = 1;

init().catch((error) => {
  console.error("Nie udało się wczytać listy szkół.", error);
  ui.count.textContent = "Lista szkół jest chwilowo niedostępna";
  ui.tableWrap.classList.add("hidden");
  ui.error.classList.remove("hidden");
});

async function init() {
  const response = await fetch("/schools-data.json?v=20260814-1");
  if (!response.ok) throw new Error(`Błąd pobierania danych: ${response.status}`);

  schools = (await response.json()).filter(isValidSchool);
  populateProvinces();
  populateCounties();
  bindEvents();
  applyFilters();
}

function isValidSchool(school) {
  return school
    && typeof school.number === "string"
    && typeof school.name === "string"
    && school.name.trim();
}

function populateProvinces() {
  const provinces = [...new Set(schools.map((school) => school.province).filter(Boolean))].sort(collator.compare);
  const fragment = document.createDocumentFragment();

  provinces.forEach((province) => {
    const option = document.createElement("option");
    option.value = province;
    option.textContent = province;
    fragment.append(option);
  });

  ui.province.append(fragment);
}

function populateCounties() {
  const province = ui.province.value;
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = province ? "Wszystkie powiaty" : "Najpierw wybierz województwo";
  ui.county.replaceChildren(placeholder);
  ui.county.disabled = !province;

  if (!province) return;

  const counties = [...new Set(schools
    .filter((school) => school.province === province)
    .map((school) => school.county)
    .filter(Boolean))].sort(collator.compare);
  const fragment = document.createDocumentFragment();

  counties.forEach((county) => {
    const option = document.createElement("option");
    option.value = county;
    option.textContent = county;
    fragment.append(option);
  });

  ui.county.append(fragment);
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
    const matchesProvince = !province || school.province === province;
    const matchesCounty = !county || school.county === county;
    const matchesQuery = !query || normalize(`${school.name} ${school.city}`).includes(query);
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
