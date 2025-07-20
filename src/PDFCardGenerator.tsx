import { useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { generateQRCodeDataURL } from "./qrUtils";

interface ExcelRow {
  ARTISTA: string;
  CANCION: string;
  LANZAMIENTO: string | number;
  YOUTUBE: string;
}

const CARD_SIZE = 48; // mm (ajustado para 4x4 en carta)
const CARDS_PER_ROW = 4;
const CARDS_PER_COL = 4;
const PAGE_WIDTH = 215.9; // mm (8.5in)
const PAGE_HEIGHT = 279.4; // mm (11in)
const GAP = 4; // espacio entre tarjetas
const totalWidth = CARDS_PER_ROW * CARD_SIZE + (CARDS_PER_ROW - 1) * GAP;
const totalHeight = CARDS_PER_COL * CARD_SIZE + (CARDS_PER_COL - 1) * GAP;
const MARGIN_X = (PAGE_WIDTH - totalWidth) / 2;
const MARGIN_Y = (PAGE_HEIGHT - totalHeight) / 2;

async function generatePDF(rows: ExcelRow[]) {
  const doc = new jsPDF({ unit: "mm", format: "letter" });
  const cardsPerPage = CARDS_PER_ROW * CARDS_PER_COL;
  let cardIndex = 0;
  for (let i = 0; i < rows.length; i++) {
    // 1. Tarjeta de datos
    if (cardIndex > 0 && cardIndex % cardsPerPage === 0) doc.addPage();
    let idx = cardIndex % cardsPerPage;
    let row = Math.floor(idx / CARDS_PER_ROW);
    let col = idx % CARDS_PER_ROW;
    let x = MARGIN_X + col * (CARD_SIZE + GAP);
    let y = MARGIN_Y + row * (CARD_SIZE + GAP);
    doc.setDrawColor(0);
    doc.rect(x, y, CARD_SIZE, CARD_SIZE);
    // Canción (arriba, pegado, multilinea)
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const cancionLines = doc.splitTextToSize(rows[i].CANCION, CARD_SIZE - 8);
    doc.text(cancionLines, x + CARD_SIZE / 2, y + 7, {
      align: "center",
      baseline: "top",
    });
    // Año (centro, más pequeño)
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(
      String(rows[i].LANZAMIENTO),
      x + CARD_SIZE / 2,
      y + CARD_SIZE / 2,
      { align: "center", baseline: "middle" }
    );
    // Artista (abajo, pegado, multilinea)
    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    const artistaLines = doc.splitTextToSize(rows[i].ARTISTA, CARD_SIZE - 8);
    const artistaLineHeight = 5.5;
    // Dejar un margen de 10mm desde abajo
    const artistaYStart =
      y + CARD_SIZE - 10 - (artistaLines.length - 1) * artistaLineHeight;
    doc.text(artistaLines, x + CARD_SIZE / 2, artistaYStart, {
      align: "center",
      baseline: "top",
    });
    cardIndex++;
    // 2. Tarjeta QR
    if (cardIndex > 0 && cardIndex % cardsPerPage === 0) doc.addPage();
    idx = cardIndex % cardsPerPage;
    row = Math.floor(idx / CARDS_PER_ROW);
    col = idx % CARDS_PER_ROW;
    x = MARGIN_X + col * (CARD_SIZE + GAP);
    y = MARGIN_Y + row * (CARD_SIZE + GAP);
    doc.setDrawColor(0);
    doc.rect(x, y, CARD_SIZE, CARD_SIZE);
    if (rows[i].YOUTUBE) {
      try {
        const qrDataUrl = await generateQRCodeDataURL(rows[i].YOUTUBE);
        doc.addImage(
          qrDataUrl,
          "PNG",
          x + 8,
          y + 8,
          CARD_SIZE - 16,
          CARD_SIZE - 16
        );
      } catch {
        doc.setFontSize(10);
        doc.text("QR Error", x + CARD_SIZE / 2, y + CARD_SIZE / 2, {
          align: "center",
        });
      }
    } else {
      doc.setFontSize(10);
      doc.text("Sin QR", x + CARD_SIZE / 2, y + CARD_SIZE / 2, {
        align: "center",
      });
    }
    cardIndex++;
  }
  doc.save("tarjetas.pdf");
}

export default function PDFCardGenerator() {
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError("");
    if (!e.target.files || e.target.files.length === 0) return;
    setFile(e.target.files[0]);
  };

  const handleGenerate = async () => {
    setError("");
    if (!file) {
      setError("Selecciona un archivo Excel primero.");
      return;
    }
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: ExcelRow[] = XLSX.utils.sheet_to_json(sheet);
      await generatePDF(rows);
    } catch (e: unknown) {
      let message = "Error desconocido";
      if (e instanceof Error) message = e.message;
      setError("Error procesando el archivo: " + message);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "2rem auto",
        padding: 24,
        background: "#fff",
        borderRadius: 8,
        boxShadow: "0 2px 8px #0001",
      }}
    >
      <h2>Generador de tarjetas PDF desde Excel</h2>
      <input type="file" accept=".xls,.xlsx" onChange={handleFile} />
      <button
        onClick={handleGenerate}
        style={{
          padding: "8px 24px",
          fontSize: 16,
          borderRadius: 4,
          background: "#1976d2",
          color: "#fff",
          border: 0,
          cursor: "pointer",
          marginLeft: 12,
        }}
      >
        Generar PDF
      </button>
      {error && <div style={{ color: "red", marginTop: 12 }}>{error}</div>}
      <div style={{ fontSize: 13, color: "#555", marginTop: 16 }}>
        Sube un archivo Excel con las columnas ARTISTA, CANCION, LANZAMIENTO,
        YOUTUBE. Por cada registro se generarán dos tarjetas: una con los datos
        y otra con el QR del link de YouTube.
      </div>
    </div>
  );
}
