import { useMemo, useState, type ChangeEvent, type MouseEvent } from "react";
import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  Alert,
} from "@mui/material";

import type { PatientDashboard, ReportFormData } from "./dashboardTypes";

type ScheduleItem = PatientDashboard["dailySchedule"][number];
type LogStatus = ReportFormData["status"];

interface ScheduleLogFormProps {
  item: ScheduleItem;
  submitting?: boolean;
  error?: string | null;
  onSave: (data: ReportFormData) => void;
  onCancel: () => void;
}

function getInitialStatus(item: ScheduleItem): LogStatus {
  const reportStatus = item.latestReport?.status;
  if (reportStatus === "done" || reportStatus === "partial" || reportStatus === "skipped") {
    return reportStatus;
  }
  if (item.status === "done") return "done";
  if (item.status === "missed") return "skipped";
  return "partial";
}

export function ScheduleLogForm({ item, submitting = false, error = null, onSave, onCancel }: ScheduleLogFormProps) {
  const initialStatus = useMemo(() => getInitialStatus(item), [item]);
  const [status, setStatus] = useState<LogStatus>(initialStatus);
  const [changesMade, setChangesMade] = useState(item.latestReport?.changesMade || "");
  const [feltAfter, setFeltAfter] = useState(item.latestReport?.feltAfter || "");
  const [symptoms, setSymptoms] = useState(item.latestReport?.symptoms || "");
  const [notes, setNotes] = useState(item.latestReport?.notes || "");
  const [flagForDoctor, setFlagForDoctor] = useState(item.latestReport?.alertLevel === "watch" || item.latestReport?.alertLevel === "urgent");

  const needsChangesField = status === "partial" || status === "skipped";

  const handleSave = () => {
    onSave({
      status,
      followed_plan: status === "done",
      changes_made: needsChangesField ? changesMade.trim() : "",
      felt_after: feltAfter.trim(),
      symptoms: symptoms.trim(),
      notes: notes.trim(),
      alert_level: flagForDoctor ? "watch" : "none",
    });
  };

  return (
    <Box
      sx={{
        mt: 1.25,
        p: 1.25,
        borderRadius: 2,
        bgcolor: "#1f1d21",
        border: "1px solid #3a3439",
      }}
    >
      <Typography variant="subtitle2" sx={{ color: "#9db7b7", mb: 1 }}>
        Log how this went
      </Typography>

      <Stack spacing={1.25}>
        <Box>
          <Typography variant="caption" sx={{ color: "#999", display: "block", mb: 0.75 }}>
            Outcome
          </Typography>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={status}
            onChange={(_e: MouseEvent<HTMLElement>, next: LogStatus | null) => {
              if (next) setStatus(next);
            }}
            sx={{
              "& .MuiToggleButton-root": {
                color: "#b8afae",
                borderColor: "#3a3439",
                textTransform: "none",
                "&.Mui-selected": {
                  color: "#101a1a",
                  bgcolor: "#8dd6a3",
                  "&:hover": { bgcolor: "#8dd6a3" },
                },
              },
            }}
          >
            <ToggleButton value="done">Done</ToggleButton>
            <ToggleButton value="partial">Partial</ToggleButton>
            <ToggleButton value="skipped">Skipped</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {needsChangesField && (
          <TextField
            label="What was different?"
            value={changesMade}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setChangesMade(e.target.value)}
            size="small"
            fullWidth
            multiline
            minRows={2}
            sx={textFieldSx}
          />
        )}

        <TextField
          label="How did they feel after?"
          value={feltAfter}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setFeltAfter(e.target.value)}
          size="small"
          fullWidth
          sx={textFieldSx}
        />

        <TextField
          label="Any symptoms?"
          value={symptoms}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setSymptoms(e.target.value)}
          size="small"
          fullWidth
          sx={textFieldSx}
        />

        <TextField
          label="Additional notes"
          value={notes}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
          size="small"
          fullWidth
          multiline
          minRows={2}
          sx={textFieldSx}
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={flagForDoctor}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setFlagForDoctor(e.target.checked)}
              sx={{ color: "#e78a53", "&.Mui-checked": { color: "#e78a53" } }}
            />
          }
          label={<Typography variant="body2" sx={{ color: "#b8afae" }}>Flag for doctor&apos;s attention</Typography>}
        />

        {error && (
          <Alert severity="error" sx={{ bgcolor: "#3a1f1f", color: "#f6d7d7", border: "1px solid #7a3636" }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
          <Button onClick={onCancel} disabled={submitting} sx={{ color: "#999", textTransform: "none" }}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={submitting}
            sx={{
              textTransform: "none",
              bgcolor: "#5f8787",
              color: "#101a1a",
              "&:hover": { bgcolor: "#6d9a9a" },
            }}
          >
            {submitting ? "Saving..." : "Save log"}
          </Button>
        </Box>
      </Stack>
    </Box>
  );
}

const textFieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#e4dfd9",
    bgcolor: "#242226",
    "& fieldset": { borderColor: "#3a3439" },
    "&:hover fieldset": { borderColor: "#5f8787" },
    "&.Mui-focused fieldset": { borderColor: "#8dd6a3" },
  },
  "& .MuiInputLabel-root": {
    color: "#999",
    "&.Mui-focused": { color: "#8dd6a3" },
  },
};
