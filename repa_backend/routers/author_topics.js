const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /author_topics:
 *     get:
 *         tags:
 *             - Author with topics
 *         summary: Get list of author with topic
 *         responses:
 *             200:
 *                 description: List of author with topic
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const topics = await db.collection("author_topics")
            .find({}, { projection: { _id: 0 } })
            .toArray();
        res.json(topics);
    } catch (err) {
        console.error("Error fetching author topics:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /author_topics/{author_id}:
 *     get:
 *         tags:
 *             - Author with topics
 *         summary: Get list of topic by authorId
 *         parameters:
 *             - in: path
 *               name: author_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the author
 *         responses:
 *             200:
 *                 description: List of topic by author
 *             404:
 *                 description: Not found
 */

router.get("/:author_id", async (req, res) => {
    try {
        const db = getDB();
        const authorId = req.params.author_id;
        const topics = await db.collection("author_topics")
            .find({ authorId }, { projection: { _id: 0 } })
            .toArray();

        if (topics.length > 0) {
            res.json(topics);
        } else {
            res.status(404).json({ error: "No papers found for the given author ID" });
        }
    } catch (err) {
        console.error("Error fetching author topics by author ID:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;