import { useState, useEffect, type SyntheticEvent } from "react";
import { ThemeProvider } from "@mui/material/styles";
import { CssBaseline, Container, Box, Typography, CircularProgress, Alert, Chip, Tabs, Tab } from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Refresh as RefreshIcon,
  GridView as OverviewIcon,
  CalendarToday as ScheduleIcon,
  MedicalServices as TreatmentIcon,
  History as HistoryIcon,
} from "@mui/icons-material";
import { IconButton, Tooltip } from "@mui/material";

import { dashboardTheme } from "../components/dashboard/dashboardTheme";
import { fetchDashboard } from "../components/dashboard/dashboardApi";
import type { PatientDashboard } from "../components/dashboard/dashboardTypes";
import { PatientInfoCard } from "../components/dashboard/PatientInfoCard";
import { MedicalHistoryCard } from "../components/dashboard/MedicalHistoryCard";
import { TreatmentPlanCard } from "../components/dashboard/TreatmentPlanCard";
import { DailyScheduleCard } from "../components/dashboard/DailyScheduleCard";
import { ProgressChartsCard } from "../components/dashboard/ProgressChartsCard";

type TabId = "overview" | "schedule" | "treatment" | "history";

const TABS: { id: TabId; label: string; icon: JSX.Element }[] = [
  { id: "overview",  label: "Overview",         icon: <OverviewIcon /> },
  { id: "schedule",  label: "Today's Schedule", icon: <ScheduleIcon /> },
  { id: "treatment", label: "Treatment Plan",   icon: <TreatmentIcon /> },
  { id: "history",   label: "Medical History",  icon: <HistoryIcon /> },
];

export function DashboardPage() {
  const [patient, setPatient] = useState<PatientDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboard("raksha-user");
      setPatient(data);
    } catch (err) {
      console.warn("Failed to fetch dashboard from backend:", err);
      setPatient(null);
      setError("Could not connect to backend. Please check the server and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <ThemeProvider theme={dashboardTheme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4, textAlign: "center" }}>
          <CircularProgress sx={{ color: "#5f8787" }} />
          <Typography sx={{ color: "#999", mt: 2 }}>Loading dashboard...</Typography>
        </Container>
      </ThemeProvider>
    );
  }

  if (!patient) {
    return (
      <ThemeProvider theme={dashboardTheme}>
        <CssBaseline />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error">{error || "Failed to load dashboard data."}</Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={dashboardTheme}>
      <CssBaseline />
      <Container maxWidth="xl" sx={{ py: 2 }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
            pb: 2,
            borderBottom: "1px solid #3a3439",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <DashboardIcon sx={{ color: "#5f8787", fontSize: 32 }} />
            <Box>
              <Typography variant="h5" sx={{ color: "#e4dfd9", fontWeight: 600 }}>
                Patient Dashboard
              </Typography>
              <Typography variant="body2" sx={{ color: "#999" }}>
                {patient.name} • {patient.surgery.type}
                <Chip
                  label="Live"
                  size="small"
                  sx={{ ml: 1, bgcolor: "#8dd6a3", color: "#101a1a", fontSize: "0.65rem", height: 18 }}
                />
              </Typography>
            </Box>
          </Box>
          <Tooltip title="Refresh data">
            <IconButton sx={{ color: "#9db7b7" }} onClick={loadDashboard}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Error/Info Alert */}
        {error && (
          <Alert severity="warning" sx={{ mb: 2, bgcolor: "#f2d08a22", border: "1px solid #f2d08a" }}>
            {error}
          </Alert>
        )}

        {/* Sub-navigation tabs */}
        <Box
          sx={{
            mb: 3,
            borderBottom: "1px solid #3a3439",
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(_e: SyntheticEvent, val: TabId) => setActiveTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              "& .MuiTab-root": {
                color: "#888",
                textTransform: "none",
                fontWeight: 500,
                fontSize: "0.875rem",
                minHeight: 48,
                gap: 0.75,
                "&.Mui-selected": { color: "#8dd6a3" },
              },
              "& .MuiTabs-indicator": { backgroundColor: "#8dd6a3" },
            }}
          >
            {TABS.map((tab) => (
              <Tab
                key={tab.id}
                value={tab.id}
                label={tab.label}
                icon={tab.icon}
                iconPosition="start"
              />
            ))}
          </Tabs>
        </Box>

        {/* Tab content */}
        {activeTab === "overview" && (
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr 1fr" },
              gap: 2,
            }}
          >
            <Box sx={{ gridColumn: { xs: "1 / -1", lg: "1 / 2" } }}>
              <PatientInfoCard patient={patient} />
            </Box>
            <Box sx={{ gridColumn: { xs: "1 / -1", lg: "2 / -1" } }}>
              <ProgressChartsCard patient={patient} />
            </Box>
          </Box>
        )}

        {activeTab === "schedule" && (
          <DailyScheduleCard patient={patient} />
        )}

        {activeTab === "treatment" && (
          <TreatmentPlanCard patient={patient} />
        )}

        {activeTab === "history" && (
          <MedicalHistoryCard patient={patient} />
        )}

        {/* Footer */}
        <Box
          sx={{
            mt: 4,
            pt: 2,
            borderTop: "1px solid #3a3439",
            textAlign: "center",
          }}
        >
          <Typography variant="caption" sx={{ color: "#666" }}>
            Live data from backend API. {" "}
            Last updated: {new Date().toLocaleString("en-IN")}
          </Typography>
        </Box>
      </Container>
    </ThemeProvider>
  );
}
