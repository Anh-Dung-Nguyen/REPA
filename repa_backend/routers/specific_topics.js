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
 *   get:
 *     tags:
 *       - Specific topics
 *     summary: Get number of authors by topic
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number for pagination
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 60
 *         description: Number of topics per page
 *     responses:
 *       200:
 *         description: Number of authors per topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topics:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       topic:
 *                         type: string
 *                         example: AI
 *                       count:
 *                         type: integer
 *                         example: 120
 *                 totalPages:
 *                   type: integer
 *                   example: 154
 */

router.get('/topic_author_counts', async (req, res) => {
    try {
        const db = getDB();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 60;
        const skip = (page - 1) * limit;

        const totalCountResult = await db.collection("author_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $group: { _id: "$topics" } },
            { $count: "total" }
        ]).toArray();

        const totalCount = totalCountResult[0]?.total || 0;
        const totalPages = Math.ceil(totalCount / limit);

        const result = await db.collection("author_specific_topics").aggregate([
            { $unwind: "$topics" },
            {
                $group: {
                    _id: "$topics",
                    authors: { $addToSet: "$_id" }
                }
            },
            {
                $project: {
                    topic: "$_id",
                    count: { $size: "$authors" },
                    _id: 0
                }
            },
            { $sort: { count: -1 } },
            { $skip: skip },
            { $limit: limit }
        ]).toArray();

        res.json({
            topics: result,
            totalPages
        });

    } catch (err) {
        console.error("Error fetching topic author counts:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;