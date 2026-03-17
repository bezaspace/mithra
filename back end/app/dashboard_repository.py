from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine, select

from app.dashboard_models import (
    ActivityBreakdown,
    AllergyRecord,
    BiomarkerReading,
    DashboardProgress,
    EmergencyContact,
    ExtendedConditionRecord,
    ExtendedTreatmentRecord,
    MilestoneRecord,
    MilestoneRow,
    PatientDashboardProfile,
    PatientMedicalHistory,
    SurgeryInfo,
    TreatmentPhase,
    TreatmentPlan,
    TreatmentPlanRow,
)
from app.patient_profile_models import PatientProfileRow
from app.schedule_models import AdherenceReportRow, ScheduleItemRow

logger = logging.getLogger("raksha.dashboard_repository")


class DashboardRepository:
    def __init__(self, db_url: str, seed_sql_path: Path | None = None) -> None:
        connect_args = (
            {"check_same_thread": False} if db_url.startswith("sqlite") else {}
        )
        self._engine = create_engine(db_url, connect_args=connect_args)
        self._seed_sql_path = seed_sql_path

    def initialize(self) -> None:
        SQLModel.metadata.create_all(self._engine)

        if self._seed_sql_path is None or not self._seed_sql_path.exists():
            logger.info("dashboard_seed_sql_missing_or_not_provided")
            return

        sql_script = self._seed_sql_path.read_text(encoding="utf-8").strip()
        if not sql_script:
            return

        statements = [stmt.strip() for stmt in sql_script.split(";") if stmt.strip()]
        if not statements:
            return

        with Session(self._engine) as session:
            for statement in statements:
                session.exec(text(statement))
            session.commit()

    def get_patient_dashboard_profile(
        self, user_id: str
    ) -> PatientDashboardProfile | None:
        normalized_user_id = user_id.strip()
        if not normalized_user_id:
            return None

        with Session(self._engine) as session:
            row = session.exec(
                select(PatientProfileRow).where(
                    PatientProfileRow.user_id == normalized_user_id
                )
            ).first()
            if row is None:
                return None

            emergency_contact = None
            if hasattr(row, "emergency_contact_json") and row.emergency_contact_json:
                try:
                    ec_data = json.loads(row.emergency_contact_json)
                    emergency_contact = EmergencyContact(**ec_data)
                except (json.JSONDecodeError, Exception) as exc:
                    logger.warning(
                        "emergency_contact_parse_failed user_id=%s error=%s",
                        user_id,
                        exc,
                    )

            surgery_info = None
            if hasattr(row, "surgery_info_json") and row.surgery_info_json:
                try:
                    si_data = json.loads(row.surgery_info_json)
                    surgery_info = SurgeryInfo(**si_data)
                except (json.JSONDecodeError, Exception) as exc:
                    logger.warning(
                        "surgery_info_parse_failed user_id=%s error=%s", user_id, exc
                    )

            phone = getattr(row, "phone", None)
            email = getattr(row, "email", None)

            return PatientDashboardProfile(
                id=row.user_id,
                name=row.full_name or "Unknown",
                age=row.age,
                sex=row.sex,
                phone=phone,
                email=email,
                emergency_contact=emergency_contact,
                surgery=surgery_info,
            )

    def get_patient_medical_history(self, user_id: str) -> PatientMedicalHistory:
        normalized_user_id = user_id.strip()
        if not normalized_user_id:
            return PatientMedicalHistory()

        with Session(self._engine) as session:
            row = session.exec(
                select(PatientProfileRow).where(
                    PatientProfileRow.user_id == normalized_user_id
                )
            ).first()
            if row is None:
                return PatientMedicalHistory()

            conditions = self._parse_conditions(row.conditions_json)
            allergies = self._parse_allergies(
                row.allergies_json, row.contraindications_json
            )
            medications = self._parse_medications(row.treatments_json)
            biomarkers = self._parse_biomarkers(row.biomarker_targets_json)

            return PatientMedicalHistory(
                conditions=conditions,
                allergies=allergies,
                medications=medications,
                biomarkers=biomarkers,
            )

    def get_treatment_plan(self, user_id: str) -> TreatmentPlan | None:
        normalized_user_id = user_id.strip()
        if not normalized_user_id:
            return None

        with Session(self._engine) as session:
            row = session.exec(
                select(TreatmentPlanRow).where(
                    TreatmentPlanRow.user_id == normalized_user_id
                )
            ).first()
            if row is None:
                return None

            phases = self._parse_phases(row.phases_json)
            return TreatmentPlan(
                id=row.id,
                user_id=row.user_id,
                surgery_type=row.surgery_type,
                start_date=row.start_date,
                estimated_end_date=row.estimated_end_date,
                current_phase=row.current_phase,
                phases=phases,
            )

    def get_milestones(self, user_id: str, limit: int = 10) -> list[MilestoneRecord]:
        normalized_user_id = user_id.strip()
        if not normalized_user_id:
            return []

        with Session(self._engine) as session:
            rows = session.exec(
                select(MilestoneRow)
                .where(MilestoneRow.user_id == normalized_user_id)
                .order_by(MilestoneRow.achieved_date.desc())
                .limit(limit)
            ).all()

            return [
                MilestoneRecord(
                    id=row.id,
                    user_id=row.user_id,
                    milestone=row.milestone,
                    achieved_date=row.achieved_date,
                    phase=row.phase,
                )
                for row in rows
            ]

    def get_adherence_stats(self, user_id: str, days: int = 28) -> dict[str, Any]:
        normalized_user_id = user_id.strip()
        if not normalized_user_id:
            return {"overall": 0, "weekly": [], "by_activity": {}}

        with Session(self._engine) as session:
            reports = session.exec(
                select(AdherenceReportRow)
                .where(AdherenceReportRow.user_id == normalized_user_id)
                .order_by(AdherenceReportRow.reported_at_iso.desc())
            ).all()

            if not reports:
                return {"overall": 0, "weekly": [0, 0, 0, 0], "by_activity": {}}

            total = len(reports)
            done_count = sum(1 for r in reports if r.status == "done")
            partial_count = sum(1 for r in reports if r.status == "partial")
            overall = (
                int((done_count + partial_count * 0.5) / total * 100)
                if total > 0
                else 0
            )

            weekly = self._compute_weekly_adherence(reports)

            by_activity = self._compute_activity_breakdown(reports)

            return {
                "overall": overall,
                "weekly": weekly,
                "by_activity": by_activity,
            }

    def _parse_conditions(self, raw: str) -> list[ExtendedConditionRecord]:
        try:
            data = json.loads(raw)
            return [
                ExtendedConditionRecord(
                    name=c.get("name", ""),
                    status=c.get("status"),
                    severity=c.get("severity", "moderate"),
                )
                for c in data
                if isinstance(c, dict)
            ]
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("conditions_parse_failed error=%s", exc)
            return []

    def _parse_allergies(
        self, allergies_raw: str, contraindications_raw: str
    ) -> list[AllergyRecord]:
        result = []
        try:
            allergies = json.loads(allergies_raw)
            for a in allergies:
                if isinstance(a, dict):
                    result.append(
                        AllergyRecord(
                            allergen=a.get("allergen", a if isinstance(a, str) else ""),
                            reaction=a.get("reaction"),
                            severity=a.get("severity", "mild"),
                        )
                    )
                elif isinstance(a, str):
                    result.append(
                        AllergyRecord(allergen=a, reaction=None, severity="mild")
                    )
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("allergies_parse_failed error=%s", exc)

        try:
            contraindications = json.loads(contraindications_raw)
            for c in contraindications:
                if isinstance(c, str):
                    result.append(
                        AllergyRecord(
                            allergen=f"Contraindication: {c}",
                            reaction="Avoid",
                            severity="severe",
                        )
                    )
        except (json.JSONDecodeError, Exception):
            pass

        return result

    def _parse_medications(self, raw: str) -> list[ExtendedTreatmentRecord]:
        try:
            data = json.loads(raw)
            return [
                ExtendedTreatmentRecord(
                    name=t.get("name", ""),
                    status=t.get("status"),
                    dosage=t.get("dosage"),
                    frequency=t.get("frequency"),
                    purpose=t.get("purpose"),
                )
                for t in data
                if isinstance(t, dict)
            ]
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("medications_parse_failed error=%s", exc)
            return []

    def _parse_biomarkers(self, raw: str) -> list[BiomarkerReading]:
        try:
            data = json.loads(raw)
            return [
                BiomarkerReading(
                    biomarker=b.get("biomarker", b.get("name", "")),
                    value=b.get("value"),
                    target=b.get("target", ""),
                    unit=b.get("unit"),
                    status=b.get("status", "normal"),
                )
                for b in data
                if isinstance(b, dict)
            ]
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("biomarkers_parse_failed error=%s", exc)
            return []

    def _parse_phases(self, raw: str) -> list[TreatmentPhase]:
        try:
            data = json.loads(raw)
            return [
                TreatmentPhase(
                    phase_number=p.get("phase_number", i + 1),
                    week_range=p.get("week_range", p.get("week", "")),
                    title=p.get("title", ""),
                    focus=p.get("focus", ""),
                    goals=p.get("goals", []),
                    milestones=p.get("milestones", []),
                    restrictions=p.get("restrictions", []),
                    status=p.get("status", "upcoming"),
                )
                for i, p in enumerate(data)
                if isinstance(p, dict)
            ]
        except (json.JSONDecodeError, Exception) as exc:
            logger.warning("phases_parse_failed error=%s", exc)
            return []

    @staticmethod
    def _compute_weekly_adherence(reports: list[AdherenceReportRow]) -> list[int]:
        from collections import defaultdict
        from datetime import datetime, timedelta

        if not reports:
            return [0, 0, 0, 0]

        # Get date range from reports
        dates = []
        for report in reports:
            try:
                dt = datetime.fromisoformat(
                    report.reported_at_iso.replace("Z", "+00:00")
                )
                dates.append(dt)
            except (ValueError, Exception):
                continue

        if not dates:
            return [0, 0, 0, 0]

        # Find the most recent date and compute 4 weeks back from there
        max_date = max(dates)
        four_weeks_ago = max_date - timedelta(days=28)

        # Group reports by week number (relative to 4 weeks ago)
        weekly_data: dict[int, list[str]] = defaultdict(list)
        for report in reports:
            try:
                dt = datetime.fromisoformat(
                    report.reported_at_iso.replace("Z", "+00:00")
                )
                days_ago = (max_date - dt).days
                week_num = 3 - (days_ago // 7)  # 0 = oldest week, 3 = most recent
                if 0 <= week_num <= 3:
                    weekly_data[week_num].append(report.status)
            except (ValueError, Exception):
                continue

        # Build result for weeks 0-3
        result = []
        for week in range(4):
            statuses = weekly_data.get(week, [])
            if not statuses:
                result.append(0)
                continue
            done = statuses.count("done")
            partial = statuses.count("partial")
            total = len(statuses)
            adherence = int((done + partial * 0.5) / total * 100) if total > 0 else 0
            result.append(adherence)

        return result

    @staticmethod
    def _compute_activity_breakdown(
        reports: list[AdherenceReportRow],
    ) -> dict[str, int]:
        from collections import defaultdict

        activity_stats: dict[str, list[str]] = defaultdict(list)
        for report in reports:
            activity_stats[report.activity_type].append(report.status)

        breakdown = {}
        for activity, statuses in activity_stats.items():
            if not statuses:
                breakdown[activity] = 0
                continue
            done = statuses.count("done")
            partial = statuses.count("partial")
            total = len(statuses)
            breakdown[activity] = (
                int((done + partial * 0.5) / total * 100) if total > 0 else 0
            )

        return breakdown
