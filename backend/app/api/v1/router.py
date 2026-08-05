from fastapi import APIRouter

from app.api.v1 import auth, tasks, teams, users

router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(teams.router)
router.include_router(tasks.router)
