import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  Text,
  View,
  Alert,
  PlatformColor,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { Host, Button, Image, ContentUnavailableView } from "@expo/ui/swift-ui";
import { buttonStyle, controlSize } from "@expo/ui/swift-ui/modifiers";
import { loadLibrary, importScore, removeScore } from "@/lib/library";
import type { ProjectEntry } from "@gtr/shared";

function displayName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function fileBadge(fileName: string): string {
  const ext = fileName.split(".").pop();
  return ext ? ext.toUpperCase() : "TAB";
}

export default function Library() {
  const router = useRouter();
  const [entries, setEntries] = useState<ProjectEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      setEntries(loadLibrary());
    }, []),
  );

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      type: "*/*",
    });
    if (res.canceled || !res.assets?.length) return;
    const asset = res.assets[0];
    try {
      setEntries(await importScore(asset.uri, asset.name));
    } catch (e) {
      Alert.alert("Import failed", String(e));
    }
  };

  const confirmRemove = (entry: ProjectEntry) => {
    Alert.alert("Remove tab?", entry.fileName, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () => setEntries(removeScore(entry.fileName)),
      },
    ]);
  };

  return (
    <>
      <FlatList
        data={entries}
        keyExtractor={(e) => e.fileName}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }}
        ListEmptyComponent={
          <Host style={{ flex: 1 }}>
            <ContentUnavailableView
              title="No Tabs Yet"
              systemImage="guitars"
              description="Import a Guitar Pro file to get started."
            />
          </Host>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/player",
                params: { file: item.fileName },
              })
            }
            onLongPress={() => confirmRemove(item)}
            style={({ pressed }) => ({
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
              padding: 14,
              borderRadius: 16,
              borderCurve: "continuous",
              backgroundColor: pressed
                ? PlatformColor("tertiarySystemGroupedBackground")
                : PlatformColor("secondarySystemGroupedBackground"),
            })}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                borderCurve: "continuous",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(10,132,255,0.12)",
              }}
            >
              <Host matchContents>
                <Image
                  systemName="music.note"
                  size={22}
                  color={PlatformColor("systemBlue")}
                />
              </Host>
            </View>
            <View style={{ flex: 1, gap: 3 }}>
              <Text
                numberOfLines={1}
                style={{
                  fontSize: 17,
                  fontWeight: "600",
                  color: PlatformColor("label"),
                }}
              >
                {displayName(item.fileName)}
              </Text>
              <Text
                style={{ fontSize: 13, color: PlatformColor("secondaryLabel") }}
              >
                {fileBadge(item.fileName)} · Added{" "}
                {new Date(item.addedAt).toLocaleDateString()}
              </Text>
            </View>
            <Host matchContents>
              <Image
                systemName="chevron.right"
                size={14}
                color={PlatformColor("tertiaryLabel")}
              />
            </Host>
          </Pressable>
        )}
      />
      <View
        style={{
          alignItems: "center",
          paddingHorizontal: 16,
          paddingBottom: 24,
        }}
      >
        <Host matchContents>
          <Button
            systemImage="plus"
            label="Import Tab"
            onPress={pickFile}
            modifiers={[buttonStyle("glassProminent"), controlSize("large")]}
          />
        </Host>
      </View>
    </>
  );
}
