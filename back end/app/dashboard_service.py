from __future__ import annotations

from datetime import datetime
from typing import Any

from app.dashboard_models import (
    ActivityBreakdown,
    DashboardProgress,
    MilestoneRecord,
    PatientMedicalHistory,
)
from app.dashboard_repository import DashboardRepository
from app.schedule_service import ScheduleService

# Activity type mapping: backend -> frontend
ACTIVITY_TYPE_MAP = {
    "activity": "exercise",
    "sleep": "rest",
    "diet": "diet",
    "medication": "medication",
    "therapy": "therapy",
    "checkup": "checkup",
}

# Status mapping: backend latestReport.status -> frontend status
STATUS_MAP = {
    "done": "done",
    "partial": "in-progress",
    "skipped": "missed",
    "delayed": "pending",
}


class DashboardService:
    def __init__(
        self,
        dashboard_repository: DashboardRepository,
        schedule_service: ScheduleService,
    ) -> None:
        self._dashboard_repo = dashboard_repository
        self._schedule_service = schedule_service

    def get_full_dashboard(
        self,
        *,
        user_id: str,
        timezone_name: str | None = None,
        date_str: str | None = None,
    ) -> dict[str, object]:
        patient = self._dashboard_repo.get_patient_dashboard_profile(user_id)
        medical_history = self._dashboard_repo.get_patient_medical_history(user_id)
        treatment_plan = self._dashboard_repo.get_treatment_plan(user_id)
        milestones = self._dashboard_repo.get_milestones(user_id, limit=10)
        adherence_stats = self._dashboard_repo.get_adherence_stats(user_id)

        daily_schedule = self._schedule_service.get_today_schedule(
            user_id=user_id,
            timezone_name=timezone_name,
            date_str=date_str,
        )

        progress = self._compute_progress(
            user_id=user_id,
            treatment_plan=treatment_plan,
            milestones=milestones,
            adherence_stats=adherence_stats,
        )

        return {
            "patient": self._serialize_patient(patient),
            "medicalHistory": self._serialize_medical_history(medical_history),
            "treatmentPlan": self._serialize_treatment_plan(treatment_plan),
            "dailySchedule": self._transform_daily_schedule(daily_schedule),
            "progress": self._serialize_progress(progress),
        }

    @staticmethod
    def _transform_daily_schedule(raw_schedule: dict[str, Any]) -> list[dict[str, Any]]:
        """Transform backend daily schedule to frontend-expected format."""
        items = raw_schedule.get("items", [])
        transformed = []

        for item in items:
            # Get status from latestReport or default to "pending"
            latest_report = item.get("latestReport")
            raw_status = latest_report.get("status") if latest_report else None
            frontend_status = STATUS_MAP.get(raw_status, "pending")

            # Map activity type
            raw_type = item.get("activityType", "activity")
            frontend_type = ACTIVITY_TYPE_MAP.get(raw_type, "exercise")

            # Pass full latestReport so the frontend log UI can pre-fill the form
            serialized_report = None
            if latest_report:
                serialized_report = {
                    "reportId": latest_report.get("reportId"),
                    "status": latest_report.get("status"),
                    "followedPlan": latest_report.get("followedPlan"),
                    "changesMade": latest_report.get("changesMade"),
                    "feltAfter": latest_report.get("feltAfter"),
                    "symptoms": latest_report.get("symptoms"),
                    "notes": latest_report.get("notes"),
                    "alertLevel": latest_report.get("alertLevel"),
                    "summary": latest_report.get("summary"),
                    "reportedAtIso": latest_report.get("reportedAtIso"),
                }

            transformed.append(
                {
                    "id": item.get("scheduleItemId", ""),
                    "time": item.get("windowStartLocal", ""),
                    "endTime": item.get("windowEndLocal", ""),
                    "title": item.get("title", ""),
                    "type": frontend_type,
                    "instructions": item.get("instructions", []),
                    "status": frontend_status,
                    "notes": item.get("notes"),
                    "latestReport": serialized_report,
                }
            )

        return transformed

    def _compute_progress(
        self,
        *,
        user_id: str,
        treatment_plan: Any,
        milestones: list[MilestoneRecord],
        adherence_stats: dict[str, Any],
    ) -> DashboardProgress:
        days_since_surgery = 0
        if treatment_plan and treatment_plan.start_date:
            try:
                surgery_date = datetime.fromisoformat(treatment_plan.start_date)
                if surgery_date.tzinfo is None:
                    surgery_date = surgery_date.replace(tzinfo=None)
                days_since_surgery = (
                    datetime.utcnow() - surgery_date.replace(tzinfo=None)
                ).days
            except (ValueError, Exception):
                days_since_surgery = 0

        phase_progress = 0
        if treatment_plan:
            total_phases = len(treatment_plan.phases)
            completed_phases = sum(
                1 for p in treatment_plan.phases if p.status == "completed"
            )

            phase_progress = (
                int(((completed_phases + 0.5) / total_phases) * 100)
                if total_phases > 0
                else 0
            )

        activity_breakdown = ActivityBreakdown(
            medication=adherence_stats.get("by_activity", {}).get("medication", 0),
            exercise=adherence_stats.get("by_activity", {}).get("activity", 0),
            diet=adherence_stats.get("by_activity", {}).get("diet", 0),
            therapy=adherence_stats.get("by_activity", {}).get("therapy", 0),
            rest=adherence_stats.get("by_activity", {}).get("sleep", 0),
        )

        return DashboardProgress(
            overall_adherence=adherence_stats.get("overall", 0),
            weekly_adherence=adherence_stats.get("weekly", [0, 0, 0, 0]),
            phase_progress=phase_progress,
            days_since_surgery=days_since_surgery,
            total_days_plan=90,
            activity_breakdown=activity_breakdown,
            recent_milestones=milestones,
        )

    @staticmethod
    def _serialize_patient(patient: Any) -> dict[str, object] | None:
        if patient is None:
            return None

        result: dict[str, object] = {
            "id": patient.id,
            "name": patient.name,
            "age": patient.age,
            "sex": patient.sex,
            "phone": patient.phone,
            "email": patient.email,
        }

        if patient.emergency_contact:
            result["emergencyContact"] = {
                "name": patient.emergency_contact.name,
                "relation": patient.emergency_contact.relation,
                "phone": patient.emergency_contact.phone,
            }

        if patient.surgery:
            result["surgery"] = {
                "type": patient.surgery.type,
                "date": patient.surgery.date,
                "reason": patient.surgery.reason,
                "surgeon": patient.surgery.surgeon,
                "hospital": patient.surgery.hospital,
                "notes": patient.surgery.notes,
            }

        return result

    @staticmethod
    def _serialize_medical_history(history: PatientMedicalHistory) -> dict[str, object]:
        return {
            "conditions": [
                {
                    "name": c.name,
                    "status": c.status,
                    "severity": c.severity.value
                    if hasattr(c.severity, "value")
                    else c.severity,
                }
                for c in history.conditions
            ],
            "allergies": [
                {
                    "allergen": a.allergen,
                    "reaction": a.reaction,
                    "severity": a.severity.value
                    if hasattr(a.severity, "value")
                    else a.severity,
                }
                for a in history.allergies
            ],
            "medications": [
                {
                    "name": m.name,
                    "status": m.status,
                    "dosage": m.dosage,
                    "frequency": m.frequency,
                    "purpose": m.purpose,
                }
                for m in history.medications
            ],
            "biomarkers": [
                {
                    "name": b.biomarker,  # Map biomarker -> name for frontend
                    "value": b.value,
                    "target": b.target,
                    "unit": b.unit,
                    "status": b.status,
                }
                for b in history.biomarkers
            ],
        }

    @staticmethod
    def _serialize_treatment_plan(plan: Any) -> dict[str, object] | None:
        if plan is None:
            return None

        return {
            "id": plan.id,
            "surgeryType": plan.surgery_type,
            "startDate": plan.start_date,
            "estimatedEndDate": plan.estimated_end_date,
            "currentPhase": plan.current_phase,
            "phases": [
                {
                    "phaseNumber": p.phase_number,
                    "week": p.week_range,  # Map weekRange -> week for frontend
                    "title": p.title,
                    "focus": p.focus,
                    "goals": p.goals,
                    "milestones": p.milestones,
                    "restrictions": p.restrictions,
                    "status": p.status.value
                    if hasattr(p.status, "value")
                    else p.status,
                }
                for p in plan.phases
            ],
        }

    @staticmethod
    def _serialize_progress(progress: DashboardProgress) -> dict[str, object]:
        return {
            "overallAdherence": progress.overall_adherence,
            "weeklyAdherence": progress.weekly_adherence,
            "phaseProgress": progress.phase_progress,
            "daysSinceSurgery": progress.days_since_surgery,
            "totalDaysPlan": progress.total_days_plan,
            "activityBreakdown": {
                "medication": progress.activity_breakdown.medication,
                "exercise": progress.activity_breakdown.exercise,
                "diet": progress.activity_breakdown.diet,
                "therapy": progress.activity_breakdown.therapy,
                "rest": progress.activity_breakdown.rest,
            },
            "recentMilestones": [
                {
                    "milestone": m.milestone,
                    "achievedDate": m.achieved_date,
                    "phase": m.phase,
                }
                for m in progress.recent_milestones
            ],
        }
