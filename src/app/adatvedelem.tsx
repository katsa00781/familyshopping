import { SettingsScaffold } from '@/components/profil/SettingsScaffold'
import { LegalSections, type LegalSection } from '@/components/profil/LegalSections'

const SECTIONS: LegalSection[] = [
  {
    heading: 'Milyen adatokat kezelünk',
    body: 'A FamilyHub a fiókodhoz tartozó email-címet, a megadott nevet, valamint az általad létrehozott bevásárlólistákat, naptáreseményeket, étrendet és a kasszához kapcsolódó adatokat tárolja. Minden adat a saját fiókodhoz (felhasználói azonosítódhoz) kötött.',
  },
  {
    heading: 'Hol tároljuk az adatokat',
    body: 'Az adataidat a Supabase felhőszolgáltatásban tároljuk, soronkénti hozzáférés-szabályozással (RLS) védve: kizárólag a saját adataidat éred el. A blokk-szkenneléshez használt kép feldolgozása szerveroldalon történik, és nem kerül tartós tárolásra.',
  },
  {
    heading: 'Harmadik felek',
    body: 'A kassza valós költési adatait – ha engedélyezed – a saját BudgetBakers Wallet fiókodból olvassuk be, kizárólag megjelenítés céljából. Reklámcélú adatmegosztás nincs.',
  },
  {
    heading: 'Az adataid törlése',
    body: 'A listáidat, eseményeidet és egyéb tartalmaidat bármikor törölheted az appból. A fiókod teljes törlését a support@familyhub.app címen kérheted.',
  },
]

export default function AdatvedelemScreen() {
  return (
    <SettingsScaffold title="Adatvédelem">
      <LegalSections
        intro="Ez a tájékoztató összefoglalja, hogyan kezeljük a FamilyHub használata során keletkező adataidat."
        sections={SECTIONS}
        updated="2026.06.26."
      />
    </SettingsScaffold>
  )
}
