import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../../App";
import { uploadImageToCloudinary } from "../services/cloudinary";
import { getCurrentLocation } from "../services/location";
import { addEntry } from "../services/storage";
import type { JournalEntry } from "../types";

type Props = NativeStackScreenProps<RootStackParamList, "Capture">;

interface GeoState {
  latitude: number | null;
  longitude: number | null;
  placeLabel: string | null;
}

const EMPTY_GEO: GeoState = {
  latitude: null,
  longitude: null,
  placeLabel: null,
};

export default function CaptureScreen({ navigation }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView | null>(null);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [geo, setGeo] = useState<GeoState>(EMPTY_GEO);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchLocation = useCallback(async () => {
    setLocating(true);
    try {
      const fix = await getCurrentLocation();
      setGeo(fix);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert("Location unavailable", message);
    } finally {
      setLocating(false);
    }
  }, []);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const takePicture = useCallback(async () => {
    if (!cameraRef.current) return;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });
      if (photo?.uri) setImageUri(photo.uri);
    } catch (err) {
      Alert.alert(
        "Capture failed",
        err instanceof Error ? err.message : String(err),
      );
    }
  }, []);

  const pickFromLibrary = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      exif: true,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setImageUri(result.assets[0].uri);
    }
  }, []);

  const save = useCallback(async () => {
    if (!imageUri) {
      Alert.alert("No photo", "Capture or pick an image first.");
      return;
    }
    setSaving(true);
    try {
      let cloudinaryUrl: string | null = null;
      let cloudinaryPublicId: string | null = null;
      try {
        const uploaded = await uploadImageToCloudinary({
          imageUri,
          latitude: geo.latitude,
          longitude: geo.longitude,
          placeLabel: geo.placeLabel,
          title,
        });
        cloudinaryUrl = uploaded.secureUrl;
        cloudinaryPublicId = uploaded.publicId;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        // Non-fatal: keep the entry locally even if upload fails (e.g. offline).
        Alert.alert(
          "Cloud upload failed",
          `Saved locally only. ${message}`,
        );
      }

      const entry: JournalEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: title.trim() || "Untitled",
        notes: notes.trim(),
        imageUri,
        cloudinaryUrl,
        cloudinaryPublicId,
        latitude: geo.latitude,
        longitude: geo.longitude,
        placeLabel: geo.placeLabel,
        createdAt: new Date().toISOString(),
      };

      await addEntry(entry);
      navigation.goBack();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      Alert.alert("Save failed", `Could not save the entry. ${message}`);
    } finally {
      setSaving(false);
    }
  }, [imageUri, title, notes, geo, navigation]);

  if (!permission) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.center}>
        <Text style={styles.permissionText}>
          We need camera access to capture travel photos.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={requestPermission}>
          <Text style={styles.primaryBtnText}>Grant camera permission</Text>
        </Pressable>
        <Pressable style={styles.secondaryBtn} onPress={pickFromLibrary}>
          <Text style={styles.secondaryBtnText}>Pick from gallery instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.cameraWrap}>
        {imageUri ? (
          <Image source={{ uri: imageUri }} style={styles.preview} />
        ) : (
          <CameraView
            ref={(ref) => {
              cameraRef.current = ref;
            }}
            style={styles.camera}
            facing="back"
          />
        )}
      </View>

      <View style={styles.row}>
        {imageUri ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => setImageUri(null)}
          >
            <Text style={styles.secondaryBtnText}>Retake</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.primaryBtn} onPress={takePicture}>
            <Text style={styles.primaryBtnText}>Capture</Text>
          </Pressable>
        )}
        <Pressable style={styles.secondaryBtn} onPress={pickFromLibrary}>
          <Text style={styles.secondaryBtnText}>Gallery</Text>
        </Pressable>
      </View>

      <View style={styles.locationBox}>
        <Text style={styles.sectionLabel}>Location</Text>
        {locating ? (
          <View style={styles.rowInline}>
            <ActivityIndicator />
            <Text style={styles.locationText}>Getting GPS fix…</Text>
          </View>
        ) : geo.latitude != null && geo.longitude != null ? (
          <>
            <Text style={styles.locationText}>
              {geo.placeLabel ?? "Unknown place"}
            </Text>
            <Text style={styles.coords}>
              {geo.latitude.toFixed(5)}, {geo.longitude.toFixed(5)}
            </Text>
          </>
        ) : (
          <Text style={styles.locationText}>Location unavailable</Text>
        )}
        <Pressable style={styles.linkBtn} onPress={fetchLocation}>
          <Text style={styles.linkBtnText}>Refresh location</Text>
        </Pressable>
      </View>

      <Text style={styles.sectionLabel}>Title</Text>
      <TextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="e.g. Sunset at Marina Beach"
      />

      <Text style={styles.sectionLabel}>Notes</Text>
      <TextInput
        style={[styles.input, styles.multiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="What do you want to remember?"
        multiline
      />

      <Pressable
        style={[styles.saveBtn, (saving || !imageUri) && styles.saveBtnDisabled]}
        onPress={save}
        disabled={saving || !imageUri}
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveBtnText}>Save entry</Text>
        )}
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
    padding: 24,
    backgroundColor: "#f5f6fa",
  },
  cameraWrap: {
    aspectRatio: 3 / 4,
    backgroundColor: "#000",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 12,
  },
  camera: { flex: 1 },
  preview: { width: "100%", height: "100%", resizeMode: "cover" },
  row: { flexDirection: "row", gap: 12, marginBottom: 16 },
  rowInline: { flexDirection: "row", alignItems: "center", gap: 8 },
  primaryBtn: {
    flex: 1,
    backgroundColor: "#1d6ef5",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  secondaryBtn: {
    flex: 1,
    backgroundColor: "#e4e7ef",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  secondaryBtnText: { color: "#1d6ef5", fontWeight: "600", fontSize: 15 },
  locationBox: {
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: "#555",
    marginBottom: 6,
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  locationText: { fontSize: 15, color: "#222", marginBottom: 2 },
  coords: { fontSize: 12, color: "#777", marginBottom: 6 },
  linkBtn: { alignSelf: "flex-start", paddingVertical: 6 },
  linkBtnText: { color: "#1d6ef5", fontWeight: "600" },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
  },
  multiline: { minHeight: 100, textAlignVertical: "top" },
  saveBtn: {
    backgroundColor: "#1d6ef5",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  permissionText: {
    fontSize: 15,
    textAlign: "center",
    color: "#333",
    marginBottom: 16,
    lineHeight: 22,
  },
});
