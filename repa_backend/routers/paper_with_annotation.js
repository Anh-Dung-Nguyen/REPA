const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /papers_with_annotations:
 *     get:
 *         tags:
 *             - Papers with annotations
 *         summary: Get list of paper with annotation
 *         responses:
 *             200:
 *                 description: List of paper with annotation
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const papersWithAnnotations = await db.collection("papers_with_annotations")
        .find({}, { projection: { _id: 0 } })
        .toArray();
        res.json(papersWithAnnotations);
    } catch (err) {
        console.error("Error fetching papers with annotations:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /papers_with_annotations/{corpus_id}:
 *     get:
 *         tags:
 *             - Papers with annotations
 *         summary: Get paper with annotation by corpusId
 *         parameters:
 *             - in: path
 *               name: corpus_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the corpus paper with annotation
 *         responses:
 *             200:
 *                 description: Paper with annotation found
 *             404:
 *                 description: Not found
 */

router.get("/:corpus_id", async (req, res) => {
    try {
        const db = getDB();
        const corpusId = parseInt(req.params.corpus_id, 10);
        const paperWithAnnotation = await db.collection("papers_with_annotations")
        .findOne({ corpusid: corpusId }, { projection: { _id: 0 } });

        if (paperWithAnnotation) {
        res.json(paperWithAnnotation);
        } else {
        res.status(404).json({ error: "No paper found with the given corpus ID" });
        }
    } catch (err) {
        console.error("Error fetching paper with annotation:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
