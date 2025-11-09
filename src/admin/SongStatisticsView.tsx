import {
  Alert,
  Box,
  Chip,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import type { SongStatistics, StatEntry } from "../types";

interface SongStatisticsViewProps {
  loading: boolean;
  error: string | null;
  stats: SongStatistics | null;
}

function StatisticsList({
  title,
  items,
  emptyMessage,
  highlight,
}: {
  title: string;
  items: StatEntry[];
  emptyMessage: string;
  highlight?: "top" | "bottom";
}) {
  const getChipColor = (index: number) => {
    if (highlight === "top" && index === 0) return "primary";
    if (highlight === "bottom" && index === 0) return "warning";
    return "default";
  };

  return (
    <Paper
      elevation={2}
      sx={{ p: 2.5, borderRadius: 3, height: "100%", background: "#fff" }}
    >
      <Stack spacing={1.5}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "#1f3c7a" }}>
          {title}
        </Typography>
        {items.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {emptyMessage}
          </Typography>
        ) : (
          <List dense disablePadding>
            {items.map((item, index) => (
              <ListItem
                key={item.label}
                disableGutters
                sx={{ py: 0.5, gap: 1, alignItems: "flex-start" }}
              >
                <Chip
                  color={getChipColor(index)}
                  label={item.count}
                  size="small"
                  sx={{ minWidth: 48, fontWeight: 600 }}
                />
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    variant: "body2",
                    sx: { fontWeight: index === 0 ? 600 : 500 },
                  }}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Stack>
    </Paper>
  );
}

export default function SongStatisticsView({
  loading,
  error,
  stats,
}: SongStatisticsViewProps) {
  if (loading) {
    return (
      <Stack alignItems="center" justifyContent="center" sx={{ py: 8 }}>
        <CircularProgress />
      </Stack>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ borderRadius: 3 }}>
        {error}
      </Alert>
    );
  }

  if (!stats) {
    return (
      <Paper elevation={0} sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
        <Typography variant="body1" color="text.secondary">
          No se encontraron datos para mostrar estadísticas.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={3}>
      <Paper
        elevation={2}
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 3,
          background: "linear-gradient(135deg, #1f3c7a, #3680e1)",
          color: "#fff",
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
          Resumen general
        </Typography>
        <Typography variant="body1">
          Total de canciones: <strong>{stats.totalSongs}</strong>
        </Typography>
        <Typography variant="body1">
          Canciones sin año registrado:{" "}
          <strong>{stats.missingYearCount}</strong>
        </Typography>
      </Paper>

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: {
            xs: "1fr",
            md: "repeat(2, 1fr)",
            lg: "repeat(3, 1fr)",
          },
        }}
      >
        <StatisticsList
          title="Años más frecuentes"
          items={stats.yearsMostCommon}
          emptyMessage="No hay años registrados."
          highlight="top"
        />
        <StatisticsList
          title="Años con menos canciones"
          items={stats.yearsLeastCommon}
          emptyMessage="No hay años suficientes para comparar."
          highlight="bottom"
        />
        <StatisticsList
          title="Décadas con menos canciones"
          items={stats.decadesLeastCommon}
          emptyMessage="No hay décadas registradas."
          highlight="bottom"
        />
        <Box sx={{ gridColumn: { xs: "auto", lg: "span 2" } }}>
          <StatisticsList
            title="Artistas con más canciones"
            items={stats.artistsMostCommon}
            emptyMessage="No hay artistas registrados."
            highlight="top"
          />
        </Box>
      </Box>
    </Stack>
  );
}
