import { useEffect, useState } from "react";
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  LinearProgress,
  Typography,
} from "@mui/material";
import {
  AccessTime as TimeIcon,
  Medication as MedicationIcon,
  FitnessCenter as ExerciseIcon,
  Restaurant as DietIcon,
  HdrAuto as RestIcon,
  Psychology as TherapyIcon,
  LocalHospital as CheckupIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as PendingIcon,
  Warning as MissedIcon,
  PlayCircle as InProgressIcon,
  EditNote as EditNoteIcon,
  ReportProblem as ReportProblemIcon,
} from "@mui/icons-material";

import { submitAdherenceReport } from "./dashboardApi";
import { ScheduleLogForm } from "./ScheduleLogForm";
import type { PatientDashboard, ReportFormData } from "./dashboardTypes";

interface DailyScheduleCardProps {
  patient: PatientDashboard;
}

type ScheduleItem = PatientDashboard["dailySchedule"][number];

const typeIcon: Record<ScheduleItem["type"], JSX.Element> = {
  medication: <MedicationIcon sx={{ fontSize: 18 }} />,
  exercise: <ExerciseIcon sx={{ fontSize: 18 }} />,
  diet: <DietIcon sx={{ fontSize: 18 }} />,
  rest: <RestIcon sx={{ fontSize: 18 }} />,
  therapy: <TherapyIcon sx={{ fontSize: 18 }} />,
  checkup: <CheckupIcon sx={{ fontSize: 18 }} />,
};

const typeColor: Record<ScheduleItem["type"], string> = {
  medication: "#5f8787",
  exercise: "#9db7b7",
  diet: "#fbcb97",
  rest: "#999",
  therapy: "#d3c2f8",
  checkup: "#8dd6a3",
};

const statusIcon: Record<ScheduleItem["status"], JSX.Element> = {
  done: <CheckCircleIcon sx={{ color: "#8dd6a3", fontSize: 20 }} />,
  pending: <PendingIcon sx={{ color: "#999", fontSize: 20 }} />,
  missed: <MissedIcon sx={{ color: "#e78a53", fontSize: 20 }} />,
  "in-progress": <InProgressIcon sx={{ color: "#5f8787", fontSize: 20 }} />,
};

const statusColor: Record<ScheduleItem["status"], string> = {
  done: "#8dd6a3",
  pending: "#999",
  missed: "#e78a53",
  "in-progress": "#5f8787",
};

function mapReportStatusToDisplayStatus(status: ReportFormData["status"]): ScheduleItem["status"] {
  if (status === "done") return "done";
  if (status === "partial") return "in-progress";
  return "missed";
}

function getSummaryParts(item: ScheduleItem): string[] {
  const report = item.latestReport;
  if (!report) return [];

  const parts = [report.status.charAt(0).toUpperCase() + report.status.slice(1)];
  if (report.feltAfter) parts.push(report.feltAfter);
  if (report.changesMade) parts.push(report.changesMade);
  return parts.slice(0, 3);
}

export function DailyScheduleCard({ patient }: DailyScheduleCardProps) {
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>(patient.dailySchedule);
  const [openFormId, setOpenFormId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setScheduleItems(patient.dailySchedule);
  }, [patient.dailySchedule]);

  const completedCount = scheduleItems.filter((s) => s.status === "done").length;
  const progressPercent = scheduleItems.length === 0 ? 0 : Math.round((completedCount / scheduleItems.length) * 100);

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-IN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const handleSave = async (item: ScheduleItem, formData: ReportFormData) => {
    setSubmittingId(item.id);
    setSubmitError(null);

    try {
      const savedReport = await submitAdherenceReport(item.id, {
        user_id: patient.id,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        ...formData,
      });

      setScheduleItems((current) =>
        current.map((currentItem) =>
          currentItem.id === item.id
            ? {
                ...currentItem,
                status: mapReportStatusToDisplayStatus(formData.status),
                latestReport: savedReport,
              }
            : currentItem
        )
      );

      setOpenFormId(null);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Failed to save this log.");
    } finally {
      setSubmittingId(null);
    }
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
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TimeIcon sx={{ color: "#5f8787" }} />
            <Typography variant="h6" sx={{ color: "#e4dfd9" }}>
              Today&apos;s Schedule
            </Typography>
          </Box>
          <Typography variant="caption" sx={{ color: "#999" }}>
            {dateStr}
          </Typography>
        </Box>

        <Box sx={{ mb: 2, mt: 1 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: "#999" }}>
              Daily Progress
            </Typography>
            <Typography variant="caption" sx={{ color: "#9db7b7" }}>
              {completedCount}/{scheduleItems.length} tasks ({progressPercent}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercent}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: "#242226",
              "& .MuiLinearProgress-bar": {
                bgcolor: progressPercent >= 70 ? "#8dd6a3" : progressPercent >= 40 ? "#5f8787" : "#f2d08a",
                borderRadius: 3,
              },
            }}
          />
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, overflowY: "auto", maxHeight: 620 }}>
          {scheduleItems.map((item) => {
            const isEditing = openFormId === item.id;
            const summaryParts = getSummaryParts(item);

            return (
              <Box
                key={item.id}
                sx={{
                  p: 1.25,
                  borderRadius: 2,
                  bgcolor: item.status === "in-progress" ? "#5f878720" : "#242226",
                  border: `1px solid ${item.status === "in-progress" ? "#5f8787" : "#3a3439"}`,
                  opacity: item.status === "missed" ? 0.85 : 1,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: `${typeColor[item.type]}22`,
                      color: typeColor[item.type],
                    }}
                  >
                    {typeIcon[item.type]}
                  </Avatar>

                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: "#e4dfd9",
                          fontWeight: 500,
                          textDecoration: item.status === "done" ? "line-through" : "none",
                        }}
                      >
                        {item.title}
                      </Typography>
                      {statusIcon[item.status]}
                    </Box>

                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 0.25, flexWrap: "wrap" }}>
                      <TimeIcon sx={{ fontSize: 12, color: "#999" }} />
                      <Typography variant="caption" sx={{ color: "#999" }}>
                        {item.time} - {item.endTime}
                      </Typography>
                      <Chip
                        label={item.type}
                        size="small"
                        sx={{
                          bgcolor: `${typeColor[item.type]}22`,
                          color: typeColor[item.type],
                          fontSize: "0.65rem",
                          height: 18,
                          textTransform: "capitalize",
                        }}
                      />
                      <Chip
                        label={item.status}
                        size="small"
                        sx={{
                          bgcolor: `${statusColor[item.status]}22`,
                          color: statusColor[item.status],
                          fontSize: "0.65rem",
                          height: 18,
                          textTransform: "capitalize",
                        }}
                      />
                    </Box>

                    {item.status !== "done" && (
                      <Box sx={{ mt: 0.75 }}>
                        {item.instructions.slice(0, 2).map((inst, idx) => (
                          <Typography
                            key={idx}
                            variant="caption"
                            sx={{ color: "#b8afae", display: "block", fontSize: "0.75rem" }}
                          >
                            • {inst}
                          </Typography>
                        ))}
                        {item.instructions.length > 2 && (
                          <Typography variant="caption" sx={{ color: "#999", fontSize: "0.7rem" }}>
                            +{item.instructions.length - 2} more instructions
                          </Typography>
                        )}
                      </Box>
                    )}

                    {item.notes && (
                      <Typography
                        variant="caption"
                        sx={{
                          color: "#f2d08a",
                          display: "block",
                          mt: 0.5,
                          fontSize: "0.7rem",
                          fontStyle: "italic",
                        }}
                      >
                        Note: {item.notes}
                      </Typography>
                    )}

                    {item.latestReport && !isEditing && (
                      <Box
                        sx={{
                          mt: 1,
                          p: 1,
                          borderRadius: 1.5,
                          bgcolor: "#1d2320",
                          border: `1px solid ${item.latestReport.alertLevel !== "none" ? "#e78a53" : "#32504a"}`,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap", mb: 0.5 }}>
                          <Chip
                            label={item.latestReport.status}
                            size="small"
                            sx={{
                              bgcolor: "#8dd6a322",
                              color: "#8dd6a3",
                              fontSize: "0.65rem",
                              height: 18,
                              textTransform: "capitalize",
                            }}
                          />
                          {summaryParts.slice(1).map((part, index) => (
                            <Typography key={index} variant="caption" sx={{ color: "#b8afae" }}>
                              {part}
                            </Typography>
                          ))}
                          {item.latestReport.alertLevel !== "none" && (
                            <ReportProblemIcon sx={{ color: "#e78a53", fontSize: 16 }} />
                          )}
                        </Box>
                        <Typography variant="caption" sx={{ color: "#9db7b7", display: "block" }}>
                          {item.latestReport.summary}
                        </Typography>
                      </Box>
                    )}

                    <Box sx={{ mt: 1, display: "flex", justifyContent: "flex-end" }}>
                      <Button
                        size="small"
                        startIcon={<EditNoteIcon />}
                        onClick={() => {
                          setSubmitError(null);
                          setOpenFormId((current) => (current === item.id ? null : item.id));
                        }}
                        sx={{
                          textTransform: "none",
                          color: "#9db7b7",
                          minWidth: 0,
                          px: 1,
                        }}
                      >
                        {item.latestReport ? "Edit log" : "Log"}
                      </Button>
                    </Box>

                    {isEditing && (
                      <ScheduleLogForm
                        item={item}
                        submitting={submittingId === item.id}
                        error={submitError}
                        onCancel={() => {
                          setOpenFormId(null);
                          setSubmitError(null);
                        }}
                        onSave={(formData) => handleSave(item, formData)}
                      />
                    )}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>

        {scheduleItems.length === 0 && (
          <Alert severity="info" sx={{ mt: 2 }}>
            No schedule items found for today.
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
