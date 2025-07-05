const express = require("express");
const axios = require("axios");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /author_specific_topics:
 *     get:
 *         tags:
 *             - Author with specific topics
 *         summary: Get paginated list of authors with specific topics
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
 *                 description: Paginated list of author specific topics
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

        const [totalCount, topics] = await Promise.all([
            db.collection("author_specific_topics").countDocuments(),
            db.collection("author_specific_topics")
                .find({}, { projection: { _id: 0 } })
                .skip(skip)
                .limit(limit)
                .toArray()
        ]);

        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            topics,
            totalCount,
            totalPages,
            currentPage: page
        });
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

/**
 * @swagger
 * /author_specific_topics/filtered_author_paper_topics/author/{authorId}:
 *   get:
 *     tags:
 *       - Author with specific topics
 *     summary: Get filtered topics by authorId (only topics that exist in specific_topics)
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the author
 *     responses:
 *       200:
 *         description: Filtered list of topics by author
 *       500:
 *         description: Internal server error
 */

router.get('/filtered_author_paper_topics/author/:authorId', async (req, res) => {
    const { authorId } = req.params;

    try {
        const authorTopicsRes = await axios.get(`http://localhost:8000/author_paper_topics/author/${authorId}`);
        const authorPaperTopics = authorTopicsRes.data;

        const specificTopicsRes = await axios.get(`http://localhost:8000/specific_topics?page=1&limit=10000`);
        const allowedTopicsArray = specificTopicsRes.data.specificTopics.map(t => t.topic);
        const allowedTopicsSet = new Set(allowedTopicsArray.map(t => t.trim().toLowerCase()));

        const filtered = authorPaperTopics.map(paper => {
            const filteredTopics = (paper.topics || []).filter(topic =>
                allowedTopicsSet.has(topic.trim().toLowerCase())
            );
            return {
                ...paper,
                topics: filteredTopics
            };
        });


        res.json(filtered);
    } catch (error) {
        console.error('Error filtering topics:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /author_specific_topics/aggregate_author_topics/author/{authorId}:
 *   get:
 *     tags:
 *       - Author with specific topics
 *     summary: Get unique filtered topics for an author (only topics that exist in specific_topics)
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the author
 *     responses:
 *       200:
 *         description: Unique filtered topics by author
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorId:
 *                   type: string
 *                 topics:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Internal server error
 */

router.get('/aggregate_author_topics/author/:authorId', async (req, res) => {
    const { authorId } = req.params;

    try {
        const authorTopicsRes = await axios.get(`http://localhost:8000/author_paper_topics/author/${authorId}`);
        const authorPaperTopics = authorTopicsRes.data;

        const specificTopicsRes = await axios.get(`http://localhost:8000/specific_topics?page=1&limit=10000`);
        const allowedTopicsSet = new Set(specificTopicsRes.data.specificTopics.map(t => t.topic.trim().toLowerCase()));

        const allTopics = [];
        authorPaperTopics.forEach(paper => {
            (paper.topics || []).forEach(topic => {
                const cleanTopic = topic.trim().toLowerCase();
                if (allowedTopicsSet.has(cleanTopic)) {
                    allTopics.push(topic.trim());
                }
            });
        });

        const uniqueTopics = Array.from(new Set(allTopics)).sort((a, b) => a.localeCompare(b));

        res.json({
            authorId,
            topics: uniqueTopics
        });

    } catch (error) {
        console.error('Error aggregating author topics:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;