from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_author_topics():
    author_topic = db.author_topics.find({}, {"_id": 0})
    return list(author_topic)

@router.get("/{author_id}")
def get_author_topics(author_id: str):
    author_topics = db.author_topics.find({"authorId": author_id}, {"_id": 0})

    if author_topics:
        return list(author_topics)
    else:
        raise HTTPException(status_code = 404, detail="No papers found for the given corpus ID")