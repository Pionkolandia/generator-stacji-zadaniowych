"use strict";

const RENTAL_EDITOR_EMAILS = new Set([
  "wiechowscy@gmail.com",
  "jtrychta@iuvi.pl",
  "vkijowska@ateneum.pl",
  "iuvigamespl@gmail.com"
]);
const RENTAL_SPREADSHEET_ID = "1Hmtd1qbQ_smlE08Qxa7NFTDI7946z5XMSDs3v7jklJI";
const RENTAL_SHEET_ID = 0;
const CAPACITY_PER_SET = 7;
const EXPECTED_TERMS = 12;
const FIREBASE_VERSION = "12.16.0";
const SETS = [
  { key: "junior", label: "Junior" },
  { key: "expert", label: "Ekspert" },
  { key: "master", label: "Master" }
];
const GALLERY_SLIDES = [
  {
    title: "Zestaw Junior",
    src: "/assets/rentals/junior.jpg",
    alt: "Zestaw Junior: siedem tytułów dla przedszkoli i klas pierwszych"
  },
  {
    title: "Zestaw Ekspert",
    src: "/assets/rentals/expert.jpg",
    alt: "Zestaw Ekspert: siedem tytułów dla klas od drugiej do ósmej"
  },
  {
    title: "Zestaw Master",
    src: "/assets/rentals/master.jpg",
    alt: "Zestaw Master: siedem tytułów dla klas siódmych i starszych"
  }
];

const ui = {
  free: document.getElementById("rentalsFreeCounter"),
  reserved: document.getElementById("rentalsReservedCounter"),
  percentage: document.getElementById("rentalsUsagePercent"),
  meter: document.getElementById("rentalsMeterBar"),
  summary: document.getElementById("rentalsCounterSummary"),
  updatedAt: document.getElementById("rentalsUpdatedAt"),
  grid: document.getElementById("rentalsGrid"),
  error: document.getElementById("rentalsError"),
  sync: document.getElementById("syncRentalsBtn"),
  syncStatus: document.getElementById("rentalsSyncStatus"),
  galleryItems: [...document.querySelectorAll("[data-gallery-slide]")],
  galleryModal: document.getElementById("setGalleryModal"),
  galleryTitle: document.getElementById("setGalleryTitle"),
  galleryImage: document.getElementById("setGalleryImage"),
  galleryCaption: document.getElementById("setGalleryCaption"),
  galleryClose: document.getElementById("setGalleryClose"),
  galleryPrevious: document.getElementById("setGalleryPrevious"),
  galleryNext: document.getElementById("setGalleryNext"),
  galleryDots: document.getElementById("setGalleryDots")
};

let currentUser = null;
let onlineRentals = null;
let currentGallerySlide = 0;
let galleryTrigger = null;

init().catch(showLoadError);

async function init() {
  ui.sync.addEventListener("click", syncRentalsFromGoogle);
  initializeGallery();

  const response = await fetch("/rentals-data.json?v=20260822-1");
  if (!response.ok) throw new Error(`Błąd pobierania danych: ${response.status}`);
  applyRentalData(await response.json());

  initializeOnlineRentals().catch((error) => {
    console.warn("Nie udało się połączyć z aktualizowaną dostępnością wypożyczeń.", error);
  });
}

function initializeGallery() {
  const dots = GALLERY_SLIDES.map((slide, index) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.setAttribute("aria-label", `Pokaż ${slide.title}`);
    dot.addEventListener("click", () => showGallerySlide(index));
    return dot;
  });
  ui.galleryDots.replaceChildren(...dots);

  ui.galleryItems.forEach((item) => {
    item.addEventListener("click", () => {
      galleryTrigger = item;
      openGallery(Number(item.dataset.gallerySlide) || 0);
    });
  });
  ui.galleryClose.addEventListener("click", closeGallery);
  ui.galleryPrevious.addEventListener("click", () => changeGallerySlide(-1));
  ui.galleryNext.addEventListener("click", () => changeGallerySlide(1));
  ui.galleryModal.addEventListener("click", (event) => {
    if (event.target === ui.galleryModal) closeGallery();
  });
  ui.galleryModal.addEventListener("cancel", () => {
    document.body.classList.remove("gallery-open");
  });
  ui.galleryModal.addEventListener("close", () => {
    document.body.classList.remove("gallery-open");
    galleryTrigger?.focus();
  });
  document.addEventListener("keydown", (event) => {
    if (!ui.galleryModal.open) return;
    if (event.key === "ArrowLeft") changeGallerySlide(-1);
    if (event.key === "ArrowRight") changeGallerySlide(1);
  });
}

function openGallery(index) {
  showGallerySlide(index);
  document.body.classList.add("gallery-open");
  ui.galleryModal.showModal();
  ui.galleryClose.focus();
}

function closeGallery() {
  if (ui.galleryModal.open) ui.galleryModal.close();
}

function changeGallerySlide(direction) {
  const index = (currentGallerySlide + direction + GALLERY_SLIDES.length) % GALLERY_SLIDES.length;
  showGallerySlide(index);
}

function showGallerySlide(index) {
  currentGallerySlide = Math.max(0, Math.min(GALLERY_SLIDES.length - 1, index));
  const slide = GALLERY_SLIDES[currentGallerySlide];
  ui.galleryTitle.textContent = slide.title;
  ui.galleryCaption.textContent = slide.title;
  ui.galleryImage.src = slide.src;
  ui.galleryImage.alt = slide.alt;

  [...ui.galleryDots.children].forEach((dot, dotIndex) => {
    const active = dotIndex === currentGallerySlide;
    dot.classList.toggle("active", active);
    dot.setAttribute("aria-current", active ? "true" : "false");
  });
}

function showLoadError(error) {
  console.error("Nie udało się wczytać dostępności wypożyczeń.", error);
  ui.grid.classList.add("hidden");
  ui.error.classList.remove("hidden");
  ui.summary.textContent = "Dane są chwilowo niedostępne.";
}

function applyRentalData(data) {
  const terms = Array.isArray(data?.terms) ? data.terms.filter(isValidTerm).slice(0, EXPECTED_TERMS) : [];
  if (terms.length !== EXPECTED_TERMS) throw new Error("Dane nie zawierają 12 poprawnych turnusów.");

  const totalCapacity = EXPECTED_TERMS * SETS.length * CAPACITY_PER_SET;
  const totalReserved = terms.reduce((total, term) => {
    return total + SETS.reduce((sum, set) => sum + clampReservation(term[set.key]), 0);
  }, 0);
  const totalFree = totalCapacity - totalReserved;
  const usage = Math.round((totalReserved / totalCapacity) * 100);

  animateCounter(ui.free, totalFree);
  animateCounter(ui.reserved, totalReserved);
  ui.percentage.textContent = `${usage}%`;
  ui.meter.style.width = `${usage}%`;
  ui.summary.textContent = `${totalReserved} miejsc jest już zajętych z puli ${totalCapacity}.`;
  ui.updatedAt.textContent = `Stan na ${formatUpdatedAt(data.updatedAt)}`;
  ui.grid.replaceChildren(...terms.map(createTermCard));
  ui.grid.classList.remove("hidden");
  ui.error.classList.add("hidden");
}

function isValidTerm(term) {
  return term
    && typeof term.term === "string"
    && /^\d{2}\.\d{2}\s*-\s*\d{2}\.\d{2}\.20\d{2}$/.test(term.term.trim())
    && SETS.every((set) => Number.isFinite(Number(term[set.key])));
}

function clampReservation(value) {
  return Math.max(0, Math.min(CAPACITY_PER_SET, Math.floor(Number(value) || 0)));
}

function createTermCard(term, index) {
  const card = document.createElement("article");
  card.className = "rental-term";

  const head = document.createElement("header");
  head.className = "rental-term-head";

  const titleWrap = document.createElement("div");
  const turnLabel = document.createElement("span");
  turnLabel.textContent = `Turnus ${index + 1}`;
  const title = document.createElement("h3");
  title.textContent = term.term;
  titleWrap.append(turnLabel, title);

  const totalFree = SETS.reduce((sum, set) => sum + (CAPACITY_PER_SET - clampReservation(term[set.key])), 0);
  const total = document.createElement("div");
  total.className = "rental-term-total";
  const totalNumber = document.createElement("strong");
  totalNumber.textContent = totalFree;
  total.append(totalNumber, document.createTextNode(" wolnych"));
  head.append(titleWrap, total);

  const list = document.createElement("dl");
  list.className = "rental-set-list";
  SETS.forEach((set) => list.append(createSetRow(set.label, term[set.key])));

  card.append(head, list);
  return card;
}

function createSetRow(label, reservedValue) {
  const reserved = clampReservation(reservedValue);
  const free = CAPACITY_PER_SET - reserved;
  const status = free === 0 ? "full" : free <= 2 ? "limited" : "available";
  const row = document.createElement("div");
  row.className = `rental-set-row ${status}`;

  const name = document.createElement("dt");
  name.textContent = label;

  const meterWrap = document.createElement("dd");
  const meter = document.createElement("span");
  meter.className = "rental-set-meter";
  meter.setAttribute("role", "progressbar");
  meter.setAttribute("aria-label", `${label}: ${free} wolnych miejsc z ${CAPACITY_PER_SET}`);
  meter.setAttribute("aria-valuemin", "0");
  meter.setAttribute("aria-valuemax", String(CAPACITY_PER_SET));
  meter.setAttribute("aria-valuenow", String(free));
  const bar = document.createElement("span");
  bar.style.width = `${(free / CAPACITY_PER_SET) * 100}%`;
  meter.append(bar);
  meterWrap.append(meter);

  const count = document.createElement("dd");
  count.className = "rental-set-count";
  count.textContent = free === 0 ? "brak miejsc" : `${free} z ${CAPACITY_PER_SET}`;

  row.append(name, meterWrap, count);
  return row;
}

function formatUpdatedAt(value) {
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "ostatnią aktualizację";
  return new Intl.DateTimeFormat("pl-PL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
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

async function initializeOnlineRentals() {
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
  const rentalsDocument = doc(db, "publicData", "rentals");
  onlineRentals = { auth, rentalsDocument, GoogleAuthProvider, serverTimestamp, setDoc, signInWithPopup };

  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    const canSync = isRentalEditor(user);
    ui.sync.classList.toggle("hidden", !canSync);
    if (!canSync) ui.syncStatus.textContent = "";
  });

  const snapshot = await getDoc(rentalsDocument);
  if (snapshot.exists()) applyRentalData(snapshot.data());
}

async function syncRentalsFromGoogle() {
  if (!onlineRentals || !currentUser) return;

  ui.sync.disabled = true;
  ui.syncStatus.textContent = "Przeliczam rezerwacje…";

  try {
    const provider = new onlineRentals.GoogleAuthProvider();
    provider.addScope("https://www.googleapis.com/auth/spreadsheets.readonly");
    provider.setCustomParameters({ prompt: "select_account" });

    const result = await onlineRentals.signInWithPopup(onlineRentals.auth, provider);
    if (!isRentalEditor(result.user)) throw new Error("Do aktualizacji potrzebne jest konto administratora.");

    const credential = onlineRentals.GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) throw new Error("Google nie przekazał dostępu do kalendarza.");

    const terms = await fetchRentalCalendar(credential.accessToken);
    const totalReserved = terms.reduce((total, term) => {
      return total + SETS.reduce((sum, set) => sum + clampReservation(term[set.key]), 0);
    }, 0);
    const data = {
      terms,
      capacityPerSet: CAPACITY_PER_SET,
      totalCapacity: EXPECTED_TERMS * SETS.length * CAPACITY_PER_SET,
      totalReserved,
      updatedAt: onlineRentals.serverTimestamp(),
      updatedBy: result.user.email
    };

    await onlineRentals.setDoc(onlineRentals.rentalsDocument, data, { merge: true });
    applyRentalData({ ...data, updatedAt: new Date() });
    ui.syncStatus.textContent = `Zaktualizowano: ${data.totalCapacity - totalReserved} wolnych miejsc.`;
  } catch (error) {
    console.error("Nie udało się zaktualizować dostępności wypożyczeń.", error);
    ui.syncStatus.textContent = syncErrorMessage(error);
  } finally {
    ui.sync.disabled = false;
  }
}

async function fetchRentalCalendar(accessToken) {
  const metadataUrl = `https://sheets.googleapis.com/v4/spreadsheets/${RENTAL_SPREADSHEET_ID}?fields=sheets.properties`;
  const metadata = await googleApiRequest(metadataUrl, accessToken);
  const sourceSheet = metadata.sheets?.find((sheet) => sheet.properties?.sheetId === RENTAL_SHEET_ID);
  if (!sourceSheet?.properties?.title) throw new Error("Nie znaleziono kalendarza wypożyczeń.");

  const escapedTitle = sourceSheet.properties.title.replace(/'/g, "''");
  const range = encodeURIComponent(`'${escapedTitle}'!A:D`);
  const valuesUrl = `https://sheets.googleapis.com/v4/spreadsheets/${RENTAL_SPREADSHEET_ID}/values/${range}`;
  const response = await googleApiRequest(valuesUrl, accessToken);
  return parseCalendarRows(response.values || []);
}

function parseCalendarRows(values) {
  const terms = [];
  let currentTerm = null;

  values.slice(1).forEach((row) => {
    const date = String(row[0] || "").trim();
    if (/^\d{2}\.\d{2}\s*-\s*\d{2}\.\d{2}\.20\d{2}$/.test(date)) {
      currentTerm = { term: date, junior: 0, expert: 0, master: 0 };
      terms.push(currentTerm);
    }
    if (!currentTerm || terms.length > EXPECTED_TERMS) return;

    SETS.forEach((set, index) => {
      if (String(row[index + 1] || "").trim()) currentTerm[set.key] += 1;
    });
  });

  const validTerms = terms.slice(0, EXPECTED_TERMS);
  if (validTerms.length !== EXPECTED_TERMS) throw new Error("Kalendarz nie zawiera 12 turnusów.");
  if (validTerms.some((term) => SETS.some((set) => term[set.key] > CAPACITY_PER_SET))) {
    throw new Error("W jednym z turnusów liczba rezerwacji przekracza dostępne 7 zestawów.");
  }
  return validTerms;
}

async function googleApiRequest(url, accessToken) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (response.ok) return response.json();

  const details = await response.json().catch(() => ({}));
  const error = new Error(details.error?.message || `Błąd usługi Google: ${response.status}`);
  error.status = response.status;
  throw error;
}

function syncErrorMessage(error) {
  if (error?.code === "auth/popup-closed-by-user") return "Aktualizacja została anulowana.";
  if (error?.status === 403) return "Brak dostępu do kalendarza lub usługa Arkuszy Google nie jest włączona.";
  return error?.message || "Nie udało się pobrać kalendarza.";
}

function isRentalEditor(user) {
  return Boolean(
    user?.emailVerified
    && RENTAL_EDITOR_EMAILS.has(String(user.email || "").trim().toLocaleLowerCase("pl"))
  );
}
