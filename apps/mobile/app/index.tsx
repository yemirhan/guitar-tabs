import { useCallback, useState } from 'react'
import { FlatList, Pressable, Text, View, Alert } from 'react-native'
import { useFocusEffect, useRouter } from 'expo-router'
import * as DocumentPicker from 'expo-document-picker'
import { Host, Button } from '@expo/ui/swift-ui'
import { loadLibrary, importScore, removeScore } from '@/lib/library'
import type { ProjectEntry } from '@gtr/shared'

export default function Library() {
  const router = useRouter()
  const [entries, setEntries] = useState<ProjectEntry[]>([])

  useFocusEffect(
    useCallback(() => {
      setEntries(loadLibrary())
    }, [])
  )

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: '*/*'
    })
    if (res.canceled || !res.assets?.length) return
    const asset = res.assets[0]
    try {
      setEntries(await importScore(asset.uri, asset.name))
    } catch (e) {
      Alert.alert('Import failed', String(e))
    }
  }

  const confirmRemove = (entry: ProjectEntry) => {
    Alert.alert('Remove tab?', entry.fileName, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => setEntries(removeScore(entry.fileName))
      }
    ])
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.fileName}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 8 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', paddingTop: 80, gap: 8 }}>
            <Text style={{ fontSize: 17, fontWeight: '600' }}>No tabs yet</Text>
            <Text style={{ opacity: 0.6 }}>Import a Guitar Pro file to get started.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({ pathname: '/player', params: { file: item.fileName } })
            }
            onLongPress={() => confirmRemove(item)}
            style={{
              padding: 16,
              borderRadius: 12,
              borderCurve: 'continuous',
              backgroundColor: 'rgba(128,128,128,0.08)',
              gap: 4
            }}>
            <Text style={{ fontSize: 17, fontWeight: '600' }} selectable>
              {item.fileName}
            </Text>
            <Text style={{ opacity: 0.6, fontSize: 13 }}>
              Added {new Date(item.addedAt).toLocaleDateString()}
            </Text>
          </Pressable>
        )}
      />
      <View style={{ alignItems: 'center', padding: 16 }}>
        <Host matchContents>
          <Button systemImage="plus" label="Import Tab" onPress={pickFile} />
        </Host>
      </View>
    </View>
  )
}
