export interface Song {
  id: number;
  artist: string;
  title: string;
  year: number | null;
  youtube_url: string;
}

export interface SongInput {
  artist: string;
  title: string;
  year: number | null;
  youtube_url: string;
}

export interface StatEntry {
  label: string;
  count: number;
}

export interface SongStatistics {
  totalSongs: number;
  missingYearCount: number;
  yearsMostCommon: StatEntry[];
  yearsLeastCommon: StatEntry[];
  decadesLeastCommon: StatEntry[];
  artistsMostCommon: StatEntry[];
}
