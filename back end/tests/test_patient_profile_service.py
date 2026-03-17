from __future__ import annotations

from app.patient_profile_models import AllergyRecord
from app.patient_profile_models import BiomarkerTarget
from app.patient_profile_models import ConditionRecord
from app.patient_profile_models import PatientProfile
from app.patient_profile_models import TreatmentRecord
from app.patient_profile_service import BIOMARKER_TARGETS_STATE_KEY
from app.patient_profile_service import PATIENT_PROFILE_STATE_KEY
from app.patient_profile_service import PROFILE_AVAILABLE_STATE_KEY
from app.patient_profile_service import PatientProfileService


class _RepositoryStub:
    def __init__(self, profile: PatientProfile | None) -> None:
        self._profile = profile

    def get_by_user_id(self, _user_id: str) -> PatientProfile | None:
        return self._profile


def test_load_profile_context_returns_profile_state() -> None:
    profile = PatientProfile(
        user_id="patient-1",
        full_name="Demo User",
        conditions=[ConditionRecord(name="Type 2 diabetes", status="active")],
        treatments=[TreatmentRecord(name="Metformin", status="ongoing")],
        biomarker_targets=[
            BiomarkerTarget(biomarker="HbA1c", target="< 7.0", unit="%")
        ],
        allergies=["Penicillin"],
    )
    service = PatientProfileService(_RepositoryStub(profile))

    result = service.load_profile_context("patient-1")

    assert result.loaded is True
    assert result.state[PROFILE_AVAILABLE_STATE_KEY] is True
    assert result.state[PATIENT_PROFILE_STATE_KEY]["user_id"] == "patient-1"
    assert result.state[BIOMARKER_TARGETS_STATE_KEY][0]["biomarker"] == "HbA1c"
    assert "Biomarker targets" in (result.profile_summary or "")


def test_load_profile_context_returns_soft_fallback_when_missing() -> None:
    service = PatientProfileService(_RepositoryStub(None))

    result = service.load_profile_context("missing-user")

    assert result.loaded is False
    assert result.source == "none"
    assert result.state[PROFILE_AVAILABLE_STATE_KEY] is False
    assert "No saved patient profile found" in result.message


def test_load_profile_context_summarizes_structured_allergies() -> None:
    profile = PatientProfile(
        user_id="patient-2",
        full_name="Demo Structured",
        conditions=[ConditionRecord(name="Hypertension", status="active")],
        treatments=[TreatmentRecord(name="Amlodipine", status="ongoing")],
        biomarker_targets=[
            BiomarkerTarget(biomarker="Blood Pressure", target="<130/80", unit="mmHg")
        ],
        allergies=[
            AllergyRecord(allergen="Penicillin", reaction="Rash", severity="mild")
        ],
    )
    service = PatientProfileService(_RepositoryStub(profile))

    result = service.load_profile_context("patient-2")

    assert result.loaded is True
    assert (
        result.state[PATIENT_PROFILE_STATE_KEY]["allergies"][0]["allergen"]
        == "Penicillin"
    )
    assert "Allergies: Penicillin." in (result.profile_summary or "")
