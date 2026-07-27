from database import Base, async_session, engine
from models import Feedback

import uuid
from datetime import datetime, timezone

from sqlalchemy import select


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def save_feedback(raw_text: str, sentiment: str, key_items: list[str], requires_action: bool) -> Feedback:
    async with async_session() as session:
        fb = Feedback(
            id=uuid.uuid4(),
            raw_text=raw_text,
            sentiment=sentiment,
            key_items=key_items,
            requires_action=requires_action,
            created_at=datetime.now(timezone.utc),
        )
        session.add(fb)
        await session.commit()
        await session.refresh(fb)
        return fb


async def get_all_feedback() -> list[Feedback]:
    async with async_session() as session:
        result = await session.execute(select(Feedback).order_by(Feedback.created_at.desc()))
        return list(result.scalars().all())