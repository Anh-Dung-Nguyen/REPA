from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_annotated_papers():
    annotated_paper = db.annotated_papers.find({}, {"_id": 0})
    return list(annotated_paper)

@router.get("/{corpus_id}")
def get_annotated_papers(corpus_id: int):
    annotated_paper = db.annotated_papers.find_one({"corpusid": corpus_id}, {"_id": 0})

    if annotated_paper:
        return annotated_paper
    else:
        raise HTTPException(status_code = 404, detail = "No annotated papers was found with the given corpus ID")
