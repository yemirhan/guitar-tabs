import { useCallback, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  Alert,
  PlatformColor,
  RefreshControl,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Host,
  Button,
  Image,
  ContentUnavailableView,
  RNHostView,
  SwipeActions,
  ScrollView,
  LazyVStack,
} from "@expo/ui/swift-ui";
import { buttonStyle, controlSize } from "@expo/ui/swift-ui/modifiers";
import { loadLibrary, importScore, removeScore } from "@/lib/library";
import type { ProjectEntry } from "@gtr/shared";
import { useGetTabs } from "@/queries/tabs";

function displayName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function fileBadge(fileName: string): string {
  const ext = fileName.split(".").pop();
  return ext ? ext.toUpperCase() : "TAB";
}

export default function Library() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<ProjectEntry[]>([]);

  const { data, isLoading, error, refetch } = useGetTabs();

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

  const importBarBottomInset = Math.max(insets.bottom, 16);

  return (
    <View style={styles.screen}>
      <FlatList
        style={styles.list}
        data={data}
        keyExtractor={(e) => e.fileName}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustContentInsets={false}
        automaticallyAdjustKeyboardInsets={false}
        alwaysBounceVertical={false}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={refetch} />
        }
        scrollEnabled={entries.length > 0}
        scrollIndicatorInsets={{ bottom: importBarBottomInset + 72 }}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: importBarBottomInset + 84 },
          entries.length === 0 && styles.emptyContent,
        ]}
        ListEmptyComponent={
          <Host style={{ flex: 1 }}>
            <ContentUnavailableView
              title="No Tabs Yet"
              systemImage="guitars"
              description="Import a Guitar Pro file to get started."
            />
          </Host>
        }
        renderItem={({ item, index }) => (
          <Item confirmRemove={confirmRemove} key={index} item={item} />
        )}
      />
      <AddNewTab pickFile={pickFile} />
    </View>
  );
}

const AddNewTab = ({ pickFile }: { pickFile: () => void }) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[styles.importBar, { paddingBottom: Math.max(insets.bottom, 16) }]}
    >
      <Host matchContents>
        <Button
          systemImage="plus"
          label="Import Tab"
          onPress={pickFile}
          modifiers={[buttonStyle("borderedProminent"), controlSize("large")]}
        />
      </Host>
    </View>
  );
};

const Item = ({
  item,
  confirmRemove,
}: {
  item: ProjectEntry;
  confirmRemove: (item: ProjectEntry) => void;
}) => {
  const router = useRouter();
  return (
    <Host matchContents={{ vertical: true }} style={styles.rowHost}>
      <SwipeActions>
        <RNHostView matchContents>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/player",
                params: { file: item.fileName },
              })
            }
            onLongPress={() => confirmRemove(item)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: pressed
                  ? PlatformColor("tertiarySystemGroupedBackground")
                  : PlatformColor("secondarySystemGroupedBackground"),
              },
            ]}
          >
            <View style={styles.iconTile}>
              <Host matchContents>
                <Image
                  systemName="music.note"
                  size={22}
                  color={PlatformColor("systemBlue")}
                />
              </Host>
            </View>
            <View style={styles.titleGroup}>
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
        </RNHostView>
        <SwipeActions.Actions edge="trailing">
          <Button
            label="Delete"
            systemImage="trash"
            role="destructive"
            onPress={() => confirmRemove(item)}
          />
        </SwipeActions.Actions>
      </SwipeActions>
    </Host>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    gap: 10,
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  rowHost: {
    width: "100%",
  },
  row: {
    width: "100%",
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderCurve: "continuous",
  },
  iconTile: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderCurve: "continuous",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(10,132,255,0.12)",
  },
  titleGroup: {
    flex: 1,
    gap: 3,
  },
  importBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0)",
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
