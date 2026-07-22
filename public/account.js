"use strict";

const config = window.STATION_APP_CONFIG || {};
const configured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const ADMIN_EMAIL = "wiechowscy@gmail.com";

if (configured) {
  initAccount().catch((error) => {
    console.error("Nie udało się uruchomić kont użytkowników.", error);
  });
}

async function initAccount() {
  const isAccountPage = document.body.classList.contains("account-page");
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js");
  const {
    browserLocalPersistence,
    createUserWithEmailAndPassword,
    getAuth,
    getRedirectResult,
    GoogleAuthProvider,
    onAuthStateChanged,
    sendEmailVerification,
    sendPasswordResetEmail,
    setPersistence,
    signInWithEmailAndPassword,
    signInWithPopup,
    signInWithRedirect,
    signOut
  } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js");
  const {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getCountFromServer,
    getDoc,
    getDocs,
    getFirestore,
    orderBy,
    query,
    serverTimestamp,
    setDoc
  } = await import("https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js");

  const firebaseApp = initializeApp(config);
  const auth = getAuth(firebaseApp);
  const db = getFirestore(firebaseApp);
  const googleProvider = new GoogleAuthProvider();
  await setPersistence(auth, browserLocalPersistence);

  if (!window.StationApp && !isAccountPage) {
    await new Promise((resolve) => window.addEventListener("station-app-ready", resolve, { once: true }));
  }

  const ui = {
    bar: document.getElementById("accountBar"),
    barTitle: document.getElementById("accountBarTitle"),
    barSubtitle: document.getElementById("accountBarSubtitle"),
    trigger: document.getElementById("accountTrigger"),
    overlay: document.getElementById("accountOverlay"),
    close: document.getElementById("closeAccountBtn"),
    authView: document.getElementById("authView"),
    libraryView: document.getElementById("libraryView"),
    authForm: document.getElementById("authForm"),
    authEmail: document.getElementById("authEmail"),
    authPassword: document.getElementById("authPassword"),
    signup: document.getElementById("emailSignupBtn"),
    google: document.getElementById("googleLoginBtn"),
    resetPassword: document.getElementById("resetPasswordBtn"),
    authMessage: document.getElementById("authMessage"),
    accountEmail: document.getElementById("accountEmail"),
    logout: document.getElementById("logoutBtn"),
    gameForm: document.getElementById("accountGameForm"),
    gameTitle: document.getElementById("accountGameTitle"),
    gamesList: document.getElementById("accountGamesList"),
    customGamesList: document.getElementById("customGamesList"),
    ownedGamesCount: document.getElementById("ownedGamesCount"),
    ownedCopiesCount: document.getElementById("ownedCopiesCount"),
    wishlistList: document.getElementById("wishlistGamesList"),
    wishlistGamesCount: document.getElementById("wishlistGamesCount"),
    wishlistCopiesCount: document.getElementById("wishlistCopiesCount"),
    saveSetForm: document.getElementById("saveSetForm"),
    savedSetName: document.getElementById("savedSetName"),
    saveSetSubmit: document.getElementById("saveSetSubmitBtn"),
    cancelSetEdit: document.getElementById("cancelSetEditBtn"),
    editingSetNotice: document.getElementById("editingSetNotice"),
    savedSetsList: document.getElementById("savedSetsList"),
    libraryMessage: document.getElementById("libraryMessage"),
    savedSetsSection: document.getElementById("savedSetsSection"),
    savedPresetGrid: document.getElementById("savedPresetGrid"),
    manageSets: document.getElementById("manageSetsBtn"),
    adminTab: document.getElementById("adminTabButton"),
    adminStats: document.getElementById("adminStats")
  };

  let currentUser = null;
  let userGames = [];
  const catalogGames = window.StationApp?.getCatalogGames() || window.STATION_GAME_CATALOG || [];
  let savedSets = [];
  let isAdmin = false;
  let editingSetId = null;

  if (isAccountPage) initAccountHelpTips();
  ui.bar?.classList.remove("hidden");
  bindEvents();
  onAuthStateChanged(auth, (user) => syncSession(user).catch(handleAccountError));
  getRedirectResult(auth).catch((error) => setMessage(ui.authMessage, friendlyError(error), true));

  function bindEvents() {
    ui.trigger?.addEventListener("click", (event) => {
      event.preventDefault();
      openAccount();
    });
    ui.close?.addEventListener("click", (event) => {
      event.preventDefault();
      closeAccount();
    });
    ui.overlay?.addEventListener("click", (event) => {
      if (!isAccountPage && event.target === ui.overlay) closeAccount();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && ui.overlay && !ui.overlay.classList.contains("hidden")) closeAccount();
    });

    ui.authForm.addEventListener("submit", signInWithEmail);
    ui.signup.addEventListener("click", signUpWithEmail);
    ui.google.addEventListener("click", signInWithGoogle);
    ui.resetPassword.addEventListener("click", sendPasswordReset);
    ui.logout.addEventListener("click", () => signOut(auth).catch(handleAccountError));
    ui.gameForm.addEventListener("submit", addGame);
    ui.saveSetForm.addEventListener("submit", saveCurrentSet);
    ui.cancelSetEdit.addEventListener("click", cancelSetEdit);
    ui.manageSets?.addEventListener("click", () => {
      if (isAccountPage) showAccountTab("sets");
      else window.location.assign("/konto.html#sets");
    });

    document.querySelectorAll("[data-account-tab]").forEach((button) => {
      button.addEventListener("click", () => showAccountTab(button.dataset.accountTab));
    });

    window.addEventListener("station-private-game-request", (event) => {
      const complete = event.detail?.complete;
      if (typeof complete !== "function") return;
      persistGame(event.detail?.title, false)
        .then(complete)
        .catch((error) => complete({ ok: false, message: friendlyError(error) }));
    });
    window.addEventListener("station-save-set-request", handleSaveSetRequest);
    window.addEventListener("station-set-edit-cancel", cancelSetEdit);
  }

  function handleSaveSetRequest() {
    if (!isAccountPage) {
      const currentSet = window.StationApp?.getCurrentSet();
      if (currentSet) {
        sessionStorage.setItem("pendingStationSet", JSON.stringify({
          set: currentSet,
          id: editingSetId,
          name: ui.savedSetName.value || ""
        }));
      }
      window.location.assign("/konto.html#sets");
      return;
    }
    openAccount();
    if (!currentUser) {
      setMessage(ui.authMessage, "Zaloguj się, aby zapisać swój zestaw stacji.");
      ui.authEmail.focus();
      return;
    }

    showAccountTab("sets");
    if (editingSetId) {
      ui.savedSetName.focus();
      ui.savedSetName.select();
      setMessage(ui.libraryMessage, "Zmień nazwę lub zapisz poprawiony zestaw.");
      return;
    }

    if (!ui.savedSetName.value) {
      const date = new Intl.DateTimeFormat("pl-PL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      }).format(new Date());
      ui.savedSetName.value = `Zestaw ${date}`;
      ui.savedSetName.select();
    } else {
      ui.savedSetName.focus();
    }
    setMessage(ui.libraryMessage, "Nadaj nazwę i zapisz aktualny zestaw.");
  }

  function openAccount() {
    if (!isAccountPage) {
      window.location.assign("/konto.html");
      return;
    }
    ui.overlay.classList.remove("hidden");
    if (!isAccountPage) document.body.classList.add("account-open");
    window.setTimeout(() => (currentUser ? ui.close : ui.authEmail).focus(), 0);
  }

  function closeAccount() {
    if (isAccountPage) {
      window.location.assign("/");
      return;
    }
    ui.overlay.classList.add("hidden");
    document.body.classList.remove("account-open");
    ui.trigger.focus();
  }

  function setMessage(element, text, error = false) {
    element.textContent = text;
    element.classList.toggle("error", error);
    element.classList.toggle("hidden", !text);
  }

  function initAccountHelpTips() {
    const buttons = Array.from(document.querySelectorAll(".info-tip[data-help]"));
    if (!buttons.length) return;
    const popover = document.createElement("div");
    popover.className = "help-popover";
    popover.id = "accountHelpPopover";
    popover.setAttribute("role", "tooltip");
    popover.hidden = true;
    document.body.append(popover);
    let activeButton = null;

    function hide() {
      activeButton?.setAttribute("aria-expanded", "false");
      activeButton = null;
      popover.hidden = true;
    }

    function show(button) {
      activeButton?.setAttribute("aria-expanded", "false");
      activeButton = button;
      popover.textContent = button.dataset.help;
      popover.hidden = false;
      button.setAttribute("aria-expanded", "true");
      const anchor = button.getBoundingClientRect();
      const left = Math.min(Math.max(12, anchor.left), window.innerWidth - popover.offsetWidth - 12);
      const below = anchor.bottom + 8;
      const top = below + popover.offsetHeight < window.innerHeight - 12
        ? below
        : Math.max(12, anchor.top - popover.offsetHeight - 8);
      popover.style.left = `${Math.round(left)}px`;
      popover.style.top = `${Math.round(top)}px`;
    }

    buttons.forEach((button) => {
      button.setAttribute("aria-describedby", popover.id);
      button.setAttribute("aria-expanded", "false");
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (activeButton === button) hide();
        else show(button);
      });
    });
    document.addEventListener("click", hide);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
  }

  function friendlyError(error) {
    const code = String(error?.code || "");
    if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(code)) {
      return "Nieprawidłowy adres e-mail lub hasło.";
    }
    if (code === "auth/email-already-in-use") return "Konto z tym adresem już istnieje.";
    if (code === "auth/weak-password") return "Hasło musi mieć co najmniej 8 znaków.";
    if (code === "auth/invalid-email") return "Sprawdź poprawność adresu e-mail.";
    if (code === "auth/popup-closed-by-user") return "Okno logowania Google zostało zamknięte.";
    if (code === "auth/popup-blocked") return "Przeglądarka zablokowała okno logowania Google.";
    if (code === "auth/unauthorized-domain") return "Ta domena nie została jeszcze dopuszczona do logowania Google.";
    if (code === "permission-denied") return "Brak uprawnień do wykonania tej operacji.";
    return "Nie udało się wykonać operacji. Spróbuj ponownie.";
  }

  function handleAccountError(error) {
    console.error(error);
    setMessage(ui.libraryMessage, friendlyError(error), true);
  }

  function authValues() {
    return {
      email: ui.authEmail.value.trim().toLowerCase(),
      password: ui.authPassword.value
    };
  }

  async function signInWithEmail(event) {
    event.preventDefault();
    setMessage(ui.authMessage, "Logowanie...");
    const { email, password } = authValues();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      setMessage(ui.authMessage, friendlyError(error), true);
    }
  }

  async function signUpWithEmail() {
    if (!ui.authForm.reportValidity()) return;
    setMessage(ui.authMessage, "Tworzenie konta...");
    const { email, password } = authValues();
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(credential.user);
      setMessage(ui.libraryMessage, "Konto zostało utworzone. Wysłaliśmy wiadomość z linkiem weryfikacyjnym.");
    } catch (error) {
      setMessage(ui.authMessage, friendlyError(error), true);
    }
  }

  async function signInWithGoogle() {
    setMessage(ui.authMessage, "Otwieranie logowania Google...");
    try {
      if (window.matchMedia("(max-width: 700px)").matches) {
        await signInWithRedirect(auth, googleProvider);
      } else {
        await signInWithPopup(auth, googleProvider);
      }
    } catch (error) {
      const code = String(error?.code || "");
      if (!["auth/popup-closed-by-user", "auth/cancelled-popup-request"].includes(code)) {
        try {
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError) {
          setMessage(ui.authMessage, friendlyError(redirectError), true);
          return;
        }
      }
      setMessage(ui.authMessage, friendlyError(error), true);
    }
  }

  async function sendPasswordReset() {
    const email = ui.authEmail.value.trim().toLowerCase();
    if (!email) {
      setMessage(ui.authMessage, "Najpierw wpisz adres e-mail.", true);
      ui.authEmail.focus();
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setMessage(ui.authMessage, "Wysłaliśmy link do zmiany hasła.");
    } catch (error) {
      setMessage(ui.authMessage, friendlyError(error), true);
    }
  }

  async function syncSession(user) {
    currentUser = user;
    isAdmin = Boolean(
      user?.emailVerified && user.email?.toLowerCase() === ADMIN_EMAIL
    );
    setMessage(ui.authMessage, "");
    setMessage(ui.libraryMessage, "");

    if (!currentUser) {
      window.dispatchEvent(new CustomEvent("station-auth-changed", {
        detail: { authenticated: false }
      }));
      setEditingSet(null);
      userGames = [];
      savedSets = [];
      window.StationApp?.setUserGames([]);
      ui.authView.classList.remove("hidden");
      ui.libraryView.classList.add("hidden");
      ui.savedSetsSection?.classList.add("hidden");
      ui.adminTab.classList.add("hidden");
      if (ui.barTitle) ui.barTitle.textContent = "Twoje konto";
      if (ui.barSubtitle) ui.barSubtitle.textContent = "Zaloguj się, aby zapisywać gry i zestawy.";
      if (ui.trigger) ui.trigger.textContent = "Zaloguj się";
      return;
    }

    await ensureUserProfile();
    ui.authView.classList.add("hidden");
    ui.libraryView.classList.remove("hidden");
    ui.accountEmail.textContent = currentUser.email || "Konto nauczyciela";
    if (ui.barTitle) ui.barTitle.textContent = "Moje materiały";
    if (ui.barSubtitle) ui.barSubtitle.textContent = currentUser.email || "Konto nauczyciela";
    if (ui.trigger) ui.trigger.textContent = "Otwórz konto";
    ui.adminTab.classList.toggle("hidden", !isAdmin);
    await Promise.all([loadUserGames(), loadSavedSets(), isAdmin ? loadAdminStats() : Promise.resolve()]);
    window.dispatchEvent(new CustomEvent("station-auth-changed", {
      detail: { authenticated: true }
    }));
    if (isAccountPage) {
      const requestedTab = window.location.hash.slice(1);
      if (["games", "wishlist", "sets", "admin"].includes(requestedTab)) showAccountTab(requestedTab);
      preparePendingSet();
    } else {
      applySetFromAccountPage();
    }
  }

  async function ensureUserProfile() {
    const profileRef = doc(db, "users", currentUser.uid);
    const profile = await getDoc(profileRef);
    const data = {
      email: currentUser.email || "",
      displayName: currentUser.displayName || "",
      updatedAt: serverTimestamp()
    };
    if (!profile.exists()) data.createdAt = serverTimestamp();
    await setDoc(profileRef, data, { merge: true });
  }

  function gamesCollection() {
    return collection(db, "users", currentUser.uid, "games");
  }

  function setsCollection() {
    return collection(db, "users", currentUser.uid, "savedSets");
  }

  async function loadUserGames() {
    const snapshot = await getDocs(query(gamesCollection(), orderBy("title")));
    userGames = snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        ...data,
        normalizedTitle: normalizeTitle(data.title),
        ownedQuantity: storedQuantity(data.ownedQuantity, 1),
        wishlistQuantity: storedQuantity(data.wishlistQuantity, 0)
      };
    });
    window.StationApp?.setUserGames(userGames
      .filter((game) => game.ownedQuantity > 0)
      .map((game) => ({ title: game.title, quantity: game.ownedQuantity })));
    renderGames();
  }

  async function addGame(event) {
    event.preventDefault();
    await persistGame(ui.gameTitle.value, true);
  }

  async function persistGame(rawTitle, showFeedback) {
    const title = String(rawTitle || "").trim().replace(/\s+/g, " ");
    if (!currentUser) {
      const message = "Zaloguj się, aby dodać grę do prywatnej kolekcji.";
      if (showFeedback) setMessage(ui.libraryMessage, message, true);
      return { ok: false, message };
    }
    if (title.length < 2) {
      const message = "Wpisz nazwę gry - co najmniej 2 znaki.";
      if (showFeedback) setMessage(ui.libraryMessage, message, true);
      return { ok: false, message };
    }
    if (titleHasBlockedContent(title)) {
      const message = "Wpisz neutralną nazwę gry bez niedozwolonych słów, adresów stron i adresów e-mail.";
      if (showFeedback) setMessage(ui.libraryMessage, message, true);
      return { ok: false, message };
    }
    const conflict = conflictingTitle(title);
    if (conflict) {
      const message = `Ten tytuł jest już dostępny jako „${conflict}”. Wybierz istniejącą grę zamiast tworzyć duplikat.`;
      if (showFeedback) setMessage(ui.libraryMessage, message, true);
      return { ok: false, message };
    }
    const existing = gameByTitle(title);
    if (existing?.ownedQuantity > 0) {
      if (showFeedback) setMessage(ui.libraryMessage, "Ta gra jest już w Twojej bibliotece.");
      return { ok: false, message: "Ta gra jest już w Twojej bibliotece." };
    }
    try {
      await saveGameState(title, 1, existing?.wishlistQuantity || 0);
      ui.gameTitle.value = "";
      if (showFeedback) setMessage(ui.libraryMessage, "Gra została dodana.");
      return { ok: true, title };
    } catch (error) {
      if (showFeedback) setMessage(ui.libraryMessage, friendlyError(error), true);
      else throw error;
      return { ok: false, message: friendlyError(error) };
    }
  }

  function renderGames() {
    ui.gamesList.replaceChildren();
    const ownedCatalog = catalogGames.filter((game) => (gameByTitle(game.title)?.ownedQuantity || 0) > 0);
    const ownedCatalogCount = ownedCatalog.length;
    const ownedCopies = userGames.reduce((sum, game) => sum + game.ownedQuantity, 0);
    ui.ownedGamesCount.textContent = `${ownedCatalogCount} z ${catalogGames.length} gier`;
    if (ui.ownedCopiesCount) {
      ui.ownedCopiesCount.textContent = `${ownedCopies} ${ownedCopies === 1 ? "posiadany egzemplarz" : "posiadanych egzemplarzy"}`;
    }

    catalogGames.forEach((game) => {
      ui.gamesList.append(catalogCard(game, "owned"));
    });

    renderWishlist();

    ui.customGamesList.replaceChildren();
    const customGames = userGames.filter((game) => (
      !catalogGames.some((catalogGame) => {
        const variants = [catalogGame.title, ...(Array.isArray(catalogGame.aliases) ? catalogGame.aliases : [])];
        return variants.some((variant) => titlesConflict(game.title, variant));
      }) && game.ownedQuantity > 0
    ));
    if (!customGames.length) {
      ui.customGamesList.append(emptyMessage("Nie masz dodatkowych gier spoza katalogu."));
      return;
    }

    customGames.forEach((game) => {
      const row = document.createElement("div");
      row.className = "account-list-row";
      const copy = document.createElement("div");
      copy.className = "account-list-copy";
      const title = document.createElement("strong");
      title.textContent = game.title;
      copy.append(title);
      const quantity = quantityControl(game.ownedQuantity, `Liczba egzemplarzy gry ${game.title}`, async (value) => {
        await saveGameState(game.title, value, game.wishlistQuantity);
        setMessage(ui.libraryMessage, `Zapisano liczbę egzemplarzy: ${game.title}.`);
      }, "custom-quantity");
      const edit = actionButton("Edytuj", "", () => editCustomGameTitle(row, game));
      const remove = actionButton("Usuń", "danger", async () => {
        if (!window.confirm(`Usunąć grę „${game.title}” z Twojej kolekcji?`)) return;
        await saveGameState(game.title, 0, game.wishlistQuantity);
      });
      const actions = document.createElement("div");
      actions.className = "account-list-actions";
      actions.append(quantity, edit, remove);
      row.append(copy, actions);
      ui.customGamesList.append(row);
    });
  }

  function editCustomGameTitle(row, game) {
    const form = document.createElement("form");
    form.className = "custom-title-edit";
    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 60;
    input.required = true;
    input.value = game.title;
    input.setAttribute("aria-label", `Nowa nazwa gry ${game.title}`);
    const actions = document.createElement("div");
    actions.className = "custom-title-edit-actions";
    const save = document.createElement("button");
    save.className = "small-button primary";
    save.type = "submit";
    save.textContent = "Zapisz";
    const cancel = actionButton("Anuluj", "", renderGames);
    actions.append(save, cancel);
    form.append(input, actions);
    row.replaceChildren(form);
    input.focus();
    input.select();

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      save.disabled = true;
      input.disabled = true;
      const result = await renameCustomGame(game, input.value);
      if (!result.ok) {
        save.disabled = false;
        input.disabled = false;
        setMessage(ui.libraryMessage, result.message, true);
        input.focus();
        return;
      }
      setMessage(ui.libraryMessage, `Zmieniono nazwę na „${result.title}”.`);
    });
  }

  async function renameCustomGame(game, rawTitle) {
    const title = String(rawTitle || "").trim().replace(/\s+/g, " ");
    if (title.length < 2) {
      return { ok: false, message: "Wpisz nazwę gry - co najmniej 2 znaki." };
    }
    if (titleHasBlockedContent(title)) {
      return {
        ok: false,
        message: "Wpisz neutralną nazwę gry bez niedozwolonych słów, adresów stron i adresów e-mail."
      };
    }
    const conflict = conflictingTitle(title, game.id);
    if (conflict) {
      return {
        ok: false,
        message: `Ten tytuł jest już dostępny jako „${conflict}”. Wybierz inną nazwę.`
      };
    }
    if (title === game.title) {
      renderGames();
      return { ok: true, title };
    }

    await setDoc(doc(db, "users", currentUser.uid, "games", game.id), {
      title,
      normalizedTitle: normalizeTitle(title),
      updatedAt: serverTimestamp()
    }, { merge: true });
    await loadUserGames();
    return { ok: true, title };
  }

  function normalizeTitle(title) {
    return titleWords(title).map((word) => TITLE_NUMBER_ALIASES[word] || word).join("");
  }

  const TITLE_NUMBER_ALIASES = Object.freeze({
    zero: "0", jeden: "1", jedna: "1", jedno: "1", dwa: "2", dwie: "2", trzy: "3",
    cztery: "4", piec: "5", szesc: "6", siedem: "7", osiem: "8", dziewiec: "9", dziesiec: "10"
  });

  const BLOCKED_TITLE_WORDS = new Set([
    "chuj", "chuja", "dupa", "jebac", "jebany", "kurwa", "kurwy", "pizda", "skurwysyn",
    "bitch", "fuck", "shit"
  ]);

  function titleWords(value) {
    return String(value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ł/g, "l")
      .replace(/Ł/g, "L")
      .toLocaleLowerCase("pl-PL")
      .match(/[a-z0-9]+/g) || [];
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
    const leftKey = normalizeTitle(left);
    const rightKey = normalizeTitle(right);
    if (!leftKey || !rightKey) return false;
    if (leftKey === rightKey) return true;
    const longest = Math.max(leftKey.length, rightKey.length);
    const allowedDistance = longest >= 14 ? 2 : longest >= 6 ? 1 : 0;
    return allowedDistance > 0
      && Math.abs(leftKey.length - rightKey.length) <= allowedDistance
      && titleDistance(leftKey, rightKey) <= allowedDistance;
  }

  function conflictingTitle(title, ignoredGameId = "") {
    for (const game of catalogGames) {
      const variants = [game.title, ...(Array.isArray(game.aliases) ? game.aliases : [])];
      if (variants.some((variant) => titlesConflict(title, variant))) return game.title;
    }
    return userGames.find((game) => game.id !== ignoredGameId && titlesConflict(title, game.title))?.title || "";
  }

  function titleHasBlockedContent(title) {
    if (/(?:https?:\/\/|www\.|\S+@\S+)/i.test(title)) return true;
    return titleWords(title).some((word) => BLOCKED_TITLE_WORDS.has(word));
  }

  function storedQuantity(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(99, Math.round(number))) : fallback;
  }

  function gameByTitle(title) {
    return userGames.find((game) => titlesConflict(title, game.title));
  }

  async function saveGameState(title, ownedQuantity, wishlistQuantity) {
    const normalizedTitle = normalizeTitle(title);
    const matches = userGames.filter((game) => titlesConflict(title, game.title));
    const owned = storedQuantity(ownedQuantity, 0);
    const wanted = storedQuantity(wishlistQuantity, 0);

    if (!owned && !wanted) {
      await Promise.all(matches.map((game) => deleteDoc(doc(db, "users", currentUser.uid, "games", game.id))));
      await loadUserGames();
      return;
    }

    const data = {
      title,
      normalizedTitle,
      ownedQuantity: owned,
      wishlistQuantity: wanted,
      updatedAt: serverTimestamp()
    };
    if (matches.length) {
      await setDoc(doc(db, "users", currentUser.uid, "games", matches[0].id), data, { merge: true });
      await Promise.all(matches.slice(1).map((game) => deleteDoc(doc(db, "users", currentUser.uid, "games", game.id))));
    } else {
      await addDoc(gamesCollection(), { ...data, createdAt: serverTimestamp() });
    }
    await loadUserGames();
  }

  function catalogCard(game, mode) {
    const record = gameByTitle(game.title);
    const owned = record?.ownedQuantity || 0;
    const wanted = record?.wishlistQuantity || 0;
    const selectedQuantity = mode === "owned" ? owned : wanted;
    const selected = selectedQuantity > 0;
    const row = document.createElement("div");
    row.className = `collection-game${mode === "owned" && selected ? " owned" : ""}${mode === "wishlist" && selected ? " wanted" : ""}`;

    const checkLabel = document.createElement("label");
    checkLabel.className = "collection-check";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selected;
    checkbox.setAttribute("aria-label", mode === "owned" ? `Mam grę ${game.title}` : `Dodaj grę ${game.title} do moich celów`);
    const checkmark = document.createElement("span");
    checkmark.textContent = "✓";
    checkLabel.append(checkbox, checkmark);

    const link = document.createElement("a");
    link.className = "collection-product";
    link.href = game.url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", `${game.title} - zobacz na stronie Iuvi Games`);
    const preview = document.createElement("span");
    preview.className = "collection-preview";
    const image = document.createElement("img");
    image.src = game.image;
    image.alt = "";
    image.loading = "lazy";
    image.width = 54;
    image.height = 54;
    image.addEventListener("error", () => row.classList.add("image-missing"));
    preview.append(image);
    const copy = document.createElement("span");
    copy.className = "collection-product-copy";
    const titleNode = document.createElement("strong");
    titleNode.textContent = game.title;
    const productHint = document.createElement("span");
    productHint.textContent = "Podgląd w Iuvi Games ↗";
    copy.append(titleNode, productHint);
    link.append(preview, copy);

    const quantity = document.createElement("label");
    quantity.className = "collection-quantity";
    quantity.textContent = "szt.";
    const quantityInput = document.createElement("input");
    quantityInput.type = "number";
    quantityInput.min = "1";
    quantityInput.max = "99";
    quantityInput.inputMode = "numeric";
    quantityInput.value = String(selectedQuantity || 1);
    quantityInput.disabled = !selected;
    quantityInput.setAttribute("aria-label", `${mode === "owned" ? "Posiadane" : "Docelowe"} egzemplarze gry ${game.title}`);
    quantity.append(quantityInput);

    checkbox.addEventListener("change", async () => {
      checkbox.disabled = true;
      try {
        const value = checkbox.checked ? storedQuantity(quantityInput.value, 1) || 1 : 0;
        await saveGameState(game.title, mode === "owned" ? value : owned, mode === "wishlist" ? value : wanted);
        setMessage(ui.libraryMessage, checkbox.checked
          ? `${mode === "owned" ? "Dodano do kolekcji" : "Dodano do listy życzeń"}: ${game.title}.`
          : `${mode === "owned" ? "Usunięto z kolekcji" : "Usunięto z listy życzeń"}: ${game.title}.`);
      } catch (error) {
        checkbox.checked = !checkbox.checked;
        checkbox.disabled = false;
        handleAccountError(error);
      }
    });

    quantityInput.addEventListener("change", async () => {
      const value = storedQuantity(quantityInput.value, 1) || 1;
      quantityInput.value = String(value);
      quantityInput.disabled = true;
      try {
        await saveGameState(game.title, mode === "owned" ? value : owned, mode === "wishlist" ? value : wanted);
        setMessage(ui.libraryMessage, `Zapisano liczbę sztuk: ${game.title}.`);
      } catch (error) {
        quantityInput.disabled = false;
        handleAccountError(error);
      }
    });

    row.append(checkLabel, link, quantity);
    return row;
  }

  function quantityControl(value, label, onChange, className = "") {
    const wrapper = document.createElement("label");
    wrapper.className = className;
    wrapper.append(document.createTextNode("Liczba sztuk"));
    const input = document.createElement("input");
    input.type = "number";
    input.min = "1";
    input.max = "99";
    input.inputMode = "numeric";
    input.value = String(value || 1);
    input.setAttribute("aria-label", label);
    input.addEventListener("change", async () => {
      const nextValue = storedQuantity(input.value, 1) || 1;
      input.value = String(nextValue);
      input.disabled = true;
      try {
        await onChange(nextValue);
      } catch (error) {
        input.disabled = false;
        handleAccountError(error);
      }
    });
    wrapper.append(input);
    return wrapper;
  }

  function renderWishlist() {
    ui.wishlistList.replaceChildren();
    const wantedGames = catalogGames.filter((game) => (gameByTitle(game.title)?.wishlistQuantity || 0) > 0);
    const wantedCopies = wantedGames.reduce((sum, game) => sum + gameByTitle(game.title).wishlistQuantity, 0);
    ui.wishlistGamesCount.textContent = `${wantedGames.length} z ${catalogGames.length} gier`;
    ui.wishlistCopiesCount.textContent = `${wantedCopies} ${wantedCopies === 1 ? "planowany egzemplarz" : "planowanych egzemplarzy"}`;
    catalogGames.forEach((game) => ui.wishlistList.append(catalogCard(game, "wishlist")));
  }

  async function loadSavedSets() {
    const snapshot = await getDocs(query(setsCollection(), orderBy("updatedAt", "desc")));
    savedSets = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderSavedSets();
    renderSavedPresetCards();
  }

  async function saveCurrentSet(event) {
    event.preventDefault();
    const pending = pendingSetData();
    const currentSet = window.StationApp?.getCurrentSet() || pending?.set;
    if (!currentSet?.complete) {
      setMessage(ui.libraryMessage, "Wróć do generatora, przygotuj kompletny zestaw i wybierz opcję zapisania.", true);
      return;
    }
    if (!editingSetId && pending?.id) editingSetId = pending.id;
    const name = ui.savedSetName.value.trim().replace(/\s+/g, " ");
    const wasEditing = Boolean(editingSetId);
    try {
      const data = {
        name,
        students: currentSet.students,
        games: currentSet.games,
        startA: currentSet.startA,
        updatedAt: serverTimestamp()
      };

      if (editingSetId) {
        await setDoc(doc(db, "users", currentUser.uid, "savedSets", editingSetId), data, { merge: true });
      } else {
        const savedSetRef = await addDoc(setsCollection(), {
          ...data,
          createdAt: serverTimestamp()
        });
        editingSetId = savedSetRef.id;
      }

      setEditingSet({ id: editingSetId, name });
      sessionStorage.removeItem("pendingStationSet");
      await loadSavedSets();
      setMessage(ui.libraryMessage, wasEditing ? "Zmiany w zestawie zostały zapisane." : "Zestaw został zapisany.");
    } catch (error) {
      setMessage(ui.libraryMessage, friendlyError(error), true);
    }
  }

  function renderSavedSets() {
    ui.savedSetsList.replaceChildren();
    if (!savedSets.length) {
      ui.savedSetsList.append(emptyMessage("Nie masz jeszcze zapisanych zestawów."));
      return;
    }
    savedSets.forEach((savedSet) => {
      const row = document.createElement("div");
      row.className = "account-list-row";
      const copy = document.createElement("div");
      copy.className = "account-list-copy";
      const title = document.createElement("strong");
      title.textContent = savedSet.name;
      const meta = document.createElement("span");
      meta.textContent = `${savedSet.students} uczniów, ${savedSet.games.length} stanowisk`;
      copy.append(title, meta);
      const load = actionButton("Edytuj", "", () => loadSet(savedSet));
      const remove = actionButton("Usuń", "danger", async () => {
        if (!window.confirm(`Usunąć zestaw „${savedSet.name}”?`)) return;
        await deleteDoc(doc(db, "users", currentUser.uid, "savedSets", savedSet.id));
        if (editingSetId === savedSet.id) setEditingSet(null);
        await loadSavedSets();
      });
      const actions = document.createElement("div");
      actions.className = "account-list-actions";
      actions.append(load, remove);
      row.append(copy, actions);
      ui.savedSetsList.append(row);
    });
  }

  function renderSavedPresetCards() {
    ui.savedPresetGrid.replaceChildren();
    ui.savedSetsSection.classList.toggle("hidden", !currentUser || !savedSets.length);
    savedSets.slice(0, 3).forEach((savedSet) => {
      const button = document.createElement("button");
      button.className = "preset-card";
      button.type = "button";
      const title = document.createElement("strong");
      title.textContent = savedSet.name;
      const meta = document.createElement("span");
      meta.textContent = `${savedSet.students} uczniów, ${savedSet.games.length} stanowisk`;
      button.append(title, meta);
      button.addEventListener("click", () => loadSet(savedSet));
      ui.savedPresetGrid.append(button);
    });
  }

  function loadSet(savedSet) {
    if (isAccountPage) {
      sessionStorage.setItem("stationSetToEdit", JSON.stringify(savedSet));
      window.location.assign("/");
      return;
    }
    if (!window.StationApp?.loadSet(savedSet)) {
      setMessage(ui.libraryMessage, "Nie udało się wczytać tego zestawu.", true);
      return;
    }
    setEditingSet(savedSet);
    closeAccount();
  }

  function pendingSetData() {
    try {
      const value = JSON.parse(sessionStorage.getItem("pendingStationSet") || "null");
      if (!value) return null;
      return value.set ? value : { set: value, id: null, name: "" };
    } catch (error) {
      sessionStorage.removeItem("pendingStationSet");
      return null;
    }
  }

  function preparePendingSet() {
    const pending = pendingSetData();
    if (!pending?.set) return;
    setEditingSet(pending.id ? { id: pending.id, name: pending.name || "" } : null);
    if (!ui.savedSetName.value) {
      const date = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
      ui.savedSetName.value = pending.name || `Zestaw ${date}`;
    }
    setMessage(ui.libraryMessage, pending.id ? "Zapisz zmiany w edytowanym zestawie." : "Zestaw z generatora jest gotowy do zapisania.");
  }

  function applySetFromAccountPage() {
    const raw = sessionStorage.getItem("stationSetToEdit");
    if (!raw) return;
    try {
      const savedSet = JSON.parse(raw);
      if (window.StationApp?.loadSet(savedSet)) {
        setEditingSet(savedSet);
        setMessage(ui.libraryMessage, `Wczytano zestaw: ${savedSet.name}. Zmień ustawienia i wybierz „Zapisz zmiany”.`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      sessionStorage.removeItem("stationSetToEdit");
    }
  }

  function setEditingSet(savedSet) {
    editingSetId = savedSet?.id || null;
    const isEditing = Boolean(editingSetId);
    ui.savedSetName.value = isEditing ? String(savedSet.name || "") : "";
    ui.saveSetSubmit.textContent = isEditing ? "Zapisz zmiany" : "Zapisz aktualny zestaw";
    ui.cancelSetEdit.classList.toggle("hidden", !isEditing);
    ui.editingSetNotice.textContent = isEditing ? `Edytujesz zestaw: ${savedSet.name || "Bez nazwy"}` : "";
    ui.editingSetNotice.classList.toggle("hidden", !isEditing);

    const printSaveButton = document.getElementById("saveSetBtn");
    if (printSaveButton) {
      printSaveButton.textContent = isEditing ? "Zapisz zmiany" : "Zapisz mój zestaw";
    }
  }

  function cancelSetEdit() {
    const wasEditing = Boolean(editingSetId);
    setEditingSet(null);
    sessionStorage.removeItem("pendingStationSet");
    if (wasEditing && ui.overlay && !ui.overlay.classList.contains("hidden")) {
      setMessage(ui.libraryMessage, "Edycja została zakończona. Bieżące ustawienia możesz zapisać jako nowy zestaw.");
    }
  }

  async function loadAdminStats() {
    ui.adminStats.replaceChildren();
    try {
      const snapshot = await getCountFromServer(collection(db, "users"));
      const item = document.createElement("div");
      item.className = "admin-stat";
      const strong = document.createElement("strong");
      strong.textContent = snapshot.data().count;
      const span = document.createElement("span");
      span.textContent = "Założone konta";
      item.append(strong, span);
      ui.adminStats.append(item);
    } catch (error) {
      ui.adminStats.append(emptyMessage("Nie udało się pobrać statystyk."));
    }
  }

  function showAccountTab(tabName) {
    if (tabName === "admin" && !isAdmin) return;
    document.querySelectorAll("[data-account-tab]").forEach((button) => {
      button.classList.toggle("active", button.dataset.accountTab === tabName);
    });
    document.querySelectorAll("[data-account-panel]").forEach((panel) => {
      panel.classList.toggle("hidden", panel.dataset.accountPanel !== tabName);
    });
  }

  function emptyMessage(text) {
    const paragraph = document.createElement("p");
    paragraph.className = "account-list-empty";
    paragraph.textContent = text;
    return paragraph;
  }

  function actionButton(label, extraClass, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `small-button${extraClass ? ` ${extraClass}` : ""}`;
    button.textContent = label;
    button.addEventListener("click", async () => {
      try {
        await handler();
      } catch (error) {
        handleAccountError(error);
      }
    });
    return button;
  }
}
