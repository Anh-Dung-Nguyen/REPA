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
 * /author_specific_topics/group_by_topic:
 *   get:
 *     tags:
 *       - Author with specific topics
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

        const results = await db.collection('author_specific_topics').aggregate(aggregationPipeline).toArray();

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
 * /author_specific_topics/group_by_topic/{topic}:
 *   get:
 *     tags:
 *       - Author with specific topics
 *     summary: Get paginated authorIds for a specific topic
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
        const page = parseInt(req.query.page) > 0 ? parseInt(req.query.page) : 1;
        const pageSize = parseInt(req.query.pageSize) > 0 ? parseInt(req.query.pageSize) : 10;

        const result = await db.collection('author_specific_topics').aggregate([
            { $match: { topics: topic } },
            {
                $group: {
                    _id: topic,
                    authorIds: { $addToSet: "$authorId" }
                }
            },
            {
                $project: {
                    _id: 0,
                    topic: "$_id",
                    authorIds: 1
                }
            }
        ]).toArray();

        if (!result.length) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const allAuthorIds = result[0].authorIds;
        const total = allAuthorIds.length;

        const start = (page - 1) * pageSize;
        const end = start + pageSize;
        const paginatedAuthorIds = allAuthorIds.slice(start, end);

        res.json({
            topic: topic,
            authorIds: paginatedAuthorIds,
            total,
            page,
            pageSize
        });
    } catch (error) {
        console.error('Error fetching authors by topic:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /author_specific_topics/group_by_topic/{topic}/average_hindex:
 *   get:
 *     tags:
 *       - Author with specific topics
 *     summary: Get average h-index for all authors of a specific topic
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic name to filter by
 *     responses:
 *       200:
 *         description: Average h-index for authors of the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                 authorCount:
 *                   type: integer
 *                 averageHindex:
 *                   type: number
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Internal server error
 */

router.get('/group_by_topic/:topic/average_hindex', async (req, res) => {
    try {
        const db = getDB();
        const topic = req.params.topic;

        const topicResult = await db.collection('author_specific_topics').aggregate([
            { $match: { topics: topic } },
            {
                $group: {
                    _id: topic,
                    authorIds: { $addToSet: "$authorId" }
                }
            }
        ]).toArray();

        if (!topicResult.length) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const authorIds = topicResult[0].authorIds;

        if (!authorIds.length) {
            return res.json({
                topic,
                authorCount: 0,
                averageHindex: 0
            });
        }

        const authorsCollection = db.collection('authors');
        const authors = await authorsCollection.find(
            { authorid: { $in: authorIds } },
            { projection: { hindex: 1 } }
        ).toArray();

        const hindexes = authors.map(a => a.hindex || 0);
        const sumHindex = hindexes.reduce((sum, val) => sum + val, 0);
        const averageHindex = hindexes.length ? sumHindex / hindexes.length : 0;

        res.json({
            topic,
            authorCount: hindexes.length,
            averageHindex: Number(averageHindex.toFixed(2))
        });
    } catch (error) {
        console.error('Error calculating average hindex:', error.message);
        res.status(500).json({ error: 'Internal server error' });
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

/**
 * @swagger
 * /author_specific_topics/test/group_by_topic/{topic}/average_hindex:
 *   get:
 *     tags:
 *       - Author with specific topics
 *     summary: Get average h-index for all authors of a specific topic
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic name to filter by
 *     responses:
 *       200:
 *         description: Average h-index for authors of the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                 authorCount:
 *                   type: integer
 *                 averageHindex:
 *                   type: number
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Internal server error
 */

router.get('/test/group_by_topic/:topic/average_hindex', async (req, res) => {
  try {
    const topic = req.params.topic;
    const topicEncoded = encodeURIComponent(topic);
    const authorIds = [];
    let page = 1;
    const pageSize = 100;
    let totalAuthors = 0;

    while (true) {
      const url = `http://localhost:8000/author_specific_topics/group_by_topic/${topicEncoded}?page=${page}&pageSize=${pageSize}`;
      const response = await axios.get(url);
      if (response.status !== 200) {
        return res.status(500).json({ error: 'Failed to fetch author IDs from external API' });
      }

      const data = response.data;
      authorIds.push(...data.authorIds);
      totalAuthors = data.total;

      if (authorIds.length >= totalAuthors || data.authorIds.length === 0) {
        break;
      }
      page++;
      if(page > 1000) break;
    }

    if (authorIds.length === 0) {
      return res.status(404).json({ error: 'Topic not found or no authors for topic' });
    }

    const hindexPromises = authorIds.map(async (authorId) => {
      try {
        const resH = await axios.get(`http://localhost:8000/authors/hindex_per_topic/${authorId}`);
        const topicHindexObj = resH.data.hindexPerTopic.find(
          (t) => t.topic.toLowerCase() === topic.toLowerCase()
        );
        return topicHindexObj ? topicHindexObj.hindex : null;
      } catch (err) {
        console.warn(`Failed to fetch h-index for author ${authorId}: ${err.message}`);
        return null;
      }
    });

    const hindexResults = await Promise.all(hindexPromises);
    const filteredHindexes = hindexResults.filter((h) => h !== null);

    const totalHindex = filteredHindexes.reduce((sum, h) => sum + h, 0);
    const averageHindex = filteredHindexes.length ? totalHindex / filteredHindexes.length : 0;

    res.json({
      topic,
      authorCount: filteredHindexes.length,
      averageHindex: Number(averageHindex.toFixed(2)),
    });
  } catch (error) {
    console.error('Error calculating average hindex:', error.message);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;