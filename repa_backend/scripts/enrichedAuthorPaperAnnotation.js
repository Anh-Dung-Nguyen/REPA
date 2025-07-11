const { connectToDB, getDB } = require("../db");
const axios = require('axios');

const BATCH_SIZE = 500;

async function enrichAndPushAuthorsPapers() {
    await connectToDB();
    const db = getDB();

    console.log("Fetching topics for all authors...");
    const topicsApiRes = await axios.get(
        `http://localhost:8000/author_specific_topics/filtered_author_paper_topics/all`
    );
    const topicsList = topicsApiRes.data;

    const authorCorpusToTopics = new Map();
    topicsList.forEach(item => {
        const key = `${item.authorId}-${item.corpusId}`;
        authorCorpusToTopics.set(key, item.topics || []);
    });

    console.log("Starting streaming authors...");

    const cursor = db.collection("authors_papers_annotations").find(
        {},
        { projection: { _id: 0, "papers.title": 1, "papers.annotation": 1, authorId: 1, name: 1 } }
    );

    let bulkOps = [];
    let processedAuthors = 0;

    for await (const author of cursor) {
        const enrichedPapers = [];

        for (const paper of author.papers || []) {
            const corpusid = Number(paper.annotation?.corpusid);

            const paperDetails = await db.collection("papers_with_annotations").findOne(
                { corpusid },
                { projection: { _id: 0, year: 1, referencecount: 1, citationcount: 1, influentialcitationcount: 1, venue: 1, abstract: 1, authors: 1 } }
            );

            let numberOfCoAuthors = 0;
            if (paperDetails?.authors) {
                numberOfCoAuthors = paperDetails.authors.filter(a => a.authorId !== author.authorId).length;
            }

            const key = `${author.authorId}-${corpusid}`;
            const specificTopics = authorCorpusToTopics.get(key) || [];

            enrichedPapers.push({
                ...paper,
                ...(paperDetails || {}),
                numberOfCoAuthors,
                specificTopics
            });
        }

        bulkOps.push({
            updateOne: {
                filter: { authorId: author.authorId },
                update: {
                    $set: {
                        authorId: author.authorId,
                        name: author.name,
                        papers: enrichedPapers
                    }
                },
                upsert: true
            }
        });

        if (bulkOps.length >= BATCH_SIZE) {
            await db.collection("authors_papers_annotations").bulkWrite(bulkOps, { ordered: false });
            processedAuthors += bulkOps.length;
            console.log(`Processed ${processedAuthors} authors...`);
            bulkOps = [];
        }
    }

    if (bulkOps.length > 0) {
        await db.collection("authors_papers_annotations").bulkWrite(bulkOps, { ordered: false });
        processedAuthors += bulkOps.length;
        console.log(`Processed remaining ${bulkOps.length} authors.`);
    }

    console.log(`Done! Total authors processed: ${processedAuthors}`);

    await db.collection("authors_papers_annotations").createIndex({ authorId: 1 });
    console.log("Index on authorId created (if not already present).");
}

enrichAndPushAuthorsPapers()
    .then(() => console.log("Enrichment completed successfully."))
    .catch(err => console.error("Enrichment failed:", err));