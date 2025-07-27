import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#3680e1" },
    secondary: { main: "#4abfd9" },
    background: { default: "#f9f9f9", paper: "#ffffff" },
    text: { primary: "#213547", secondary: "#646cff" },
  },
  typography: {
    fontFamily: "Roboto, Helvetica, Arial, sans-serif",
    h1: {
      fontSize: "2.5rem",
      "@media (min-width:600px)": { fontSize: "3rem" },
    },
    h5: {
      fontSize: "1.5rem",
      "@media (min-width:600px)": { fontSize: "1.75rem" },
    },
    body2: {
      fontSize: "0.875rem",
      "@media (min-width:600px)": { fontSize: "1rem" },
    },
  },
  breakpoints: { values: { xs: 0, sm: 600, md: 900, lg: 1200, xl: 1536 } },
});

export default theme;
