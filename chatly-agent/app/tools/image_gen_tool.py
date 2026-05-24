"""Image generation tools using HuggingFace APIs (text-to-image and sticker)."""

import asyncio
import io
import json
import logging
import os
import tempfile
import uuid
from contextlib import suppress
from datetime import UTC, datetime
from datetime import timedelta
from typing import Any

import PIL.Image
from huggingface_hub import InferenceClient
from langchain_core.tools import BaseTool, tool
from minio import Minio

from app.config import settings
from app.repositories.file_repo import FileRepository

logger = logging.getLogger(__name__)

_FLUX_SCHNELL = "black-forest-labs/FLUX.1-schnell"
_STICKER_SPACE = "prithivMLmods/FLUX.2-Klein-LoRA-Studio"
_RATE_LIMIT_PHRASES = ("rate limit", "too many requests", "429", "quota exceeded")
_RATE_LIMIT_MSG = (
    "HuggingFace rate limit reached — the free-tier quota has been exceeded. "
    "Please wait a few minutes and try again."
)
_DEFAULT_IMAGE_URL_EXPIRY = timedelta(days=7)


def image_gen_available() -> bool:
    """True when a HuggingFace API key is configured."""
    return bool(settings.huggingface_api_key)


def _is_rate_limit(exc: Exception) -> bool:
    """Return True when the exception looks like a provider rate-limit error."""
    msg = str(exc).lower()
    return any(p in msg for p in _RATE_LIMIT_PHRASES)


def create_image_gen_tools(
    minio_client: Minio,
    bucket_name: str,
    file_repo: FileRepository,
    user_id: str,
    session_id: str,
    generated_attachments: list[dict[str, Any]],
) -> list[BaseTool]:
    """Create image generation tools scoped to the current session.

    ``generated_attachments`` is a mutable list. Each tool appends an
    attachment-metadata dict when it successfully saves a generated file, so
    ``ChatService`` can attach them to the assistant message without an extra
    DB round-trip.
    """
    hf_api_key = settings.huggingface_api_key

    async def _persist(
        image_bytes: bytes,
        filename: str,
        content_type: str,
    ) -> dict[str, Any]:
        """Upload ``image_bytes`` to MinIO and create a file record."""
        object_key = f"{user_id}/{session_id}/generated/{filename}"

        loop = asyncio.get_event_loop()

        def _upload() -> None:
            minio_client.put_object(
                bucket_name,
                object_key,
                data=io.BytesIO(image_bytes),
                length=len(image_bytes),
                content_type=content_type,
            )

        await loop.run_in_executor(None, _upload)

        metadata: dict[str, Any] = await file_repo.create(
            {
                "session_id": session_id,
                "user_id": user_id,
                "filename": filename,
                "mime_type": content_type,
                "size_bytes": len(image_bytes),
                "minio_bucket": bucket_name,
                "object_key": object_key,
                "source": "generated",
                "created_at": datetime.now(UTC),
            }
        )
        public_url: str = minio_client.presigned_get_object(
            bucket_name,
            object_key,
            expires=_DEFAULT_IMAGE_URL_EXPIRY,
        )
        attachment: dict[str, Any] = {
            "file_id": str(metadata["id"]),
            "filename": filename,
            "content_type": content_type,
            "size": len(image_bytes),
            "url": public_url,
        }
        generated_attachments.append(attachment)
        return attachment

    @tool
    async def generate_image(prompt: str) -> str:
        """Generate an image from a text description using FLUX.1-schnell.

        Use this when the user asks to create, draw, generate, or visualize an
        image from any description. Always translate and optimize the user's
        description to detailed English before calling — specific, vivid English
        prompts produce much better results.

        Args:
            prompt: Detailed English description of the image to generate.

        Returns:
            JSON string with the generated file metadata (file_id, filename,
            content_type, size), or a plain-text error message.
        """
        loop = asyncio.get_event_loop()

        def _run() -> PIL.Image.Image:
            client = InferenceClient(model=_FLUX_SCHNELL, token=hf_api_key)
            return client.text_to_image(  # type: ignore[return-value]
                prompt,
                num_inference_steps=4,
                width=1024,
                height=1024,
            )

        try:
            image = await loop.run_in_executor(None, _run)
        except Exception as exc:
            if _is_rate_limit(exc):
                return _RATE_LIMIT_MSG
            logger.exception("generate_image failed prompt=%r: %s", prompt, exc)
            return f"Image generation failed: {exc}"

        buf = io.BytesIO()
        image.save(buf, format="PNG")
        image_bytes = buf.getvalue()
        filename = f"image_{uuid.uuid4().hex[:8]}.png"

        try:
            att = await _persist(image_bytes, filename, "image/png")
        except Exception as exc:
            logger.exception("generate_image: failed to persist output: %s", exc)
            return f"Image was generated but could not be saved: {exc}"

        return json.dumps(att)

    @tool
    async def generate_sticker(file_id: str, expression: str) -> str:
        """Generate a chibi-style sticker from a photo the user has uploaded.

        Use this ONLY when the user has already uploaded a photo in this session
        and you have a concrete file_id (a 24-character hex string) from the upload
        response. Do NOT call this tool if the user has not uploaded a photo yet —
        ask them to upload one first. Never invent or guess a file_id.
        Translate and optimize the expression/style to English.

        Args:
            file_id: The 24-character hex file_id returned when the photo was uploaded.
            expression: English sticker style / emotion description, e.g.
                        "happy smiling, sparkling eyes, cute chibi character".

        Returns:
            JSON string with the generated sticker file metadata, or a plain-text
            error message.
        """
        import re

        if not re.fullmatch(r"[0-9a-fA-F]{24}", file_id):
            return (
                "No valid file_id was provided. "
                "Ask the user to upload a photo first, then retry with the file_id."
            )

        file_row = await file_repo.find_by_user_and_id(user_id, file_id)
        if file_row is None:
            return (
                f"File '{file_id}' was not found in this session. "
                "Please upload the photo first."
            )

        src_bucket = str(file_row.get("minio_bucket", bucket_name))
        src_key = str(file_row.get("object_key", ""))
        loop = asyncio.get_event_loop()

        # ── Download source photo to a local temp file ──────────────────────
        def _download() -> str:
            resp = minio_client.get_object(src_bucket, src_key)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                tmp.write(resp.read())
                return tmp.name

        try:
            src_tmp = await loop.run_in_executor(None, _download)
        except Exception as exc:
            logger.exception(
                "generate_sticker: download failed file_id=%s: %s", file_id, exc
            )
            return f"Could not retrieve the uploaded photo: {exc}"

        # ── Call FLUX.2 Klein via Gradio Space ───────────────────────────────
        sticker_prompt = (
            f"sticker art style, thick black outline, white background, "
            f"{expression}, chibi style, cute, vibrant colors"
        )

        def _generate(input_path: str) -> str:
            from gradio_client import Client, handle_file  # lazy import

            gc = Client(_STICKER_SPACE, token=hf_api_key)
            result = gc.predict(
                input_images=[{"image": handle_file(input_path), "caption": None}],
                prompt=sticker_prompt,
                style_name="None",
                seed=0,
                randomize_seed=True,
                guidance_scale=1.0,
                steps=4,
                api_name="/infer",
            )
            out = result[0]
            return str(out["path"] if isinstance(out, dict) else out)

        out_tmp: str | None = None
        try:
            out_tmp = await loop.run_in_executor(None, _generate, src_tmp)
        except Exception as exc:
            if _is_rate_limit(exc):
                return _RATE_LIMIT_MSG
            logger.exception("generate_sticker: generation failed: %s", exc)
            return f"Sticker generation failed: {exc}"
        finally:
            with suppress(OSError):
                os.unlink(src_tmp)

        # ── Read output file ─────────────────────────────────────────────────
        sticker_bytes: bytes
        try:
            with open(out_tmp, "rb") as fh:
                sticker_bytes = fh.read()
        except Exception as exc:
            logger.exception("generate_sticker: failed to read output: %s", exc)
            return f"Sticker was generated but could not be read: {exc}"
        finally:
            if out_tmp is not None:
                with suppress(OSError):
                    os.unlink(out_tmp)

        filename = f"sticker_{uuid.uuid4().hex[:8]}.png"
        try:
            att = await _persist(sticker_bytes, filename, "image/png")
        except Exception as exc:
            logger.exception("generate_sticker: failed to persist output: %s", exc)
            return f"Sticker was generated but could not be saved: {exc}"

        return json.dumps(att)

    return [generate_image, generate_sticker]  # type: ignore[return-value]
