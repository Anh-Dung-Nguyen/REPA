const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /corpus_specific_topics:
 *     get:
 *         tags:
 *             - Corpus with specific topics
 *         summary: Get list of corpus with specific topic
 *         responses:
 *             200:
 *                 description: List of corpus with specific topic
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const topics = await db.collection("corpus_specific_topics")
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
 * /corpus_specific_topics/group_by_topic:
 *   get:
 *     tags:
 *       - Corpus with specific topics
 *     summary: Get paginated list of topics with associated corpusIds
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 60
 *     responses:
 *       200:
 *         description: Paginated list of topics with their corpus IDs
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
 *                       corpusIds:
 *                         type: array
 *                         items:
 *                           type: string
 *                 totalCount:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 *       500:
 *         description: Internal server error
 */

router.get('/group_by_topic', async (req, res) => {
    try {
        const db = getDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 60;
        const skip = (page - 1) * limit;

        const aggregationPipeline = [
            { $unwind: "$topics" },
            {
                $group: {
                    _id: "$topics",
                    corpusIds: { $addToSet: "$corpusId" }
                }
            },
            {
                $project: {
                    _id: 0,
                    topic: "$_id",
                    corpusIds: 1
                }
            },
            { $sort: { topic: 1 } },
            {
                $facet: {
                    metadata: [{ $count: "total" }],
                    data: [{ $skip: skip }, { $limit: limit }]
                }
            }
        ];

        const results = await db.collection('corpus_specific_topics').aggregate(aggregationPipeline).toArray();

        const metadata = results[0].metadata[0] || { total: 0 };
        const totalCount = metadata.total;
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            topics: results[0].data,
            totalCount,
            totalPages,
            currentPage: page
        });
    } catch (error) {
        console.error('Error grouping corpus by topic:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /corpus_specific_topics/group_by_topic/{topic}:
 *   get:
 *     tags:
 *       - Corpus with specific topics
 *     summary: Get all corpusIds for a specific topic
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic name to filter by
 *     responses:
 *       200:
 *         description: List of corpusIds for the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                 corpusIds:
 *                   type: array
 *                   items:
 *                     type: string
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Internal server error
 */

router.get('/group_by_topic/:topic', async (req, res) => {
    try {
        const db = getDB();
        const topic = req.params.topic;

        const result = await db.collection('corpus_specific_topics').aggregate([
            { $match: { topics: topic } },
            {
                $group: {
                    _id: topic,
                    corpusIds: { $addToSet: "$corpusId" }
                }
            },
            {
                $project: {
                    _id: 0,
                    topic: "$_id",
                    corpusIds: 1
                }
            }
        ]).toArray();

        if (!result.length) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        res.json(result[0]);
    } catch (error) {
        console.error('Error fetching corpus by topic:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /corpus_specific_topics/{corpus_id}:
 *     get:
 *         tags:
 *             - Corpus with specific topics
 *         summary: Get list of specific topic by corpusId
 *         parameters:
 *             - in: path
 *               name: corpus_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the corpus
 *         responses:
 *             200:
 *                 description: List of specific topic by corpus
 *             404:
 *                 description: Not found
 */

router.get("/:corpus_id", async (req, res) => {
    try {
        const db = getDB();
        const corpusId = Number(req.params.corpus_id);
        const topics = await db.collection("corpus_specific_topics")
            .find({ corpusId }, { projection: { _id: 0 } })
            .toArray();

        if (topics.length > 0) {
            res.json(topics);
        } else {
            res.status(404).json({ error: "No result found for the given corpus ID" });
        }
    } catch (err) {
        console.error("Error fetching author specific topics by corpus ID:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;