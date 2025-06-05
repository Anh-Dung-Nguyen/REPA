from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_author_specific_topics():
    author_specific_topic = db.author_specific_topics.find({}, {"_id": 0})
    return list(author_specific_topic)

@router.get("/{author_id}")
def get_author_specific_topics(author_id: str):
    author_specific_topics = db.author_specific_topics.find({"authorId": author_id}, {"_id": 0})

    if author_specific_topics:
        return list(author_specific_topics)
    else:
        raise HTTPException(status_code = 404, detail="No result found for the given author ID")