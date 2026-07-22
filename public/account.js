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

  if (!window.StationApp) {
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
  const catalogGames = window.StationApp?.getCatalogGames() || [];
  let savedSets = [];
  let isAdmin = false;
  let editingSetId = null;

  ui.bar.classList.remove("hidden");
  bindEvents();
  onAuthStateChanged(auth, (user) => syncSession(user).catch(handleAccountError));
  getRedirectResult(auth).catch((error) => setMessage(ui.authMessage, friendlyError(error), true));

  function bindEvents() {
    ui.trigger.addEventListener("click", openAccount);
    ui.close.addEventListener("click", closeAccount);
    ui.overlay.addEventListener("click", (event) => {
      if (event.target === ui.overlay) closeAccount();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !ui.overlay.classList.contains("hidden")) closeAccount();
    });

    ui.authForm.addEventListener("submit", signInWithEmail);
    ui.signup.addEventListener("click", signUpWithEmail);
    ui.google.addEventListener("click", signInWithGoogle);
    ui.resetPassword.addEventListener("click", sendPasswordReset);
    ui.logout.addEventListener("click", () => signOut(auth).catch(handleAccountError));
    ui.gameForm.addEventListener("submit", addGame);
    ui.saveSetForm.addEventListener("submit", saveCurrentSet);
    ui.cancelSetEdit.addEventListener("click", cancelSetEdit);
    ui.manageSets.addEventListener("click", () => {
      openAccount();
      showAccountTab("sets");
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
    ui.overlay.classList.remove("hidden");
    document.body.classList.add("account-open");
    window.setTimeout(() => (currentUser ? ui.close : ui.authEmail).focus(), 0);
  }

  function closeAccount() {
    ui.overlay.classList.add("hidden");
    document.body.classList.remove("account-open");
    ui.trigger.focus();
  }

  function setMessage(element, text, error = false) {
    element.textContent = text;
    element.classList.toggle("error", error);
    element.classList.toggle("hidden", !text);
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
      ui.savedSetsSection.classList.add("hidden");
      ui.adminTab.classList.add("hidden");
      ui.barTitle.textContent = "Twoje konto";
      ui.barSubtitle.textContent = "Zaloguj się, aby zapisywać gry i zestawy.";
      ui.trigger.textContent = "Zaloguj się";
      return;
    }

    await ensureUserProfile();
    ui.authView.classList.add("hidden");
    ui.libraryView.classList.remove("hidden");
    ui.accountEmail.textContent = currentUser.email || "Konto nauczyciela";
    ui.barTitle.textContent = "Moje materiały";
    ui.barSubtitle.textContent = currentUser.email || "Konto nauczyciela";
    ui.trigger.textContent = "Otwórz konto";
    ui.adminTab.classList.toggle("hidden", !isAdmin);
    await Promise.all([loadUserGames(), loadSavedSets(), isAdmin ? loadAdminStats() : Promise.resolve()]);
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
        normalizedTitle: data.normalizedTitle || normalizeTitle(data.title)
      };
    });
    window.StationApp?.setUserGames(userGames.map((game) => game.title));
    renderGames();
  }

  async function addGame(event) {
    event.preventDefault();
    await persistGame(ui.gameTitle.value, true);
  }

  async function persistGame(rawTitle, showFeedback) {
    const title = String(rawTitle || "").trim().replace(/\s+/g, " ");
    if (title.length < 2 || !currentUser) return;
    const normalizedTitle = title.toLocaleLowerCase("pl-PL");
    if (userGames.some((game) => game.normalizedTitle === normalizedTitle)) {
      if (showFeedback) setMessage(ui.libraryMessage, "Ta gra jest już w Twojej bibliotece.");
      return;
    }
    try {
      await addDoc(gamesCollection(), { title, normalizedTitle, createdAt: serverTimestamp() });
      ui.gameTitle.value = "";
      await loadUserGames();
      if (showFeedback) setMessage(ui.libraryMessage, "Gra została dodana.");
    } catch (error) {
      if (showFeedback) setMessage(ui.libraryMessage, friendlyError(error), true);
      else throw error;
    }
  }

  function renderGames() {
    ui.gamesList.replaceChildren();
    const ownedKeys = new Set(userGames.map((game) => game.normalizedTitle));
    const catalogKeys = new Set(catalogGames.map((game) => normalizeTitle(game.title)));
    const ownedCatalogCount = catalogGames.filter((game) => ownedKeys.has(normalizeTitle(game.title))).length;
    ui.ownedGamesCount.textContent = `${ownedCatalogCount} z ${catalogGames.length} gier`;

    catalogGames.forEach((game) => {
      const row = document.createElement("div");
      const normalizedTitle = normalizeTitle(game.title);
      const isOwned = ownedKeys.has(normalizedTitle);
      row.className = `collection-game${isOwned ? " owned" : ""}`;

      const checkLabel = document.createElement("label");
      checkLabel.className = "collection-check";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = isOwned;
      checkbox.setAttribute("aria-label", `Mam grę ${game.title}`);
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
      const title = document.createElement("strong");
      title.textContent = game.title;
      const productHint = document.createElement("span");
      productHint.textContent = "Podgląd w Iuvi Games ↗";
      copy.append(title, productHint);
      link.append(preview, copy);

      checkbox.addEventListener("change", async () => {
        checkbox.disabled = true;
        try {
          if (checkbox.checked) {
            await persistGame(game.title, false);
            setMessage(ui.libraryMessage, `Dodano do kolekcji: ${game.title}.`);
          } else {
            await removeGameByTitle(game.title);
            setMessage(ui.libraryMessage, `Usunięto z kolekcji: ${game.title}.`);
          }
        } catch (error) {
          checkbox.checked = !checkbox.checked;
          checkbox.disabled = false;
          handleAccountError(error);
        }
      });

      row.append(checkLabel, link);
      ui.gamesList.append(row);
    });

    ui.customGamesList.replaceChildren();
    const customGames = userGames.filter((game) => !catalogKeys.has(game.normalizedTitle));
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
      const remove = actionButton("Usuń", "danger", async () => {
        if (!window.confirm(`Usunąć grę „${game.title}” z Twojej kolekcji?`)) return;
        await deleteDoc(doc(db, "users", currentUser.uid, "games", game.id));
        await loadUserGames();
      });
      const actions = document.createElement("div");
      actions.className = "account-list-actions";
      actions.append(remove);
      row.append(copy, actions);
      ui.customGamesList.append(row);
    });
  }

  function normalizeTitle(title) {
    return String(title || "").trim().replace(/\s+/g, " ").toLocaleLowerCase("pl-PL");
  }

  async function removeGameByTitle(title) {
    const normalizedTitle = normalizeTitle(title);
    const matches = userGames.filter((game) => game.normalizedTitle === normalizedTitle);
    await Promise.all(matches.map((game) => deleteDoc(doc(db, "users", currentUser.uid, "games", game.id))));
    await loadUserGames();
  }

  async function loadSavedSets() {
    const snapshot = await getDocs(query(setsCollection(), orderBy("updatedAt", "desc")));
    savedSets = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderSavedSets();
    renderSavedPresetCards();
  }

  async function saveCurrentSet(event) {
    event.preventDefault();
    const currentSet = window.StationApp?.getCurrentSet();
    if (!currentSet?.complete) {
      setMessage(ui.libraryMessage, "Najpierw wybierz grę dla każdego stanowiska.", true);
      return;
    }
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
    if (!window.StationApp?.loadSet(savedSet)) {
      setMessage(ui.libraryMessage, "Nie udało się wczytać tego zestawu.", true);
      return;
    }
    setEditingSet(savedSet);
    closeAccount();
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
    if (wasEditing && !ui.overlay.classList.contains("hidden")) {
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
