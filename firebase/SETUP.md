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

Reguły zapewniają każdemu użytkownikowi dostęp tylko do jego gier i zestawów. Zweryfikowane konto `wiechowscy@gmail.com` może dodatkowo odczytać liczbę założonych kont.

## 4. Publikacja reguł

Po zainstalowaniu Firebase CLI i zalogowaniu można użyć:

```bash
firebase use --add
firebase deploy --only firestore:rules
```

## 5. Konto administratora

Najprościej zalogować się w aplikacji przyciskiem Google jako `wiechowscy@gmail.com`. Konto Google ma zweryfikowany adres, dlatego karta `Administrator` pojawi się automatycznie.
