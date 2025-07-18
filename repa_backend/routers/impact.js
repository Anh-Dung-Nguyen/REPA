const express = require("express");
const router = express.Router();
const { getDB } = require("../db");

/**
 * @swagger
 * /impact/impact_one_topic:
 *      get:
 *          tags:
 *              - Impact
 *          summary: Get list of impact
 *          responses:
 *              200:
 *                  description: List of impact
 */

router.get("/impact_one_topic", async (req, res) => {
    try {
        const db = getDB();
        const impact = await db.collection("impact_one_topic")
            .find({}, { projection: { _id: 0 } })
            .toArray()
        res.json(impact);
    } catch (error) {
        console.error("Error fetching impact: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /impact/impact_one_topic/{topic_id}:
 *   get:
 *     tags:
 *       - Impact
 *     summary: Get impact details for a specific topic by topic_id
 *     parameters:
 *       - in: path
 *         name: topic_id
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic_id to fetch
 *     responses:
 *       200:
 *         description: Impact details for one topic
 *       404:
 *         description: Topic not found
 */

router.get("/impact_one_topic/:topic_id", async (req, res) => {
    const topicId = req.params.topic_id;

    try {
        const db = getDB();
        const topic = await db.collection("impact_one_topic").findOne(
            { topic_id: topicId },
            { projection: { _id: 0 } }
        );

        if (!topic) {
            return res.status(404).json({ error: "Topic not found" });
        }

        res.json(topic);
    } catch (error) {
        console.error("Error fetching topic by topic_id: ", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;