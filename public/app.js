"use strict";

const GAMES = Object.freeze([
  "3 Traki",
  "Antywirus Mutacja",
  "Arka Noego",
  "Atomowe Zagadki",
  "Baszty i Maszty",
  "Chess Peace",
  "Dinozaury Tajemnicza Wyspa",
  "Droga do Świątyni. Smocza edycja.",
  "Dropzone – strefa zrzutu",
  "Dziura w Całym",
  "Gnomki i domki",
  "Goool!",
  "IQ Bubbles",
  "IQ Link",
  "IQ Matrix",
  "IQ Noodles",
  "IQ Perplex",
  "IQ Six Pro",
  "IQ Stars",
  "IQ Stixx",
  "IQ Waves",
  "IQ XOXO",
  "Jaś i Małgosia",
  "Kopalnia Złota",
  "Kości Pamięci",
  "Królewna Śnieżka",
  "Królicza Norka",
  "Kubik",
  "Kulki do Kwadratu",
  "Kwadrylion",
  "Logic Lane",
  "Łowcy Duchów",
  "Magiczny Las",
  "Misie w Lesie",
  "Na Plaży",
  "Owieczki",
  "Parada Pingwinów",
  "Parking Puzzler",
  "Pingwiny na Lodzie",
  "Pingwiny – Zabawa w Basenie",
  "Piraci w Morzu Ognia",
  "Plug & Play Ball",
  "Plug & Play Puzzler",
  "Psiaki na Spacerze",
  "Ptasie Figle",
  "Rafa Koralowa",
  "Robaczki",
  "Rozgryź to!",
  "Spadające Gwiazdy",
  "Strachy na Lachy",
  "Śpiąca Królewna",
  "Tajemnice Świątyni",
  "Take Off",
  "Trzy Bałwanki",
  "Ucieczka z Atlantydy",
  "Ucieczka z lochu",
  "Wilk i 7 Koźlątek",
  "Zgrane Rybki",
  "ZigZag Puzzler",
  "Zwinne Delfinki",
  "Żółwim Tempem"
]);

const GAME_CATALOG = Object.freeze((
  Array.isArray(window.STATION_GAME_CATALOG) && window.STATION_GAME_CATALOG.length
    ? window.STATION_GAME_CATALOG
    : GAMES.map((title) => ({ title, url: "", image: "" }))
).map((game) => Object.freeze({ ...game })));

const TITLE_NUMBER_ALIASES = Object.freeze({
  zero: "0",
  jeden: "1",
  jedna: "1",
  jedno: "1",
  dwa: "2",
  dwie: "2",
  trzy: "3",
  cztery: "4",
  piec: "5",
  szesc: "6",
  siedem: "7",
  osiem: "8",
  dziewiec: "9",
  dziesiec: "10"
});

const BLOCKED_TITLE_WORDS = new Set([
  "chuj", "chuja", "dupa", "jebac", "jebany", "kurwa", "kurwy", "pizda", "skurwysyn",
  "bitch", "fuck", "shit"
]);

const PRESETS = [
  {
    id: "junior",
    name: "Junior",
    meta: "28 uczniów, 14 stanowisk",
    students: 28,
    games: [
      "Wilk i 7 Koźlątek", "Wilk i 7 Koźlątek",
      "Królewna Śnieżka", "Królewna Śnieżka",
      "Trzy Bałwanki", "Trzy Bałwanki",
      "Gnomki i domki", "Gnomki i domki",
      "Misie w Lesie", "Misie w Lesie",
      "Jaś i Małgosia", "Jaś i Małgosia",
      "Owieczki", "Owieczki"
    ],
    startA: [5, 5, 5, 5, 9, 9, 1, 1, 11, 11, 5, 5, 5, 5]
  },
  {
    id: "ekspert",
    name: "Ekspert",
    meta: "30 uczniów, 15 stanowisk",
    students: 30,
    games: [
      "IQ Matrix", "IQ Matrix", "IQ Matrix",
      "IQ Perplex", "IQ Perplex", "IQ Perplex",
      "IQ Six Pro", "IQ Six Pro", "IQ Six Pro",
      "Antywirus Mutacja", "Antywirus Mutacja", "Antywirus Mutacja",
      "Kwadrylion", "Kwadrylion", "Kwadrylion"
    ],
    startA: Array(15).fill(3)
  },
  {
    id: "master",
    name: "Master",
    meta: "26 uczniów, 13 stanowisk",
    students: 26,
    games: [
      "Atomowe Zagadki", "Atomowe Zagadki",
      "Chess Peace", "Chess Peace",
      "Logic Lane", "Logic Lane",
      "IQ Stars", "IQ Stars",
      "IQ XOXO", "IQ XOXO",
      "ZigZag Puzzler", "ZigZag Puzzler",
      "Kubik"
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
  isAuthenticated: false,
  customGames: [],
  userGames: [],
  userInventory: [],
  catalogGames: GAMES
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

function initHelpTips() {
  const buttons = Array.from(document.querySelectorAll(".info-tip[data-help]"));
  if (!buttons.length) return;

  const popover = document.createElement("div");
  popover.id = "helpPopover";
  popover.className = "help-popover";
  popover.setAttribute("role", "tooltip");
  popover.hidden = true;
  document.body.appendChild(popover);

  let activeButton = null;
  let pinned = false;

  function positionPopover() {
    if (!activeButton || popover.hidden) return;

    const gap = 8;
    const edge = 12;
    const anchor = activeButton.getBoundingClientRect();
    const width = popover.offsetWidth;
    const height = popover.offsetHeight;
    const centeredLeft = anchor.left + (anchor.width - width) / 2;
    const left = Math.min(Math.max(centeredLeft, edge), window.innerWidth - width - edge);
    const below = anchor.bottom + gap;
    const top = below + height <= window.innerHeight - edge
      ? below
      : Math.max(edge, anchor.top - height - gap);

    popover.style.left = `${Math.round(left)}px`;
    popover.style.top = `${Math.round(top)}px`;
  }

  function showHelp(button, shouldPin = false) {
    if (activeButton && activeButton !== button) {
      activeButton.setAttribute("aria-expanded", "false");
    }

    activeButton = button;
    pinned = shouldPin;
    popover.textContent = button.dataset.help;
    popover.hidden = false;
    button.setAttribute("aria-expanded", "true");
    positionPopover();
  }

  function hideHelp() {
    if (activeButton) activeButton.setAttribute("aria-expanded", "false");
    activeButton = null;
    pinned = false;
    popover.hidden = true;
  }

  buttons.forEach((button) => {
    button.setAttribute("aria-describedby", popover.id);
    button.setAttribute("aria-expanded", "false");
    button.addEventListener("mouseenter", () => {
      if (!pinned) showHelp(button);
    });
    button.addEventListener("mouseleave", () => {
      if (!pinned) hideHelp();
    });
    button.addEventListener("focus", () => {
      if (!pinned) showHelp(button);
    });
    button.addEventListener("blur", () => {
      if (!pinned) hideHelp();
    });
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (activeButton === button && pinned) {
        hideHelp();
      } else {
        showHelp(button, true);
      }
    });
  });

  document.addEventListener("click", hideHelp);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") hideHelp();
  });
  window.addEventListener("resize", positionPopover);
  window.addEventListener("scroll", () => {
    if (pinned) positionPopover();
    else hideHelp();
  }, true);
}

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
  const games = [...state.userGames, ...state.customGames, ...state.catalogGames];
  const seen = new Set();
  return games.filter((game) => {
    const key = gameKey(game);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectionGames() {
  const seen = new Set();
  return state.userGames.filter((game) => {
    const key = gameKey(game);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectionInventory() {
  const inventory = new Map();
  state.userInventory.forEach((item) => {
    const title = String(item?.title || "").trim();
    const key = gameKey(title);
    const quantity = Math.max(0, Math.min(99, Number(item?.quantity) || 0));
    if (!key || !quantity) return;
    const existing = inventory.get(key);
    if (existing) existing.quantity += quantity;
    else inventory.set(key, { title, quantity });
  });
  return Array.from(inventory.values());
}

function collectionCopies() {
  return collectionInventory().flatMap((item) => Array.from({ length: item.quantity }, () => item.title));
}

function updateCollectionSummary() {
  const inventory = collectionInventory();
  const count = inventory.length;
  const copies = inventory.reduce((sum, item) => sum + item.quantity, 0);
  const summary = $("stationCollectionCount");
  if (!summary) return;
  summary.textContent = count
    ? `${count} ${count === 1 ? "tytuł" : count < 5 ? "tytuły" : "tytułów"}, ${copies} ${copies === 1 ? "egzemplarz" : "egzemplarzy"}`
    : "Brak zaznaczonych gier";
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

  window.dispatchEvent(new CustomEvent("station-set-edit-cancel"));

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

function optionItemsHTML(games, selected) {
  return games.map((game) => {
    const option = escapeHTML(game);
    return `<option value="${option}"${selected === game ? " selected" : ""}>${option}</option>`;
  }).join("");
}

function optionsHTML(selected) {
  const ownedKeys = new Set(collectionGames().map(gameKey));
  const ownedGames = allGames().filter((game) => ownedKeys.has(gameKey(game)));
  const otherGames = allGames().filter((game) => !ownedKeys.has(gameKey(game)));

  if (!ownedGames.length) return optionItemsHTML(otherGames, selected);
  return `
    <optgroup label="Moja kolekcja">${optionItemsHTML(ownedGames, selected)}</optgroup>
    <optgroup label="Pozostałe gry">${optionItemsHTML(otherGames, selected)}</optgroup>
  `;
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

function titleWords(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ł/g, "l")
    .replace(/Ł/g, "L")
    .toLocaleLowerCase("pl-PL")
    .match(/[a-z0-9]+/g) || [];
}

function titleKey(value) {
  return titleWords(value).map((word) => TITLE_NUMBER_ALIASES[word] || word).join("");
}

function titleDistance(left, right) {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      current[rightIndex] = Math.min(
        current[rightIndex - 1] + 1,
        previous[rightIndex] + 1,
        previous[rightIndex - 1] + (left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1)
      );
    }
    previous.splice(0, previous.length, ...current);
  }
  return previous[right.length];
}

function titlesConflict(left, right) {
  const leftKey = titleKey(left);
  const rightKey = titleKey(right);
  if (!leftKey || !rightKey) return false;
  if (leftKey === rightKey) return true;
  const longest = Math.max(leftKey.length, rightKey.length);
  const allowedDistance = longest >= 14 ? 2 : longest >= 6 ? 1 : 0;
  return allowedDistance > 0
    && Math.abs(leftKey.length - rightKey.length) <= allowedDistance
    && titleDistance(leftKey, rightKey) <= allowedDistance;
}

function conflictingGameTitle(name) {
  for (const game of GAME_CATALOG) {
    const variants = [game.title, ...(Array.isArray(game.aliases) ? game.aliases : [])];
    if (variants.some((variant) => titlesConflict(name, variant))) return game.title;
  }
  return [...state.userGames, ...state.customGames].find((game) => titlesConflict(name, game)) || "";
}

function titleHasBlockedContent(name) {
  if (/(?:https?:\/\/|www\.|\S+@\S+)/i.test(name)) return true;
  return titleWords(name).some((word) => BLOCKED_TITLE_WORDS.has(word));
}

function setCustomGameAccess(authenticated) {
  state.isAuthenticated = Boolean(authenticated);
  const input = $("customGame");
  const button = $("addCustomBtn");
  const status = $("customAuthText");
  const link = $("customAuthLink");
  input.disabled = !state.isAuthenticated;
  button.disabled = !state.isAuthenticated;
  status.textContent = state.isAuthenticated
    ? "Własny tytuł zostanie zapisany tylko w Twojej prywatnej kolekcji. Oficjalny katalog 61 gier pozostaje bez zmian."
    : "Własne tytuły można dodawać dopiero po zalogowaniu.";
  link.classList.toggle("hidden", state.isAuthenticated);
  if (!state.isAuthenticated && state.customGames.length) {
    state.customGames = [];
    refreshGameChoices();
  }
}

function savePrivateGame(name) {
  return new Promise((resolve) => {
    let completed = false;
    const timeout = window.setTimeout(() => {
      if (!completed) resolve({ ok: false, message: "Nie udało się połączyć z kontem. Odśwież stronę i zaloguj się ponownie." });
    }, 8000);
    const complete = (result) => {
      if (completed) return;
      completed = true;
      window.clearTimeout(timeout);
      resolve(result || { ok: false });
    };
    window.dispatchEvent(new CustomEvent("station-private-game-request", { detail: { title: name, complete } }));
  });
}

async function addCustomGame() {
  const input = $("customGame");
  const button = $("addCustomBtn");
  const note = $("customNote");
  const name = input.value.trim().replace(/\s+/g, " ");

  note.classList.remove("hidden");

  if (!state.isAuthenticated) {
    note.textContent = "Zaloguj się, aby dodać własny tytuł do prywatnej kolekcji.";
    return;
  }

  if (name.length < 2) {
    note.textContent = "Wpisz nazwę gry - co najmniej 2 znaki.";
    return;
  }

  if (titleHasBlockedContent(name)) {
    note.textContent = "Wpisz neutralną nazwę gry bez niedozwolonych słów, adresów stron i adresów e-mail.";
    return;
  }

  const conflict = conflictingGameTitle(name);
  if (conflict) {
    note.textContent = `Ten tytuł jest już dostępny jako „${conflict}”. Wybierz go z listy zamiast tworzyć duplikat.`;
    return;
  }

  input.disabled = true;
  button.disabled = true;
  note.textContent = "Zapisywanie w prywatnej kolekcji...";
  const result = await savePrivateGame(name);
  input.disabled = false;
  button.disabled = false;
  if (!result?.ok) {
    note.textContent = result?.message || "Nie udało się zapisać gry. Spróbuj ponownie.";
    input.focus();
    return;
  }

  state.customGames.unshift(result.title || name);
  note.textContent = `Dodano „${result.title || name}” do Twojej prywatnej kolekcji.`;
  input.value = "";
  buildStationSelects();
  input.focus();
}

function shuffledGames(games) {
  const shuffled = [...games];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }
  return shuffled;
}

function randomAssignment(games) {
  return shuffledGames(games).slice(0, state.stations);
}

function setRandomizeNote(message, error = false) {
  const note = $("randomizeNote");
  note.textContent = message;
  note.classList.toggle("info", !error);
  note.classList.toggle("warning", error);
  note.classList.toggle("hidden", !message);
}

function randomizeStations() {
  const titles = collectionGames();
  const copies = collectionCopies();
  if (titles.length < 3) {
    setRandomizeNote("Zaznacz na koncie co najmniej 3 różne gry, aby generator mógł ułożyć rotację bez powtórzeń.", true);
    return;
  }
  if (copies.length < state.stations) {
    setRandomizeNote(`Masz ${copies.length} egzemplarzy gier, a potrzeba ${state.stations}. Zwiększ liczbę posiadanych sztuk w koncie nauczyciela.`, true);
    return;
  }

  const previousGames = [...state.games];
  let matched = false;
  for (let attempt = 0; attempt < 300; attempt += 1) {
    state.games = randomAssignment(copies);
    if (ensureRotation()) {
      matched = true;
      break;
    }
  }

  if (!matched) {
    state.games = previousGames;
    buildStationSelects();
    setRandomizeNote("Z tej kolekcji nie udało się ułożyć rotacji bez powtórzeń. Zaznacz więcej różnych gier.", true);
    return;
  }

  buildStationSelects();
  setRandomizeNote(`Wylosowano ${state.stations} stanowisk z Twojej kolekcji.`, false);
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
  return titleKey(game);
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

function initEvents() {
  $("students").addEventListener("input", recalc);

  $("toStep2").addEventListener("click", () => {
    recalc();
    buildStationSelects();
    showStep(2);
  });
  $("back1").addEventListener("click", () => showStep(1));

  $("addCustomBtn").addEventListener("click", () => addCustomGame());
  $("randomizeStationsBtn").addEventListener("click", randomizeStations);
  $("customGame").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addCustomGame();
    }
  });

  window.addEventListener("station-auth-changed", (event) => {
    setCustomGameAccess(event.detail?.authenticated);
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
  $("saveSetBtn").addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("station-save-set-request"));
  });
  $("restartBtn").addEventListener("click", () => {
    window.dispatchEvent(new CustomEvent("station-set-edit-cancel"));
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

function refreshGameChoices() {
  if (!$('panel2').classList.contains('hidden')) {
    buildStationSelects();
  }
}

window.StationApp = {
  getCatalogGames() {
    return GAME_CATALOG.map((game) => ({ ...game }));
  },
  getCurrentSet() {
    const games = Array.from({ length: state.stations }, (_, index) => state.games[index] || "");
    const startA = Array.from({ length: state.stations }, (_, index) => Number(state.startA[index]) || 1);
    return {
      students: state.students,
      stations: state.stations,
      games,
      startA,
      complete: games.every(Boolean)
    };
  },
  loadSet(savedSet) {
    const students = Number(savedSet?.students);
    if (!Number.isInteger(students) || students < 6 || students > 40) return false;

    $("students").value = students;
    recalc();
    if (!Array.isArray(savedSet.games) || savedSet.games.length !== state.stations) return false;

    state.games = savedSet.games.map((game) => String(game || "").trim());
    state.startA = Array.from({ length: state.stations }, (_, index) => {
      const value = Number(savedSet.start_a?.[index] ?? savedSet.startA?.[index]);
      return Number.isInteger(value) && value > 0 ? value : 1;
    });
    syncBFromA();
    buildStationSelects();
    showStep(1);
    return true;
  },
  setUserGames(games) {
    const inventory = Array.isArray(games) ? games.map((game) => {
      if (game && typeof game === "object") {
        return {
          title: String(game.title || "").trim(),
          quantity: Math.max(0, Math.min(99, Number(game.quantity) || 0))
        };
      }
      return { title: String(game || "").trim(), quantity: 1 };
    }).filter((item) => item.title && item.quantity > 0) : [];
    state.userInventory = inventory;
    state.userGames = inventory.map((item) => item.title).filter((game, index, list) => (
      list.findIndex((candidate) => gameKey(candidate) === gameKey(game)) === index
    ));
    updateCollectionSummary();
    refreshGameChoices();
  }
};

function boot() {
  initHelpTips();
  renderPresets();
  recalc();
  updateCollectionSummary();
  initEvents();
  showStep(1);
  window.dispatchEvent(new CustomEvent("station-app-ready"));
}

boot();
