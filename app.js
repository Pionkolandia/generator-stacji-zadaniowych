"use strict";

const GAMES = [
  "Trzy Małe Świnki Deluxe",
  "Czerwony Kapturek Deluxe",
  "Wilk i 7 Koźlątek",
  "Królewna Śnieżka Deluxe",
  "Śpiąca Królewna Deluxe",
  "Jas i Magiczna Fasola Deluxe",
  "Kamelot Jr",
  "Mądry Zamek",
  "3 Traki",
  "Dzień i Noc",
  "Park Safari Jr",
  "Safari Park Jr",
  "Zwierzaki na Wsi",
  "Misie w Lesie",
  "Smart Pieseł - Bieg po Medal",
  "Dress Code",
  "Żabki",
  "Biedroneczki",
  "Apple Puzzler",
  "Potwory - Zabawa w Chowanego",
  "Kotełki",
  "Hop do Norki",
  "Kolorowy Kod",
  "Diamentowy Kod",
  "Antywirus",
  "Blokada",
  "Gwiezdna Ucieczka",
  "Tajemnicza Wyspa",
  "Akademia Jazdy Konnej",
  "Dinozaury - Tajemnicza Wyspa",
  "Smoczy Ogień",
  "Droga do Świątyni (Smocza Edycja)",
  "Piraci w Morzu Ognia",
  "Spadające Gwiazdy",
  "Kwadrylion",
  "Genius Square",
  "Wyścigówki",
  "IQ Puzzler Pro",
  "IQ Love",
  "IQ Digits",
  "IQ Gears",
  "IQ Focus",
  "IQ Fit",
  "Arka Noego",
  "Zwinne Delfinki",
  "Robaczki",
  "Kopalnia Złota",
  "Na Plaży",
  "Goool!",
  "Pingwiny - Zabawa w Basenie",
  "Fabryka Robotów",
  "Tajemnice Świątyni"
];

const PRESETS = [
  {
    id: "junior",
    name: "Junior",
    meta: "28 uczniów, 14 stanowisk",
    students: 28,
    games: [
      "Trzy Małe Świnki Deluxe",
      "Trzy Małe Świnki Deluxe",
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
    startA: [5, 5, 5, 5, 9, 9, 1, 1, 11, 11, 5, 5, 5, 5]
  },
  {
    id: "ekspert",
    name: "Ekspert",
    meta: "30 uczniów, 15 stanowisk",
    students: 30,
    games: [
      "IQ Digits",
      "IQ Digits",
      "IQ Digits",
      "IQ Love",
      "IQ Love",
      "IQ Love",
      "Kotełki",
      "Kotełki",
      "Kotełki",
      "Blokada",
      "Blokada",
      "Blokada",
      "Hop do Norki",
      "Hop do Norki",
      "Hop do Norki"
    ],
    startA: Array(15).fill(3)
  },
  {
    id: "master",
    name: "Master",
    meta: "26 uczniów, 13 stanowisk",
    students: 26,
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
    startA: [4, 4, 4, 4, 4, 4, 4, 4, 2, 2, 2, 2, 2]
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
  rotationOffsets: [0, 1, 2],
  customGames: []
};

const timerState = {
  group: "A",
  totalSeconds: 300,
  remainingSeconds: 300,
  running: false,
  intervalId: null
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
  state.games = [...preset.games];
  state.startA = [...preset.startA];
  state.startB = preset.startA.map((start) => start + 1);

  $("students").value = preset.students;
  recalc();
  syncBFromA();
  buildStationSelects();
  markDuplicates();
}

function showStep(step) {
  document.querySelector(".workspace").classList.toggle("equal-height", step === 1);

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
          <option value=""${!state.games[index] ? " selected" : ""} disabled>Wybierz grę</option>
          ${optionsHTML(state.games[index])}
        </select>
      </label>
    `;
    row.querySelector("select").addEventListener("change", (event) => {
      state.games[index] = event.target.value;
      markDuplicates();
      updateRotationNotice();
    });
    grid.appendChild(row);
  }

  markDuplicates();
  updateRotationNotice();
}

function addCustomGame() {
  const input = $("customGame");
  const note = $("customNote");
  const name = input.value.trim().replace(/\s+/g, " ");

  note.classList.remove("hidden");

  if (name.length < 2) {
    note.textContent = "Wpisz nazwę gry - co najmniej 2 znaki.";
    return;
  }

  const exists = allGames().some((game) => game.toLowerCase() === name.toLowerCase());
  if (exists) {
    note.textContent = `"${name}" jest już na liście.`;
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

function gameKey(game) {
  return String(game || "").trim().toLocaleLowerCase("pl-PL");
}

function routeHasUniqueGames(offsets) {
  if (offsets.length !== 3 || state.stations < 3) return false;
  for (let pairIndex = 0; pairIndex < state.pairs; pairIndex += 1) {
    const stationIndexes = offsets.map((offset) => (pairIndex + offset) % state.stations);
    const stationSet = new Set(stationIndexes);
    const gameSet = new Set(stationIndexes.map((stationIndex) => gameKey(state.games[stationIndex])));
    if (stationSet.size !== 3 || gameSet.size !== 3) return false;
  }
  return true;
}

function findRotationOffsets() {
  if (!allStationsChosen()) return null;
  const uniqueGames = new Set(state.games.map(gameKey));
  if (uniqueGames.size < 3) return null;

  const candidates = [];
  for (let second = 1; second < state.stations; second += 1) {
    for (let third = 1; third < state.stations; third += 1) {
      if (third === second) continue;
      candidates.push([0, second, third]);
    }
  }

  candidates.sort((left, right) => {
    const leftScore = Math.max(left[1], left[2]) * 100 + left[1] + left[2];
    const rightScore = Math.max(right[1], right[2]) * 100 + right[1] + right[2];
    return leftScore - rightScore;
  });

  return candidates.find(routeHasUniqueGames) || null;
}

function ensureRotation() {
  const offsets = findRotationOffsets();
  if (!offsets) return false;
  state.rotationOffsets = offsets;
  return true;
}

function updateRotationNotice() {
  const note = $("rotationNote");
  if (!note) return;
  if (!allStationsChosen()) {
    note.classList.add("hidden");
    note.textContent = "";
    return;
  }

  if (ensureRotation()) {
    note.classList.add("hidden");
    note.textContent = "";
    return;
  }

  note.textContent = "Nie da się ułożyć 3 rund bez powtórzenia gry na jednej karcie. Dodaj więcej różnych tytułów albo zmień kolejność stanowisk.";
  note.classList.remove("hidden");
}

function syncBFromA() {
  state.startB.length = state.stations;
  for (let index = 0; index < state.stations; index += 1) {
    const value = parseInt(state.startA[index], 10);
    state.startB[index] = Number.isFinite(value) ? value + 1 : NaN;
  }
}

function buildRangeTable() {
  state.startA.length = state.stations;
  state.startB.length = state.stations;

  for (let index = 0; index < state.stations; index += 1) {
    if (!Number.isFinite(parseInt(state.startA[index], 10))) state.startA[index] = 2;
  }

  syncBFromA();

  $("rangeBody").innerHTML = state.games.map((game, index) => `
    <tr>
      <td><strong>${index + 1}</strong></td>
      <td class="game-name">${escapeHTML(game)}</td>
      <td><input type="number" min="1" max="200" value="${state.startA[index]}" data-kind="a" data-index="${index}" aria-label="Start A, stanowisko ${index + 1}"></td>
      <td><span class="seq-preview" id="previewA${index}">${seqText(seqFrom(state.startA[index]))}</span></td>
      <td><input type="number" min="1" max="201" value="${state.startB[index]}" data-kind="b" data-index="${index}" readonly aria-label="Start B, stanowisko ${index + 1}"></td>
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

  if (kind !== "a") return;
  state.startA[index] = value;
  state.startB[index] = Number.isFinite(value) ? value + 1 : NaN;
  const bInput = document.querySelector(`input[data-kind="b"][data-index="${index}"]`);
  if (bInput) bInput.value = Number.isFinite(state.startB[index]) ? state.startB[index] : "";

  updateRangePreview(index);
}

function updateRangePreview(index) {
  $("previewA" + index).textContent = seqText(seqFrom(state.startA[index]));
  $("previewB" + index).textContent = seqText(seqFrom(state.startB[index]));
}

function rangesValid() {
  syncBFromA();
  for (let index = 0; index < state.stations; index += 1) {
    if (!seqFrom(state.startA[index]) || !seqFrom(state.startB[index])) return false;
  }
  return true;
}

function allStationsChosen() {
  return Array.from({ length: state.stations }, (_, index) => Boolean(state.games[index])).every(Boolean);
}

function stationsForPair(pairIndex) {
  return state.rotationOffsets.map((offset) => (pairIndex + offset) % state.stations);
}

function stationBlock(stationIndex, starts, isB) {
  const sequence = seqFrom(starts[stationIndex]);
  return `
    <div class="print-station">
      <span class="station-tag">STACJA ${stationIndex + 1}</span>
      <div class="print-game">${escapeHTML(state.games[stationIndex])}</div>
      <div class="task-label">Wykonaj zadania w kolejności:</div>
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
        <div class="card-title">STACJE ZADANIOWE<small>Karta gracza - Szkoła jest SMART!</small></div>
        <div class="card-meta">
          <span class="pill pair">Para nr ${pairNumber}</span>
          <span class="pill ${isB ? "b" : "a"}">${playerLabel}</span>
          <span class="name-line">Imię i nazwisko: <span class="blank"></span></span>
        </div>
      </header>
      <div class="stations-3">
        ${stationIndexes.map((stationIndex) => stationBlock(stationIndex, starts, isB)).join("")}
      </div>
      <div class="card-total">
        <div class="total-box">Łączna liczba zadań: <span class="blank"></span></div>
        <div class="total-box">Łączny czas: <span class="blank"></span> min : sek</div>
      </div>
      ${isC ? `<p class="trio-note">Para 3-osobowa: role gracza i sędziego rotują - każdy gra w 2 z 3 rund.</p>` : ""}
    </article>
  `;
}

function teacherSheetHTML() {
  ensureRotation();
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
      <h3>Ściągawka dla nauczyciela</h3>
      <p class="teacher-sub">Stacje zadaniowe - ${state.students} uczniów - ${state.pairs} par - ${state.stations} stanowisk</p>
      <p class="teacher-rules">
        <strong>Przebieg:</strong> w każdej parze najpierw gra Gracz A, a Gracz B sędziuje i pilnuje czasu. Po 3 rundach następuje zamiana ról. Jedna runda: 5 zadań, limit 4-5 min. Sędzia zatwierdza każde zadanie przed przejściem dalej. Rotacja dobiera dla każdej pary 3 różne stanowiska i 3 różne gry.
        <strong>Punktacja:</strong> 1 pkt za zadanie, bonus za komplet: poniżej 2:00 +3, 2:01-3:30 +2, 3:31-5:00 +1. Remis rozstrzyga łączny czas.
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
          <p class="teacher-note">Przed lekcją: wydrukuj karty, potnij po jednej na gracza, przy stanowiskach przygotuj gry w pozycji startowej i ustal wyraźny sygnał końca rundy.</p>
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
  if (!ensureRotation()) {
    $("rotationNote").textContent = "Nie da się wygenerować poprawnych kart: każda osoba musi dostać 3 różne gry. Dodaj więcej różnych tytułów albo zmień kolejność stanowisk.";
    $("rotationNote").classList.remove("hidden");
    showStep(2);
    return;
  }

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
    <p class="notice info preview-note">Podgląd wydruku: ${cards.length} kart gracza i ściągawka nauczyciela.</p>
    ${pages}
  `;
  renderSummary(cards.length);
}

function clampTimerInput(value, min, max) {
  const number = parseInt(value, 10);
  if (!Number.isFinite(number)) return min;
  return Math.min(Math.max(number, min), max);
}

function formatTimer(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const mins = Math.floor(safeSeconds / 60);
  const secs = safeSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function getConfiguredTimerSeconds() {
  const minutes = clampTimerInput($("timerMinutes").value, 0, 99);
  const seconds = clampTimerInput($("timerSeconds").value, 0, 59);
  const total = minutes * 60 + seconds;
  return total > 0 ? total : 1;
}

function setTimerDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  $("timerMinutes").value = minutes;
  $("timerSeconds").value = seconds;
  timerState.totalSeconds = totalSeconds;
  if (!timerState.running) {
    timerState.remainingSeconds = totalSeconds;
  }
  updateTimerDisplay();
}

function updateTimerDisplay() {
  $("timerDisplay").textContent = formatTimer(timerState.remainingSeconds);
  $("timerGroupTitle").textContent = timerState.group;
  $("timerRoundLabel").textContent = $("timerRound").value.trim() || "Runda";
  $("timerOverlay").dataset.group = timerState.group;
  $("timerStartPause").textContent = timerState.running ? "Pauza" : "Start";
  document.querySelectorAll("[data-timer-group]").forEach((button) => {
    button.classList.toggle("active", button.dataset.timerGroup === timerState.group);
  });
}

function setTimerStatus(text) {
  $("timerStatus").textContent = text;
}

function playTimerSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!$("timerSound").checked || !AudioContextClass) return;
  const context = new AudioContextClass();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.35, context.currentTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.7);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.75);
}

function stopTimerInterval() {
  if (timerState.intervalId) {
    window.clearInterval(timerState.intervalId);
    timerState.intervalId = null;
  }
}

function finishTimer() {
  stopTimerInterval();
  timerState.running = false;
  timerState.remainingSeconds = 0;
  setTimerStatus(`Koniec czasu dla grupy ${timerState.group}`);
  $("timerOverlay").classList.add("timer-done");
  playTimerSound();
  updateTimerDisplay();
}

function tickTimer() {
  timerState.remainingSeconds -= 1;
  if (timerState.remainingSeconds <= 0) {
    finishTimer();
    return;
  }
  updateTimerDisplay();
}

function startPauseTimer() {
  if (timerState.running) {
    timerState.running = false;
    stopTimerInterval();
    setTimerStatus("Pauza");
    updateTimerDisplay();
    return;
  }

  if (timerState.remainingSeconds <= 0) {
    timerState.remainingSeconds = getConfiguredTimerSeconds();
  }

  timerState.totalSeconds = getConfiguredTimerSeconds();
  timerState.running = true;
  $("timerOverlay").classList.remove("timer-done");
  setTimerStatus(`Odmierzam czas dla grupy ${timerState.group}`);
  updateTimerDisplay();
  timerState.intervalId = window.setInterval(tickTimer, 1000);
}

function resetTimer() {
  stopTimerInterval();
  timerState.running = false;
  timerState.totalSeconds = getConfiguredTimerSeconds();
  timerState.remainingSeconds = timerState.totalSeconds;
  $("timerOverlay").classList.remove("timer-done");
  setTimerStatus("Gotowy");
  updateTimerDisplay();
}

function setTimerGroup(group) {
  timerState.group = group;
  $("timerOverlay").classList.remove("timer-done");
  setTimerStatus(timerState.running ? `Odmierzam czas dla grupy ${group}` : "Gotowy");
  updateTimerDisplay();
}

function openTimer() {
  timerState.totalSeconds = getConfiguredTimerSeconds();
  if (!timerState.running) {
    timerState.remainingSeconds = timerState.totalSeconds;
  }
  $("timerOverlay").classList.remove("hidden");
  document.body.classList.add("timer-open");
  setTimerStatus(timerState.running ? `Odmierzam czas dla grupy ${timerState.group}` : "Gotowy");
  updateTimerDisplay();
}

function closeTimer() {
  $("timerOverlay").classList.add("hidden");
  document.body.classList.remove("timer-open");
}

function initTimerEvents() {
  ["openTimerBtn", "openTimerBtn2"].forEach((id) => {
    const button = $(id);
    if (button) button.addEventListener("click", openTimer);
  });

  $("closeTimerBtn").addEventListener("click", closeTimer);
  $("timerStartPause").addEventListener("click", startPauseTimer);
  $("timerReset").addEventListener("click", resetTimer);
  $("timerNextGroup").addEventListener("click", () => setTimerGroup(timerState.group === "A" ? "B" : "A"));
  $("timerRound").addEventListener("input", updateTimerDisplay);

  ["timerMinutes", "timerSeconds"].forEach((id) => {
    $(id).addEventListener("input", () => {
      if (!timerState.running) resetTimer();
    });
  });

  document.querySelectorAll("[data-timer-group]").forEach((button) => {
    button.addEventListener("click", () => setTimerGroup(button.dataset.timerGroup));
  });

  document.querySelectorAll("[data-preset-seconds]").forEach((button) => {
    button.addEventListener("click", () => {
      stopTimerInterval();
      timerState.running = false;
      $("timerOverlay").classList.remove("timer-done");
      setTimerDuration(Number(button.dataset.presetSeconds));
      setTimerStatus("Gotowy");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !$("timerOverlay").classList.contains("hidden")) {
      closeTimer();
    }
  });
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
    if (!ensureRotation()) {
      updateRotationNotice();
      return;
    }
    buildRangeTable();
    showStep(3);
  });
  $("back2").addEventListener("click", () => showStep(2));

  $("toStep4").addEventListener("click", () => {
    if (!rangesValid()) {
      window.alert("Uzupełnij poprawne numery startowe dla obu graczy.");
      return;
    }
    if (!ensureRotation()) {
      updateRotationNotice();
      showStep(2);
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
    recalc();
    showStep(1);
  });

  initTimerEvents();

  document.querySelectorAll("[data-step-target]").forEach((chip) => {
    chip.addEventListener("click", () => {
      const target = Number(chip.dataset.stepTarget);
      if (target === 1) showStep(1);
      if (target === 2 && state.stations) {
        buildStationSelects();
        showStep(2);
      }
      if (target === 3 && allStationsChosen()) {
        if (!ensureRotation()) {
          updateRotationNotice();
          showStep(2);
          return;
        }
        buildRangeTable();
        showStep(3);
      }
      if (target === 4 && rangesValid() && allStationsChosen()) {
        if (!ensureRotation()) {
          updateRotationNotice();
          showStep(2);
          return;
        }
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
