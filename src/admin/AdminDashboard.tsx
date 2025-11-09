import { useEffect, useMemo, useState, type SyntheticEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import AddCircleIcon from "@mui/icons-material/AddCircle";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import LogoutIcon from "@mui/icons-material/Logout";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import SongFormDialog from "./SongFormDialog";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import {
  createSong,
  deleteSong,
  listSongs,
  updateSong,
} from "../services/songService";
import type { Song, SongInput } from "../types";

interface FeedbackState {
  severity: "success" | "error";
  message: string;
}

const DEFAULT_PAGE_SIZE = 25;
const PAGE_SIZE_OPTIONS = [10, 25, 50];

interface AdminDashboardProps {
  onExit: () => void;
  onSignOut: () => void;
  userEmail?: string | null;
}

export default function AdminDashboard({
  onExit,
  onSignOut,
  userEmail,
}: AdminDashboardProps) {
  const supabaseConfigured = useMemo(() => isSupabaseConfigured(), []);
  const [songs, setSongs] = useState<Song[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_PAGE_SIZE);
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [formLoading, setFormLoading] = useState(false);
  const [editingSong, setEditingSong] = useState<Song | null>(null);

  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<Song | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const handler = window.setTimeout(() => {
      setPage(0);
      setSearchTerm(searchInput.trim());
    }, 400);

    return () => window.clearTimeout(handler);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!supabaseConfigured) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { songs: fetchedSongs, total: fetchedTotal } = await listSongs({
          page,
          pageSize: rowsPerPage,
          search: searchTerm,
        });

        if (!cancelled) {
          setSongs(fetchedSongs);
          setTotal(fetchedTotal);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error
              ? err.message
              : "No se pudieron cargar las canciones.";
          setError(message);
          setSongs([]);
          setTotal(0);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    run().catch(() => {
      /* handled in run */
    });

    return () => {
      cancelled = true;
    };
  }, [page, rowsPerPage, searchTerm, reloadToken, supabaseConfigured]);

  const handleChangePage = (_: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const nextRows = Number(event.target.value);
    setRowsPerPage(nextRows);
    setPage(0);
  };

  const handleRefresh = () => {
    setReloadToken((prev) => prev + 1);
  };

  const openCreateForm = () => {
    setFormMode("create");
    setEditingSong(null);
    setFormOpen(true);
  };

  const openEditForm = (song: Song) => {
    setFormMode("edit");
    setEditingSong(song);
    setFormOpen(true);
  };

  const closeForm = () => {
    if (formLoading) {
      return;
    }
    setFormOpen(false);
    setEditingSong(null);
  };

  const handleFormSubmit = async (payload: SongInput) => {
    setFormLoading(true);

    try {
      if (formMode === "create") {
        await createSong(payload);
        setFeedback({
          severity: "success",
          message: "Canción creada correctamente.",
        });
        setPage(0);
      } else if (editingSong) {
        await updateSong(editingSong.id, payload);
        setFeedback({ severity: "success", message: "Canción actualizada." });
      }
      setFormOpen(false);
      setEditingSong(null);
      setSnackbarOpen(true);
      setReloadToken((prev) => prev + 1);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Ocurrió un error guardando la canción.";
      setFeedback({ severity: "error", message });
      setSnackbarOpen(true);
    } finally {
      setFormLoading(false);
    }
  };

  const requestDelete = (song: Song) => {
    setDeleteTarget(song);
  };

  const cancelDelete = () => {
    if (deleteLoading) {
      return;
    }
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    setDeleteLoading(true);

    try {
      await deleteSong(deleteTarget.id);
      setFeedback({ severity: "success", message: "Canción eliminada." });
      setSnackbarOpen(true);
      setDeleteTarget(null);
      setReloadToken((prev) => prev + 1);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la canción seleccionada.";
      setFeedback({ severity: "error", message });
      setSnackbarOpen(true);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleSnackbarClose = (
    _event?: SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }
    setSnackbarOpen(false);
    setFeedback(null);
  };

  const renderTableBody = () => {
    if (loading) {
      return (
        <TableRow>
          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
            <CircularProgress color="primary" />
          </TableCell>
        </TableRow>
      );
    }

    if (!songs.length) {
      return (
        <TableRow>
          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
            <Typography variant="body1" color="text.secondary">
              {searchTerm
                ? "No hay resultados que coincidan con tu búsqueda."
                : "Todavía no hay canciones registradas."}
            </Typography>
          </TableCell>
        </TableRow>
      );
    }

    return songs.map((song) => (
      <TableRow key={song.id} hover>
        <TableCell width={80}>{song.id}</TableCell>
        <TableCell sx={{ minWidth: 180 }}>
          <Typography variant="body2" fontWeight={600} noWrap>
            {song.artist}
          </Typography>
        </TableCell>
        <TableCell sx={{ minWidth: 220 }}>
          <Typography variant="body2" noWrap>
            {song.title}
          </Typography>
        </TableCell>
        <TableCell width={120}>{song.year ?? "-"}</TableCell>
        <TableCell sx={{ minWidth: 200 }}>
          {song.youtube_url ? (
            <Button
              variant="text"
              size="small"
              component="a"
              href={song.youtube_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Abrir enlace
            </Button>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sin enlace
            </Typography>
          )}
        </TableCell>
        <TableCell align="right" width={140}>
          <Tooltip title="Editar">
            <IconButton color="primary" onClick={() => openEditForm(song)}>
              <EditIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="Eliminar">
            <IconButton color="error" onClick={() => requestDelete(song)}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <>
      <div className="ocean-background" />
      <div className="ocean-blur" />
      <Box
        sx={{
          position: "relative",
          minHeight: "100vh",
          width: "100vw",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          py: { xs: 6, md: 8 },
          px: { xs: 2, md: 4 },
        }}
      >
        <Container maxWidth="lg" sx={{ position: "relative", zIndex: 1 }}>
          <Paper
            elevation={6}
            sx={{
              p: { xs: 3, md: 5 },
              borderRadius: 4,
              backdropFilter: "blur(12px)",
              backgroundColor: "rgba(255,255,255,0.9)",
            }}
          >
            <Stack spacing={3}>
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "flex-start", md: "center" }}
              >
                <Box>
                  <Typography
                    variant="h4"
                    component="h1"
                    sx={{
                      fontWeight: 700,
                      textAlign: { xs: "left", md: "left" },
                      mb: 1,
                      color: "#1f3c7a",
                    }}
                  >
                    Administrador de canciones
                  </Typography>
                  <Typography variant="body1" color="text.secondary">
                    Gestiona la base de datos de canciones utilizada por
                    Ponchister. Puedes crear, editar o eliminar registros en
                    cualquier momento.
                  </Typography>
                  {userEmail ? (
                    <Typography variant="caption" color="text.secondary">
                      Sesión iniciada como <strong>{userEmail}</strong>
                    </Typography>
                  ) : null}
                </Box>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                  <Button
                    variant="outlined"
                    startIcon={<ArrowBackIcon />}
                    onClick={onExit}
                  >
                    Volver al generador
                  </Button>
                  <Button
                    variant="contained"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={onSignOut}
                  >
                    Cerrar sesión
                  </Button>
                </Stack>
              </Stack>

              {!supabaseConfigured && (
                <Alert severity="warning">
                  Debes definir las variables <code>VITE_SUPABASE_URL</code> y
                  <code> VITE_SUPABASE_ANON_KEY</code> para conectarte a
                  Supabase.
                </Alert>
              )}

              {error && (
                <Alert severity="error" onClose={() => setError(null)}>
                  {error}
                </Alert>
              )}

              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2}
                justifyContent="space-between"
                alignItems={{ xs: "stretch", md: "center" }}
              >
                <TextField
                  label="Buscar canciones"
                  placeholder="Busca por artista, canción o enlace"
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  fullWidth
                  disabled={!supabaseConfigured}
                />
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <Tooltip title="Recargar lista">
                    <span>
                      <IconButton
                        color="primary"
                        onClick={handleRefresh}
                        disabled={!supabaseConfigured || loading}
                      >
                        <RefreshIcon />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button
                    variant="contained"
                    startIcon={<AddCircleIcon />}
                    onClick={openCreateForm}
                    disabled={!supabaseConfigured}
                    sx={{ fontWeight: 700 }}
                  >
                    Nueva canción
                  </Button>
                </Stack>
              </Stack>

              <Divider />

              <Paper elevation={0} sx={{ overflow: "hidden" }}>
                <TableContainer>
                  <Table size="medium">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Artista</TableCell>
                        <TableCell>Canción</TableCell>
                        <TableCell>Año</TableCell>
                        <TableCell>Enlace</TableCell>
                        <TableCell align="right">Acciones</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>{renderTableBody()}</TableBody>
                  </Table>
                </TableContainer>
                <TablePagination
                  component="div"
                  count={total}
                  page={page}
                  rowsPerPage={rowsPerPage}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                  rowsPerPageOptions={PAGE_SIZE_OPTIONS}
                  labelRowsPerPage="Registros por página"
                  labelDisplayedRows={({ from, to, count }) =>
                    `${from}-${to} de ${count !== -1 ? count : `más de ${to}`}`
                  }
                  disabled={!supabaseConfigured}
                />
              </Paper>
            </Stack>
          </Paper>
        </Container>
      </Box>

      <SongFormDialog
        open={formOpen}
        mode={formMode}
        initialValue={editingSong}
        onClose={closeForm}
        onSubmit={handleFormSubmit}
        loading={formLoading}
      />

      <Dialog open={Boolean(deleteTarget)} onClose={cancelDelete}>
        <DialogTitle>Eliminar canción</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Seguro que deseas eliminar el registro
            {deleteTarget
              ? ` "${deleteTarget.title}" de ${deleteTarget.artist}`
              : ""}
            ? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={deleteLoading}>
            Cancelar
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={deleteLoading}
          >
            {deleteLoading ? "Eliminando..." : "Eliminar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen && Boolean(feedback)}
        autoHideDuration={5000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {feedback ? (
          <Alert
            onClose={handleSnackbarClose}
            severity={feedback.severity}
            sx={{ width: "100%" }}
          >
            {feedback.message}
          </Alert>
        ) : undefined}
      </Snackbar>
    </>
  );
}
