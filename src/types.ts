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
