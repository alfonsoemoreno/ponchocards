import { getSupabaseClient } from "../lib/supabaseClient";
import type { Song, SongInput, SongStatistics } from "../types";

const SONG_FIELDS = "id, artist, title, year, youtube_url";
const EXPORT_PAGE_SIZE = 1000;

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
  year?: number | null;
  sortBy?: "id" | "artist" | "title" | "year";
  sortDirection?: "asc" | "desc";
}): Promise<{ songs: Song[]; total: number }>;
export async function listSongs({
  page,
  pageSize,
  search,
  year,
  sortBy = "id",
  sortDirection = "asc",
}: {
  page: number;
  pageSize: number;
  search?: string;
  year?: number | null;
  sortBy?: "id" | "artist" | "title" | "year";
  sortDirection?: "asc" | "desc";
}): Promise<{ songs: Song[]; total: number }> {
  const supabase = getSupabaseClient();
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let query = supabase.from("songs").select(SONG_FIELDS, { count: "exact" });

  if (typeof year === "number") {
    query = query.eq("year", year);
  }

  if (search && search.trim() !== "") {
    const term = search.trim();
    query = query.or(
      `artist.ilike.%${term}%,title.ilike.%${term}%,youtube_url.ilike.%${term}%`
    );
  }

  const ascending = sortDirection === "asc";
  const orderOptions: {
    ascending: boolean;
    nullsFirst?: boolean;
    nullsLast?: boolean;
  } = {
    ascending,
  };

  if (sortBy === "year") {
    if (ascending) {
      orderOptions.nullsLast = true;
    } else {
      orderOptions.nullsFirst = true;
    }
  }

  query = query.order(sortBy, orderOptions);

  if (sortBy !== "id") {
    query = query.order("id", { ascending: true });
  }

  query = query.range(from, to);

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

export async function bulkUpsertSongs(payload: SongInput[]): Promise<void> {
  if (payload.length === 0) {
    return;
  }

  const supabase = getSupabaseClient();
  const sanitized = payload.map(sanitizeInput);

  const { error } = await supabase
    .from("songs")
    .upsert(sanitized, { onConflict: "youtube_url" })
    .select("id");

  if (error) {
    throw new Error(
      error.message || "No se pudieron sincronizar las canciones importadas."
    );
  }
}

export async function deleteSong(id: number): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase.from("songs").delete().eq("id", id);

  if (error) {
    throw new Error(error.message || "No se pudo eliminar la canción.");
  }
}

export async function fetchSongStatistics(): Promise<SongStatistics> {
  const supabase = getSupabaseClient();
  const STAT_LIMIT = 10;

  const { data, error } = await supabase
    .from("songs")
    .select(SONG_FIELDS)
    .order("year", { ascending: true });

  if (error) {
    throw new Error(
      error.message || "No se pudieron obtener las estadísticas."
    );
  }

  const songs = (data ?? []).map((item) =>
    normalizeSong(item as Record<string, unknown>)
  );

  const totalSongs = songs.length;
  const missingYearCount = songs.reduce(
    (acc, song) => (song.year === null ? acc + 1 : acc),
    0
  );

  const yearMap = new Map<number, number>();
  const decadeMap = new Map<number, number>();
  const artistMap = new Map<string, number>();

  songs.forEach((song) => {
    const artistKey = song.artist.trim() || "Sin artista";
    artistMap.set(artistKey, (artistMap.get(artistKey) ?? 0) + 1);

    if (song.year === null) {
      return;
    }

    yearMap.set(song.year, (yearMap.get(song.year) ?? 0) + 1);
    const decade = Math.floor(song.year / 10) * 10;
    decadeMap.set(decade, (decadeMap.get(decade) ?? 0) + 1);
  });

  const yearEntries = Array.from(yearMap.entries()).map(([year, count]) => ({
    label: String(year),
    value: year,
    count,
  }));

  const yearsMostCommon = [...yearEntries]
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.value - b.value;
      }
      return b.count - a.count;
    })
    .slice(0, STAT_LIMIT)
    .map(({ label, count }) => ({ label, count }));

  const yearsLeastCommon = [...yearEntries]
    .sort((a, b) => {
      if (a.count === b.count) {
        return a.value - b.value;
      }
      return a.count - b.count;
    })
    .slice(0, Math.min(STAT_LIMIT, yearEntries.length))
    .map(({ label, count }) => ({ label, count }));

  const decadeEntries = Array.from(decadeMap.entries()).map(
    ([decade, count]) => ({
      label: `${decade}s`,
      value: decade,
      count,
    })
  );

  const decadesLeastCommon = [...decadeEntries]
    .sort((a, b) => {
      if (a.count === b.count) {
        return a.value - b.value;
      }
      return a.count - b.count;
    })
    .slice(0, Math.min(STAT_LIMIT, decadeEntries.length))
    .map(({ label, count }) => ({ label, count }));

  const artistsMostCommon = Array.from(artistMap.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => {
      if (b.count === a.count) {
        return a.label.localeCompare(b.label);
      }
      return b.count - a.count;
    })
    .slice(0, STAT_LIMIT);

  return {
    totalSongs,
    missingYearCount,
    yearsMostCommon,
    yearsLeastCommon,
    decadesLeastCommon,
    artistsMostCommon,
  };
}

export async function fetchAllSongs(): Promise<Song[]> {
  const supabase = getSupabaseClient();
  const collected: Song[] = [];

  for (let from = 0; ; from += EXPORT_PAGE_SIZE) {
    const to = from + EXPORT_PAGE_SIZE - 1;
    const { data, error } = await supabase
      .from("songs")
      .select(SONG_FIELDS)
      .order("id", { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(
        error.message || "No se pudieron exportar las canciones desde Supabase."
      );
    }

    const batch = (data ?? []).map((item) =>
      normalizeSong(item as Record<string, unknown>)
    );

    collected.push(...batch);

    if (batch.length < EXPORT_PAGE_SIZE) {
      break;
    }
  }

  return collected;
}
