import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../App";
import { deleteEntry, loadEntries } from "../services/storage";
import type { JournalEntry } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "EntryDetail">;

export default function EntryDetailScreen({ route, navigation }: Props) {
  const { id } = route.params;
  const [entry, setEntry] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const entries = await loadEntries();
      setEntry(entries.find((e) => e.id === id) ?? null);
      setLoading(false);
    })();
  }, [id]);

  const openMap = useCallback(() => {
    if (!entry || entry.latitude == null || entry.longitude == null) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${entry.latitude},${entry.longitude}`;
    Linking.openURL(url).catch(() => {
      Alert.alert("Unable to open maps");
    });
  }, [entry]);

  const onDelete = useCallback(() => {
    if (!entry) return;
    Alert.alert("Delete entry", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteEntry(entry.id);
          navigation.goBack();
        },
      },
    ]);
  }, [entry, navigation]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.center}>
        <Text>Entry not found.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Image
        source={{ uri: entry.cloudinaryUrl ?? entry.imageUri }}
        style={styles.image}
      />
      <Text style={styles.title}>{entry.title}</Text>
      <Text style={styles.date}>
        {new Date(entry.createdAt).toLocaleString()}
      </Text>

      {entry.latitude != null && entry.longitude != null ? (
        <Pressable style={styles.locationBox} onPress={openMap}>
          <Text style={styles.sectionLabel}>Location</Text>
          <Text style={styles.locationText}>
            {entry.placeLabel ?? "Tap to open map"}
          </Text>
          <Text style={styles.coords}>
            {entry.latitude.toFixed(5)}, {entry.longitude.toFixed(5)}
          </Text>
          <Text style={styles.linkText}>Open in Google Maps →</Text>
        </Pressable>
      ) : (
        <View style={styles.locationBox}>
          <Text style={styles.sectionLabel}>Location</Text>
          <Text style={styles.locationText}>No location recorded</Text>
        </View>
      )}

      {entry.notes ? (
        <View style={styles.notesBox}>
          <Text style={styles.sectionLabel}>Notes</Text>
          <Text style={styles.notes}>{entry.notes}</Text>
        </View>
      ) : null}

      <View style={styles.metaBox}>
        <Text style={styles.metaLabel}>Cloudinary</Text>
        <Text style={styles.metaValue} selectable>
          {entry.cloudinaryUrl ?? "Not uploaded"}
        </Text>
      </View>

      <Pressable style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteBtnText}>Delete entry</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f6fa" },
  content: { padding: 16, paddingBottom: 48 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f5f6fa",
  },
  image: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: "#ddd",
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: 4 },
  date: { fontSize: 13, color: "#666", marginBottom: 16 },
  locationBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationText: { fontSize: 15, color: "#222", marginBottom: 2 },
  coords: { fontSize: 12, color: "#777", marginBottom: 6 },
  linkText: { color: "#1d6ef5", fontWeight: "600" },
  notesBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  notes: { fontSize: 15, lineHeight: 22, color: "#222" },
  metaBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  metaLabel: { fontSize: 12, fontWeight: "700", color: "#555", marginBottom: 4 },
  metaValue: { fontSize: 12, color: "#444" },
  deleteBtn: {
    backgroundColor: "#d64545",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  deleteBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
});
