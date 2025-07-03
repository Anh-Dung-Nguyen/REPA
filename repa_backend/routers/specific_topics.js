const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 
const axios = require("axios");

/**
 * @swagger
 * /specific_topics:
 *     get:
 *         tags:
 *             - Specific topics
 *         summary: Get list of specific topics
 *         parameters:
 *             - in: query
 *               name: page
 *               schema:
 *                 type: integer
 *                 default: 1
 *             - in: query
 *               name: limit
 *               schema:
 *                 type: integer
 *                 default: 60
 *         responses:
 *             200:
 *                 description: Paginated list of specific topics
 *                 content:
 *                     application/json:
 *                         schema:
 *                             type: object
 *                             properties:
 *                                 topics:
 *                                     type: array
 *                                 totalPages:
 *                                     type: integer
 *                                 totalCount:
 *                                     type: integer
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 60;
        const skip = (page - 1) * limit;

        const [totalCount, specificTopics] = await Promise.all([
            db.collection("specific_topics").countDocuments(),
            db.collection("specific_topics")
                .find({}, {projection: {_id: 0}})
                .skip(skip)
                .limit(limit)
                .toArray()
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({specificTopics, totalCount, totalPages, currentPage: page});
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

/**
 * @swagger
 * /specific_topics/topic_corpus_counts:
 *   get:
 *     tags:
 *       - Specific topics
 *     summary: Get number of corpus by topic
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
 *         description: Number of corpus per topic
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

router.get('/topic_corpus_counts', async (req, res) => {
    try {
        const db = getDB();

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 60;
        const skip = (page - 1) * limit;

        const totalCountResult = await db.collection("corpus_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $group: { _id: "$topics" } },
            { $count: "total" }
        ]).toArray();

        const totalCount = totalCountResult[0]?.total || 0;
        const totalPages = Math.ceil(totalCount / limit);

        const result = await db.collection("corpus_specific_topics").aggregate([
            { $unwind: "$topics" },
            {
                $group: {
                    _id: "$topics",
                    corpusIds: { $addToSet: "$_id" }
                }
            },
            {
                $project: {
                    topic: "$_id",
                    count: { $size: "$corpusIds" },
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

/**
 * @swagger
 * /specific_topics/search:
 *     get:
 *         tags:
 *             - Specific topics
 *         summary: Search specific topic by name
 *         parameters:
 *           - in: query
 *             name: name
 *             schema:
 *                 type: string
 *             required: true
 *             description: The name of the specific topic to search for
 *         responses:
 *             200:
 *                 description: List of matched specific topic
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: array
 *                       items:
 *                         type: object
 */

router.get("/search", async (req, res) => {
    try {
        const db = getDB();
        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "Missing or empty 'name' query parameter" });
        }

        const regex = new RegExp(name.trim(), "i");

        const matchedTopics = await db.collection("specific_topics")
            .find({ topic: { $regex: regex } }, { projection: { _id: 0, topic: 1 } })
            .toArray();

        if (!matchedTopics.length) {
            return res.json({ specific_topics: [] });
        }

        const topicNames = matchedTopics.map(t => t.topic);

        const authorCounts = await db.collection("author_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $match: { topics: { $in: topicNames } } },
            {
                $group: {
                    _id: "$topics",
                    researcherCount: { $addToSet: "$_id" }
                }
            },
            {
                $project: {
                    topic: "$_id",
                    researcherCount: { $size: "$researcherCount" },
                    _id: 0
                }
            }
        ]).toArray();

        const corpusCounts = await db.collection("corpus_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $match: { topics: { $in: topicNames } } },
            {
                $group: {
                    _id: "$topics",
                    paperCount: { $addToSet: "$_id" }
                }
            },
            {
                $project: {
                    topic: "$_id",
                    paperCount: { $size: "$paperCount" },
                    _id: 0
                }
            }
        ]).toArray();

        const countsByTopic = {};
        authorCounts.forEach(({ topic, researcherCount }) => {
            countsByTopic[topic] = { ...countsByTopic[topic], researcherCount };
        });
        corpusCounts.forEach(({ topic, paperCount }) => {
            countsByTopic[topic] = { ...countsByTopic[topic], paperCount };
        });

        const result = matchedTopics.map(t => ({
            topic: t.topic,
            researcherCount: countsByTopic[t.topic]?.researcherCount || 0,
            paperCount: countsByTopic[t.topic]?.paperCount || 0
        }));

        res.json({ specific_topics: result });
    } catch (err) {
        console.error("Error searching specific topics with counts:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /specific_topics/average_hindex:
 *   get:
 *     tags:
 *       - Specific topics
 *     summary: Get average H-Index per specific topic (paginated)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of topics per page
 *     responses:
 *       200:
 *         description: Success
 *       500:
 *         description: Internal server error
 */

router.get("/average_hindex", async (req, res) => {
    try {
        const db = getDB();

        const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
        const limit = parseInt(req.query.limit) > 0 ? parseInt(req.query.limit) : 10;

        const total = await db.collection("specific_topics").countDocuments();
        const totalPages = Math.ceil(total / limit);

        const topics = await db.collection("specific_topics")
            .find({}, { projection: { _id: 0, topic: 1 } })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        const results = [];

        for (const { topic } of topics) {
            const authorsRes = await axios.get('http://localhost:8000/authors');
            const authors = authorsRes.data.authors || [];

            const topicRegex = new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            
            const matchedAuthors = authors.filter(author => 
                author.specific_topic && topicRegex.test(author.specific_topic)
            );

            const hindexes = matchedAuthors.map(a => a.hindex || 0);
            const authorsCount = hindexes.length;

            let average_hindex = null;
            if (authorsCount > 0) {
                const sum = hindexes.reduce((acc, val) => acc + val, 0);
                average_hindex = parseFloat((sum / authorsCount).toFixed(2));
            }

            results.push({
                topic,
                average_hindex,
                authors_count: authorsCount
            });
        }

        res.json({
            page,
            limit,
            total,
            totalPages,
            results
        });
    } catch (err) {
        console.error("Error calculating average H-Index per topic:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;