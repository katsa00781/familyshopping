import { SettingsScaffold } from '@/components/profil/SettingsScaffold'
import { LegalSections, type LegalSection } from '@/components/profil/LegalSections'

const SECTIONS: LegalSection[] = [
  {
    heading: 'A szolgáltatás',
    body: 'A FamilyHub egy családi szervező alkalmazás, amely a bevásárlás, a naptár, a kassza és az étkezéstervezés egy helyen kezelését segíti. A szolgáltatást „adott állapotában" biztosítjuk, és folyamatosan fejlesztjük.',
  },
  {
    heading: 'A fiókod',
    body: 'A fiókodért és a hozzá tartozó jelszó biztonságáért te felelsz. A megadott adatok valódiságáért szintén te vagy felelős. Egy fiókot a háztartásod tagjaival oszthatsz meg.',
  },
  {
    heading: 'Elfogadható használat',
    body: 'Az alkalmazást jogszerű, személyes célra használhatod. Tilos az appot vagy a hozzá tartozó szolgáltatásokat visszaélésszerűen, mások adataihoz való jogosulatlan hozzáférésre vagy a rendszer terhelésére használni.',
  },
  {
    heading: 'Felelősség',
    body: 'Az appban megjelenő árak, becslések és emlékeztetők tájékoztató jellegűek. Nem vállalunk felelősséget a megjelenített adatok pontosságából eredő esetleges döntésekért. Az árfigyelés és a kassza-adatok csak segítségként szolgálnak.',
  },
  {
    heading: 'Módosítások',
    body: 'A feltételeket időről időre frissíthetjük. A lényeges változásokról az appban tájékoztatunk. A szolgáltatás további használata a módosított feltételek elfogadását jelenti.',
  },
]

export default function FeltetelekScreen() {
  return (
    <SettingsScaffold title="Felhasználási feltételek">
      <LegalSections
        intro="A FamilyHub használatával elfogadod az alábbi feltételeket."
        sections={SECTIONS}
        updated="2026.06.26."
      />
    </SettingsScaffold>
  )
}
