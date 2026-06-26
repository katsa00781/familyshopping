import { Text, View } from 'react-native'

export interface LegalSection {
  heading: string
  body: string
}

interface LegalSectionsProps {
  intro?: string
  sections: LegalSection[]
  updated: string
}

/** Statikus jogi tartalom renderelő (Adatvédelem / Feltételek) – token színek. */
export function LegalSections({ intro, sections, updated }: LegalSectionsProps) {
  return (
    <View className="gap-5">
      {intro ? (
        <Text className="text-body-md text-foreground dark:text-dark-foreground leading-6">
          {intro}
        </Text>
      ) : null}
      {sections.map((section) => (
        <View key={section.heading} className="gap-1.5">
          <Text className="text-heading-md font-semibold text-foreground dark:text-dark-foreground">
            {section.heading}
          </Text>
          <Text className="text-body-md text-muted leading-6">{section.body}</Text>
        </View>
      ))}
      <Text className="text-body-sm text-muted pt-2">Utolsó frissítés: {updated}</Text>
    </View>
  )
}
