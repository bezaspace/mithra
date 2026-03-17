import type { PatientDashboard, LatestReport, ReportFormData } from "./dashboardTypes";
import { backendHttpUrl } from "../../lib/backendUrls";

// ─── Backend API response types ────────────────────────────────────────────

interface ApiLatestReport {
  reportId: string;
  status: string;
  followedPlan: boolean;
  changesMade: string | null;
  feltAfter: string | null;
  symptoms: string | null;
  notes: string | null;
  alertLevel: string;
  summary: string;
  reportedAtIso: string;
}

interface ApiPatient {
  id: string;
  name: string;
  age: number | null;
  sex: string | null;
  phone: string | null;
  email: string | null;
  emergencyContact?: { name: string; relation: string; phone: string } | null;
  surgery?: {
    type: string;
    date: string;
    reason: string;
    surgeon: string;
    hospital: string;
    notes: string | null;
  } | null;
}

interface ApiCondition {
  name: string;
  status: string | null;
  severity: string;
}

interface ApiAllergy {
  allergen: string;
  reaction: string | null;
  severity: string;
}

interface ApiMedication {
  name: string;
  status: string | null;
  dosage: string | null;
  frequency: string | null;
  purpose: string | null;
}

interface ApiBiomarker {
  name: string;
  value: string | null;
  target: string;
  unit: string | null;
  status: string | null;
}

interface ApiMedicalHistory {
  conditions: ApiCondition[];
  allergies: ApiAllergy[];
  medications: ApiMedication[];
  biomarkers: ApiBiomarker[];
}

interface ApiTreatmentPhase {
  phaseNumber: number;
  week: string;
  title: string;
  focus: string;
  goals: string[];
  milestones: string[];
  restrictions: string[];
  status: string;
}

interface ApiTreatmentPlan {
  id: string;
  surgeryType: string;
  startDate: string;
  estimatedEndDate: string;
  currentPhase: number;
  phases: ApiTreatmentPhase[];
}

interface ApiScheduleItem {
  id: string;
  time: string;
  endTime: string;
  title: string;
  type: string;
  instructions: string[];
  status: string;
  notes: string | null;
  latestReport?: ApiLatestReport | null;
}

interface ApiProgress {
  overallAdherence: number;
  weeklyAdherence: number[];
  phaseProgress: number;
  daysSinceSurgery: number;
  totalDaysPlan: number;
  activityBreakdown: {
    medication: number;
    exercise: number;
    diet: number;
    therapy: number;
    rest: number;
  };
  recentMilestones: Array<{ milestone: string; achievedDate: string; phase: number }>;
}

interface DashboardApiResponse {
  patient: ApiPatient | null;
  medicalHistory: ApiMedicalHistory;
  treatmentPlan: ApiTreatmentPlan | null;
  dailySchedule: ApiScheduleItem[];
  progress: ApiProgress;
}

// ─── Submit report payload ──────────────────────────────────────────────────

export interface SubmitReportPayload extends ReportFormData {
  user_id: string;
  timezone?: string;
}

// ─── Default fallbacks ──────────────────────────────────────────────────────

const DEFAULT_SURGERY = {
  type: "Unknown",
  date: new Date().toISOString().split("T")[0],
  reason: "Not specified",
  surgeon: "Not specified",
  hospital: "Not specified",
  notes: "",
};

const DEFAULT_EMERGENCY_CONTACT = {
  name: "Not specified",
  relation: "Not specified",
  phone: "Not specified",
};

// ─── Fetch full dashboard ───────────────────────────────────────────────────

export async function fetchDashboard(userId: string = "raksha-user"): Promise<PatientDashboard> {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const response = await fetch(
    `${backendHttpUrl}/api/dashboard/${encodeURIComponent(userId)}?timezone=${encodeURIComponent(timezone)}`
  );

  if (!response.ok) {
    throw new Error(`Dashboard fetch failed: ${response.status} ${response.statusText}`);
  }

  const apiData: DashboardApiResponse = await response.json();
  return transformApiResponse(apiData);
}

// ─── Submit an adherence report for a schedule item ────────────────────────

export async function submitAdherenceReport(
  scheduleItemId: string,
  payload: SubmitReportPayload
): Promise<LatestReport> {
  const response = await fetch(
    `${backendHttpUrl}/api/schedule/items/${encodeURIComponent(scheduleItemId)}/reports`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    throw new Error(`Report submission failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return {
    reportId: data.reportId,
    status: validateReportStatus(data.status),
    followedPlan: data.followedPlan,
    changesMade: data.changesMade ?? null,
    feltAfter: data.feltAfter ?? null,
    symptoms: data.symptoms ?? null,
    notes: data.notes ?? null,
    alertLevel: validateAlertLevel(data.alertLevel),
    summary: data.summary,
    reportedAtIso: data.reportedAtIso,
  };
}

// ─── Transform backend response to PatientDashboard ────────────────────────

function transformApiResponse(apiData: DashboardApiResponse): PatientDashboard {
  const { patient, medicalHistory, treatmentPlan, dailySchedule, progress } = apiData;

  return {
    id: patient?.id || "unknown",
    name: patient?.name || "Unknown Patient",
    age: patient?.age || 0,
    sex: patient?.sex || "Unknown",
    phone: patient?.phone || "",
    email: patient?.email || "",
    emergencyContact: patient?.emergencyContact || DEFAULT_EMERGENCY_CONTACT,
    surgery: patient?.surgery
      ? {
          type: patient.surgery.type,
          date: patient.surgery.date,
          reason: patient.surgery.reason,
          surgeon: patient.surgery.surgeon,
          hospital: patient.surgery.hospital,
          notes: patient.surgery.notes || "",
        }
      : DEFAULT_SURGERY,
    medicalHistory: {
      conditions: medicalHistory.conditions.map((c) => ({
        name: c.name,
        status: c.status || "",
        severity: validateSeverity(c.severity),
      })),
      allergies: medicalHistory.allergies.map((a) => ({
        allergen: a.allergen,
        reaction: a.reaction || "",
        severity: a.severity === "severe" ? "severe" : "mild",
      })),
      medications: medicalHistory.medications.map((m) => ({
        name: m.name,
        dosage: m.dosage || "",
        frequency: m.frequency || "",
        purpose: m.purpose || "",
      })),
      biomarkers: medicalHistory.biomarkers.map((b) => ({
        name: b.name,
        value: b.value || "",
        target: b.target,
        unit: b.unit || "",
        status: validateBiomarkerStatus(b.status),
      })),
    },
    treatmentPlan: treatmentPlan
      ? {
          startDate: treatmentPlan.startDate,
          estimatedEndDate: treatmentPlan.estimatedEndDate,
          currentPhase: treatmentPlan.currentPhase,
          phases: treatmentPlan.phases.map((p) => ({
            week: p.week,
            title: p.title,
            focus: p.focus,
            goals: p.goals,
            milestones: p.milestones,
            restrictions: p.restrictions,
            status: validatePhaseStatus(p.status),
          })),
        }
      : {
          startDate: new Date().toISOString().split("T")[0],
          estimatedEndDate: "",
          currentPhase: 1,
          phases: [],
        },
    dailySchedule: dailySchedule.map((item) => ({
      id: item.id,
      time: item.time,
      endTime: item.endTime,
      title: item.title,
      type: validateScheduleType(item.type),
      instructions: item.instructions,
      status: validateScheduleStatus(item.status),
      notes: item.notes || undefined,
      latestReport: item.latestReport
        ? {
            reportId: item.latestReport.reportId,
            status: validateReportStatus(item.latestReport.status),
            followedPlan: item.latestReport.followedPlan,
            changesMade: item.latestReport.changesMade,
            feltAfter: item.latestReport.feltAfter,
            symptoms: item.latestReport.symptoms,
            notes: item.latestReport.notes,
            alertLevel: validateAlertLevel(item.latestReport.alertLevel),
            summary: item.latestReport.summary,
            reportedAtIso: item.latestReport.reportedAtIso,
          }
        : undefined,
    })),
    progress: {
      overallAdherence: progress.overallAdherence,
      weeklyAdherence: progress.weeklyAdherence,
      phaseProgress: progress.phaseProgress,
      daysSinceSurgery: progress.daysSinceSurgery,
      totalDaysPlan: progress.totalDaysPlan,
      activityBreakdown: {
        medication: progress.activityBreakdown.medication,
        exercise: progress.activityBreakdown.exercise,
        diet: progress.activityBreakdown.diet,
        therapy: progress.activityBreakdown.therapy,
        rest: progress.activityBreakdown.rest,
      },
      recentMilestones: progress.recentMilestones.map((m) => ({
        milestone: m.milestone,
        achievedDate: m.achievedDate,
        phase: m.phase,
      })),
    },
  };
}

// ─── Validators ─────────────────────────────────────────────────────────────

function validateSeverity(value: string): "mild" | "moderate" | "severe" {
  if (value === "mild" || value === "moderate" || value === "severe") return value;
  return "moderate";
}

function validateBiomarkerStatus(value: string | null): "normal" | "borderline" | "high" | "low" {
  if (value === "normal" || value === "borderline" || value === "high" || value === "low") return value;
  return "normal";
}

function validatePhaseStatus(value: string): "completed" | "active" | "upcoming" {
  if (value === "completed" || value === "active" || value === "upcoming") return value;
  return "upcoming";
}

function validateScheduleType(
  value: string
): "medication" | "exercise" | "diet" | "rest" | "therapy" | "checkup" {
  const valid = ["medication", "exercise", "diet", "rest", "therapy", "checkup"];
  if (valid.includes(value)) return value as ReturnType<typeof validateScheduleType>;
  return "exercise";
}

function validateScheduleStatus(value: string): "done" | "pending" | "missed" | "in-progress" {
  if (value === "done" || value === "pending" || value === "missed" || value === "in-progress") return value;
  return "pending";
}

function validateReportStatus(value: string): "done" | "partial" | "skipped" | "delayed" {
  if (value === "done" || value === "partial" || value === "skipped" || value === "delayed") return value;
  return "done";
}

function validateAlertLevel(value: string): "none" | "watch" | "urgent" {
  if (value === "none" || value === "watch" || value === "urgent") return value;
  return "none";
}
