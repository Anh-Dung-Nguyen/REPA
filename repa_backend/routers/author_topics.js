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
 * /author_topics/group_by_topic:
 *   get:
 *     tags:
 *       - Author with topics
 *     summary: Get paginated list of topics with associated authorIds
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
 *         description: Paginated list of topics with their authors
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
 *                       authorIds:
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
                    authorIds: { $addToSet: "$authorId" }
                }
            },
            {
                $project: {
                    _id: 0,
                    topic: "$_id",
                    authorIds: 1
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

        const results = await db.collection('author_topics').aggregate(aggregationPipeline).toArray();

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
        console.error('Error grouping authors by topic:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /author_topics/group_by_topic/{topic}:
 *   get:
 *     tags:
 *       - Author with topics
 *     summary: Get paginated authorIds for a topic
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic name to filter by
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Page number (starts from 1)
 *       - in: query
 *         name: pageSize
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *           minimum: 1
 *         description: Number of items per page
 *     responses:
 *       200:
 *         description: Paginated list of authorIds for the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                   example: "deep learning"
 *                 authorIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["12345", "67890", "112233"]
 *                 total:
 *                   type: integer
 *                   description: Total number of authorIds
 *                   example: 120
 *                 page:
 *                   type: integer
 *                   description: Current page number
 *                   example: 1
 *                 pageSize:
 *                   type: integer
 *                   description: Number of items per page
 *                   example: 10
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Internal server error
 */

router.get('/group_by_topic/:topic', async (req, res) => {
    try {
        const db = getDB();
        const topic = req.params.topic;
        const page = Number.parseInt(req.query.page, 10) > 0 ? Number(req.query.page) : 1;
        const pageSize = Number.parseInt(req.query.pageSize, 10) > 0 ? Number(req.query.pageSize) : 10;

        const MAX_PAGE_SIZE = 1000;
        const safePageSize = Math.min(pageSize, MAX_PAGE_SIZE);

        const pipeline = [
            { $match: { topics: topic } },              
            { $group: { _id: "$authorId" } },          
            { $sort: { _id: 1 } },                 
            {
                $facet: {
                    data: [
                        { $skip: (page - 1) * safePageSize },
                        { $limit: safePageSize },
                        { $project: { _id: 0, authorId: "$_id" } }
                    ],
                    total: [
                        { $count: "count" }                  
                    ]
                }
            }
        ];

        const [agg] = await db
            .collection('author_topics')
            .aggregate(pipeline, { allowDiskUse: true, maxTimeMS: 60_000 })
            .toArray();

        const total = (agg.total[0]?.count) || 0;
        const authorIds = agg.data.map(d => d.authorId);

        if (total === 0) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        res.json({
            topic,
            authorIds,
            total,
            page,
            pageSize: safePageSize
        });
    } catch (error) {
        console.error('Error fetching authors by topic:', error);
        res.status(500).json({ error: 'Internal server error' });
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