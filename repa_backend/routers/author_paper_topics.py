from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_author_paper_topic():
    author_paper_topic = db.author_paper_topics.find({}, {"_id": 0})
    return list(author_paper_topic)

@router.get("/corpus/{corpus_id}")
def get_author_paper_topic_by_corpus(corpus_id: int):
    author_paper_topics = db.author_paper_topics.find({"corpusId": corpus_id}, {"_id": 0, "paperId": 0})

    if author_paper_topics:
        return list(author_paper_topics)
    else:
        raise HTTPException(status_code = 404, detail="No papers found for the given corpus ID")


@router.get("/author/{author_id}")
def get_author_paper_topic_by_author(author_id: str):
    author_paper_topic = db.author_paper_topics.find({"authorId": author_id}, {"_id": 0, "paperId": 0})

    if author_paper_topic:
        return list(author_paper_topic)
    else:
        raise HTTPException(status_code = 404, detail = "No papers found for the given author ID")