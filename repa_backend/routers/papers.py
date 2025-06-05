from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_papers():
    papers = db.papers.find({}, {"_id": 0})
    return list(papers)

@router.get("/{corpus_id}")
def get_papers(corpus_id: int):
    paper = db.papers.find_one({"corpusid": corpus_id}, {"_id": 0})

    if paper:
        return paper
    else:
        raise HTTPException(status_code = 404, detail = "No papers found with the given corpus ID")
