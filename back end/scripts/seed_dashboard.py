#!/usr/bin/env python3
"""
Seed script for dashboard mock data.

This script populates the database with comprehensive mock data for a patient
(Rajesh Kumar) who has undergone knee replacement surgery. The data includes:
- Extended patient profile with surgery info and contacts
- Medical history with conditions, allergies, medications, and biomarkers
- Treatment plan with 4 phases and milestones
- Schedule items and adherence reports for progress tracking

Usage:
    python scripts/seed_dashboard.py

Or from the backend directory:
    python -m scripts.seed_dashboard
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

# Add the backend directory to the path
backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from sqlmodel import Session, SQLModel, create_engine

from app.dashboard_models import MilestoneRow, TreatmentPhaseStatus, TreatmentPlanRow
from app.patient_profile_models import PatientProfileRow
from app.schedule_models import AdherenceReportRow, ScheduleItemRow

# Database path - uses the same database as the main application
DB_PATH = backend_dir / "app" / "data" / "patient_profiles.db"
DB_URL = f"sqlite:///{DB_PATH}"

# ============================================================================
# Mock Patient Data
# ============================================================================

MOCK_PATIENT = {
    "user_id": "raksha-user",
    "full_name": "Rajesh Kumar",
    "age": 52,
    "sex": "Male",
    "phone": "+91 98765 43210",
    "email": "rajesh.kumar@email.com",
    "emergency_contact": {
        "name": "Priya Kumar",
        "relation": "Spouse",
        "phone": "+91 98765 43211",
    },
    "surgery_info": {
        "type": "Total Knee Replacement (Right)",
        "date": "2026-02-15",
        "reason": (
            "Severe osteoarthritis of right knee with grade 4 cartilage damage "
            "causing chronic pain, limited mobility, and inability to perform "
            "daily activities. Conservative treatments including physiotherapy, "
            "medications, and injections provided only temporary relief over "
            "the past 2 years."
        ),
        "surgeon": "Dr. Anand Mehta",
        "hospital": "Apollo Hospital, Delhi",
        "notes": "Uncomplicated surgery. Patient responded well to anesthesia. No intraoperative complications.",
    },
    "conditions": [
        {
            "name": "Osteoarthritis (Right Knee)",
            "status": "Post-surgical",
            "severity": "severe",
        },
        {
            "name": "Hypertension",
            "status": "Controlled with medication",
            "severity": "moderate",
        },
        {
            "name": "Type 2 Diabetes",
            "status": "Controlled with medication",
            "severity": "moderate",
        },
        {
            "name": "Hyperlipidemia",
            "status": "Controlled with medication",
            "severity": "mild",
        },
        {
            "name": "Obesity (BMI 29.5)",
            "status": "Under management",
            "severity": "moderate",
        },
    ],
    "treatments": [
        {
            "name": "Amlodipine",
            "status": "ongoing",
            "dosage": "5mg",
            "frequency": "Once daily",
            "purpose": "Blood pressure",
        },
        {
            "name": "Metformin",
            "status": "ongoing",
            "dosage": "500mg",
            "frequency": "Twice daily",
            "purpose": "Blood sugar",
        },
        {
            "name": "Atorvastatin",
            "status": "ongoing",
            "dosage": "10mg",
            "frequency": "Once daily (night)",
            "purpose": "Cholesterol",
        },
        {
            "name": "Aspirin",
            "status": "ongoing",
            "dosage": "75mg",
            "frequency": "Once daily",
            "purpose": "Blood thinner",
        },
    ],
    "allergies": [
        {"allergen": "Penicillin", "reaction": "Skin rash, hives", "severity": "mild"},
        {
            "allergen": "Sulfa drugs",
            "reaction": "Nausea, vomiting",
            "severity": "severe",
        },
    ],
    "contraindications": [
        "NSAIDs should be used with caution due to diabetes",
        "Avoid prolonged bed rest to prevent DVT",
    ],
    "family_history": [
        "Father had hypertension",
        "Mother had Type 2 diabetes",
    ],
    "biomarker_targets": [
        {
            "biomarker": "Blood Pressure",
            "value": "128/82",
            "target": "<130/80",
            "unit": "mmHg",
            "status": "normal",
            "rationale": "Hypertension management",
        },
        {
            "biomarker": "Fasting Glucose",
            "value": "118",
            "target": "<126",
            "unit": "mg/dL",
            "status": "borderline",
            "rationale": "Diabetes control",
        },
        {
            "biomarker": "HbA1c",
            "value": "6.8",
            "target": "<7.0",
            "unit": "%",
            "status": "normal",
            "rationale": "Long-term glucose control",
        },
        {
            "biomarker": "Total Cholesterol",
            "value": "195",
            "target": "<200",
            "unit": "mg/dL",
            "status": "normal",
            "rationale": "Cardiovascular risk reduction",
        },
        {
            "biomarker": "BMI",
            "value": "29.5",
            "target": "<25",
            "unit": "kg/m\u00b2",
            "status": "high",
            "rationale": "Weight management for joint health",
        },
    ],
    "notes": "Prioritize post-surgical rehabilitation while managing chronic conditions. Monitor blood sugar closely during recovery period.",
}

# ============================================================================
# Treatment Plan Data
# ============================================================================

TREATMENT_PLAN = {
    "user_id": "raksha-user",
    "surgery_type": "Total Knee Replacement (Right)",
    "start_date": "2026-02-15",
    "estimated_end_date": "2026-05-15",
    "current_phase": 2,
    "phases": [
        {
            "phase_number": 1,
            "week_range": "Weeks 1-2",
            "title": "Immediate Post-Op Recovery",
            "focus": "Pain management, wound care, gentle mobility",
            "goals": [
                "Manage pain effectively (target VAS < 4)",
                "Complete wound healing without infection",
                "Achieve 0-30 degree knee flexion",
                "Independent bed mobility",
                "Begin ankle pumps and quad sets",
            ],
            "milestones": [
                "Wound assessment passed",
                "Pain under control without IV medication",
                "First physiotherapy session completed",
            ],
            "restrictions": [
                "No weight-bearing without support",
                "No bending knee beyond 30 degrees",
                "Avoid sitting with legs crossed",
            ],
            "status": "completed",
        },
        {
            "phase_number": 2,
            "week_range": "Weeks 3-6",
            "title": "Early Rehabilitation",
            "focus": "Increasing range of motion, light strengthening",
            "goals": [
                "Achieve 0-90 degree knee flexion",
                "Walk with walker/crutches independently",
                "Begin seated leg raises and heel slides",
                "Reduce swelling significantly",
                "Transition to oral pain medications only",
            ],
            "milestones": [
                "90 degree flexion achieved",
                "Walker-assisted walking for 10 minutes",
                "Stair climbing with support initiated",
            ],
            "restrictions": [
                "No high-impact activities",
                "Use walking aid as prescribed",
                "Elevate leg when resting",
            ],
            "status": "active",
        },
        {
            "phase_number": 3,
            "week_range": "Weeks 7-12",
            "title": "Progressive Strengthening",
            "focus": "Building strength, improving gait, increasing endurance",
            "goals": [
                "Achieve 0-120 degree knee flexion",
                "Walk independently without assistive device",
                "Begin stationary cycling",
                "Complete household activities independently",
                "Achieve full weight-bearing tolerance",
            ],
            "milestones": [
                "Walk without assistive device",
                "Complete a full flight of stairs",
                "120 degree flexion achieved",
            ],
            "restrictions": [
                "Avoid running or jumping",
                "Use caution on uneven surfaces",
                "No deep squats",
            ],
            "status": "upcoming",
        },
        {
            "phase_number": 4,
            "week_range": "Weeks 13-24",
            "title": "Return to Normal Activities",
            "focus": "Functional training, activity-specific exercises",
            "goals": [
                "Full range of motion (0-135 degrees)",
                "Return to work and daily activities",
                "Swimming and low-impact exercise",
                "Maintain strength and flexibility",
                "Long-term joint health management",
            ],
            "milestones": [
                "Return to work",
                "Drive independently",
                "Complete recreational activities",
            ],
            "restrictions": [
                "Avoid contact sports",
                "Lifelong weight management recommended",
                "Regular follow-up appointments",
            ],
            "status": "upcoming",
        },
    ],
}

# ============================================================================
# Milestones Data (achieved milestones)
# ============================================================================

MILESTONES = [
    {
        "milestone": "Walker-assisted walking started",
        "achieved_date": "2026-02-25",
        "phase": 2,
    },
    {
        "milestone": "30 degree flexion achieved",
        "achieved_date": "2026-02-24",
        "phase": 1,
    },
    {
        "milestone": "Wound healing assessment passed",
        "achieved_date": "2026-02-22",
        "phase": 1,
    },
    {
        "milestone": "Pain managed without IV medication",
        "achieved_date": "2026-02-20",
        "phase": 1,
    },
    {
        "milestone": "First physiotherapy session",
        "achieved_date": "2026-02-17",
        "phase": 1,
    },
]

# ============================================================================
# Schedule Items Data
# ============================================================================

SCHEDULE_ITEMS = [
    {
        "id": "sched-dash-001",
        "activity_type": "medication",
        "title": "Morning Medications",
        "instructions": [
            "Take Metformin 500mg with breakfast",
            "Take Amlodipine 5mg with water",
            "Take Aspirin 75mg after food",
        ],
        "window_start_local": "07:00",
        "window_end_local": "07:30",
        "display_order": 1,
    },
    {
        "id": "sched-dash-002",
        "activity_type": "diet",
        "title": "Breakfast",
        "instructions": [
            "High-protein meal (eggs, dal, or paneer)",
            "Include whole grain (roti/oats)",
            "Fresh fruits - low glycemic index",
            "Warm water with lemon",
        ],
        "window_start_local": "07:30",
        "window_end_local": "08:15",
        "display_order": 2,
    },
    {
        "id": "sched-dash-003",
        "activity_type": "therapy",
        "title": "Morning Physiotherapy Session",
        "instructions": [
            "Heel slides - 3 sets of 15 reps",
            "Quad sets - 3 sets of 10 reps (hold 5 sec)",
            "Seated knee flexion - 3 sets of 10 reps",
            "Ankle pumps - 3 sets of 20 reps",
            "Short walks with walker - 10 minutes",
            "Ice application post-exercise - 15 min",
        ],
        "window_start_local": "09:00",
        "window_end_local": "10:00",
        "display_order": 3,
        "notes": "Home visit by physiotherapist",
    },
    {
        "id": "sched-dash-004",
        "activity_type": "checkup",
        "title": "Blood Sugar Check",
        "instructions": [
            "Check blood glucose level",
            "Log reading in diary",
            "Report if below 70 or above 180",
        ],
        "window_start_local": "10:30",
        "window_end_local": "11:00",
        "display_order": 4,
        "notes": "Fasting glucose target: 80-130 mg/dL",
    },
    {
        "id": "sched-dash-005",
        "activity_type": "diet",
        "title": "Lunch",
        "instructions": [
            "Balanced meal with protein and fiber",
            "Brown rice or roti (1-2 pieces)",
            "Vegetables and dal",
            "Avoid fried foods",
        ],
        "window_start_local": "12:30",
        "window_end_local": "13:15",
        "display_order": 5,
    },
    {
        "id": "sched-dash-006",
        "activity_type": "exercise",
        "title": "Afternoon Exercises",
        "instructions": [
            "Straight leg raises - 3 sets of 10 reps",
            "Standing hip abduction - 3 sets of 10 reps",
            "Calf raises - 3 sets of 10 reps",
            "Wall slides (partial) - 3 sets of 8 reps",
        ],
        "window_start_local": "14:00",
        "window_end_local": "14:30",
        "display_order": 6,
        "notes": "Do not exceed 90 degree knee flexion",
    },
    {
        "id": "sched-dash-007",
        "activity_type": "medication",
        "title": "Evening Medications",
        "instructions": [
            "Take Atorvastatin 10mg",
            "Take Metformin 500mg with snack",
            "Pain medication as needed (Diclofenac if required)",
        ],
        "window_start_local": "15:00",
        "window_end_local": "15:30",
        "display_order": 7,
    },
    {
        "id": "sched-dash-008",
        "activity_type": "activity",
        "title": "Evening Walk",
        "instructions": [
            "Walk with walker in house - 15 minutes",
            "Practice heel-toe walking pattern",
            "Rest if experiencing increased pain or swelling",
        ],
        "window_start_local": "17:00",
        "window_end_local": "17:30",
        "display_order": 8,
    },
    {
        "id": "sched-dash-009",
        "activity_type": "diet",
        "title": "Dinner",
        "instructions": [
            "Light dinner - avoid heavy meals",
            "Grilled or steamed vegetables",
            "Protein (fish/chicken/dal)",
            "Avoid carbohydrates after 7 PM",
        ],
        "window_start_local": "19:00",
        "window_end_local": "19:45",
        "display_order": 9,
    },
    {
        "id": "sched-dash-010",
        "activity_type": "sleep",
        "title": "Night Routine",
        "instructions": [
            "Apply ice pack to knee - 15 minutes",
            "Elevate leg on pillows",
            "Gentle ankle movements",
            "Blood sugar check before sleep",
        ],
        "window_start_local": "21:00",
        "window_end_local": "21:30",
        "display_order": 10,
    },
]


def generate_adherence_reports(user_id: str) -> list[dict]:
    """Generate 4 weeks of mock adherence reports for progress charts."""
    reports = []
    # Use current date as base to ensure recent data
    today = datetime.now(timezone.utc)
    base_date = today - timedelta(days=27)  # Start 4 weeks ago

    for week in range(4):
        for day in range(7):
            report_date = base_date + timedelta(weeks=week, days=day)
            if report_date > today:
                break

            # Include ALL schedule items for complete activity breakdown
            for item in SCHEDULE_ITEMS:
                if day < 2 and week == 0:
                    status = "done"
                elif day < 4:
                    status = "done" if (week + day) % 3 != 0 else "partial"
                else:
                    status = "done" if (week + day) % 4 != 0 else "skipped"

                reports.append(
                    {
                        "id": f"rep_{uuid4().hex[:16]}",
                        "user_id": user_id,
                        "schedule_item_id": item["id"],
                        "report_date_local": report_date.strftime("%Y-%m-%d"),
                        "activity_type": item["activity_type"],
                        "status": status,
                        "followed_plan": status == "done",
                        "changes_made": None
                        if status == "done"
                        else "Modified exercise intensity",
                        "felt_after": "Good" if status == "done" else "Tired",
                        "symptoms": None,
                        "notes": None,
                        "alert_level": "watch" if status == "skipped" else "none",
                        "summary": f"{item['title']}: {status}.",
                        "reported_at_iso": report_date.replace(
                            hour=7 + (item["display_order"] % 12), minute=0
                        ).isoformat(),
                        "conversation_turn_id": None,
                        "session_id": None,
                        "created_at": report_date.isoformat(),
                    }
                )

    return reports


def seed_database() -> None:
    """Seed the database with dashboard mock data."""
    print(f"Seeding dashboard data to: {DB_PATH}")

    connect_args = {"check_same_thread": False}
    engine = create_engine(DB_URL, connect_args=connect_args)

    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        # Insert or update patient profile
        patient = MOCK_PATIENT
        existing = (
            session.query(PatientProfileRow)
            .filter_by(user_id=patient["user_id"])
            .first()
        )

        if existing:
            print(f"Updating existing patient: {patient['user_id']}")
            existing.full_name = patient["full_name"]
            existing.age = patient["age"]
            existing.sex = patient["sex"]
            existing.phone = patient["phone"]
            existing.email = patient["email"]
            existing.emergency_contact_json = json.dumps(patient["emergency_contact"])
            existing.surgery_info_json = json.dumps(patient["surgery_info"])
            existing.conditions_json = json.dumps(patient["conditions"])
            existing.treatments_json = json.dumps(patient["treatments"])
            existing.allergies_json = json.dumps(patient["allergies"])
            existing.contraindications_json = json.dumps(patient["contraindications"])
            existing.family_history_json = json.dumps(patient["family_history"])
            existing.biomarker_targets_json = json.dumps(patient["biomarker_targets"])
            existing.notes = patient["notes"]
            existing.updated_at = datetime.now(timezone.utc).isoformat()
        else:
            print(f"Creating new patient: {patient['user_id']}")
            profile_row = PatientProfileRow(
                user_id=patient["user_id"],
                full_name=patient["full_name"],
                age=patient["age"],
                sex=patient["sex"],
                phone=patient["phone"],
                email=patient["email"],
                emergency_contact_json=json.dumps(patient["emergency_contact"]),
                surgery_info_json=json.dumps(patient["surgery_info"]),
                conditions_json=json.dumps(patient["conditions"]),
                treatments_json=json.dumps(patient["treatments"]),
                allergies_json=json.dumps(patient["allergies"]),
                contraindications_json=json.dumps(patient["contraindications"]),
                family_history_json=json.dumps(patient["family_history"]),
                biomarker_targets_json=json.dumps(patient["biomarker_targets"]),
                notes=patient["notes"],
            )
            session.add(profile_row)

        # Insert or update treatment plan
        plan = TREATMENT_PLAN
        existing_plan = (
            session.query(TreatmentPlanRow).filter_by(user_id=plan["user_id"]).first()
        )

        if existing_plan:
            print(f"Updating existing treatment plan for: {plan['user_id']}")
            existing_plan.surgery_type = plan["surgery_type"]
            existing_plan.start_date = plan["start_date"]
            existing_plan.estimated_end_date = plan["estimated_end_date"]
            existing_plan.current_phase = plan["current_phase"]
            existing_plan.phases_json = json.dumps(plan["phases"])
            existing_plan.updated_at = datetime.now(timezone.utc).isoformat()
        else:
            print(f"Creating new treatment plan for: {plan['user_id']}")
            plan_row = TreatmentPlanRow(
                user_id=plan["user_id"],
                surgery_type=plan["surgery_type"],
                start_date=plan["start_date"],
                estimated_end_date=plan["estimated_end_date"],
                current_phase=plan["current_phase"],
                phases_json=json.dumps(plan["phases"]),
            )
            session.add(plan_row)

        # Insert milestones
        for ms in MILESTONES:
            existing_ms = (
                session.query(MilestoneRow)
                .filter_by(user_id=plan["user_id"], milestone=ms["milestone"])
                .first()
            )

            if not existing_ms:
                milestone_row = MilestoneRow(
                    user_id=plan["user_id"],
                    milestone=ms["milestone"],
                    achieved_date=ms["achieved_date"],
                    phase=ms["phase"],
                )
                session.add(milestone_row)

        session.commit()
        print("Patient profile, treatment plan, and milestones seeded successfully!")

        # Insert schedule items using raw SQL (to avoid conflicts with existing schedule repo)
        for item in SCHEDULE_ITEMS:
            check_sql = text("SELECT COUNT(*) FROM schedule_items WHERE id = :id")
            result = session.execute(check_sql, {"id": item["id"]})
            count = result.scalar()

            if count == 0:
                insert_sql = text("""
                    INSERT INTO schedule_items (id, user_id, activity_type, title, instructions_json,
                        window_start_local, window_end_local, display_order, active, notes, created_at, updated_at)
                    VALUES (:id, :user_id, :activity_type, :title, :instructions_json,
                        :window_start_local, :window_end_local, :display_order, :active, :notes, :created_at, :updated_at)
                """)
                session.execute(
                    insert_sql,
                    {
                        "id": item["id"],
                        "user_id": plan["user_id"],
                        "activity_type": item["activity_type"],
                        "title": item["title"],
                        "instructions_json": json.dumps(item["instructions"]),
                        "window_start_local": item["window_start_local"],
                        "window_end_local": item["window_end_local"],
                        "display_order": item["display_order"],
                        "active": True,
                        "notes": item.get("notes"),
                        "created_at": datetime.now(timezone.utc).isoformat(),
                        "updated_at": datetime.now(timezone.utc).isoformat(),
                    },
                )

        # Insert adherence reports
        reports = generate_adherence_reports(plan["user_id"])
        for report in reports:
            check_sql = text("SELECT COUNT(*) FROM adherence_reports WHERE id = :id")
            result = session.execute(check_sql, {"id": report["id"]})
            count = result.scalar()

            if count == 0:
                insert_sql = text("""
                    INSERT INTO adherence_reports (id, user_id, schedule_item_id, report_date_local,
                        activity_type, status, followed_plan, changes_made, felt_after, symptoms, notes,
                        alert_level, summary, reported_at_iso, conversation_turn_id, session_id, created_at)
                    VALUES (:id, :user_id, :schedule_item_id, :report_date_local,
                        :activity_type, :status, :followed_plan, :changes_made, :felt_after, :symptoms, :notes,
                        :alert_level, :summary, :reported_at_iso, :conversation_turn_id, :session_id, :created_at)
                """)
                session.execute(insert_sql, report)

        session.commit()
        print(f"Schedule items ({len(SCHEDULE_ITEMS)}) seeded successfully!")
        print(f"Adherence reports ({len(reports)}) generated successfully!")
        print("\nDashboard mock data seeding complete!")
        print(
            f"\nYou can now access the dashboard at: http://localhost:8000/api/dashboard/{plan['user_id']}"
        )


if __name__ == "__main__":
    seed_database()
