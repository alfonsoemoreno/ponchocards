import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";
import * as XLSX from "xlsx";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = resolve(__dirname, "..");

config({ path: resolve(projectRoot, ".env.local") });
config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en ponchocards/.env.local"
  );
  process.exit(1);
}

function normalizeRow(row, index) {
  const artist = String(row.ARTISTA ?? row.artist ?? "").trim();
  const title = String(row.CANCION ?? row.cancion ?? "").trim();
  const youtubeUrl = String(row.YOUTUBE ?? row.youtube ?? "").trim();
  const rawYear = row.LANZAMIENTO ?? row.lanzamiento ?? row.YEAR ?? null;
  let year = null;

  if (typeof rawYear === "number") {
    year = Number.isFinite(rawYear) ? Math.trunc(rawYear) : null;
  } else if (typeof rawYear === "string" && rawYear.trim() !== "") {
    const parsed = Number.parseInt(rawYear.trim(), 10);
    year = Number.isNaN(parsed) ? null : parsed;
  }

  if (!artist || !title || !youtubeUrl) {
    console.warn(
      `Fila ${
        index + 2
      }: datos incompletos (ARTISTA, CANCION, YOUTUBE son obligatorios). Se omite.`
    );
    return null;
  }

  return {
    artist,
    title,
    year,
    youtube_url: youtubeUrl,
  };
}

async function main() {
  const workbookPath = resolve(projectRoot, "public", "plantilla.xlsx");
  const buffer = await readFile(workbookPath);
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error("El archivo plantilla.xlsx no contiene hojas");
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  const songs = rows
    .map((row, index) => normalizeRow(row, index))
    .filter((value) => value !== null);

  if (songs.length === 0) {
    console.log("No se encontraron registros válidos para sincronizar.");
    return;
  }

  console.log(`Sincronizando ${songs.length} canciones con Supabase...`);

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { error } = await supabase
    .from("songs")
    .upsert(songs, { onConflict: "youtube_url" });

  if (error) {
    throw new Error(`Error al sincronizar canciones: ${error.message}`);
  }

  console.log("Seed completado correctamente.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
