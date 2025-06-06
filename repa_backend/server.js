const express = require("express");
const { connectToDB, getDB } = require('./db');

const authorsRouter = require("./routers/authors");
const papersRouter = require("./routers/papers");
const annotatedPapersRouter = require("./routers/annotated_papers");
const papersWithAnnotationsRouter = require("./routers/paper_with_annotation");
const authorPaperTopicsRouter = require("./routers/author_paper_topics");
const authorTopicsRouter = require("./routers/author_topics");
const authorsPapersAnnotationsRouter = require("./routers/authors_papers_annotations");
const authorSpecificTopicsRouter = require("./routers/author_specific_topics");

const setupSwagger = require('./swagger');

const app = express();

app.use(express.json());

app.use("/authors", authorsRouter);               
app.use("/papers", papersRouter);                 
app.use("/annotated_papers", annotatedPapersRouter); 
app.use("/papers_with_annotations", papersWithAnnotationsRouter); 
app.use("/author_paper_topics", authorPaperTopicsRouter);         
app.use("/author_topics", authorTopicsRouter);                    
app.use("/authors_papers_annotations", authorsPapersAnnotationsRouter); 
app.use("/author_specific_topics", authorSpecificTopicsRouter); 

setupSwagger(app);

app.get("/", (req, res) => {
    res.json({ message: "REPA backend is running" });
});

const PORT = process.env.PORT || 8000;

connectToDB().then(() => {
    console.log('Connected to MongoDB');

    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}).catch((err) => {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
});