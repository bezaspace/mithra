import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  Warning as WarningIcon,
  LocalPharmacy as PharmacyIcon,
  Science as ScienceIcon,
  Healing as HealingIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import type { PatientDashboard } from "./dashboardTypes";

interface MedicalHistoryCardProps {
  patient: PatientDashboard;
}

const severityColor = {
  mild: "#9db7b7",
  moderate: "#f2d08a",
  severe: "#e78a53",
};

const biomarkerStatusColor = {
  normal: "#8dd6a3",
  borderline: "#f2d08a",
  high: "#e78a53",
  low: "#d3c2f8",
};

export function MedicalHistoryCard({ patient }: MedicalHistoryCardProps) {
  const { medicalHistory } = patient;

  return (
    <Card
      sx={{
        height: "100%",
        background: "linear-gradient(135deg, #1a191c 0%, #2c282d 100%)",
        border: "1px solid #3a3439",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <HealingIcon sx={{ color: "#5f8787" }} />
          <Typography variant="h6" sx={{ color: "#e4dfd9" }}>
            Medical History
          </Typography>
        </Box>

        <Accordion
          defaultExpanded
          sx={{
            bgcolor: "#242226",
            "&:before": { display: "none" },
            mb: 1,
            borderRadius: "8px !important",
            border: "1px solid #3a3439",
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#999" }} />}>
            <Typography sx={{ color: "#9db7b7", fontSize: "0.9rem" }}>
              Conditions ({medicalHistory.conditions.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.8 }}>
              {medicalHistory.conditions.map((condition) => (
                <Chip
                  key={condition.name}
                  label={`${condition.name} - ${condition.status}`}
                  size="small"
                  sx={{
                    bgcolor: `${severityColor[condition.severity]}22`,
                    border: `1px solid ${severityColor[condition.severity]}`,
                    color: severityColor[condition.severity],
                    fontSize: "0.75rem",
                  }}
                />
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>

        <Accordion
          sx={{
            bgcolor: "#242226",
            "&:before": { display: "none" },
            mb: 1,
            borderRadius: "8px !important",
            border: "1px solid #3a3439",
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#999" }} />}>
            <Typography sx={{ color: "#9db7b7", fontSize: "0.9rem" }}>
              Allergies ({medicalHistory.allergies.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense disablePadding>
              {medicalHistory.allergies.map((allergy) => (
                <ListItem key={allergy.allergen} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <WarningIcon
                      sx={{
                        fontSize: 18,
                        color: allergy.severity === "severe" ? "#e78a53" : "#f2d08a",
                      }}
                    />
                  </ListItemIcon>
                  <ListItemText
                    primary={allergy.allergen}
                    secondary={`Reaction: ${allergy.reaction}`}
                    primaryTypographyProps={{ sx: { color: "#e4dfd9", fontSize: "0.85rem" } }}
                    secondaryTypographyProps={{ sx: { color: "#b8afae", fontSize: "0.78rem" } }}
                  />
                  <Chip
                    label={allergy.severity}
                    size="small"
                    sx={{
                      bgcolor: allergy.severity === "severe" ? "#e78a5322" : "#f2d08a22",
                      color: allergy.severity === "severe" ? "#e78a53" : "#f2d08a",
                      fontSize: "0.7rem",
                    }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion
          sx={{
            bgcolor: "#242226",
            "&:before": { display: "none" },
            mb: 1,
            borderRadius: "8px !important",
            border: "1px solid #3a3439",
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#999" }} />}>
            <Typography sx={{ color: "#9db7b7", fontSize: "0.9rem" }}>
              Current Medications ({medicalHistory.medications.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense disablePadding>
              {medicalHistory.medications.map((med) => (
                <ListItem key={med.name} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <PharmacyIcon sx={{ fontSize: 18, color: "#5f8787" }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={`${med.name} ${med.dosage}`}
                    secondary={`${med.frequency} • ${med.purpose}`}
                    primaryTypographyProps={{ sx: { color: "#e4dfd9", fontSize: "0.85rem" } }}
                    secondaryTypographyProps={{ sx: { color: "#b8afae", fontSize: "0.78rem" } }}
                  />
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>

        <Accordion
          sx={{
            bgcolor: "#242226",
            "&:before": { display: "none" },
            borderRadius: "8px !important",
            border: "1px solid #3a3439",
          }}
        >
          <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ color: "#999" }} />}>
            <Typography sx={{ color: "#9db7b7", fontSize: "0.9rem" }}>
              Biomarkers ({medicalHistory.biomarkers.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <List dense disablePadding>
              {medicalHistory.biomarkers.map((marker) => (
                <ListItem key={marker.name} sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <ScienceIcon sx={{ fontSize: 18, color: biomarkerStatusColor[marker.status] }} />
                  </ListItemIcon>
                  <ListItemText
                    primary={marker.name}
                    secondary={`Current: ${marker.value} ${marker.unit} | Target: ${marker.target}`}
                    primaryTypographyProps={{ sx: { color: "#e4dfd9", fontSize: "0.85rem" } }}
                    secondaryTypographyProps={{ sx: { color: "#b8afae", fontSize: "0.78rem" } }}
                  />
                  {marker.status === "normal" ? (
                    <CheckCircleIcon sx={{ fontSize: 18, color: "#8dd6a3" }} />
                  ) : (
                    <ErrorIcon sx={{ fontSize: 18, color: biomarkerStatusColor[marker.status] }} />
                  )}
                </ListItem>
              ))}
            </List>
          </AccordionDetails>
        </Accordion>
      </CardContent>
    </Card>
  );
}
