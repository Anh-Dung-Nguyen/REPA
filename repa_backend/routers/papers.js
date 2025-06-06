const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /papers:
 *     get:
 *         tags:
 *             - Papers
 *         summary: Get list of papers
 *         responses:
 *             200:
 *                 description: List of papers
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const papers = await db.collection("papers")
        .find({}, { projection: { _id: 0 } })
        .toArray();
        res.json(papers);
    } catch (err) {
        console.error("Error fetching papers:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /papers/{corpus_id}:
 *     get:
 *         tags:
 *             - Papers
 *         summary: Get papers by corpusId
 *         parameters:
 *             - in: path
 *               name: corpus_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the corpus papers
 *         responses:
 *             200:
 *                 description: Papers found
 *             404:
 *                 description: Not found
 */

router.get("/:corpus_id", async (req, res) => {
    try {
        const db = getDB();
        const corpusId = parseInt(req.params.corpus_id, 10);
        const paper = await db.collection("papers")
        .findOne({ corpusid: corpusId }, { projection: { _id: 0 } });

        if (paper) {
        res.json(paper);
        } else {
        res.status(404).json({ error: "No papers found with the given corpus ID" });
        }
    } catch (err) {
        console.error("Error fetching paper:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;