from __future__ import annotations

from fastapi import APIRouter, Query

from app.dashboard_service import DashboardService


def build_dashboard_router(dashboard_service: DashboardService) -> APIRouter:
    router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

    @router.get("/{user_id}")
    async def get_dashboard(
        user_id: str,
        timezone: str | None = Query(default=None),
        date: str | None = Query(default=None),
    ) -> dict[str, object]:
        return dashboard_service.get_full_dashboard(
            user_id=user_id,
            timezone_name=timezone,
            date_str=date,
        )

    return router
