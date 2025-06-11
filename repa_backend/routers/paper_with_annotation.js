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
 * /papers_with_annotations/latest_paper_title/{authorId}:
 *   get:
 *     tags:
 *       - Papers with annotations
 *     summary: Get latest paper title by authorId
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The author ID to search papers for
 *     responses:
 *       200:
 *         description: Latest paper title found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 title:
 *                   type: string
 *                   example: "Ontology-based model for trusted critical site supervision in FUSE-IT"
 *       404:
 *         description: No papers found for the author
 *       500:
 *         description: Internal server error
 */

router.get("/latest_paper_title/:authorId", async (req, res) => {
  try {
    const db = getDB();
    const authorId = req.params.authorId;

    const latestPaper = await db.collection("papers_with_annotations")
      .find({ "authors.authorId": authorId })
      .sort({ updated: -1 })
      .limit(1)
      .project({ _id: 0, title: 1})
      .next();

    if (!latestPaper) {
      return res.status(404).json({ error: "No papers found for this author" });
    }

    res.json({ title: latestPaper.title });
  } catch (error) {
    console.error("Error fetching latest paper title:", error);
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

/**
 * @swagger
 * /papers_with_annotations/url/{corpusid}:
 *   get:
 *     tags:
 *       - Papers with annotations
 *     summary: Get paper URL by corpusid
 *     parameters:
 *       - in: path
 *         name: corpusid
 *         required: true
 *         schema:
 *           type: string
 *         description: The Corpus ID to retrieve the paper URL for
 *     responses:
 *       200:
 *         description: Paper URL found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 corpusid:
 *                   type: integer
 *                   example: 199000349
 *                 url:
 *                   type: string
 *                   example: "https://www.semanticscholar.org/paper/78dc9426d7ac0d652aaf3dc1ace1250214375ce0"
 *       404:
 *         description: No paper found for the given corpusid
 *       500:
 *         description: Internal server error
 */

router.get("/url/:corpusid", async (req, res) => {
  try {
    const db = getDB();
    const corpusId = parseInt(req.params.corpusid, 10);

    const paper = await db.collection("papers_with_annotations")
      .findOne({ corpusid: corpusId }, { projection: { _id: 0, corpusid: 1, url: 1 } });

    if (!paper) {
      return res.status(404).json({ error: "No paper found for the given corpusid" });
    }

    res.json(paper);
  } catch (err) {
    console.error("Error fetching paper URL by corpusid:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
