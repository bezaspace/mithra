from __future__ import annotations

from fastapi import APIRouter, Query

from app.schedule_models import AdherenceReportRequest
from app.schedule_service import ScheduleService


def build_schedule_router(schedule_service: ScheduleService) -> APIRouter:
    router = APIRouter(prefix="/api/schedule", tags=["schedule"])

    @router.get("/today")
    async def get_today_schedule(
        user_id: str = Query(..., min_length=1),
        timezone: str | None = Query(default=None),
        date: str | None = Query(default=None),
    ) -> dict[str, object]:
        return schedule_service.get_today_schedule(
            user_id=user_id,
            timezone_name=timezone,
            date_str=date,
        )

    @router.post("/items/{schedule_item_id}/reports")
    async def submit_adherence_report(
        schedule_item_id: str,
        body: AdherenceReportRequest,
    ) -> dict[str, object]:
        return schedule_service.save_adherence_report(
            user_id=body.user_id,
            schedule_item_id=schedule_item_id,
            status=body.status,
            followed_plan=body.followed_plan,
            changes_made=body.changes_made,
            felt_after=body.felt_after,
            symptoms=body.symptoms,
            notes=body.notes,
            alert_level=body.alert_level,
            reported_at_iso=None,
            timezone_name=body.timezone,
        )

    @router.get("/items/{schedule_item_id}/reports")
    async def get_item_reports(
        schedule_item_id: str,
        user_id: str = Query(..., min_length=1),
        timezone: str | None = Query(default=None),
        date: str | None = Query(default=None),
    ) -> dict[str, object]:
        return schedule_service.list_reports_for_item(
            user_id=user_id,
            schedule_item_id=schedule_item_id,
            timezone_name=timezone,
            date_str=date,
        )

    return router
