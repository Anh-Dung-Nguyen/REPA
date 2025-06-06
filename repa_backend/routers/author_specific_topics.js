const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /author_specific_topics:
 *     get:
 *         tags:
 *             - Author with specific topics
 *         summary: Get list of author with specific topic
 *         responses:
 *             200:
 *                 description: List of author with specific topic
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const topics = await db.collection("author_specific_topics")
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
 * /author_specific_topics/{author_id}:
 *     get:
 *         tags:
 *             - Author with specific topics
 *         summary: Get list of specific topic by authorId
 *         parameters:
 *             - in: path
 *               name: author_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the author
 *         responses:
 *             200:
 *                 description: List of specific topic by author
 *             404:
 *                 description: Not found
 */

router.get("/:author_id", async (req, res) => {
    try {
        const db = getDB();
        const authorId = req.params.author_id;
        const topics = await db.collection("author_specific_topics")
        .find({ authorId }, { projection: { _id: 0 } })
        .toArray();

        if (topics.length > 0) {
        res.json(topics);
        } else {
        res.status(404).json({ error: "No result found for the given author ID" });
        }
    } catch (err) {
        console.error("Error fetching author specific topics by author ID:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;