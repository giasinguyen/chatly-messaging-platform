from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import StreamingResponse

from app.dependencies import get_file_service, get_request_context
from app.models.context import RequestContext
from app.models.file import FileListResponse, FileResponse
from app.services.file_service import FileService
from app.storage.minio import get_bucket_name, get_storage_client

router = APIRouter(prefix="/sessions/{session_id}", tags=["files"])


@router.post(
    "/files",
    response_model=FileResponse,
    summary="Upload file",
    description="Upload a file (PDF, DOCX, TXT, MD, CSV, JSON) to be indexed for RAG context.",
    responses={
        400: {"description": "Unsupported file type or session limit reached"},
        401: {"description": "Unauthorized"},
        404: {"description": "Session not found"},
        413: {"description": "File too large"},
    },
)
async def upload_file(
    session_id: str,
    file: UploadFile = File(...),  # noqa: B008
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: FileService = Depends(get_file_service),  # noqa: B008
) -> FileResponse:
    """Upload one file into a session for RAG context."""
    try:
        row = await service.upload_file(ctx.user_id, session_id, file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return FileResponse(**row)


@router.get(
    "/files",
    response_model=FileListResponse,
    summary="List files",
    description="List all files uploaded to a session.",
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "Session not found"},
    },
)
async def list_files(
    session_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: FileService = Depends(get_file_service),  # noqa: B008
) -> FileListResponse:
    """List uploaded files in one session for current user."""
    rows = await service.list_files(ctx.user_id, session_id)
    items = [FileResponse(**row) for row in rows]
    return FileListResponse(files=items, total=len(items))


@router.delete(
    "/files/{file_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete file",
    description="Delete a file and all associated vector chunks.",
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "File not found"},
    },
)
async def delete_file(
    session_id: str,
    file_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: FileService = Depends(get_file_service),  # noqa: B008
) -> Response:
    """Delete one uploaded file and related chunks."""
    try:
        await service.delete_file(ctx.user_id, session_id, file_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/files/{file_id}/content",
    summary="Download file",
    description="Stream the raw file bytes from storage with proper Content-Type headers.",
    responses={
        401: {"description": "Unauthorized"},
        404: {"description": "File not found"},
    },
)
async def download_file(
    session_id: str,
    file_id: str,
    ctx: RequestContext = Depends(get_request_context),  # noqa: B008
    service: FileService = Depends(get_file_service),  # noqa: B008
) -> StreamingResponse:
    """Download the raw bytes of one uploaded file."""
    try:
        row = await service.get_file(ctx.user_id, session_id, file_id)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    minio = get_storage_client()
    bucket = row.get("minio_bucket") or get_bucket_name()
    object_key = str(row.get("object_key", ""))
    mime_type = str(row.get("mime_type") or "application/octet-stream")
    filename = str(row.get("filename", "file"))

    try:
        response = minio.get_object(str(bucket), object_key)
    except Exception as exc:
        raise HTTPException(
            status_code=404, detail="File not found in storage"
        ) from exc

    return StreamingResponse(
        response,
        media_type=mime_type,
        headers={
            "Content-Disposition": f'inline; filename="{filename}"',
            "Cache-Control": "private, max-age=3600",
        },
    )
