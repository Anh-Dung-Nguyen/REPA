const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /authors_papers_annotations:
 *     get:
 *         tags:
 *             - Author with papers and annotations
 *         summary: Get list of author with paper annotation
 *         responses:
 *             200:
 *                 description: List of author with paper annotation
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const results = await db.collection("authors_papers_annotations")
        .find({}, { projection: { _id: 0, "papers.paperId": 0 } })
        .toArray();
        res.json(results);
    } catch (err) {
        console.error("Error fetching authors papers annotations:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors_papers_annotations/{author_id}:
 *     get:
 *         tags:
 *             - Author with papers and annotations
 *         summary: Get list of paper with annotation by authorId
 *         parameters:
 *             - in: path
 *               name: author_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the author
 *         responses:
 *             200:
 *                 description: List of spaper with annotation by author
 *             404:
 *                 description: Not found
 */

router.get("/:author_id", async (req, res) => {
    try {
        const db = getDB();
        const authorId = req.params.author_id;

        const authorData = await db.collection("authors_papers_annotations")
            .findOne({ authorId }, { projection: { _id: 0, "papers.title": 1, "papers.annotation": 1, authorId: 1, name: 1 } });

        if (!authorData) {
            return res.status(404).json({ error: "No papers found for the given author ID" });
        }

        const enrichedPapers = await Promise.all(
            authorData.papers.map(async (paper) => {
                const paperDetails = await db.collection("papers_with_annotations")
                    .findOne(
                        { corpusid: Number(paper.annotation.corpusid) },
                        { projection: { _id: 0, year: 1, referencecount: 1, citationcount: 1, influentialcitationcount: 1, venue: 1, abstract: 1 } }
                    );

                return {
                    ...paper,
                    ...(paperDetails || {})
                };
            })
        );

        res.json({
            authorId: authorData.authorId,
            name: authorData.name,
            papers: enrichedPapers
        });

    } catch (err) {
        console.error("Error fetching enriched papers by author ID:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;