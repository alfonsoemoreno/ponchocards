import { getSupabaseClient } from "../lib/supabaseClient";
import type { Song, SongInput } from "../types";

const SONG_FIELDS = "id, artist, title, year, youtube_url";

function normalizeSong(raw: Record<string, unknown>): Song {
  const yearValue = raw.year;
  let year: number | null = null;

  if (typeof yearValue === "number" && Number.isFinite(yearValue)) {
    year = yearValue;
  } else if (typeof yearValue === "string" && yearValue.trim() !== "") {
    const parsed = Number.parseInt(yearValue, 10);
    year = Number.isNaN(parsed) ? null : parsed;
  }

  return {
    id: Number(raw.id),
    artist: String(raw.artist ?? ""),
    title: String(raw.title ?? ""),
    year,
    youtube_url: String(raw.youtube_url ?? ""),
  };
}

function sanitizeInput(payload: SongInput): SongInput {
  const trimmedArtist = payload.artist.trim();
  const trimmedTitle = payload.title.trim();
  const trimmedYoutube = payload.youtube_url.trim();

  const numericYear =
    typeof payload.year === "number" && Number.isFinite(payload.year)
      ? payload.year
      : null;

  return {
    artist: trimmedArtist,
    title: trimmedTitle,
    youtube_url: trimmedYoutube,
    year: numericYear,
  };
}

export async function listSongs(params: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ songs: Song[]; total: number }>;
export async function listSongs({
  page,
  pageSize,
  search,
}: {
  page: number;
  pageSize: number;
  search?: string;
}): Promise<{ songs: Song[]; total: number }> {
  const supabase = getSupabaseClient();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("songs")
    .select(SONG_FIELDS, { count: "exact" })
    .order("id", { ascending: true })
    .range(from, to);

  if (search && search.trim() !== "") {
    const term = search.trim();
    query = query.or(
      `artist.ilike.%${term}%,title.ilike.%${term}%,youtube_url.ilike.%${term}%`
    );
  }

  const { data, error, count } = await query;

  if (error) {
    throw new Error(
      error.message || "No se pudieron cargar las canciones desde Supabase."
    );
  }

  const songs = (data ?? []).map((item) =>
    normalizeSong(item as Record<string, unknown>)
  );

  return {
    songs,
    total: typeof count === "number" ? count : songs.length,
  };
}

export async function createSong(payload: SongInput): Promise<Song> {
  const supabase = getSupabaseClient();
  const sanitized = sanitizeInput(payload);

  const { data, error } = await supabase
    .from("songs")
    .insert([sanitized])
    .select(SONG_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message || "No se pudo crear la canción.");
  }

  return normalizeSong((data ?? {}) as Record<string, unknown>);
}

export async function updateSong(
  id: number,
  payload: SongInput
): Promise<Song> {
  const supabase = getSupabaseClient();
  const sanitized = sanitizeInput(payload);

  const { data, error } = await supabase
    .from("songs")
    .update(sanitized)
    .eq("id", id)
    .select(SONG_FIELDS)
    .single();

  if (error) {
    throw new Error(error.message || "No se pudo actualizar la canción.");
  }

  return normalizeSong((data ?? {}) as Record<string, unknown>);
}

export async function deleteSong(id: number): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("songs").delete().eq("id", id);

  if (error) {
    throw new Error(error.message || "No se pudo eliminar la canción.");
  }
}
