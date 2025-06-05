from fastapi import FastAPI
from repa_backend.routers import authors, papers, annotated_papers, paper_with_annotation, author_paper_topics, author_topics

app = FastAPI()

app.include_router(authors.router, prefix = "/authors", tags = ["Authors"])
app.include_router(papers.router, prefix = "/papers", tags = ["Papers"])
app.include_router(annotated_papers.router, prefix = "/annotated_papers", tags = ["Annotated_papers"])
app.include_router(paper_with_annotation.router, prefix = "/papers_with_annotations", tags = ["Papers_with_annotations"])
app.include_router(author_paper_topics.router, prefix = "/author_paper_topics", tags = ["Author_paper_topics"])
app.include_router(author_topics.router, prefix = "/author_topics", tags = ["Author_topics"])

@app.get("/")
def root():
    return {"message": "REPA backend is running"}