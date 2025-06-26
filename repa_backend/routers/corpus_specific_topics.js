const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /corpus_specific_topics:
 *     get:
 *         tags:
 *             - Corpus with specific topics
 *         summary: Get list of corpus with specific topic
 *         responses:
 *             200:
 *                 description: List of corpus with specific topic
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const topics = await db.collection("corpus_specific_topics")
        .find({}, { projection: { _id: 0 } })
        .toArray();
        res.json(topics);
    } catch (err) {
        console.error("Error fetching author specific topics:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /corpus_specific_topics/{corpus_id}:
 *     get:
 *         tags:
 *             - Corpus with specific topics
 *         summary: Get list of specific topic by corpusId
 *         parameters:
 *             - in: path
 *               name: corpus_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the corpus
 *         responses:
 *             200:
 *                 description: List of specific topic by corpus
 *             404:
 *                 description: Not found
 */

router.get("/:corpus_id", async (req, res) => {
    try {
        const db = getDB();
        const corpusId = Number(req.params.corpus_id);
        const topics = await db.collection("corpus_specific_topics")
        .find({ corpusId }, { projection: { _id: 0 } })
        .toArray();

        if (topics.length > 0) {
        res.json(topics);
        } else {
        res.status(404).json({ error: "No result found for the given corpus ID" });
        }
    } catch (err) {
        console.error("Error fetching author specific topics by corpus ID:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;