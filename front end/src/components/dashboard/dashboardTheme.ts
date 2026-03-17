import { createTheme } from "@mui/material/styles";

export const dashboardTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#5f8787",
      light: "#9db7b7",
      dark: "#4a6a6a",
    },
    secondary: {
      main: "#fbcb97",
      light: "#ffd4b0",
      dark: "#e78a53",
    },
    background: {
      default: "#121113",
      paper: "#1a191c",
    },
    text: {
      primary: "#e4dfd9",
      secondary: "#b8afae",
    },
    error: {
      main: "#e78a53",
    },
    warning: {
      main: "#f2d08a",
    },
    success: {
      main: "#8dd6a3",
    },
    info: {
      main: "#9db7b7",
    },
  },
  typography: {
    fontFamily: '"Avenir Next", "Segoe UI", sans-serif',
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
    },
    subtitle2: {
      fontWeight: 600,
      letterSpacing: "0.05em",
    },
    body2: {
      fontSize: "0.875rem",
    },
    caption: {
      fontSize: "0.75rem",
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: "0 8px 18px rgba(8, 8, 8, 0.34)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiAccordion: {
      styleOverrides: {
        root: {
          "&:before": {
            display: "none",
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: 4,
        },
      },
    },
  },
});
