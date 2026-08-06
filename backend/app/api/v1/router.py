from fastapi import APIRouter

from app.api.v1 import auth, chat, tasks, teams, users

router = APIRouter()
router.include_router(auth.router)
router.include_router(users.router)
router.include_router(teams.router)
router.include_router(tasks.router)
# Sem prefixo proprio: o chat pendura rotas sob /times e sob /tarefas, porque
# a mesma conversa existe nos dois escopos.
router.include_router(chat.router)
