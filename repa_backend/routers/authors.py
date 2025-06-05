from fastapi import APIRouter, HTTPException
from repa_backend.database import db

router = APIRouter()

@router.get("/")
def list_authors():
    authors = db.authors.find({}, {"_id": 0})
    return list(authors)

@router.get("/{author_id}")
def get_author(author_id: str):
    author = db.authors.find_one({"authorid": author_id}, {"_id": 0})
    if author:
        return author
    else:
        raise HTTPException(status_code = 404, detail = "No author found with the given author ID")
