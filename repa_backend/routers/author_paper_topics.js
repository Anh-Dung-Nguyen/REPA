const express = require("express");
const router = express.Router();
const { getDB } = require("../db");

/**
 * @swagger
 * /author_paper_topics:
 *   get:
 *     tags:
 *       - Author with papers and topics
 *     summary: Get paginated list of authors with papers and topics
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: List of authors with paper topics (paginated)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 page:
 *                   type: integer
 *                 limit:
 *                   type: integer
 *                 total:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();

        const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
        const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;
        const skip = (page - 1) * limit;

        const total = await db.collection("author_paper_topics").countDocuments();
        const totalPages = Math.ceil(total / limit);

        const data = await db.collection("author_paper_topics")
            .find({}, { projection: { _id: 0 } })
            .skip(skip)
            .limit(limit)
            .toArray();

        res.json({
            page,
            limit,
            total,
            totalPages,
            data
        });

    } catch (err) {
        console.error("Error fetching author paper topics:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /author_paper_topics/corpus/{corpus_id}:
 *     get:
 *         tags:
 *             - Author with papers and topics
 *         summary: Get list of author by corpusId
 *         parameters:
 *             - in: path
 *               name: corpus_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the corpus
 *         responses:
 *             200:
 *                 description: List of author by topic and paper found
 *             404:
 *                 description: Not found
 */

router.get("/corpus/:corpus_id", async (req, res) => {
    try {
        const db = getDB();
        const corpusId = parseInt(req.params.corpus_id, 10);
        const topics = await db.collection("author_paper_topics")
        .find({ corpusId }, { projection: { _id: 0, paperId: 0 } })
        .toArray();

        if (topics.length > 0) {
            res.json(topics);
        } else {
            res.status(404).json({ error: "No papers found for the given corpus ID" });
        }
    } catch (err) {
        console.error("Error fetching author paper topics by corpus:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /author_paper_topics/author/{author_id}:
 *     get:
 *         tags:
 *             - Author with papers and topics
 *         summary: Get list of paper and topic by authorId
 *         parameters:
 *             - in: path
 *               name: author_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the author
 *         responses:
 *             200:
 *                 description: List of paper and topic by author found
 *             404:
 *                 description: Not found
 */

router.get("/author/:author_id", async (req, res) => {
    try {
        const db = getDB();
        const authorId = req.params.author_id;
        const topics = await db.collection("author_paper_topics")
            .find({ authorId }, { projection: { _id: 0, paperId: 0 } })
            .toArray();

        if (topics.length > 0) {
            res.json(topics);
        } else {
            res.status(404).json({ error: "No papers found for the given author ID" });
        }
    } catch (err) {
        console.error("Error fetching author paper topics by author:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;