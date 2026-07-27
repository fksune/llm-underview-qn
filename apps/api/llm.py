import json
import logging

import httpx

from config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You analyze restaurant reviews and return JSON.
Respond with valid JSON only, no markdown, no extra text.
Format: {"sentiment": "Positive"|"Neutral"|"Negative", "key_items": ["item1", "item2"], "requires_action": true|false}
- requires_action must be true if the review mentions food poisoning, severe illness, health code violations, or threats of violence.
- key_items should list specific menu items, staff roles (e.g. "Server", "Chef"), or aspects (e.g. "Ambience", "Wait time") mentioned."""  # noqa: E501


async def analyze_review(text: str) -> dict:
    if not settings.groq_api_key:
        return {"sentiment": "Neutral", "key_items": [], "requires_action": False}

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.groq_api_key}",
                "Content-Type": "application/json",
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": text},
                ],
                "response_format": {"type": "json_object"},
                "temperature": 0,
            },
        )
        if resp.status_code != 200:
            logger.error("Groq API error %s: %s", resp.status_code, resp.text)
            return {"sentiment": "Neutral", "key_items": [], "requires_action": False}
        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        try:
            return json.loads(content)
        except json.JSONDecodeError:
            logger.error("Failed to parse LLM response: %s", content)
            return {"sentiment": "Neutral", "key_items": [], "requires_action": False}