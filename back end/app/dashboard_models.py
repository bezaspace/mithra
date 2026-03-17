from __future__ import annotations

from datetime import datetime, timezone
from enum import StrEnum
from uuid import uuid4

from pydantic import BaseModel, Field as PydanticField
from sqlmodel import Field, SQLModel


# ============================================================================
# Surgery & Contact Models
# ============================================================================


class SurgeryInfo(BaseModel):
    type: str
    date: str
    reason: str
    surgeon: str
    hospital: str
    notes: str | None = None


class EmergencyContact(BaseModel):
    name: str
    relation: str
    phone: str


class PatientContactInfo(BaseModel):
    phone: str | None = None
    email: str | None = None


# ============================================================================
# Extended Medical History Models
# ============================================================================


class ConditionSeverity(StrEnum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


class ExtendedConditionRecord(BaseModel):
    name: str
    status: str | None = None
    severity: ConditionSeverity = ConditionSeverity.MODERATE


class AllergyRecord(BaseModel):
    allergen: str
    reaction: str | None = None
    severity: ConditionSeverity = ConditionSeverity.MILD


class ExtendedTreatmentRecord(BaseModel):
    name: str
    status: str | None = None
    dosage: str | None = None
    frequency: str | None = None
    purpose: str | None = None


class BiomarkerReading(BaseModel):
    biomarker: str
    value: str | None = None
    target: str
    unit: str | None = None
    status: str | None = None  # "normal", "borderline", "high", "low"


# ============================================================================
# Treatment Plan Models
# ============================================================================


class TreatmentPhaseStatus(StrEnum):
    COMPLETED = "completed"
    ACTIVE = "active"
    UPCOMING = "upcoming"


class TreatmentPhase(BaseModel):
    phase_number: int
    week_range: str
    title: str
    focus: str
    goals: list[str] = PydanticField(default_factory=list)
    milestones: list[str] = PydanticField(default_factory=list)
    restrictions: list[str] = PydanticField(default_factory=list)
    status: TreatmentPhaseStatus = TreatmentPhaseStatus.UPCOMING


class TreatmentPlan(BaseModel):
    id: str
    user_id: str
    surgery_type: str
    start_date: str
    estimated_end_date: str
    current_phase: int = 1
    phases: list[TreatmentPhase] = PydanticField(default_factory=list)


class TreatmentPlanRow(SQLModel, table=True):
    __tablename__ = "treatment_plans"

    id: str = Field(
        default_factory=lambda: f"plan_{uuid4().hex[:16]}", primary_key=True, index=True
    )
    user_id: str = Field(index=True)
    surgery_type: str
    start_date: str
    estimated_end_date: str
    current_phase: int = Field(default=1)
    phases_json: str = Field(default="[]")
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )
    updated_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ============================================================================
# Milestone Models
# ============================================================================


class MilestoneRecord(BaseModel):
    id: str
    user_id: str
    milestone: str
    achieved_date: str
    phase: int


class MilestoneRow(SQLModel, table=True):
    __tablename__ = "milestones"

    id: str = Field(
        default_factory=lambda: f"ms_{uuid4().hex[:16]}", primary_key=True, index=True
    )
    user_id: str = Field(index=True)
    milestone: str
    achieved_date: str
    phase: int
    created_at: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


# ============================================================================
# Progress Tracking Models
# ============================================================================


class ActivityBreakdown(BaseModel):
    medication: int = 0
    exercise: int = 0
    diet: int = 0
    therapy: int = 0
    rest: int = 0


class DashboardProgress(BaseModel):
    overall_adherence: int = 0
    weekly_adherence: list[int] = PydanticField(default_factory=list)
    phase_progress: int = 0
    days_since_surgery: int = 0
    total_days_plan: int = 90
    activity_breakdown: ActivityBreakdown = PydanticField(
        default_factory=ActivityBreakdown
    )
    recent_milestones: list[MilestoneRecord] = PydanticField(default_factory=list)


# ============================================================================
# Full Dashboard Response Model
# ============================================================================


class DashboardResponse(BaseModel):
    patient: PatientDashboardProfile
    medical_history: PatientMedicalHistory
    treatment_plan: TreatmentPlan | None = None
    daily_schedule: dict | None = None
    progress: DashboardProgress


class PatientDashboardProfile(BaseModel):
    id: str
    name: str
    age: int | None = None
    sex: str | None = None
    phone: str | None = None
    email: str | None = None
    emergency_contact: EmergencyContact | None = None
    surgery: SurgeryInfo | None = None


class PatientMedicalHistory(BaseModel):
    conditions: list[ExtendedConditionRecord] = PydanticField(default_factory=list)
    allergies: list[AllergyRecord] = PydanticField(default_factory=list)
    medications: list[ExtendedTreatmentRecord] = PydanticField(default_factory=list)
    biomarkers: list[BiomarkerReading] = PydanticField(default_factory=list)
