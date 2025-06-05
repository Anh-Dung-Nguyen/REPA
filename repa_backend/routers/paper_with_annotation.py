from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_paper_with_annotation():
    paper_with_annotation = db.papers_with_annotations.find({}, {"_id": 0})
    return list(paper_with_annotation)

@router.get("/{corpus_id}")
def get_paper_with_annotation(corpus_id: int):
    paper_with_annotation = db.papers_with_annotations.find_one({"corpusid": corpus_id}, {"_id": 0})

    if paper_with_annotation:
        return paper_with_annotation
    else:
        raise HTTPException(status_code = 404, detail = "No paper found with the given corpus ID")
