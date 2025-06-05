from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_authors_papers_annotations():
    authors_papers_annotations = db.authors_papers_annotations.find({}, {"_id": 0, "papers.paperId": 0})
    return list(authors_papers_annotations)

@router.get("/{author_id}")
def get_authors_papers_annotations(author_id: str):
    authors_papers_annotations = list(db.authors_papers_annotations.find({"authorId": author_id}, {"_id": 0, "papers.paperId": 0}))

    if authors_papers_annotations:
        return authors_papers_annotations
    else:
        raise HTTPException(status_code = 404, detail = "No papers found for the given corpus ID")