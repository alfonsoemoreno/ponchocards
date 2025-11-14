import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Fade,
  Snackbar,
  Tooltip,
} from "@mui/material";
import { alpha, useTheme } from "@mui/material/styles";

import PDFCardGenerator from "./PDFCardGenerator";
import AdminDashboard from "./admin/AdminDashboard";
import AdminAccessDialog from "./admin/AdminAccessDialog";
import { getSupabaseClient, isSupabaseConfigured } from "./lib/supabaseClient";
import { useSupabaseAuth } from "./lib/useSupabaseAuth";
import "./App.css";

type ViewMode = "generator" | "admin";

function App() {
  const [view, setView] = useState<ViewMode>("generator");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const { user, loading: authLoading } = useSupabaseAuth();
  const theme = useTheme();

  const supabaseConfigured = isSupabaseConfigured();

  useEffect(() => {
    if (!user) {
      setView("generator");
      setLoginOpen(false);
    }
  }, [user]);

  const handleOpenAdmin = () => {
    if (!supabaseConfigured) {
      setSnackbar(
        "Configura Supabase para habilitar el panel de administración."
      );
      return;
    }
    if (user) {
      setView("admin");
    } else {
      setLoginError(null);
      setLoginOpen(true);
    }
  };

  const handleCloseAdmin = () => {
    setView("generator");
  };

  const handleLogin = async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    setLoginLoading(true);
    setLoginError(null);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) {
        throw new Error(error.message || "No se pudo iniciar sesión");
      }
      setLoginOpen(false);
      setSnackbar("Sesión iniciada correctamente.");
      setView("admin");
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : "Error inesperado");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      setSnackbar("Sesión cerrada.");
    } catch (err) {
      setSnackbar(
        err instanceof Error
          ? err.message
          : "No se pudo cerrar la sesión. Intenta nuevamente."
      );
    }
  };

  const handleSnackbarClose = () => {
    setSnackbar(null);
  };

  return (
    <Box sx={{ minHeight: "100vh", width: "100vw", position: "relative" }}>
      <Box
        sx={{
          position: "fixed",
          top: { xs: 12, sm: 16 },
          right: { xs: 12, sm: 16 },
          zIndex: 2100,
        }}
      >
        <Tooltip
          title="Acceso restringido"
          arrow
          disableHoverListener={Boolean(user)}
        >
          <span>
            <Button
              variant="contained"
              color="primary"
              onClick={handleOpenAdmin}
              disabled={authLoading}
              sx={{
                minWidth: { xs: 148, sm: 184 },
                fontWeight: 700,
                backgroundImage:
                  view === "admin"
                    ? theme.customGradients.lagoon
                    : theme.customGradients.plasma,
                borderColor: alpha("#ffffff", 0.25),
                boxShadow:
                  "0 25px 50px -24px rgba(36,73,187,0.65), inset 0 1px 0 rgba(255,255,255,0.25)",
                backdropFilter: "blur(14px)",
                "&:hover": {
                  backgroundImage: theme.customGradients.sunset,
                  boxShadow:
                    "0 30px 60px -24px rgba(36,73,187,0.75), inset 0 1px 0 rgba(255,255,255,0.35)",
                },
              }}
            >
              {authLoading
                ? "Validando..."
                : user
                ? "Administración"
                : "Acceso admin"}
            </Button>
          </span>
        </Tooltip>
      </Box>

      {authLoading ? (
        <Fade in timeout={250} appear>
          <Box
            sx={{
              position: "fixed",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.35)",
              zIndex: 1200,
            }}
          >
            <CircularProgress color="inherit" sx={{ color: "#fff" }} />
          </Box>
        </Fade>
      ) : null}

      {view === "admin" && user ? (
        <AdminDashboard
          onExit={handleCloseAdmin}
          onSignOut={handleSignOut}
          userEmail={user.email}
        />
      ) : (
        <PDFCardGenerator />
      )}

      <AdminAccessDialog
        open={loginOpen}
        loading={loginLoading}
        onClose={() => setLoginOpen(false)}
        onSubmit={handleLogin}
        error={loginError}
      />

      <Snackbar
        open={Boolean(snackbar)}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        {snackbar ? <Alert severity="info">{snackbar}</Alert> : undefined}
      </Snackbar>
    </Box>
  );
}

export default App;
