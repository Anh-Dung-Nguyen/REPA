const express = require("express");
const router = express.Router();
const { getDB } = require("../db");
const axios = require("axios");
const { spawn } = require("child_process");
const path = require("path");

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

/**
 * @swagger
 * /impact/impact_group_topic/{authorId}:
 *   get:
 *     tags:
 *       - Impact
 *     summary: Calculate group impact factor for all topics of a specific author
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Author ID whose topic group impact factor will be calculated
 *     responses:
 *       200:
 *         description: Group impact calculation result
 *       500:
 *         description: Internal server error
 */

router.get("/impact_group_topic/:authorId", async (req, res) => {
    const { authorId } = req.params;

    try {
        const topicRes = await axios.get(`http://localhost:8000/author_specific_topics/aggregate_author_topics/author/${authorId}`);
        const topics = topicRes.data?.topics;

        if (!topics || topics.length === 0) {
            return res.status(404).json({ error: "No topics found for this author." });
        }

        const pythonScriptPath = path.resolve(__dirname, "../../Import_data/impact_topics.py");
        const pythonInterpreter = "/home/nguyen-anh-dung/mon_env/bin/python";
        const python = spawn(pythonInterpreter, [pythonScriptPath]);

        let output = "";
        let errOutput = "";

        python.stdout.on("data", (data) => {
            const str = data.toString();
            console.log("Python stdout:", str);
            output += str;
        });

        python.stderr.on("data", (data) => {
            const errStr = data.toString();
            console.error("Python stderr:", errStr);
            errOutput += errStr;
        });

        python.on("close", (code) => {
            if (code !== 0) {
                console.error("Python error:", errOutput);
                return res.status(500).json({ error: "Python script failed", details: errOutput });
            }

            try {
                const result = JSON.parse(output);

                if ('impact_factor' in result) {
                    return res.json({ impact_factor: result.impact_factor });
                } else {
                    return res.status(500).json({ error: "impact_factor not found in Python output" });
                }

            } catch (err) {
                res.status(500).json({ error: "Failed to parse Python output" });
            }
        });

        python.stdin.write(JSON.stringify({ topics }));
        python.stdin.end();

    } catch (err) {
        console.error("Error calculating group impact:", err);
        res.status(500).json({ error: "Failed to calculate group impact" });
    }
});

module.exports = router;