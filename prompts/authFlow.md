## Auth flow

- [ ] `store/authStore.ts` – Zustand store (session, user, signIn, signOut)
- [ ] `app/(auth)/login.tsx` – Login képernyő (design: 3/5 PDF, 01. Login)
  - Logo + "Üdvözöllek!" heading
  - Email + jelszó input (label fent, eye toggle)
  - "Bejelentkezés" primary lg gomb (disabled amíg üres mező)
  - "Elfelejtettem a jelszavam" ghost link
  - "Még nincs fiókom — Regisztrálok" secondary gomb
  - Error: piros toast + email mező shake animáció
- [ ] `app/(auth)/register.tsx` – Regisztrációs képernyő (alap, name + email + pw)
- [ ] `app/_layout.tsx` – Auth guard: bejelentkezve → tabs, kijelentkezve → login
- [ ] Supabase session persist tesztelése (app újraindítás után marad a login)
