export interface JournalEntry {
  id: string;
  title: string;
  notes: string;
  imageUri: string;
  cloudinaryUrl: string | null;
  cloudinaryPublicId: string | null;
  latitude: number | null;
  longitude: number | null;
  placeLabel: string | null;
  createdAt: string;
}
