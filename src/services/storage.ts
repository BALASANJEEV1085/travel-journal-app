import AsyncStorage from "@react-native-async-storage/async-storage";
import type { JournalEntry } from "../types";

const STORAGE_KEY = "travel-journal-entries-v1";

export async function loadEntries(): Promise<JournalEntry[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as JournalEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveEntries(entries: JournalEntry[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export async function addEntry(entry: JournalEntry): Promise<JournalEntry[]> {
  const existing = await loadEntries();
  const next = [entry, ...existing];
  await saveEntries(next);
  return next;
}

export async function deleteEntry(id: string): Promise<JournalEntry[]> {
  const existing = await loadEntries();
  const next = existing.filter((e) => e.id !== id);
  await saveEntries(next);
  return next;
}
