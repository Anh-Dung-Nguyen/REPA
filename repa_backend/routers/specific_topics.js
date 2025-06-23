const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /specific_topics:
 *     get:
 *         tags:
 *             - Specific topics
 *         summary: Get list of specific topics
 *         responses:
 *             200:
 *                 description: List of specific topics
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const specificTopics = await db.collection("specific_topics")
        .find({}, { projection: { _id: 0 } })
        .toArray();
        res.json(specificTopics);
    } catch (err) {
        console.error("Error fetching annotated papers:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /specific_topics/count:
 *     get:
 *         tags:
 *             - Specific topics
 *         summary: Get list of specific topics
 *         responses:
 *             200:
 *                 description: Number of specific topics
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: object
 *                       properties:
 *                         totalSpecificTopics:
 *                           type: integer
 *                           example: 120
 */

router.get("/count", async (req, res) => {
    try {
        const db = getDB();
        const specific_topics = await db.collection("specific_topics").countDocuments();
        res.json({specific_topics});
    } catch (err) {
        console.error("Error fetching annotated papers:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /specific_topics/topic_author_counts:
 *     get:
 *         tags:
 *             - Specific topics
 *         summary: Get number of author by topic
 *         responses:
 *             200:
 *                 description: Number of author by topic
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: object
 *                       properties:
 *                         count:
 *                           type: integer
 *                           example: 120
 *                         topic:
 *                           type: string
 *                           example: AI
 */

router.get('/topic_author_counts', async (req, res) => {
    try {
        const db = getDB();
        const result = await db.collection("author_specific_topics").aggregate([
            { $unwind: "$topics" },
            {
                $group: {
                    _id: "$topics",
                    uniqueAuthors: { $addToSet: "$authorId" }
                }
            },
            {
                $project: {
                    topic: "$_id",
                    count: { $size: "$uniqueAuthors" },
                    _id: 0
                }
            },
            { $sort: { count: -1 } }
        ]).toArray();

        res.json(result);
    } catch (err) {
        console.error("Error fetching topic author counts:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;