-- Családi feladatok: ismétlődés (2026-11-09).
--
-- `rrule`: RFC 5545 részhalmaz (FREQ=DAILY|WEEKLY|MONTHLY|YEARLY;INTERVAL=n), mint a
-- `calendar_events.rrule`. Ismétlődő feladat kipipálásakor a kliens a `due_at`-et a
-- következő esedékességre lépteti (nem jön létre új sor). null = egyszeri feladat.
--
-- Újrafuttatható (idempotens).

alter table public.family_tasks add column if not exists rrule text;
