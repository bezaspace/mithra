import { Card, CardContent, Typography, Box, LinearProgress } from "@mui/material";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Doughnut, Bar } from "react-chartjs-2";
import {
  TrendingUp as TrendingUpIcon,
  CheckCircle as CheckIcon,
} from "@mui/icons-material";
import type { PatientDashboard } from "./dashboardTypes";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ProgressChartsCardProps {
  patient: PatientDashboard;
}

export function ProgressChartsCard({ patient }: ProgressChartsCardProps) {
  const { progress } = patient;

  const adherenceData = {
    labels: ["Completed", "Remaining"],
    datasets: [
      {
        data: [progress.overallAdherence, 100 - progress.overallAdherence],
        backgroundColor: ["#5f8787", "#242226"],
        borderColor: ["#9db7b7", "#3a3439"],
        borderWidth: 2,
      },
    ],
  };

  const weeklyData = {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Adherence %",
        data: progress.weeklyAdherence,
        backgroundColor: progress.weeklyAdherence.map((val) =>
          val >= 90 ? "#8dd6a366" : val >= 80 ? "#5f878766" : "#f2d08a66"
        ),
        borderColor: progress.weeklyAdherence.map((val) =>
          val >= 90 ? "#8dd6a3" : val >= 80 ? "#5f8787" : "#f2d08a"
        ),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: true,
    cutout: "70%",
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1a191c",
        titleColor: "#e4dfd9",
        bodyColor: "#b8afae",
        borderColor: "#3a3439",
        borderWidth: 1,
      },
    },
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "#1a191c",
        titleColor: "#e4dfd9",
        bodyColor: "#b8afae",
        borderColor: "#3a3439",
        borderWidth: 1,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        grid: {
          color: "#3a3439",
        },
        ticks: {
          color: "#999",
        },
      },
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#999",
        },
      },
    },
  };

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
          <TrendingUpIcon sx={{ color: "#5f8787" }} />
          <Typography variant="h6" sx={{ color: "#e4dfd9" }}>
            Progress & Adherence
          </Typography>
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
          {/* Overall Adherence Doughnut */}
          <Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="caption" sx={{ color: "#999", display: "block", mb: 1 }}>
                Overall Adherence
              </Typography>
              <Box sx={{ position: "relative", width: 120, height: 120, mx: "auto" }}>
                <Doughnut data={adherenceData} options={doughnutOptions} />
                <Box
                  sx={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    textAlign: "center",
                  }}
                >
                  <Typography variant="h5" sx={{ color: "#9db7b7", fontWeight: 600 }}>
                    {progress.overallAdherence}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Weekly Trend Bar Chart */}
          <Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#999", display: "block", mb: 1 }}>
                Weekly Adherence Trend
              </Typography>
              <Box sx={{ height: 140 }}>
                <Bar data={weeklyData} options={barOptions} />
              </Box>
            </Box>
          </Box>

          {/* Activity Breakdown */}
          <Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#999", display: "block", mb: 1 }}>
                Activity Breakdown
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                {Object.entries(progress.activityBreakdown).map(([activity, value]) => (
                  <Box key={activity}>
                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                      <Typography variant="caption" sx={{ color: "#b8afae", textTransform: "capitalize" }}>
                        {activity}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          color: value >= 90 ? "#8dd6a3" : value >= 75 ? "#5f8787" : "#f2d08a",
                          fontWeight: 600,
                        }}
                      >
                        {value}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={value}
                      sx={{
                        height: 6,
                        borderRadius: 3,
                        bgcolor: "#242226",
                        "& .MuiLinearProgress-bar": {
                          bgcolor: value >= 90 ? "#8dd6a3" : value >= 75 ? "#5f8787" : "#f2d08a",
                          borderRadius: 3,
                        },
                      }}
                    />
                  </Box>
                ))}
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Recovery Timeline */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: "#242226",
            borderRadius: 2,
            border: "1px solid #3a3439",
          }}
        >
          <Typography variant="subtitle2" sx={{ color: "#9db7b7", mb: 1.5 }}>
            Recovery Timeline
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 2 }}>
            <Box>
              <Typography variant="caption" sx={{ color: "#999" }}>
                Days Since Surgery
              </Typography>
              <Typography variant="h5" sx={{ color: "#e4dfd9", fontWeight: 600 }}>
                {progress.daysSinceSurgery}
                <Typography component="span" variant="caption" sx={{ color: "#999", ml: 0.5 }}>
                  / {progress.totalDaysPlan}
                </Typography>
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#999" }}>
                Current Phase
              </Typography>
              <Typography variant="h5" sx={{ color: "#5f8787", fontWeight: 600 }}>
                {patient.treatmentPlan.currentPhase}
                <Typography component="span" variant="caption" sx={{ color: "#999", ml: 0.5 }}>
                  / {patient.treatmentPlan.phases.length}
                </Typography>
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: "#999" }}>
                Milestones Achieved
              </Typography>
              <Typography variant="h5" sx={{ color: "#8dd6a3", fontWeight: 600 }}>
                {progress.recentMilestones.length}
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Recent Milestones */}
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ color: "#9db7b7", mb: 1 }}>
            Recent Milestones
          </Typography>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
            {progress.recentMilestones.slice(0, 4).map((milestone, idx) => (
              <Box
                key={idx}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  p: 1,
                  bgcolor: "#242226",
                  borderRadius: 1,
                  border: "1px solid #3a3439",
                }}
              >
                <CheckIcon sx={{ color: "#8dd6a3", fontSize: 18 }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: "#e4dfd9", fontSize: "0.82rem" }}>
                    {milestone.milestone}
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: "#999" }}>
                  {new Date(milestone.achievedDate).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </Typography>
              </Box>
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
