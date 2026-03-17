import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  Chip,
  Divider,
} from "@mui/material";
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  LocalHospital as HospitalIcon,
  CalendarMonth as CalendarIcon,
  Emergency as EmergencyIcon,
} from "@mui/icons-material";
import type { PatientDashboard } from "./dashboardTypes";

interface PatientInfoCardProps {
  patient: PatientDashboard;
}

export function PatientInfoCard({ patient }: PatientInfoCardProps) {
  const surgeryDate = new Date(patient.surgery.date);
  const today = new Date();
  const daysSinceSurgery = Math.floor(
    (today.getTime() - surgeryDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <Card
      sx={{
        height: "100%",
        background: "linear-gradient(135deg, #1a191c 0%, #2c282d 100%)",
        border: "1px solid #3a3439",
      }}
    >
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
          <Avatar
            sx={{
              width: 64,
              height: 64,
              bgcolor: "#5f8787",
              fontSize: "1.5rem",
              mr: 2,
            }}
          >
            {patient.name
              .split(" ")
              .map((n) => n[0])
              .join("")}
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ color: "#e4dfd9", fontWeight: 600 }}>
              {patient.name}
            </Typography>
            <Typography variant="body2" sx={{ color: "#b8afae" }}>
              {patient.age} years old • {patient.sex}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mb: 2 }}>
          <Chip
            icon={<CalendarIcon sx={{ fontSize: 16 }} />}
            label={`Day ${daysSinceSurgery} Post-Op`}
            sx={{ bgcolor: "#5f8787", color: "#101a1a" }}
            size="small"
          />
          <Chip
            icon={<HospitalIcon sx={{ fontSize: 16 }} />}
            label={patient.surgery.type}
            variant="outlined"
            sx={{ borderColor: "#5f8787", color: "#9db7b7" }}
            size="small"
          />
        </Box>

        <Divider sx={{ borderColor: "#3a3439", my: 1.5 }} />

        <Typography
          variant="subtitle2"
          sx={{ color: "#9db7b7", mb: 0.5, textTransform: "uppercase", fontSize: "0.7rem" }}
        >
          Surgery Details
        </Typography>
        <Typography variant="body2" sx={{ color: "#e4dfd9", mb: 1, fontWeight: 500 }}>
          {patient.surgery.type}
        </Typography>
        <Typography variant="body2" sx={{ color: "#b8afae", mb: 1.5, fontSize: "0.85rem" }}>
          {patient.surgery.reason}
        </Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mb: 1.5 }}>
          <Box>
            <Typography variant="caption" sx={{ color: "#999" }}>
              Surgeon
            </Typography>
            <Typography variant="body2" sx={{ color: "#e4dfd9" }}>
              {patient.surgery.surgeon}
            </Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ color: "#999" }}>
              Hospital
            </Typography>
            <Typography variant="body2" sx={{ color: "#e4dfd9" }}>
              {patient.surgery.hospital}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: "#3a3439", my: 1.5 }} />

        <Typography
          variant="subtitle2"
          sx={{ color: "#9db7b7", mb: 1, textTransform: "uppercase", fontSize: "0.7rem" }}
        >
          Contact Information
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <PhoneIcon sx={{ fontSize: 16, color: "#999" }} />
            <Typography variant="body2" sx={{ color: "#b8afae" }}>
              {patient.phone}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <EmailIcon sx={{ fontSize: 16, color: "#999" }} />
            <Typography variant="body2" sx={{ color: "#b8afae" }}>
              {patient.email}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1 }}>
            <EmergencyIcon sx={{ fontSize: 16, color: "#e78a53", mt: 0.3 }} />
            <Box>
              <Typography variant="body2" sx={{ color: "#b8afae" }}>
                {patient.emergencyContact.name} ({patient.emergencyContact.relation})
              </Typography>
              <Typography variant="caption" sx={{ color: "#999" }}>
                {patient.emergencyContact.phone}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}
