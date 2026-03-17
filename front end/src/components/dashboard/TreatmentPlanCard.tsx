import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  LinearProgress,
} from "@mui/material";
import {
  Flag as FlagIcon,
  CheckCircle as CheckCircleIcon,
  RadioButtonUnchecked as UncheckedIcon,
  RadioButtonChecked as ActiveIcon,
  Lock as LockedIcon,
  Block as RestrictionIcon,
} from "@mui/icons-material";
import type { PatientDashboard } from "./dashboardTypes";

interface TreatmentPlanCardProps {
  patient: PatientDashboard;
}

const phaseStatusIcon = {
  completed: <CheckCircleIcon sx={{ color: "#8dd6a3", fontSize: 20 }} />,
  active: <ActiveIcon sx={{ color: "#5f8787", fontSize: 20 }} />,
  upcoming: <LockedIcon sx={{ color: "#999", fontSize: 20 }} />,
};

const phaseStatusColor = {
  completed: "#8dd6a3",
  active: "#5f8787",
  upcoming: "#999",
};

export function TreatmentPlanCard({ patient }: TreatmentPlanCardProps) {
  const { treatmentPlan } = patient;
  const activePhaseIndex = treatmentPlan.phases.findIndex((p) => p.status === "active");
  const completedCount = treatmentPlan.phases.filter((p) => p.status === "completed").length;

  return (
    <Card
      sx={{
        height: "100%",
        background: "linear-gradient(135deg, #1a191c 0%, #2c282d 100%)",
        border: "1px solid #3a3439",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <FlagIcon sx={{ color: "#5f8787" }} />
            <Typography variant="h6" sx={{ color: "#e4dfd9" }}>
              Treatment Plan
            </Typography>
          </Box>
          <Chip
            label={`Phase ${treatmentPlan.currentPhase} of ${treatmentPlan.phases.length}`}
            size="small"
            sx={{ bgcolor: "#5f8787", color: "#101a1a" }}
          />
        </Box>

        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#999" }}>
              Overall Progress
            </Typography>
            <Typography variant="caption" sx={{ color: "#9db7b7" }}>
              {patient.progress.phaseProgress}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={patient.progress.phaseProgress}
            sx={{
              height: 8,
              borderRadius: 4,
              bgcolor: "#242226",
              "& .MuiLinearProgress-bar": {
                bgcolor: "#5f8787",
                borderRadius: 4,
              },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {treatmentPlan.phases.map((phase, index) => (
            <Box
              key={index}
              sx={{
                p: 1.5,
                borderRadius: 2,
                bgcolor: phase.status === "active" ? "#5f878715" : "#242226",
                border: `1px solid ${phase.status === "active" ? "#5f8787" : "#3a3439"}`,
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                {phaseStatusIcon[phase.status]}
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ color: phaseStatusColor[phase.status], fontSize: "0.85rem" }}
                  >
                    {phase.week}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "#e4dfd9", fontWeight: 500 }}>
                    {phase.title}
                  </Typography>
                </Box>
              </Box>

              <Typography
                variant="caption"
                sx={{ color: "#b8afae", display: "block", mb: 1, fontStyle: "italic" }}
              >
                Focus: {phase.focus}
              </Typography>

              {phase.status !== "upcoming" && (
                <>
                  <Typography
                    variant="caption"
                    sx={{ color: "#9db7b7", display: "block", mb: 0.5, fontWeight: 600 }}
                  >
                    Goals
                  </Typography>
                  <List dense disablePadding sx={{ mb: 1 }}>
                    {phase.goals.slice(0, 3).map((goal, gIdx) => (
                      <ListItem key={gIdx} sx={{ px: 0, py: 0.25 }}>
                        <ListItemIcon sx={{ minWidth: 24 }}>
                          {phase.status === "completed" ? (
                            <CheckCircleIcon sx={{ fontSize: 14, color: "#8dd6a3" }} />
                          ) : (
                            <UncheckedIcon sx={{ fontSize: 14, color: "#999" }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={goal}
                          primaryTypographyProps={{
                            sx: {
                              color: phase.status === "completed" ? "#b8afae" : "#e4dfd9",
                              fontSize: "0.78rem",
                              textDecoration: phase.status === "completed" ? "line-through" : "none",
                            },
                          }}
                        />
                      </ListItem>
                    ))}
                    {phase.goals.length > 3 && (
                      <Typography variant="caption" sx={{ color: "#999", ml: 3 }}>
                        +{phase.goals.length - 3} more goals
                      </Typography>
                    )}
                  </List>

                  <Typography
                    variant="caption"
                    sx={{ color: "#f2d08a", display: "block", mb: 0.5, fontWeight: 600 }}
                  >
                    Milestones
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mb: 1 }}>
                    {phase.milestones.map((milestone, mIdx) => (
                      <Chip
                        key={mIdx}
                        label={milestone}
                        size="small"
                        icon={
                          phase.status === "completed" ? (
                            <CheckCircleIcon sx={{ fontSize: 14 }} />
                          ) : undefined
                        }
                        sx={{
                          bgcolor: "#2c282d",
                          color: "#b8afae",
                          fontSize: "0.7rem",
                          height: 24,
                        }}
                      />
                    ))}
                  </Box>
                </>
              )}

              {phase.restrictions.length > 0 && (
                <>
                  <Typography
                    variant="caption"
                    sx={{ color: "#e78a53", display: "block", mb: 0.5, fontWeight: 600 }}
                  >
                    Restrictions
                  </Typography>
                  <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                    {phase.restrictions.slice(0, 2).map((restriction, rIdx) => (
                      <Chip
                        key={rIdx}
                        label={restriction}
                        size="small"
                        icon={<RestrictionIcon sx={{ fontSize: 14 }} />}
                        sx={{
                          bgcolor: "#e78a5315",
                          color: "#e78a53",
                          fontSize: "0.7rem",
                          height: 24,
                          border: "1px solid #e78a5344",
                        }}
                      />
                    ))}
                  </Box>
                </>
              )}
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
}
