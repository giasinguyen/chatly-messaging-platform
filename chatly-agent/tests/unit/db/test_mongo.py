import pytest
from bson import ObjectId

from app.db.mongo import to_object_id, to_str_id


def test_to_str_id_converts_object_id_to_id() -> None:
    doc = {"_id": ObjectId(), "name": "test"}

    result = to_str_id(doc)

    assert result is not None
    assert "id" in result
    assert "_id" not in result


def test_to_object_id_returns_object_id_for_valid_string() -> None:
    oid = ObjectId()

    parsed = to_object_id(str(oid))

    assert parsed == oid


def test_to_object_id_raises_value_error_for_invalid_string() -> None:
    with pytest.raises(ValueError):
        to_object_id("invalid-id")
