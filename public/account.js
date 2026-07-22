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
    wishlistDocumentType: document.getElementById("wishlistDocumentType"),
    wishlistBuyerName: document.getElementById("wishlistBuyerName"),
    wishlistContact: document.getElementById("wishlistContact"),
    wishlistNotes: document.getElementById("wishlistNotes"),
    printWishlist: document.getElementById("printWishlistBtn"),
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
    ui.printWishlist.addEventListener("click", printWishlistDocument);
    ui.saveSetForm.addEventListener("submit", saveCurrentSet);
    ui.cancelSetEdit.addEventListener("click", cancelSetEdit);
    ui.manageSets?.addEventListener("click", () => {
      if (isAccountPage) showAccountTab("sets");
      else window.location.assign("/konto.html#sets");
    });

    document.querySelectorAll("[data-account-tab]").forEach((button) => {
      button.addEventListener("click", () => showAccountTab(button.dataset.accountTab));
    });

    window.addEventListener("station-game-added", (event) => {
      if (currentUser && event.detail?.title) {
        persistGame(event.detail.title, false).catch(handleAccountError);
      }
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
    if (ui.wishlistContact && !ui.wishlistContact.value) {
      ui.wishlistContact.value = currentUser.email || "";
    }
    ui.adminTab.classList.toggle("hidden", !isAdmin);
    await Promise.all([loadUserGames(), loadSavedSets(), isAdmin ? loadAdminStats() : Promise.resolve()]);
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
        normalizedTitle: data.normalizedTitle || normalizeTitle(data.title),
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
    if (title.length < 2 || !currentUser) return;
    const existing = gameByTitle(title);
    if (existing?.ownedQuantity > 0) {
      if (showFeedback) setMessage(ui.libraryMessage, "Ta gra jest już w Twojej bibliotece.");
      return;
    }
    try {
      await saveGameState(title, 1, existing?.wishlistQuantity || 0);
      ui.gameTitle.value = "";
      if (showFeedback) setMessage(ui.libraryMessage, "Gra została dodana.");
    } catch (error) {
      if (showFeedback) setMessage(ui.libraryMessage, friendlyError(error), true);
      else throw error;
    }
  }

  function renderGames() {
    ui.gamesList.replaceChildren();
    const catalogKeys = new Set(catalogGames.map((game) => normalizeTitle(game.title)));
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
    const customGames = userGames.filter((game) => !catalogKeys.has(game.normalizedTitle) && game.ownedQuantity > 0);
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
      const remove = actionButton("Usuń", "danger", async () => {
        if (!window.confirm(`Usunąć grę „${game.title}” z Twojej kolekcji?`)) return;
        await saveGameState(game.title, 0, game.wishlistQuantity);
      });
      const actions = document.createElement("div");
      actions.className = "account-list-actions";
      actions.append(quantity, remove);
      row.append(copy, actions);
      ui.customGamesList.append(row);
    });
  }

  function normalizeTitle(title) {
    return String(title || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl-PL");
  }

  function storedQuantity(value, fallback) {
    if (value === undefined || value === null || value === "") return fallback;
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(99, Math.round(number))) : fallback;
  }

  function gameByTitle(title) {
    const normalizedTitle = normalizeTitle(title);
    return userGames.find((game) => game.normalizedTitle === normalizedTitle);
  }

  async function saveGameState(title, ownedQuantity, wishlistQuantity) {
    const normalizedTitle = normalizeTitle(title);
    const matches = userGames.filter((game) => game.normalizedTitle === normalizedTitle);
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
    checkbox.setAttribute("aria-label", mode === "owned" ? `Mam grę ${game.title}` : `Chcę kupić grę ${game.title}`);
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
    quantityInput.setAttribute("aria-label", `${mode === "owned" ? "Posiadane" : "Planowane"} egzemplarze gry ${game.title}`);
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
    ui.wishlistCopiesCount.textContent = `${wantedCopies} ${wantedCopies === 1 ? "sztuka do zamówienia" : "sztuk do zamówienia"}`;
    ui.printWishlist.disabled = !wantedGames.length;
    catalogGames.forEach((game) => ui.wishlistList.append(catalogCard(game, "wishlist")));
  }

  function escapeDocumentText(value) {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function printWishlistDocument() {
    const selectedGames = catalogGames.map((game) => ({
      ...game,
      quantity: gameByTitle(game.title)?.wishlistQuantity || 0
    })).filter((game) => game.quantity > 0);
    if (!selectedGames.length) {
      setMessage(ui.libraryMessage, "Najpierw zaznacz co najmniej jedną grę na liście życzeń.", true);
      return;
    }

    const printWindow = window.open("", "wishlist-document", "width=980,height=760");
    if (!printWindow) {
      setMessage(ui.libraryMessage, "Przeglądarka zablokowała okno wydruku. Zezwól tej stronie na otwieranie okien.", true);
      return;
    }

    const isOrder = ui.wishlistDocumentType.value === "order";
    const documentTitle = isOrder ? "Lista do zamówienia" : "Prośba o wycenę";
    const buyer = ui.wishlistBuyerName.value.trim() || "........................................................";
    const contact = ui.wishlistContact.value.trim() || currentUser?.email || "........................................................";
    const notes = ui.wishlistNotes.value.trim() || "Proszę o informację o dostępności, terminie realizacji oraz kosztach dostawy.";
    const totalCopies = selectedGames.reduce((sum, game) => sum + game.quantity, 0);
    const date = new Intl.DateTimeFormat("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date());
    const rows = selectedGames.map((game, index) => `
      <tr>
        <td>${index + 1}</td>
        <td><strong>${escapeDocumentText(game.title)}</strong></td>
        <td class="quantity">${game.quantity}</td>
        <td><a href="${escapeDocumentText(game.url)}">Zobacz produkt</a></td>
      </tr>
    `).join("");

    printWindow.document.write(`<!doctype html>
      <html lang="pl"><head><meta charset="utf-8"><title>${documentTitle}</title>
      <style>
        @page { size: A4; margin: 14mm; }
        * { box-sizing: border-box; }
        body { margin: 0; color: #18213f; font-family: Arial, sans-serif; font-size: 12px; }
        header { display: flex; align-items: center; justify-content: space-between; gap: 20px; border-bottom: 3px solid #2647df; padding-bottom: 12px; }
        header img { width: 180px; height: auto; }
        h1 { margin: 0; color: #142c91; font-size: 27px; }
        .date { margin-top: 5px; color: #5d6787; text-align: right; }
        .details { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 18px 0; }
        .detail { border: 1px solid #d8deef; padding: 10px; }
        .detail span { display: block; margin-bottom: 3px; color: #5d6787; font-size: 10px; font-weight: bold; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #2647df; color: white; text-align: left; }
        th, td { border: 1px solid #d8deef; padding: 8px; }
        tbody tr:nth-child(even) { background: #f4f7ff; }
        .quantity { width: 74px; font-size: 15px; font-weight: bold; text-align: center; }
        a { color: #142c91; }
        .summary { margin: 12px 0; padding: 10px; background: #e8edff; color: #142c91; font-weight: bold; }
        .notes { margin-top: 16px; border-top: 1px solid #d8deef; padding-top: 12px; white-space: pre-wrap; }
        footer { margin-top: 22px; color: #5d6787; font-size: 10px; }
      </style></head><body>
      <header>
        <img src="${window.location.origin}/assets/logo-szkola-jest-smart.png" alt="Szkoła jest SMART">
        <div><h1>${documentTitle}</h1><div class="date">Data: ${date}</div></div>
      </header>
      <section class="details">
        <div class="detail"><span>Zamawiający / placówka</span>${escapeDocumentText(buyer)}</div>
        <div class="detail"><span>Dane kontaktowe</span>${escapeDocumentText(contact)}</div>
      </section>
      <table><thead><tr><th>Lp.</th><th>Gra</th><th>Liczba sztuk</th><th>Informacje</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="summary">Razem: ${selectedGames.length} ${selectedGames.length === 1 ? "tytuł" : "tytułów"}, ${totalCopies} ${totalCopies === 1 ? "sztuka" : "sztuk"}.</div>
      <div class="notes"><strong>Uwagi:</strong><br>${escapeDocumentText(notes)}</div>
      <footer>Dokument wygenerowany w aplikacji Stacje zadaniowe - Szkoła jest SMART!</footer>
      <script>window.addEventListener("load", () => { window.focus(); window.print(); });<\/script>
      </body></html>`);
    printWindow.document.close();
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
