from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from jose import JWTError, jwt

from auth import get_current_user, router as auth_router
from config import settings
from crud import get_all_feedback, init_db, save_feedback
from llm import analyze_review
from schemas import FeedbackRequest, FeedbackResponse
from websocket_manager import manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Restaurant Feedback System", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.post("/api/feedback")
async def submit_feedback(body: FeedbackRequest) -> FeedbackResponse:
    result = await analyze_review(body.raw_text)
    fb = await save_feedback(
        raw_text=body.raw_text,
        sentiment=result.get("sentiment", "Neutral"),
        key_items=result.get("key_items", []),
        requires_action=result.get("requires_action", False),
    )
    payload = FeedbackResponse(
        id=fb.id,
        raw_text=fb.raw_text,
        sentiment=fb.sentiment,
        key_items=fb.key_items if isinstance(fb.key_items, list) else [],
        requires_action=fb.requires_action,
        created_at=fb.created_at,
    )
    await manager.broadcast(payload.model_dump(mode="json"))
    return payload


@app.get("/api/insights")
async def get_insights(_=Depends(get_current_user)) -> list[FeedbackResponse]:
    records = await get_all_feedback()
    return [
        FeedbackResponse(
            id=fb.id,
            raw_text=fb.raw_text,
            sentiment=fb.sentiment,
            key_items=fb.key_items if isinstance(fb.key_items, list) else [],
            requires_action=fb.requires_action,
            created_at=fb.created_at,
        )
        for fb in records
    ]


@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str | None = None):
    if not token:
        await ws.close(code=4001)
        return
    try:
        jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        await ws.close(code=4001)
        return

    await manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(ws)


static_dir = Path(__file__).parent / "static"
if static_dir.is_dir():
    app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        file_path = static_dir / full_path
        if file_path.is_file():
            return FileResponse(str(file_path))
        index = static_dir / "index.html"
        if index.is_file():
            return FileResponse(str(index))
        return {"error": "not found"}