import { useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { generateQRCodeDataURL } from "./qrUtils";
import { Box, Button, Typography, Alert } from "@mui/material";

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
  const totalCards = rows.length;
  const totalPages = Math.ceil(totalCards / cardsPerPage);

  // 1. Print data cards with numbers
  let cardNumber = 1;
  for (let page = 0; page < totalPages; page++) {
    if (page > 0) doc.addPage();
    for (let i = 0; i < cardsPerPage; i++) {
      const idx = page * cardsPerPage + i;
      if (idx >= totalCards) break;
      const rowPos = Math.floor(i / CARDS_PER_ROW);
      const colPos = i % CARDS_PER_ROW;
      const x = MARGIN_X + colPos * (CARD_SIZE + GAP);
      const y = MARGIN_Y + rowPos * (CARD_SIZE + GAP);
      doc.setDrawColor(0);
      doc.rect(x, y, CARD_SIZE, CARD_SIZE);
      // Card number
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(String(cardNumber), x + 2, y + 3);
      // Song title
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const cancionLines = doc.splitTextToSize(
        rows[idx].CANCION,
        CARD_SIZE - 8
      );
      doc.text(cancionLines, x + CARD_SIZE / 2, y + 7, {
        align: "center",
        baseline: "top",
      });
      // Year
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text(
        String(rows[idx].LANZAMIENTO),
        x + CARD_SIZE / 2,
        y + CARD_SIZE / 2,
        {
          align: "center",
          baseline: "middle",
        }
      );
      // Artist
      doc.setFontSize(12);
      doc.setFont("helvetica", "normal");
      const artistaLines = doc.splitTextToSize(
        rows[idx].ARTISTA,
        CARD_SIZE - 8
      );
      const lineHeight = 5.5;
      const startY =
        y + CARD_SIZE - 10 - (artistaLines.length - 1) * lineHeight;
      doc.text(artistaLines, x + CARD_SIZE / 2, startY, {
        align: "center",
        baseline: "top",
      });
      cardNumber++;
    }
  }

  // 2. Print QR cards on back with matching numbers (horizontal mirror per row)
  for (let page = 0; page < totalPages; page++) {
    doc.addPage();
    for (let i = 0; i < cardsPerPage; i++) {
      const idx = page * cardsPerPage + i;
      if (idx >= totalCards) break;
      // mirror horizontally: same row, flipped column
      const dataRow = Math.floor(i / CARDS_PER_ROW);
      const dataCol = i % CARDS_PER_ROW;
      const rowPos = dataRow;
      const colPos = CARDS_PER_ROW - 1 - dataCol;
      const x = MARGIN_X + colPos * (CARD_SIZE + GAP);
      const y = MARGIN_Y + rowPos * (CARD_SIZE + GAP);
      doc.setDrawColor(0);
      doc.rect(x, y, CARD_SIZE, CARD_SIZE);
      // Card number
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(String(idx + 1), x + 2, y + 3);
      if (rows[idx].YOUTUBE) {
        try {
          const qrDataUrl = await generateQRCodeDataURL(rows[idx].YOUTUBE);
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
    }
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
    <Box
      sx={{
        maxWidth: { xs: "100%", sm: 500, md: 600 },
        mx: "auto",
        my: { xs: 2, sm: 4 },
        p: { xs: 1, sm: 3 },
        bgcolor: "background.paper",
        borderRadius: 2,
        boxShadow: 2,
        minHeight: { xs: "100vh", sm: "auto" },
      }}
    >
      <Typography
        variant="h1"
        component="h1"
        gutterBottom
        sx={{ fontSize: { xs: 22, sm: 28 } }}
      >
        PONCHISTER
      </Typography>
      <Typography
        variant="h5"
        component="h1"
        gutterBottom
        sx={{ fontSize: { xs: 22, sm: 28 } }}
      >
        Generador de Tarjetas PDF
      </Typography>
      <Box
        sx={{
          mb: 2,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "center" },
          gap: 2,
        }}
      >
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={handleFile}
          style={{
            width: "100%",
            maxWidth: 300,
            background: "#f6f8fa",
            border: "1px solid #d0d7de",
            borderRadius: 6,
            padding: 8,
            fontSize: 15,
          }}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleGenerate}
          sx={{
            ml: { sm: 2 },
            mt: { xs: 2, sm: 0 },
            py: 1,
            px: 3,
            fontSize: 16,
            borderRadius: 2,
            width: { xs: "100%", sm: "auto" },
            boxShadow: "0 1.5px 4px #0001",
            textTransform: "none",
            fontWeight: 600,
          }}
        >
          Generar PDF
        </Button>
        <Button
          variant="outlined"
          color="secondary"
          href={"/plantilla.xlsx"}
          download
          sx={{
            ml: { sm: 2 },
            mt: { xs: 2, sm: 0 },
            py: 1,
            px: 3,
            fontSize: 15,
            borderRadius: 2,
            width: { xs: "100%", sm: "auto" },
            boxShadow: "0 1.5px 4px #0001",
            textTransform: "none",
            fontWeight: 500,
          }}
        >
          Descargar plantilla Excel
        </Button>
      </Box>
      {error && (
        <Alert
          severity="error"
          sx={{ mb: 2, fontSize: { xs: 13, sm: 15 }, borderRadius: 2 }}
        >
          {error}
        </Alert>
      )}
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ mt: 2, fontSize: { xs: 14, sm: 16 }, lineHeight: 1.7 }}
      >
        Sube un archivo Excel con las columnas <b>ARTISTA</b>, <b>CANCION</b>,{" "}
        <b>LANZAMIENTO</b>, <b>YOUTUBE</b>.<br />
        Por cada registro se generarán dos tarjetas: una con los datos y otra
        con el QR del link de YouTube.
      </Typography>
      <Box
        sx={{
          mt: 3,
          mb: 2,
          p: { xs: 1, sm: 2 },
          bgcolor: "#f6f8fa",
          borderRadius: 3,
          boxShadow: "0 1.5px 8px #0001",
          border: "1px solid #d0d7de",
        }}
      >
        <Typography
          variant="subtitle1"
          sx={{
            mb: 1,
            fontSize: { xs: 16, sm: 18 },
            fontWeight: 600,
            color: "#24292f",
          }}
        >
          Ejemplo de archivo Excel:
        </Typography>
        <Box
          component="table"
          sx={{
            width: "100%",
            borderCollapse: "collapse",
            mb: 2,
            fontSize: { xs: 12, sm: 15 },
            background: "#fff",
            borderRadius: 2,
            overflow: "hidden",
            boxShadow: "0 1.5px 8px #0001",
          }}
        >
          <Box component="thead">
            <Box component="tr" sx={{ bgcolor: "#f6f8fa" }}>
              <Box
                component="th"
                sx={{
                  border: "1px solid #d0d7de",
                  p: 1,
                  fontWeight: 600,
                  color: "#24292f",
                  fontSize: { xs: 13, sm: 15 },
                }}
              >
                ARTISTA
              </Box>
              <Box
                component="th"
                sx={{
                  border: "1px solid #d0d7de",
                  p: 1,
                  fontWeight: 600,
                  color: "#24292f",
                  fontSize: { xs: 13, sm: 15 },
                }}
              >
                CANCION
              </Box>
              <Box
                component="th"
                sx={{
                  border: "1px solid #d0d7de",
                  p: 1,
                  fontWeight: 600,
                  color: "#24292f",
                  fontSize: { xs: 13, sm: 15 },
                }}
              >
                LANZAMIENTO
              </Box>
              <Box
                component="th"
                sx={{
                  border: "1px solid #d0d7de",
                  p: 1,
                  fontWeight: 600,
                  color: "#24292f",
                  fontSize: { xs: 13, sm: 15 },
                }}
              >
                YOUTUBE
              </Box>
            </Box>
          </Box>
          <Box component="tbody">
            <Box component="tr">
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                Mon Laferte
              </Box>
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                Tu falta de querer
              </Box>
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                2015
              </Box>
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                https://youtube.com/ejemplo
              </Box>
            </Box>
            <Box component="tr">
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                Los Bunkers
              </Box>
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                Bailando solo
              </Box>
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                2013
              </Box>
              <Box component="td" sx={{ border: "1px solid #d0d7de", p: 1 }}>
                https://youtube.com/ejemplo2
              </Box>
            </Box>
          </Box>
        </Box>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ fontSize: { xs: 13, sm: 15 }, lineHeight: 1.7 }}
        >
          <b>¿Cómo funciona?</b>
          <br />
          1. Sube tu archivo Excel con los datos.
          <br />
          2. Haz clic en <b>Generar PDF</b>.<br />
          3. Por cada registro se generarán dos tarjetas: una con los datos y
          otra con el QR del link de YouTube.
          <br />
          4. El PDF tendrá 16 tarjetas por hoja (4x4), y se agregarán hojas
          automáticamente si hay más registros.
          <br />
        </Typography>
        <Box sx={{ mt: 2, textAlign: "center" }}>
          <img
            src={"/hoja.png"}
            alt="Ejemplo visual de tarjetas"
            style={{
              maxWidth: "100%",
              borderRadius: 8,
              boxShadow: "0 2px 8px #0002",
              height: "auto",
            }}
          />
        </Box>
      </Box>
    </Box>
  );
}
