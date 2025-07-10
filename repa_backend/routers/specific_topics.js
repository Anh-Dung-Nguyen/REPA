const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 
const axios = require("axios");
const NodeCache = require("node-cache");

const cache = new NodeCache({ stdTTL: 3600});

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
 *                 default: 28
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
        const limit = parseInt(req.query.limit) || 28;
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
 *                 totalCount:
 *                   type: integer
 *                   example: 9227
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 */

router.get('/topic_author_counts', async (req, res) => {
    try {
        const db = getDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 60;
        const skip = (page - 1) * limit;

        const totalCount = await db.collection("specific_topics").countDocuments();
        const totalPages = Math.ceil(totalCount / limit);

        const topicsPage = await db.collection("specific_topics")
            .find({}, { projection: { _id: 0, topic: 1 } })
            .skip(skip)
            .limit(limit)
            .toArray();

        const topicNames = topicsPage.map(t => t.topic);

        const authorCounts = await db.collection("author_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $match: { topics: { $in: topicNames } } },
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
            }
            ]).toArray();

        const countsByTopic = {};
        authorCounts.forEach(item => {
            countsByTopic[item.topic] = item.count;
        });

        const result = topicNames.map(topic => ({
            topic,
            count: countsByTopic[topic] || 0
        }));

        res.json({
            topics: result,
            totalPages,
            totalCount,
            currentPage: page
        });

    } catch (err) {
        console.error("Error in topic_author_counts:", err);
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
 *                 totalCount:
 *                   type: integer
 *                   example: 9227
 *                 currentPage:
 *                   type: integer
 *                   example: 1
 */

router.get('/topic_corpus_counts', async (req, res) => {
    try {
        const db = getDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 60;
        const skip = (page - 1) * limit;

        const totalCount = await db.collection("specific_topics").countDocuments();
        const totalPages = Math.ceil(totalCount / limit);

        const topicsPage = await db.collection("specific_topics")
            .find({}, { projection: { _id: 0, topic: 1 } })
            .skip(skip)
            .limit(limit)
            .toArray();

        const topicNames = topicsPage.map(t => t.topic);

        const corpusCounts = await db.collection("corpus_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $match: { topics: { $in: topicNames } } },
            {
                $group: {
                _id: "$topics",
                uniqueCorpusIds: { $addToSet: "$_id" }
                }
            },
            {
                $project: {
                topic: "$_id",
                count: { $size: "$uniqueCorpusIds" },
                _id: 0
                }
            }
            ]).toArray();

        const countsByTopic = {};
        corpusCounts.forEach(item => {
            countsByTopic[item.topic] = item.count;
        });

        const result = topicNames.map(topic => ({
            topic,
            count: countsByTopic[topic] || 0
        }));

        res.json({
            topics: result,
            totalPages,
            totalCount,
            currentPage: page
        });

    } catch (err) {
        console.error("Error in topic_corpus_counts:", err);
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
            .find({ topic: { $regex: regex } })
            .project({ _id: 0 })
            .toArray();

        if (!matchedTopics.length) {
            return res.json({ specificTopics: [] });
        }

        const topicNames = matchedTopics.map(t => t.topic);

        const authorCounts = await db.collection("author_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $match: { topics: { $in: topicNames } } },
            { $group: { _id: "$topics", researcherCount: { $addToSet: "$_id" } } },
            { $project: { topic: "$_id", researcherCount: { $size: "$researcherCount" }, _id: 0 } }
        ]).toArray();

        const corpusCounts = await db.collection("corpus_specific_topics").aggregate([
            { $unwind: "$topics" },
            { $match: { topics: { $in: topicNames } } },
            { $group: { _id: "$topics", paperCount: { $addToSet: "$_id" } } },
            { $project: { topic: "$_id", paperCount: { $size: "$paperCount" }, _id: 0 } }
        ]).toArray();

        const countsByTopic = {};
        authorCounts.forEach(({ topic, researcherCount }) => {
            countsByTopic[topic] = { ...countsByTopic[topic], researcherCount };
        });
        corpusCounts.forEach(({ topic, paperCount }) => {
            countsByTopic[topic] = { ...countsByTopic[topic], paperCount };
        });

        let result = matchedTopics.map(t => ({
            topic: t.topic,
            researcherCount: countsByTopic[t.topic]?.researcherCount || 0,
            paperCount: countsByTopic[t.topic]?.paperCount || 0
        }));

        const lowerQuery = name.trim().toLowerCase();
        result.sort((a, b) => {
            const aStarts = a.topic.toLowerCase().startsWith(lowerQuery) ? -1 : 0;
            const bStarts = b.topic.toLowerCase().startsWith(lowerQuery) ? -1 : 0;
            return aStarts - bStarts;
        });

        res.json({ specificTopics: result });
    } catch (err) {
        console.error("Error searching specific topics with counts:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /specific_topics/topic_avg_hindex:
 *   get:
 *     tags:
 *       - Specific topics
 *     summary: Get average h-index of authors by topic (via API calls)
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
 *         description: Average h-index per topic
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
 *                       avg_hindex:
 *                         type: number
 *                 totalPages:
 *                   type: integer
 *                 totalCount:
 *                   type: integer
 *                 currentPage:
 *                   type: integer
 */

router.get('/topic_avg_hindex', async (req, res) => {
    try {
        const db = getDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 60;

        const totalCount = await db.collection('specific_topics').countDocuments();
        const totalPages = Math.ceil(totalCount / limit);

        const topicsDocs = await db.collection('specific_topics')
            .find({}, { projection: { _id: 0, topic: 1 } })
            .skip((page - 1) * limit)
            .limit(limit)
            .toArray();

        const topics = topicsDocs.map(doc => doc.topic);

        const topicHindexMap = {};
        topics.forEach(topic => topicHindexMap[topic] = []);

        let authorsPage = 1;
        const authorsPerPage = 500;
        let totalAuthorsPages = 1;

        do {
            const cacheKey = `authors_page_${authorsPage}`;

            let authorsData;
            if (cache.has(cacheKey)) {
                authorsData = cache.get(cacheKey);
            } else {
                const resp = await axios.get(`http://localhost:8000/authors?page=${authorsPage}&limit=${authorsPerPage}`);
                authorsData = resp.data;
                cache.set(cacheKey, authorsData);
            }

            if (authorsPage === 1 && authorsData.totalPages) {
                totalAuthorsPages = authorsData.totalPages;
            }

            const authors = authorsData.authors;

            for (const author of authors) {
                if (author.specific_topics && author.hindex != null) {
                    author.specific_topics.forEach(topic => {
                        if (topicHindexMap[topic] !== undefined) {
                            topicHindexMap[topic].push(author.hindex);
                        }
                    });
                }
            }

            authorsPage++;

        } while (authorsPage <= totalAuthorsPages);

            const result = Object.entries(topicHindexMap).map(([topic, hindexes]) => {
            const avg = hindexes.length
                ? Number((hindexes.reduce((a, b) => a + b, 0) / hindexes.length).toFixed(2))
                : 0;
            return { topic, avg_hindex: avg };
        });

        res.json({
            topics: result,
            totalPages,
            totalCount,
            currentPage: page
        });

    } catch (err) {
        console.error("Error in topic_avg_hindex:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;