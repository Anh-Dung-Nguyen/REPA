const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /annotated_papers:
 *     get:
 *         tags:
 *             - Annotated papers
 *         summary: Get list of anotated papers
 *         responses:
 *             200:
 *                 description: List of annotated papers
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const annotatedPapers = await db.collection("annotated_papers")
            .find({}, { projection: { _id: 0 } })
            .toArray();
            res.json(annotatedPapers);
    } catch (err) {
        console.error("Error fetching annotated papers:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /annotated_papers/count:
 *     get:
 *         tags:
 *             - Annotated papers
 *         summary: Get the total number of annotated papers
 *         responses:
 *             200:
 *                 description: Total number of annotated papers
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: object
 *                       properties:
 *                         totalAnnotatedPapers:
 *                           type: integer
 *                           example: 120
 */

router.get("/count", async (req, res) => {
    try {
        const db = getDB();
        const totalAnnotatedPapers = await db.collection("annotated_papers").countDocuments();
        res.json({ totalAnnotatedPapers });
    } catch (err) {
        console.error("Error fetching author count:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /annotated_papers/{corpus_id}:
 *     get:
 *         tags:
 *             - Annotated papers
 *         summary: Get annotated papers by corpusId
 *         parameters:
 *             - in: path
 *               name: corpus_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the corpus annotated papers
 *         responses:
 *             200:
 *                 description: Annotated papers found
 *             404:
 *                 description: Not found
 */

router.get("/:corpus_id", async (req, res) => {
    try {
        const db = getDB();
        const corpusId = parseInt(req.params.corpus_id, 10);
        const annotatedPaper = await db.collection("annotated_papers")
            .findOne({ corpusid: corpusId }, { projection: { _id: 0 } });

        if (annotatedPaper) {
            res.json(annotatedPaper);
        } else {
            res.status(404).json({ error: "No annotated papers was found with the given corpus ID" });
        }
    } catch (err) {
        console.error("Error fetching annotated paper:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;