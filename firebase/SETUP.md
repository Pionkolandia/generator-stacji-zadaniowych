# Konfiguracja Firebase

## 1. Projekt

Projekt `stacje-zadaniowe` oraz aplikacja internetowa `Stacje zadaniowe Vercel` są utworzone. Pola `apiKey`, `authDomain`, `projectId` i `appId` są zapisane w `public/firebase-config.js`.

Konfiguracja aplikacji internetowej Firebase jest publicznym identyfikatorem projektu. Dostęp do danych zabezpieczają reguły Firestore, dlatego w repozytorium nie wolno umieszczać kluczy kont usługowych.

## 2. Logowanie

W Firebase Console w `Authentication` → `Sign-in method` są włączone:

- `Email/Password`,
- `Google`, wybierając adres pomocy dla użytkowników.

W `Authentication` → `Settings` → `Authorized domains` należy utrzymywać:

- `stacjezadaniowe.vercel.app`,
- domenę docelową, gdy zostanie podłączona.

## 3. Baza Firestore

Baza Firestore działa w trybie produkcyjnym w lokalizacji `eur3`. Reguły z pliku `firebase/firestore.rules` są wdrożone.

## Aktualizacja listy szkół

Publiczna strona odczytuje zatwierdzoną listę z dokumentu `publicData/schools` i korzysta z lokalnej listy jako kopii awaryjnej. Dokument mogą aktualizować wyłącznie zweryfikowane konta administratorów: `wiechowscy@gmail.com`, `jtrychta@iuvi.pl`, `vkijowska@ateneum.pl` oraz `iuvigamespl@gmail.com`.

Po zalogowaniu uprawniony użytkownik widzi na stronie `/szkoly` przycisk `Pobierz nowe szkoły`. Przycisk prosi Google wyłącznie o dostęp do odczytu prywatnego arkusza, pobiera kolumny potrzebne w katalogu i zapisuje ich publiczną wersję w Firestore. Arkusz źródłowy ani plik Excel nie są udostępniane odwiedzającym.

W projekcie Google Cloud musi być włączona usługa Google Sheets API. Po zmianie reguł należy je ponownie opublikować:

```bash
firebase deploy --only firestore:rules
```

Reguły zapewniają każdemu użytkownikowi dostęp tylko do jego profilu, gier i zestawów. Zweryfikowane konta administratorów mogą dodatkowo odczytać listę profili użytkowników z imieniem i nazwiskiem, adresem e-mail oraz datą utworzenia konta.

## 4. Publikacja reguł

Po zainstalowaniu Firebase CLI i zalogowaniu można użyć:

```bash
firebase use --add
firebase deploy --only firestore:rules
```

## 5. Konto administratora

Karta `Administrator` pojawia się automatycznie po zalogowaniu zweryfikowanym kontem `wiechowscy@gmail.com`, `jtrychta@iuvi.pl`, `vkijowska@ateneum.pl` lub `iuvigamespl@gmail.com`.
