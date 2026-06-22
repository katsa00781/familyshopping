import { useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, Text, View } from 'react-native'

import BottomSheet from '@/components/ui/BottomSheet'
import { getWalletSpendingDetail } from '@/lib/budget'
import { formatHuf, formatHuDate } from '@/lib/format'
import { colors } from '@/constants/colors'
import type { WalletCategoryDetail } from '@/types'

interface CategorySpendingSheetProps {
  visible: boolean
  /** A megnyitott terv-kategória neve (null = zárva). */
  category: string | null
  /** A hónap első napja (YYYY-MM-DD). */
  month: string
  /** A terv-kategória betervezett kerete – a fejléc összevetéshez. */
  planned: number
  onClose: () => void
}

type Status = 'loading' | 'ready' | 'empty' | 'error'

/**
 * Egy terv-kategória költésének részletezője: Wallet-alkategória csoportok,
 * azon belül a konkrét tételek (dátum · megnevezés · összeg). A wallet-spending
 * Edge Function `detail` módjából tölt.
 */
export function CategorySpendingSheet({
  visible,
  category,
  month,
  planned,
  onClose,
}: CategorySpendingSheetProps) {
  const [status, setStatus] = useState<Status>('loading')
  const [detail, setDetail] = useState<WalletCategoryDetail | null>(null)

  useEffect(() => {
    let active = true
    if (!visible || !category) return
    setStatus('loading')
    setDetail(null)
    getWalletSpendingDetail(month, category)
      .then((d) => {
        if (!active) return
        if (!d || d.groups.length === 0) {
          setStatus('empty')
          return
        }
        setDetail(d)
        setStatus('ready')
      })
      .catch(() => {
        if (active) setStatus('error')
      })
    return () => {
      active = false
    }
  }, [visible, category, month])

  return (
    <BottomSheet visible={visible} onClose={onClose} title={category ?? ''} variant="full">
      {status === 'ready' && detail ? (
        <>
          {/* Összegző fejléc: valós elköltött / betervezett */}
          <View className="mb-3 flex-row items-end justify-between">
            <View>
              <Text className="text-body-sm text-muted">Elköltve</Text>
              <Text className="text-heading-lg font-bold text-foreground dark:text-dark-foreground">
                {formatHuf(detail.total)}
              </Text>
            </View>
            <Text className="text-body-sm text-muted">{`Keret: ${formatHuf(planned)}`}</Text>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {detail.groups.map((g) => (
              <View key={g.subCategory} className="mb-4">
                <View className="mb-1 flex-row items-center justify-between">
                  <Text className="text-body-md font-semibold text-foreground dark:text-dark-foreground">
                    {g.subCategory}
                  </Text>
                  <Text className="text-body-md font-semibold text-primary">{formatHuf(g.total)}</Text>
                </View>
                {g.records.map((r, i) => (
                  <View
                    key={`${g.subCategory}-${i}`}
                    className="flex-row items-center justify-between border-t border-border dark:border-dark-border py-2"
                  >
                    <View className="flex-1 pr-3">
                      <Text
                        className="text-body-md text-foreground dark:text-dark-foreground"
                        numberOfLines={1}
                      >
                        {r.label}
                      </Text>
                      <Text className="text-body-sm text-muted">{formatHuDate(r.date)}</Text>
                    </View>
                    <Text className="text-body-md font-medium text-foreground dark:text-dark-foreground">
                      {formatHuf(r.amount)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
        </>
      ) : status === 'loading' ? (
        <View className="flex-1 items-center justify-center" style={{ minHeight: 160 }}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-4" style={{ minHeight: 160 }}>
          <Text className="text-body-md text-muted text-center">
            {status === 'error'
              ? 'A részletek betöltése nem sikerült.'
              : 'Ebben a hónapban nincs költés ebben a kategóriában.'}
          </Text>
        </View>
      )}
    </BottomSheet>
  )
}
