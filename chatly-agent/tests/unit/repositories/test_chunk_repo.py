import pytest
from mongomock_motor import AsyncMongoMockClient

from app.repositories.chunk_repo import ChunkRepository


@pytest.fixture
def chunk_repo() -> ChunkRepository:
    client = AsyncMongoMockClient()
    db = client["agent_server_test"]
    return ChunkRepository(collection=db["chunks"])


@pytest.mark.asyncio
async def test_delete_by_file_removes_only_target_file_chunks(
    chunk_repo: ChunkRepository,
) -> None:
    await chunk_repo.insert_many(
        [
            {
                "file_id": "file-a",
                "session_id": "s1",
                "user_id": "u1",
                "content": "a",
                "chunk_index": 0,
                "embedding": [0.1, 0.2],
            },
            {
                "file_id": "file-a",
                "session_id": "s1",
                "user_id": "u1",
                "content": "b",
                "chunk_index": 1,
                "embedding": [0.2, 0.3],
            },
            {
                "file_id": "file-b",
                "session_id": "s1",
                "user_id": "u1",
                "content": "c",
                "chunk_index": 0,
                "embedding": [0.3, 0.4],
            },
        ]
    )

    deleted = await chunk_repo.delete_by_file("file-a")
    remaining = await chunk_repo.count_by_session("s1")

    assert deleted == 2
    assert remaining == 1


@pytest.mark.asyncio
async def test_count_by_session_returns_zero_when_empty(
    chunk_repo: ChunkRepository,
) -> None:
    count = await chunk_repo.count_by_session("missing-session")
    assert count == 0


