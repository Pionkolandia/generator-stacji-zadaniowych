"use strict";

const GAMES = [
  "Trzy Male Swinki Deluxe",
  "Czerwony Kapturek Deluxe",
  "Wilk i 7 Kozlatek",
  "Krolewna Sniezka Deluxe",
  "Spiaca Krolewna Deluxe",
  "Jas i Magiczna Fasola Deluxe",
  "Kamelot Jr",
  "Madry Zamek",
  "3 Traki",
  "Dzien i Noc",
  "Park Safari Jr",
  "Safari Park Jr",
  "Zwierzaki na Wsi",
  "Misie w Lesie",
  "Smart Piesel - Bieg po Medal",
  "Dress Code",
  "Zabki",
  "Biedroneczki",
  "Apple Puzzler",
  "Potwory - Zabawa w Chowanego",
  "Kotelki",
  "Hop do Norki",
  "Kolorowy Kod",
  "Diamentowy Kod",
  "Antywirus",
  "Blokada",
  "Gwiezdna Ucieczka",
  "Tajemnicza Wyspa",
  "Akademia Jazdy Konnej",
  "Dinozaury - Tajemnicza Wyspa",
  "Smoczy Ogien",
  "Droga do Swiatyni (Smocza Edycja)",
  "Piraci w Morzu Ognia",
  "Spadajace Gwiazdy",
  "Kwadrylion",
  "Genius Square",
  "Wyscigowki",
  "IQ Puzzler Pro",
  "IQ Love",
  "IQ Digits",
  "IQ Gears",
  "IQ Focus",
  "IQ Fit",
  "Arka Noego",
  "Zwinne Delfinki",
  "Robaczki",
  "Kopalnia Zlota",
  "Na Plazy",
  "Goool!",
  "Pingwiny - Zabawa w Basenie",
  "Fabryka Robotow",
  "Tajemnice Swiatyni"
];

const PRESETS = [
  {
    id: "junior",
    name: "Junior",
    meta: "28 uczniow, 14 stanowisk",
    students: 28,
    sequenceMode: "manual",
    games: [
      "Trzy Male Swinki Deluxe",
      "Trzy Male Swinki Deluxe",
      "Czerwony Kapturek Deluxe",
      "Czerwony Kapturek Deluxe",
      "Park Safari Jr",
      "Safari Park Jr",
      "3 Traki",
      "3 Traki",
      "Dress Code",
      "Dress Code",
      "Kamelot Jr",
      "Kamelot Jr",
      "Biedroneczki",
      "Biedroneczki"
    ],
    startA: [5, 5, 5, 5, 9, 9, 1, 1, 11, 11, 5, 5, 5, 5],
    startB: [6, 6, 6, 6, 10, 10, 2, 2, 11, 11, 6, 6, 6, 6]
  },
  {
    id: "master",
    name: "Master",
    meta: "26 uczniow, 13 stanowisk",
    students: 26,
    sequenceMode: "manual",
    games: [
      "Apple Puzzler",
      "Apple Puzzler",
      "Diamentowy Kod",
      "Diamentowy Kod",
      "Diamentowy Kod",
      "IQ Gears",
      "Tajemnicza Wyspa",
      "Tajemnicza Wyspa",
      "IQ Puzzler Pro",
      "IQ Puzzler Pro",
      "IQ Focus",
      "IQ Focus",
      "IQ Gears"
    ],
    startA: [4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2],
    startB: [5, 5, 5, 5, 5, 5, 5, 5, 3, 3, 3, 3, 3]
  },
  {
    id: "ekspert",
    name: "Ekspert",
    meta: "30 uczniow, 15 stanowisk",
    students: 30,
    sequenceMode: "manual",
    games: [
      "IQ Digits",
      "IQ Digits",
      "IQ Digits",
      "IQ Love",
      "IQ Love",
      "IQ Love",
      "Kotelki",
      "Kotelki",
      "Kotelki",
      "Blokada",
      "Blokada",
      "Blokada",
      "Hop do Norki",
      "Hop do Norki",
      "Hop do Norki"
    ],
    startA: Array(15).fill(3),
    startB: Array(15).fill(2)
  }
];

const state = {
  students: 20,
  pairs: 10,
  stations: 10,
  hasTrio: false,
  games: [],
  startA: [],
  startB: [],
  sequenceMode: "autoPlus",
  customGames: []
};

const CARDS_PER_PAGE = 3;
const $ = (id) => document.getElementById(id);

function escapeHTML(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function seqFrom(start) {
  const s = parseInt(start, 10);
  if (!Number.isFinite(s) || s < 1) return null;
  return [s, s + 2, s + 4, s + 6, s + 8];
}

function seqText(seq) {
  return seq ? seq.join(", ") : "-";
}

function allGames() {
  return [...state.customGames, ...GAMES];
}

function renderPresets() {
  $("presetGrid").innerHTML = PRESETS.map((preset) => `
    <button class="preset-card" type="button" data-preset="${preset.id}">
      <strong>${escapeHTML(preset.name)}</strong>
      <span>${escapeHTML(preset.meta)}</span>
    </button>
  `).join("");

  document.querySelectorAll("[data-preset]").forEach((button) => {
    button.addEventListener("click", () => applyPreset(button.dataset.preset));
  });
}

function applyPreset(id) {
  const preset = PRESETS.find((item) => item.id === id);
  if (!preset) return;

  state.students = preset.students;
  state.sequenceMode = preset.sequenceMode;
  state.games = [...preset.games];
  state.startA = [...preset.startA];
  state.startB = [...preset.startB];

  $("students").value = preset.students;
  $("sequenceMode").value = preset.sequenceMode;
  recalc();
  buildStationSelects();
  markDuplicates();
}

function showStep(step) {
  document.querySelectorAll("[data-panel]").forEach((panel) => {
    panel.classList.toggle("hidden", Number(panel.dataset.panel) !== step);
  });

  document.querySelectorAll("[data-step-target]").forEach((chip) => {
    const target = Number(chip.dataset.stepTarget);
    chip.classList.toggle("active", target === step);
    chip.classList.toggle("done", target < step);
  });

  $("printArea").classList.toggle("hidden", step !== 4);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function recalc() {
  const value = parseInt($("students").value, 10);
  const valid = Number.isFinite(value) && value >= 6 && value <= 40;

  $("minNote").classList.toggle("hidden", !(Number.isFinite(value) && value < 6));

  if (!valid) {
    $("calcPairs").textContent = "-";
    $("calcStations").textContent = "-";
    $("calcCards").textContent = "-";
    $("oddNote").classList.add("hidden");
    $("toStep2").disabled = true;
    return;
  }

  state.students = value;
  state.pairs = Math.floor(value / 2);
  state.stations = state.pairs;
  state.hasTrio = value % 2 === 1;

  $("calcPairs").textContent = state.pairs;
  $("calcStations").textContent = state.stations;
  $("calcCards").textContent = state.pairs * 2 + (state.hasTrio ? 1 : 0);
  $("oddNote").classList.toggle("hidden", !state.hasTrio);
  $("toStep2").disabled = false;

  state.games.length = state.stations;
  state.startA.length = state.stations;
  state.startB.length = state.stations;
}

function optionsHTML(selected) {
  return allGames().map((game) => {
    const option = escapeHTML(game);
    return `<option value="${option}"${selected === game ? " selected" : ""}>${option}</option>`;
  }).join("");
}

function buildStationSelects() {
  const grid = $("stationGrid");
  grid.innerHTML = "";
  state.games.length = state.stations;

  for (let index = 0; index < state.stations; index += 1) {
    const row = document.createElement("div");
    row.className = "station-card";
    row.dataset.index = index;
    row.innerHTML = `
      <div class="station-number">${index + 1}</div>
      <label class="field">
        <span>Stanowisko ${index + 1}</span>
        <select aria-label="Gra na stanowisku ${index + 1}">
          <option value=""${!state.games[index] ? " selected" : ""} disabled>Wybierz gre</option>
          ${optionsHTML(state.games[index])}
        </select>
      </label>
    `;
    row.querySelector("select").addEventListener("change", (event) => {
      state.games[index] = event.target.value;
      markDuplicates();
    });
    grid.appendChild(row);
  }

  markDuplicates();
}

function addCustomGame() {
  const input = $("customGame");
  const note = $("customNote");
  const name = input.value.trim().replace(/\s+/g, " ");

  note.classList.remove("hidden");

  if (name.length < 2) {
    note.textContent = "Wpisz nazwe gry - co najmniej 2 znaki.";
    return;
  }

  const exists = allGames().some((game) => game.toLowerCase() === name.toLowerCase());
  if (exists) {
    note.textContent = `"${name}" jest juz na liscie.`;
    return;
  }

  state.customGames.unshift(name);
  note.textContent = `Dodano "${name}".`;
  input.value = "";
  buildStationSelects();
  input.focus();
}

function markDuplicates() {
  const counts = {};
  state.games.forEach((game) => {
    if (game) counts[game] = (counts[game] || 0) + 1;
  });

  let hasDuplicate = false;
  document.querySelectorAll(".station-card").forEach((row) => {
    const game = state.games[Number(row.dataset.index)];
    const duplicate = Boolean(game && counts[game] > 1);
    row.classList.toggle("duplicate", duplicate);
    if (duplicate) hasDuplicate = true;
  });

  $("dupNote").classList.toggle("hidden", !hasDuplicate);
  $("emptyNote").classList.add("hidden");
}

function syncBFromMode() {
  state.sequenceMode = $("sequenceMode").value;
  if (state.sequenceMode !== "autoPlus") return;
  for (let index = 0; index < state.stations; index += 1) {
    const value = parseInt(state.startA[index], 10);
    state.startB[index] = Number.isFinite(value) ? value + 1 : NaN;
  }
}

function buildRangeTable() {
  state.startA.length = state.stations;
  state.startB.length = state.stations;

  for (let index = 0; index < state.stations; index += 1) {
    if (!Number.isFinite(parseInt(state.startA[index], 10))) state.startA[index] = 1;
    if (!Number.isFinite(parseInt(state.startB[index], 10))) state.startB[index] = state.startA[index] + 1;
  }

  syncBFromMode();

  $("rangeBody").innerHTML = state.games.map((game, index) => `
    <tr>
      <td><strong>${index + 1}</strong></td>
      <td class="game-name">${escapeHTML(game)}</td>
      <td><input type="number" min="1" max="200" value="${state.startA[index]}" data-kind="a" data-index="${index}" aria-label="Start A, stanowisko ${index + 1}"></td>
      <td><span class="seq-preview" id="previewA${index}">${seqText(seqFrom(state.startA[index]))}</span></td>
      <td><input type="number" min="1" max="200" value="${state.startB[index]}" data-kind="b" data-index="${index}" ${state.sequenceMode === "autoPlus" ? "readonly" : ""} aria-label="Start B, stanowisko ${index + 1}"></td>
      <td><span class="seq-preview b" id="previewB${index}">${seqText(seqFrom(state.startB[index]))}</span></td>
    </tr>
  `).join("");

  $("rangeBody").querySelectorAll("input").forEach((input) => {
    input.addEventListener("input", handleRangeInput);
  });
}

function handleRangeInput(event) {
  const index = Number(event.target.dataset.index);
  const kind = event.target.dataset.kind;
  const value = parseInt(event.target.value, 10);

  if (kind === "a") {
    state.startA[index] = value;
    if (state.sequenceMode === "autoPlus") {
      state.startB[index] = Number.isFinite(value) ? value + 1 : NaN;
      const bInput = document.querySelector(`input[data-kind="b"][data-index="${index}"]`);
      if (bInput) bInput.value = Number.isFinite(state.startB[index]) ? state.startB[index] : "";
    }
  } else {
    state.startB[index] = value;
  }

  updateRangePreview(index);
}

function updateRangePreview(index) {
  $("previewA" + index).textContent = seqText(seqFrom(state.startA[index]));
  $("previewB" + index).textContent = seqText(seqFrom(state.startB[index]));
}

function rangesValid() {
  syncBFromMode();
  for (let index = 0; index < state.stations; index += 1) {
    if (!seqFrom(state.startA[index]) || !seqFrom(state.startB[index])) return false;
  }
  return true;
}

function allStationsChosen() {
  return Array.from({ length: state.stations }, (_, index) => Boolean(state.games[index])).every(Boolean);
}

function stationsForPair(pairIndex) {
  return [
    pairIndex,
    (pairIndex + 1) % state.stations,
    (pairIndex + 2) % state.stations
  ];
}

function stationBlock(stationIndex, starts, isB) {
  const sequence = seqFrom(starts[stationIndex]);
  return `
    <div class="print-station">
      <span class="station-tag">STACJA ${stationIndex + 1}</span>
      <div class="print-game">${escapeHTML(state.games[stationIndex])}</div>
      <div class="task-label">Wykonaj zadania w kolejnosci:</div>
      <div class="seq">${sequence.map((item) => `<b>${item}</b>`).join("")}</div>
      <div class="results">
        Zadania: <span class="blank"></span><br>
        Czas: <span class="blank short"></span> : <span class="blank short"></span> min : sek
      </div>
    </div>
  `;
}

function cardHTML(pairNumber, player, stationIndexes) {
  const isB = player === "B";
  const isC = player === "C";
  const starts = isB ? state.startB : state.startA;
  const playerLabel = isC ? "GRACZ C" : `GRACZ ${player}`;
  const cardClass = isB ? "player-card b-card" : "player-card";

  return `
    <article class="${cardClass}">
      <header class="card-head">
        <div class="card-title">STACJE ZADANIOWE<small>Karta gracza - Szkola jest SMART!</small></div>
        <div class="card-meta">
          <span class="pill pair">Para nr ${pairNumber}</span>
          <span class="pill ${isB ? "b" : "a"}">${playerLabel}</span>
          <span class="name-line">Imie i nazwisko: <span class="blank"></span></span>
        </div>
      </header>
      <div class="stations-3">
        ${stationIndexes.map((stationIndex) => stationBlock(stationIndex, starts, isB)).join("")}
      </div>
      <div class="card-total">
        <div class="total-box">Laczna liczba zadan: <span class="blank"></span></div>
        <div class="total-box">Laczny czas: <span class="blank"></span> min : sek</div>
      </div>
      ${isC ? `<p class="trio-note">Para 3-osobowa: role gracza i sedziego rotuja - kazdy gra w 2 z 3 rund.</p>` : ""}
    </article>
  `;
}

function teacherSheetHTML() {
  const stationRows = Array.from({ length: state.stations }, (_, index) => `
    <tr>
      <td><strong>${index + 1}</strong></td>
      <td>${escapeHTML(state.games[index])}</td>
      <td>${seqText(seqFrom(state.startA[index]))}</td>
      <td>${seqText(seqFrom(state.startB[index]))}</td>
    </tr>
  `).join("");

  const rotationRows = Array.from({ length: state.pairs }, (_, pairIndex) => {
    const stations = stationsForPair(pairIndex).map((station) => station + 1);
    const trio = state.hasTrio && pairIndex === state.pairs - 1 ? " (3-os.)" : "";
    return `
      <tr>
        <td><strong>Para ${pairIndex + 1}${trio}</strong></td>
        <td>Stacja ${stations[0]}</td>
        <td>Stacja ${stations[1]}</td>
        <td>Stacja ${stations[2]}</td>
      </tr>
    `;
  }).join("");

  return `
    <section class="teacher-sheet">
      <h3>Sciagawka dla nauczyciela</h3>
      <p class="teacher-sub">Stacje zadaniowe - ${state.students} uczniow - ${state.pairs} par - ${state.stations} stanowisk</p>
      <p class="teacher-rules">
        <strong>Przebieg:</strong> w kazdej parze najpierw gra Gracz A, a Gracz B sedziuje i pilnuje czasu. Po 3 rundach nastepuje zamiana rol. Jedna runda: 5 zadan, limit 4-5 min. Sedzia zatwierdza kazde zadanie przed przejsciem dalej.
        <strong>Punktacja:</strong> 1 pkt za zadanie, bonus za komplet: ponizej 2:00 +3, 2:01-3:30 +2, 3:31-5:00 +1. Remis rozstrzyga laczny czas.
      </p>
      <div class="teacher-grid">
        <table>
          <thead><tr><th>Stan.</th><th>Gra</th><th>Zadania A</th><th>Zadania B</th></tr></thead>
          <tbody>${stationRows}</tbody>
        </table>
        <div>
          <table>
            <thead><tr><th>Para</th><th>Runda 1</th><th>Runda 2</th><th>Runda 3</th></tr></thead>
            <tbody>${rotationRows}</tbody>
          </table>
          <p class="teacher-note">Przed lekcja: wydrukuj karty, potnij po jednej na gracza, przy stanowiskach przygotuj gry w pozycji startowej i ustal wyrazny sygnal konca rundy.</p>
        </div>
      </div>
    </section>
  `;
}

function renderSummary(cardsCount) {
  $("summaryGrid").innerHTML = `
    <div class="summary-item"><strong>${cardsCount}</strong><span>kart gracza</span></div>
    <div class="summary-item"><strong>${Math.ceil(cardsCount / CARDS_PER_PAGE) + 1}</strong><span>stron A4</span></div>
    <div class="summary-item"><strong>${state.stations}</strong><span>stanowisk</span></div>
  `;
}

function renderPrintArea() {
  const cards = [];
  for (let pairIndex = 0; pairIndex < state.pairs; pairIndex += 1) {
    const stationIndexes = stationsForPair(pairIndex);
    cards.push(cardHTML(pairIndex + 1, "A", stationIndexes));
    cards.push(cardHTML(pairIndex + 1, "B", stationIndexes));
    if (state.hasTrio && pairIndex === state.pairs - 1) {
      cards.push(cardHTML(pairIndex + 1, "C", stationIndexes));
    }
  }

  let pages = "";
  for (let index = 0; index < cards.length; index += CARDS_PER_PAGE) {
    pages += `<div class="sheet page">${cards.slice(index, index + CARDS_PER_PAGE).join("")}</div>`;
  }
  pages += `<div class="sheet page">${teacherSheetHTML()}</div>`;

  $("printArea").innerHTML = `
    <p class="notice info preview-note">Podglad wydruku: ${cards.length} kart gracza i sciagawka nauczyciela.</p>
    ${pages}
  `;
  renderSummary(cards.length);
}

async function downloadHtml() {
  renderPrintArea();
  let css = "";
  try {
    const response = await fetch("/styles.css");
    css = await response.text();
  } catch (_error) {
    css = "";
  }
  const html = `<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Stacje zadaniowe - wydruk</title><style>${css}</style></head><body><main class="app">${$("printArea").outerHTML}</main></body></html>`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "stacje-zadaniowe-wydruk.html";
  link.click();
  URL.revokeObjectURL(url);
}

function initEvents() {
  $("students").addEventListener("input", recalc);
  $("sequenceMode").addEventListener("change", () => {
    state.sequenceMode = $("sequenceMode").value;
    if (!$("panel3").classList.contains("hidden")) buildRangeTable();
  });

  $("toStep2").addEventListener("click", () => {
    recalc();
    buildStationSelects();
    showStep(2);
  });
  $("back1").addEventListener("click", () => showStep(1));

  $("addCustomBtn").addEventListener("click", addCustomGame);
  $("customGame").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomGame();
    }
  });

  $("toStep3").addEventListener("click", () => {
    if (!allStationsChosen()) {
      $("emptyNote").classList.remove("hidden");
      return;
    }
    buildRangeTable();
    showStep(3);
  });
  $("back2").addEventListener("click", () => showStep(2));

  $("toStep4").addEventListener("click", () => {
    if (!rangesValid()) {
      window.alert("Uzupelnij poprawne numery startowe dla obu graczy.");
      return;
    }
    renderPrintArea();
    showStep(4);
  });
  $("back3").addEventListener("click", () => showStep(3));

  $("printBtn").addEventListener("click", () => window.print());
  $("downloadHtmlBtn").addEventListener("click", downloadHtml);
  $("restartBtn").addEventListener("click", () => {
    state.games = [];
    state.startA = [];
    state.startB = [];
    $("sequenceMode").value = "autoPlus";
    state.sequenceMode = "autoPlus";
    recalc();
    showStep(1);
  });

  document.querySelectorAll("[data-step-target]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const target = Number(chip.dataset.stepTarget);
      if (target === 1) showStep(1);
      if (target === 2 && state.stations) {
        buildStationSelects();
        showStep(2);
      }
      if (target === 3 && allStationsChosen()) {
        buildRangeTable();
        showStep(3);
      }
      if (target === 4 && rangesValid() && allStationsChosen()) {
        renderPrintArea();
        showStep(4);
      }
    });
  });
}

function boot() {
  renderPresets();
  recalc();
  initEvents();
  showStep(1);
}

boot();
