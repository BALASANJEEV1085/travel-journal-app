import React, { useCallback, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../App";
import { loadEntries } from "../services/storage";
import type { JournalEntry } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Home">;

export default function HomeScreen({ navigation }: Props) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      setEntries(await loadEntries());
    } finally {
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        contentContainerStyle={
          entries.length === 0 ? styles.emptyWrap : styles.listContent
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>No entries yet</Text>
            <Text style={styles.emptyText}>
              Tap the camera button below to capture your first travel memory.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("EntryDetail", { id: item.id })}
          >
            <Image
              source={{ uri: item.cloudinaryUrl ?? item.imageUri }}
              style={styles.thumb}
            />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle} numberOfLines={1}>
                {item.title || "Untitled"}
              </Text>
              <Text style={styles.cardMeta} numberOfLines={1}>
                {item.placeLabel ??
                  (item.latitude != null && item.longitude != null
                    ? `${item.latitude.toFixed(3)}, ${item.longitude.toFixed(3)}`
                    : "No location")}
              </Text>
              <Text style={styles.cardDate}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      />

      <Pressable
        style={styles.fab}
        onPress={() => navigation.navigate("Capture")}
      >
        <Text style={styles.fabText}>+ Capture</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa" },
  listContent: { padding: 16, paddingBottom: 100 },
  emptyWrap: { flexGrow: 1, padding: 24, justifyContent: "center" },
  empty: { alignItems: "center" },
  emptyTitle: { fontSize: 20, fontWeight: "600", marginBottom: 8 },
  emptyText: { textAlign: "center", color: "#555", lineHeight: 20 },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  thumb: { width: 96, height: 96, backgroundColor: "#ddd" },
  cardBody: { flex: 1, padding: 12, justifyContent: "center" },
  cardTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  cardMeta: { fontSize: 13, color: "#444", marginBottom: 4 },
  cardDate: { fontSize: 12, color: "#888" },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: "#1d6ef5",
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 28,
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  fabText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
