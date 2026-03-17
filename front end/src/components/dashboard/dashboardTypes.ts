// Core type for a saved adherence report returned from the backend
export interface LatestReport {
  reportId: string;
  status: "done" | "partial" | "skipped" | "delayed";
  followedPlan: boolean;
  changesMade: string | null;
  feltAfter: string | null;
  symptoms: string | null;
  notes: string | null;
  alertLevel: "none" | "watch" | "urgent";
  summary: string;
  reportedAtIso: string;
}

// Form data collected in ScheduleLogForm before submission
export interface ReportFormData {
  status: "done" | "partial" | "skipped";
  followed_plan: boolean;
  changes_made?: string;
  felt_after?: string;
  symptoms?: string;
  notes?: string;
  alert_level: "none" | "watch" | "urgent";
}

// Full patient dashboard data shape used throughout the frontend
export interface PatientDashboard {
  id: string;
  name: string;
  age: number;
  sex: string;
  phone: string;
  email: string;
  emergencyContact: {
    name: string;
    relation: string;
    phone: string;
  };
  surgery: {
    type: string;
    date: string;
    reason: string;
    surgeon: string;
    hospital: string;
    notes: string;
  };
  medicalHistory: {
    conditions: Array<{
      name: string;
      status: string;
      severity: "mild" | "moderate" | "severe";
    }>;
    allergies: Array<{
      allergen: string;
      reaction: string;
      severity: "mild" | "severe";
    }>;
    medications: Array<{
      name: string;
      dosage: string;
      frequency: string;
      purpose: string;
    }>;
    biomarkers: Array<{
      name: string;
      value: string;
      target: string;
      unit: string;
      status: "normal" | "borderline" | "high" | "low";
    }>;
  };
  treatmentPlan: {
    startDate: string;
    estimatedEndDate: string;
    currentPhase: number;
    phases: Array<{
      week: string;
      title: string;
      focus: string;
      goals: string[];
      milestones: string[];
      restrictions: string[];
      status: "completed" | "active" | "upcoming";
    }>;
  };
  dailySchedule: Array<{
    id: string;
    time: string;
    endTime: string;
    title: string;
    type: "medication" | "exercise" | "diet" | "rest" | "therapy" | "checkup";
    instructions: string[];
    status: "done" | "pending" | "missed" | "in-progress";
    notes?: string;
    latestReport?: LatestReport;
  }>;
  progress: {
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
    recentMilestones: Array<{
      milestone: string;
      achievedDate: string;
      phase: number;
    }>;
  };
}
