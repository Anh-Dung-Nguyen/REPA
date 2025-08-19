const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /corpus_topics:
 *     get:
 *         tags:
 *             - Corpus with topics
 *         summary: Get list of corpus with topic
 *         responses:
 *             200:
 *                 description: List of corpus with topic
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const topics = await db.collection("corpus_topics")
            .find({}, { projection: { _id: 0 } })
            .toArray();
        res.json(topics);
    } catch (err) {
        console.error("Error fetching corpus topics:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /corpus_topics/group_by_topic/{topic}:
 *   get:
 *     tags:
 *       - Corpus with topics
 *     summary: Get paginated corpusIds for a topic
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
 *         description: Paginated list of corpusIds for the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                   example: "1064 nm"
 *                 corpusIds:
 *                   type: array
 *                   items:
 *                     type: integer
 *                   example: [202699423, 219689746, 202700151]
 *                 total:
 *                   type: integer
 *                   description: Total number of corpusIds
 *                   example: 140
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

        const page = parseInt(req.query.page) || 1;
        const pageSize = parseInt(req.query.pageSize) || 10;

        const result = await db.collection('corpus_topics').aggregate([
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

        const allCorpusIds = result[0].corpusIds;
        const total = allCorpusIds.length;

        const start = (page - 1) * pageSize;
        const paginatedCorpusIds = allCorpusIds.slice(start, start + pageSize);

        res.json({
            topic,
            corpusIds: paginatedCorpusIds,
            total,
            page,
            pageSize
        });
    } catch (error) {
        console.error('Error fetching corpus by topic:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /corpus_topics/group_by_topic/{topic}/stats:
 *   get:
 *     tags:
 *       - Corpus with topics
 *     summary: Get stats (year, number of pages, citation count, reference count) for all corpusIds of a topic
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: The topic name to filter by
 *     responses:
 *       200:
 *         description: Statistics for corpusIds of the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                 corpusCount:
 *                   type: integer
 *                 averagePages:
 *                   type: number
 *                 totalCitations:
 *                   type: integer
 *                 totalReferences:
 *                   type: integer
 *                 details:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       corpusId:
 *                         type: integer
 *                       year:
 *                         type: integer
 *                       pages:
 *                         type: integer
 *                       citationCount:
 *                         type: integer
 *                       referenceCount:
 *                         type: integer
 *       404:
 *         description: Topic not found
 *       500:
 *         description: Internal server error
 */

router.get('/group_by_topic/:topic/stats', async (req, res) => {
    try {
        const db = getDB();
        const topic = req.params.topic;

        const result = await db.collection('corpus_topics').aggregate([
            { $match: { topics: topic } },
            {
                $group: {
                    _id: topic,
                    corpusIds: { $addToSet: "$corpusId" }
                }
            }
        ]).toArray();

        if (!result.length) {
            return res.status(404).json({ error: 'Topic not found' });
        }

        const corpusIds = result[0].corpusIds;

        if (!corpusIds.length) {
            return res.json({
                topic,
                corpusCount: 0,
                averagePages: 0,
                totalCitations: 0,
                totalReferences: 0,
                details: []
            });
        }

        const papers = await db.collection('papers_with_annotations').find(
            { corpusid: { $in: corpusIds } },
            { projection: { corpusid: 1, year: 1, citationcount: 1, referencecount: 1, "journal.pages": 1 } }
        ).toArray();

        let totalPages = 0;
        let totalCitations = 0;
        let totalReferences = 0;
        let details = [];

        for (const paper of papers) {
            let pagesCount = 0;
            if (paper.journal && paper.journal.pages) {
                const pages = paper.journal.pages.split('-');
                if (pages.length === 2) {
                    const start = parseInt(pages[0], 10);
                    const end = parseInt(pages[1], 10);
                    if (!isNaN(start) && !isNaN(end) && end >= start) {
                        pagesCount = end - start + 1;
                    }
                }
            }

            totalPages += pagesCount;
            totalCitations += paper.citationcount || 0;
            totalReferences += paper.referencecount || 0;

            details.push({
                corpusId: paper.corpusid,
                year: paper.year || null,
                pages: pagesCount,
                citationCount: paper.citationcount || 0,
                referenceCount: paper.referencecount || 0
            });
        }

        const averagePages = details.length ? totalPages / details.length : 0;

        res.json({
            topic,
            corpusCount: details.length,
            averagePages: Number(averagePages.toFixed(2)),
            totalCitations,
            totalReferences,
            details
        });
    } catch (error) {
        console.error('Error fetching corpus stats:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /corpus_topics/{corpus_id}:
 *     get:
 *         tags:
 *             - Corpus with topics
 *         summary: Get list of topic by corpusId
 *         parameters:
 *             - in: path
 *               name: corpus_id
 *               required: true
 *               schema:
 *                   type: string
 *               description: The ID of the corpus
 *         responses:
 *             200:
 *                 description: List of topic by corpus
 *             404:
 *                 description: Not found
 */

router.get("/:corpus_id", async (req, res) => {
    try {
        const db = getDB();
        const corpusId = parseInt(req.params.corpus_id);
        const topics = await db.collection("corpus_topics")
            .find({ corpusId }, { projection: { _id: 0 } })
            .toArray();

        if (topics.length > 0) {
            res.json(topics);
        } else {
            res.status(404).json({ error: "No papers found for the given corpus ID" });
        }
    } catch (err) {
        console.error("Error fetching author topics by corpus ID:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;