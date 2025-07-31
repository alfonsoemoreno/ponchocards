import { useState } from "react";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { generateQRCodeDataURL } from "./qrUtils";
import { Box, Button, Typography, Alert, Container } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import DownloadIcon from "@mui/icons-material/Download";
import MusicNoteIcon from "@mui/icons-material/MusicNote";

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

// Sample sheet configuration: 5 columns x 4 rows for 20 cards
const SAMPLE_COLS = 5;
const SAMPLE_ROWS = 5; // 5 rows for 25 cards
const SHEET_MARGIN = 10; // page margin in mm
// calculate card size to avoid cutting at edges
const SAMPLE_CARD_SIZE =
  (PAGE_WIDTH - 2 * SHEET_MARGIN - (SAMPLE_COLS - 1) * GAP) / SAMPLE_COLS;
const SAMPLE_MARGIN_X = SHEET_MARGIN;
// center vertically
const SAMPLE_MARGIN_Y =
  (PAGE_HEIGHT - (SAMPLE_ROWS * SAMPLE_CARD_SIZE + (SAMPLE_ROWS - 1) * GAP)) /
  2;
// Placeholder for logo image (base64 Data URL), replace with your own
const logoDataUrl = "DATA_URL_OF_YOUR_LOGO_HERE"; // must be PNG or JPEG

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

  const handleDownloadSamples = async () => {
    // Load music note image from public folder
    const img = new Image();
    img.src = "/nota-musical.png";
    await new Promise<void>((resolve) => {
      img.onload = () => resolve();
    });
    const doc = new jsPDF({ unit: "mm", format: "letter" });
    const totalCards = SAMPLE_COLS * SAMPLE_ROWS;
    const cardsPerPage = SAMPLE_COLS * SAMPLE_ROWS;
    const totalPages = Math.ceil(totalCards / cardsPerPage);
    for (let page = 0; page < totalPages; page++) {
      if (page > 0) doc.addPage();
      for (let i = 0; i < cardsPerPage; i++) {
        const idx = page * cardsPerPage + i;
        if (idx >= totalCards) break;
        const rowPos = Math.floor(i / SAMPLE_COLS);
        const colPos = i % SAMPLE_COLS;
        const x = SAMPLE_MARGIN_X + colPos * (SAMPLE_CARD_SIZE + GAP);
        const y = SAMPLE_MARGIN_Y + rowPos * (SAMPLE_CARD_SIZE + GAP);
        doc.setDrawColor(0);
        doc.rect(x, y, SAMPLE_CARD_SIZE, SAMPLE_CARD_SIZE);
        // Logo if provided
        const logoSize = SAMPLE_CARD_SIZE * 0.25;
        if (
          logoDataUrl &&
          !logoDataUrl.includes("DATA_URL_OF_YOUR_LOGO_HERE")
        ) {
          doc.addImage(
            logoDataUrl,
            "PNG",
            x + (SAMPLE_CARD_SIZE - logoSize) / 2,
            y + 4,
            logoSize,
            logoSize
          );
        }
        // Music note image
        const iconSize = SAMPLE_CARD_SIZE * 0.5;
        doc.addImage(
          img,
          "PNG",
          x + (SAMPLE_CARD_SIZE - iconSize) / 2,
          y + (SAMPLE_CARD_SIZE - iconSize) / 2,
          iconSize,
          iconSize
        );
      }
    }
    doc.save("fichas.pdf");
  };

  return (
    <>
      <div className="ocean-background" />
      <div className="ocean-blur" />
      {/* Neon lines animated background */}
      <Box
        className="neon-lines"
        sx={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: -1,
        }}
      >
        <Box
          className="neon-line"
          sx={{
            top: "18%",
            background: "linear-gradient(90deg, #00fff7, #0ff, #fff)",
            boxShadow: "0 0 16px #00fff7",
            animation: "neon-move-right 2.5s linear infinite",
          }}
        />
        <Box
          className="neon-line"
          sx={{
            top: "32%",
            background: "linear-gradient(90deg, #ff00ea, #fff, #ff0)",
            boxShadow: "0 0 16px #ff00ea",
            animation: "neon-move-left 3.2s linear infinite",
          }}
        />
        <Box
          className="neon-line"
          sx={{
            top: "46%",
            background: "linear-gradient(90deg, #fff200, #fff, #00ff6a)",
            boxShadow: "0 0 16px #fff200",
            animation: "neon-move-right 2.1s linear infinite",
          }}
        />
        <Box
          className="neon-line"
          sx={{
            top: "60%",
            background: "linear-gradient(90deg, #00ff6a, #fff, #00fff7)",
            boxShadow: "0 0 16px #00ff6a",
            animation: "neon-move-left 2.8s linear infinite",
          }}
        />
        <Box
          className="neon-line"
          sx={{
            top: "74%",
            background: "linear-gradient(90deg, #ff0, #fff, #ff00ea)",
            boxShadow: "0 0 16px #ff0",
            animation: "neon-move-right 3.5s linear infinite",
          }}
        />
      </Box>
      {/* Título fijo fuera del contenedor blanco */}

      <Container
        maxWidth="lg"
        disableGutters
        sx={{ px: { xs: 2, md: 4 }, py: { xs: 2, md: 4 } }}
      >
        <Box
          sx={{
            // ensure this container sits above neon-lines
            position: "relative",
            zIndex: 1,
            // ensure all inner text is black by default
            color: "text.primary",
            width: "100%",
            bgcolor: "rgba(255,255,255,0.8)",
            backdropFilter: "blur(8px)",
            borderRadius: 2,
            boxShadow: 2,
            my: { xs: 2, md: 4 },
            p: { xs: 2, md: 4 },
          }}
        >
          <Box sx={{ textAlign: "center", mb: 2 }}>
            <img
              src="/ponchister_logo.png"
              alt="Ponchister Logo"
              style={{
                maxWidth: "50%",
                height: "auto",
                margin: "0 auto",
              }}
            />
          </Box>
          <Box
            sx={{
              mb: 2,
              display: "flex",
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
              justifyContent: "center",
              gap: 2,
            }}
          >
            {/* Upload button hidden input */}
            <input
              hidden
              accept=".xls,.xlsx"
              id="upload-excel"
              type="file"
              onChange={handleFile}
            />
            <label htmlFor="upload-excel">
              <Button
                variant="outlined"
                color="primary"
                component="span"
                startIcon={<UploadFileIcon />}
                sx={{
                  width: { xs: "100%", sm: "auto" },
                  fontSize: "1.2rem",
                  fontWeight: 700,
                }}
              >
                Seleccionar Excel
              </Button>
            </label>
            <Button
              variant="outlined"
              color="error"
              onClick={handleGenerate}
              startIcon={<PictureAsPdfIcon />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                fontSize: "1.2rem",
                fontWeight: 700,
              }}
            >
              Generar PDF
            </Button>
            <Button
              variant="outlined"
              color="success"
              href="/plantilla.xlsx"
              download
              startIcon={<DownloadIcon />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                fontSize: "1.2rem",
                fontWeight: 700,
              }}
            >
              Descargar Excel
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              onClick={handleDownloadSamples}
              startIcon={<MusicNoteIcon />}
              sx={{
                width: { xs: "100%", sm: "auto" },
                fontSize: "1.2rem",
                fontWeight: 700,
              }}
            >
              Descargar fichas
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
            color="text.primary"
            sx={{ mt: 2, fontSize: { xs: 14, sm: 16 }, lineHeight: 1.7 }}
          >
            Sube un archivo Excel con las columnas <b>ARTISTA</b>,{" "}
            <b>CANCION</b>, <b>LANZAMIENTO</b>, <b>YOUTUBE</b>.<br />
            Por cada registro se generarán dos tarjetas numeradas: cara A con la
            información y cara B con el QR alineado e invertido horizontalmente
            para coincidir al imprimir doble cara.
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
                color: "#000",
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
                      color: "#000",
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
                      color: "#000",
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
                      color: "#000",
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
                      color: "#000",
                      fontSize: { xs: 13, sm: 15 },
                    }}
                  >
                    YOUTUBE
                  </Box>
                </Box>
              </Box>
              <Box component="tbody">
                <Box component="tr">
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    Mon Laferte
                  </Box>
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    Tu falta de querer
                  </Box>
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    2015
                  </Box>
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    https://youtube.com/ejemplo
                  </Box>
                </Box>
                <Box component="tr">
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    Los Bunkers
                  </Box>
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    Bailando solo
                  </Box>
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    2013
                  </Box>
                  <Box
                    component="td"
                    sx={{ border: "1px solid #d0d7de", p: 1 }}
                  >
                    https://youtube.com/ejemplo2
                  </Box>
                </Box>
              </Box>
            </Box>
            <Typography
              variant="body2"
              color="text.primary"
              sx={{ fontSize: { xs: 13, sm: 15 }, lineHeight: 1.7 }}
            >
              <b>¿Cómo funciona?</b>
              <br />
              1. Sube tu archivo Excel con los datos.
              <br />
              2. Haz clic en <b>Generar PDF</b>.<br />
              3. Por cada registro se generan dos tarjetas numeradas: cara A con
              la información y cara B con el QR correspondiente.
              <br />
              4. Al imprimir en doble cara, los QR están invertidos
              horizontalmente para alinearse con la tarjeta de datos.
              <br />
              5. Cada página contiene hasta 16 tarjetas (4x4) y se añaden
              páginas según el número de registros.
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
      </Container>
    </>
  );
}
