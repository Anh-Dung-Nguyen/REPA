const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getDB } = require("../db");
const NodeCache = require("node-cache");
const crypto = require("crypto");

const topicsCache = new NodeCache({ stdTTL: 3600});
const hashCache = new NodeCache({ stdTTL: 7200});

const createSearchHash = (text) => {
    return crypto.createHash('md5').update(text.toLowerCase().trim()).digest('hex');
};

/**
 * @swagger
 * /authors:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get a paginated list of authors (optionally filtered by name, authorId, or topic)
 *         parameters:
 *           - in: query
 *             name: page
 *             schema:
 *                 type: integer
 *             description: Page number (default is 1)
 *           - in: query
 *             name: limit
 *             schema:
 *                 type: integer
 *             description: Number of authors per page (default is 21)
 *           - in: query
 *             name: name
 *             schema:
 *                 type: string
 *             description: Filter authors by name (case-insensitive, partial match)
 *           - in: query
 *             name: authorId
 *             schema:
 *                 type: string
 *             description: Filter authors by exact author ID
 *           - in: query
 *             name: topic
 *             schema:
 *                 type: string
 *             description: Filter authors by topic
 *         responses:
 *             200:
 *               description: Paginated list of authors
 *               content:
 *                 application/json:
 *                   schema:
 *                     type: object
 *                     properties:
 *                       page:
 *                         type: integer
 *                       limit:
 *                         type: integer
 *                       total:
 *                         type: integer
 *                       totalPages:
 *                         type: integer
 *                       authors:
 *                         type: array
 *                         items:
 *                           type: object
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();

        const page = Math.max(1, parseInt(req.query.page)) || 1;
        const limit = Math.max(1, parseInt(req.query.limit)) || 21;
        const skip = (page - 1) * limit;

        const name = req.query.name?.trim();
        const authorId = req.query.authorId?.trim();
        const topic = req.query.topic?.trim();

        let query = {};
        let authorIds = [];

        if (authorId) {
            query = { authorid: authorId };
        } else if (name) {
            const searchHash = createSearchHash(name);
            const cacheKey = `name_search_${searchHash}`;
            
            let cachedResults = hashCache.get(cacheKey);
            if (!cachedResults) {
                const nameResults = await db.collection("authors").aggregate([
                    {
                        $match: {
                            name: { $regex: new RegExp(name, "i") }
                        }
                    },
                    { $project: { authorid: 1, _id: 0 } },
                    { $limit: 10000 }
                ]).toArray();
                
                cachedResults = nameResults.map(r => r.authorid);
                hashCache.set(cacheKey, cachedResults);
            }
            
            if (cachedResults.length === 0) {
                return res.json({
                    page, limit, total: 0, totalPages: 0, authors: []
                });
            }
            
            authorIds = cachedResults;
            query = { authorid: { $in: authorIds } };
        } else if (topic) {
            try {
                const topicResults = await axios.get(`http://localhost:8000/author_topics/group_by_topic`, {
                    params: { topic: topic }
                });
                
                if (!topicResults.data || !topicResults.data.authors) {
                    return res.json({
                        page, limit, total: 0, totalPages: 0, authors: []
                    });
                }
                
                authorIds = topicResults.data.authors.map(a => a.authorId);
                if (authorIds.length === 0) {
                    return res.json({
                        page, limit, total: 0, totalPages: 0, authors: []
                    });
                }
                
                query = { authorid: { $in: authorIds } };
            } catch (error) {
                console.error('Error fetching authors by topic:', error);
                return res.status(500).json({ error: "Error filtering by topic" });
            }
        }

        let authors, total;
        
        if (Object.keys(query).length === 0) {
            [authors, total] = await Promise.all([
                db.collection("authors")
                    .find({}, { projection: { _id: 0, authorid: 1, name: 1, hindex: 1, papercount: 1, citationcount: 1 } })
                    .skip(skip).limit(limit).toArray(),
                db.collection("authors").countDocuments({})
            ]);
        } else {
            if (name && authorIds.length > 0) {
                const relevantIds = authorIds.slice(skip, skip + limit);
                authors = await db.collection("authors")
                    .find(
                        { authorid: { $in: relevantIds } },
                        { projection: { _id: 0, authorid: 1, name: 1, hindex: 1, papercount: 1, citationcount: 1 } }
                    ).toArray();
                
                const idToAuthor = new Map(authors.map(a => [a.authorid, a]));
                authors = relevantIds.map(id => idToAuthor.get(id)).filter(Boolean);
                total = authorIds.length;
            } else {
                [authors, total] = await Promise.all([
                    db.collection("authors")
                        .find(query, { projection: { _id: 0, authorid: 1, name: 1, hindex: 1, papercount: 1, citationcount: 1 } })
                        .skip(skip).limit(limit).toArray(),
                    db.collection("authors").countDocuments(query)
                ]);
            }
        }

        const authorIdList = authors.map(a => a.authorid);

        const latestPapers = await db.collection("papers_with_annotations").aggregate([
            { $match: { "authors.authorId": { $in: authorIdList } } },
            { $unwind: "$authors" },
            { $match: { "authors.authorId": { $in: authorIdList } } },
            { $sort: { updated: -1 } },
            {
                $group: {
                    _id: "$authors.authorId",
                    latestTitle: { $first: "$title" }
                }
            }
        ]).toArray();
        const paperMap = new Map(latestPapers.map(r => [r._id, r.latestTitle]));

        const topicsDocs = await db.collection("author_topics")
            .find({ authorId: { $in: authorIdList } })
            .toArray();

        const topicsMap = new Map(
            topicsDocs.map(doc => [doc.authorId, doc.topics || []])
        );

        authorIdList.forEach(id => {
            if (!topicsMap.has(id)) {
                topicsMap.set(id, []);
            }
        });

        const papers = await db.collection("papers_with_annotations")
            .find({ "authors.authorId": { $in: authorIdList } }, { projection: { authors: 1 } })
            .toArray();

        const coauthorMap = new Map();
        for (const authorId of authorIdList) {
            coauthorMap.set(authorId, new Set());
        }
        for (const paper of papers) {
            const idsInPaper = (paper.authors || []).map(a => a.authorId);
            for (const id of idsInPaper) {
                if (coauthorMap.has(id)) {
                    for (const coId of idsInPaper) {
                        if (coId !== id) {
                            coauthorMap.get(id).add(coId);
                        }
                    }
                }
            }
        }

        const allCoauthorIds = Array.from(new Set(
            Array.from(coauthorMap.values()).flatMap(set => Array.from(set))
        ));

        const coauthorDetails = await db.collection("authors")
            .find({ authorid: { $in: allCoauthorIds } },
                  { projection: { _id: 0, authorid: 1, name: 1, hindex: 1, papercount: 1 } })
            .toArray();
        const coauthorDetailMap = new Map(coauthorDetails.map(c => [c.authorid, c]));

        const capitalizeFirst = str => str.charAt(0).toUpperCase() + str.slice(1);

        const enrichedAuthors = authors.map(author => {
            const latestTitle = paperMap.get(author.authorid) || null;
            const topics = topicsMap.get(author.authorid) || [];
            const coauthorIds = coauthorMap.get(author.authorid) || new Set();

            const coauthors = Array.from(coauthorIds)
                .map(id => coauthorDetailMap.get(id))
                .filter(Boolean);

            return {
                ...author,
                latest_paper_title: latestTitle,
                topic: topics.map(capitalizeFirst).join(", "),
                topic_count: topics.length,
                unique_coauthors_count: coauthors.length,
                coauthors
            };
        });

        res.json({
            page, limit, total,
            totalPages: Math.ceil(total / limit),
            authors: enrichedAuthors
        });

    } catch (err) {
        console.error("Error fetching enriched authors:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors/count:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get the total number of authors
 *         responses:
 *             200:
 *                 description: Total number of authors
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: object
 *                       properties:
 *                         totalAuthors:
 *                           type: integer
 *                           example: 120
 */

router.get("/count", async (req, res) => {
    try {
        const db = getDB();
        const totalAuthors = await db.collection("authors").countDocuments();
        res.json({ totalAuthors });
    } catch (err) {
        console.error("Error fetching author count:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors/{author_id}/coauthors/count:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get the number of unique co-authors for a specific author
 *         parameters:
 *           - in: path
 *             name: author_id
 *             required: true
 *             schema:
 *                 type: string
 *             description: The ID of the author
 *         responses:
 *             200:
 *                 description: Number of unique co-authors
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: object
 *                       properties:
 *                         uniqueCoauthors:
 *                           type: integer
 *                           example: 42
 *             404:
 *                 description: Author not found or no papers
 */

router.get("/:author_id/coauthors/count", async (req, res) => {
    try {
        const db = getDB();
        const authorId = req.params.author_id;

        const papers = await db.collection("papers_with_annotations")
            .find({ "authors.authorId": authorId }, { projection: { authors: 1 } })
            .toArray();

        if (!papers.length) {
            return res.status(404).json({ error: "No papers found for the given author ID" });
        }

        const coauthorSet = new Set();

        for (const paper of papers) {
            if (paper.authors) {
                paper.authors.forEach((author) => {
                    if (author.authorId !== authorId) {
                        coauthorSet.add(author.authorId);
                    }
                });
            }
        }

        res.json({ uniqueCoauthors: coauthorSet.size });
    } catch (err) {
        console.error("Error counting co-authors:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors/{author_id}/coauthors:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get list of unique co-authors for a specific author
 *         parameters:
 *           - in: path
 *             name: author_id
 *             required: true
 *             schema:
 *                 type: string
 *             description: The ID of the author
 *         responses:
 *             200:
 *                 description: List of unique co-authors
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           authorid:
 *                             type: string
 *                             example: "123456"
 *                           name:
 *                             type: string
 *                             example: "Jane Doe"
 *             404:
 *                 description: Author not found or no papers
 */

router.get("/:author_id/coauthors", async (req, res) => {
    try {
        const db = getDB();
        const authorId = req.params.author_id;

        const papers = await db.collection("papers_with_annotations")
            .find({ "authors.authorId": authorId }, { projection: { authors: 1 } })
            .toArray();

        if (!papers.length) {
            return res.status(404).json({ error: "No papers found for the given author ID" });
        }

        const coauthorIds = new Set();

        for (const paper of papers) {
            if (paper.authors) {
                paper.authors.forEach((author) => {
                    if (author.authorId !== authorId) {
                        coauthorIds.add(author.authorId);
                    }
                });
            }
        }

        const coauthors = await db.collection("authors")
            .find({ authorid: { $in: Array.from(coauthorIds) } }, { projection: { _id: 0, authorid: 1, name: 1 } })
            .toArray();

        res.json(coauthors);
    } catch (err) {
        console.error("Error fetching co-authors:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors/search:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Search authors by name or author ID with hash optimization
 *         parameters:
 *           - in: query
 *             name: query
 *             schema:
 *                 type: string
 *             required: true
 *             description: The name or author ID to search for
 *         responses:
 *             200:
 *                 description: List of matched authors
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
        const { query: searchQuery } = req.query;
        
        if (!searchQuery || searchQuery.trim() === "") {
            return res.status(400).json({ error: "Missing or empty 'query' parameter" });
        }
        
        const trimmedQuery = searchQuery.trim();
        const searchHash = createSearchHash(trimmedQuery);
        const cacheKey = `authors_search_${searchHash}`;
        const cached = hashCache.get(cacheKey);
        
        if (cached) {
            return res.json({ authors: cached });
        }
        
        let authors = [];
        
        if (/^[a-zA-Z0-9]+$/.test(trimmedQuery)) {
            const exactMatch = await db.collection("authors")
                .findOne({ authorid: trimmedQuery }, { projection: { _id: 0 } });
            if (exactMatch) {
                authors = [exactMatch];
            }
        }
        
        if (authors.length === 0) {
            const pipeline = [
                {
                    $match: {
                        name: { $regex: new RegExp(trimmedQuery, "i") }
                    }
                },
                { $project: { _id: 0 } },
                { $limit: 50 },
                { $sort: { hindex: -1, citationcount: -1 } }
            ];
            authors = await db.collection("authors").aggregate(pipeline).toArray();
        }
        
        const enrichedAuthors = await Promise.all(authors.map(async (author) => {
            const authorId = author.authorid;
            
            const papers = await db.collection("papers_with_annotations")
                .find({ "authors.authorId": authorId }, { projection: { authors: 1, title: 1 } })
                .toArray();
            
            const latestPaper = papers.length > 0 ? papers[0] : null;
            
            const coauthorSet = new Set();
            if (papers && Array.isArray(papers)) {
                papers.forEach(paper => {
                    if (paper.authors && Array.isArray(paper.authors)) {
                        paper.authors.forEach(a => {
                            if (a.authorId && a.authorId !== authorId) {
                                coauthorSet.add(a.authorId);
                            }
                        });
                    }
                });
            }
            
            const specificTopicEntry = await db.collection("author_topics")
                .findOne({ authorId: authorId });
            
            function capitalizeFirstLetter(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }
            
            return {
                ...author,
                latest_paper_title: latestPaper?.title || null,
                topic: specificTopicEntry?.topics
                    ? capitalizeFirstLetter(specificTopicEntry.topics.join(", "))
                    : null,
                unique_coauthors_count: coauthorSet.size
            };
        }));
        
        hashCache.set(cacheKey, enrichedAuthors);
        res.json({ authors: enrichedAuthors });
        
    } catch (err) {
        console.error("Error searching authors:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors/hindex:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get number of hindex by author
 *         responses:
 *             200:
 *                 description: Number of hindex by author
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                           example: Nguyen Anh Dung
 *                         h-index:
 *                           type: int
 *                           example: 25
 */

router.get('/hindex', async (req, res) => {
    try {
        const db = getDB();
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 100;
        const skip = (page - 1) * limit;

        const cursor = db.collection("authors")
            .find({ hindex: { $ne: null } }, { projection: { name: 1, hindex: 1, authorid: 1, _id: 0 } })
            .sort({ hindex: -1})
            .skip(skip)
            .limit(limit);

        const authors = await cursor.toArray();

        const total = await db.collection("authors").countDocuments({ hindex: { $ne: null } });

        res.json({
            page,
            limit,
            totalPages: Math.ceil(total / limit),
            totalResults: total,
            results: authors
        });
    } catch (err) {
        console.error("Error fetching author h-indexes:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors/{author_id}:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get author by authorId, including distinct specific topics and their count
 *         parameters:
 *           - in: path
 *             name: author_id
 *             required: true
 *             schema:
 *                 type: string
 *             description: The ID of the author
 *         responses:
 *             200:
 *                 description: Author found
 *             404:
 *                 description: Not found
 */

router.get("/:author_id", async (req, res) => {
    try {
        const db = getDB();
        const authorId = req.params.author_id;

        const cacheKey = `author_${authorId}`;
        const cached = topicsCache.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const author = await db.collection("authors")
            .findOne({ authorid: authorId }, { projection: { _id: 0 } });

        if (!author) {
            return res.status(404).json({ error: "No author found with the given author ID" });
        }

        const latestPaper = await db.collection("papers_with_annotations")
            .find({ "authors.authorId": authorId })
            .sort({ updated: -1 })
            .limit(1)
            .project({ _id: 0, title: 1 })
            .next();

        const axios = require('axios');
        const filteredRes = await axios.get(`http://localhost:8000/author_specific_topics/filtered_author_paper_topics/author/${authorId}`);
        const filteredAuthorPaperTopics = filteredRes.data;

        const allTopics = filteredAuthorPaperTopics.flatMap(paper => paper.topics || []);
        const distinctTopicsSet = new Set(allTopics);
        const distinctTopics = Array.from(distinctTopicsSet).sort();

        const specificTopicsCount = distinctTopics.length;

        const papers = await db.collection("papers_with_annotations")
            .find({ "authors.authorId": authorId }, { projection: { authors: 1 } })
            .toArray();

        const coauthorSet = new Set();
        papers.forEach(paper => {
            if (paper.authors) {
                paper.authors.forEach(a => {
                    if (a.authorId !== authorId) {
                        coauthorSet.add(a.authorId);
                    }
                });
            }
        });

        const coauthorIds = Array.from(coauthorSet);
        let coauthors = [];
        if (coauthorIds.length) {
            coauthors = await db.collection("authors")
                .find(
                    { authorid: { $in: coauthorIds } },
                    { projection: { _id: 0, authorid: 1, name: 1, hindex: 1, papercount: 1, citationcount: 1 } }
                )
                .toArray();
        }

        const capitalizeFirstLetter = (string) =>
            string.charAt(0).toUpperCase() + string.slice(1);

        const enrichedAuthor = {
            ...author,
            latest_paper_title: latestPaper?.title || null,
            specific_topic: distinctTopics.length
                ? capitalizeFirstLetter(distinctTopics.join(", "))
                : null,
            specific_topics_count: specificTopicsCount,
            unique_coauthors_count: coauthorSet.size,
            coauthors
        };

        topicsCache.set(cacheKey, enrichedAuthor);

        res.json(enrichedAuthor);
    } catch (err) {
        console.error("Error fetching enriched author:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});


/**
 * @swagger
 * /authors/authors_coauthors_citations_evolution/{authorId}:
 *   get:
 *     tags:
 *       - Authors
 *     summary: Get evolution of citations of co-authors by year
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the main author
 *     responses:
 *       200:
 *         description: Yearly citations of co-authors
 *       404:
 *         description: Not found
 *       500:
 *         description: Internal server error
 */

router.get('/authors_coauthors_citations_evolution/:authorId', async (req, res) => {
    try {
        const authorId = String(req.params.authorId);

        const cacheKey = `coauthors_citations_${authorId}`;
        const cached = topicsCache.get(cacheKey);
        if (cached) {
            return res.json({ data: cached });
        }

        const axios = require('axios');
        const { data: authorData } = await axios.get(`http://localhost:8000/authors_papers_annotations/${authorId}`);

        if (!authorData || !Array.isArray(authorData.papers)) {
            return res.status(404).json({ error: "No papers found for the given author ID" });
        }

        const coAuthorIds = new Set();
        authorData.papers.forEach(paper => {
            if (Array.isArray(paper.authors)) {
                paper.authors.forEach(coAuthor => {
                    if (coAuthor.authorId && String(coAuthor.authorId) !== authorId) {
                        coAuthorIds.add(String(coAuthor.authorId));
                    }
                });
            }
        });

        if (coAuthorIds.size === 0) {
            console.log(`No co-authors found for authorId: ${authorId}`);
            return res.json({ data: [] });
        }

        const coAuthorsCitationsByYear = {};

        const coAuthorsResponses = await Promise.all(
            Array.from(coAuthorIds).map(async coAuthorId => {
                try {
                    const response = await axios.get(`http://localhost:8000/authors_papers_annotations/${coAuthorId}`);
                    return { coAuthorId, data: response.data };
                } catch (error) {
                    console.warn(`Failed to fetch data for co-authorId: ${coAuthorId}:`, error.message);
                    return null;
                }
            })
        );

        coAuthorsResponses.forEach(item => {
            if (!item || !item.data || !Array.isArray(item.data.papers)) return;

            item.data.papers.forEach(paper => {
                if (paper.year && typeof paper.citationcount === 'number') {
                    if (!coAuthorsCitationsByYear[paper.year]) {
                        coAuthorsCitationsByYear[paper.year] = { year: paper.year, citations: 0 };
                    }
                    coAuthorsCitationsByYear[paper.year].citations += paper.citationcount;
                } else {
                    console.warn(`Skipping paper for co-author ${item.coAuthorId} due to missing year or invalid citationcount:`, paper);
                }
            });
        });

        const coAuthorsCitationsEvolutionData = Object.values(coAuthorsCitationsByYear)
            .sort((a, b) => a.year - b.year);

        topicsCache.set(cacheKey, coAuthorsCitationsEvolutionData);

        res.json({ data: coAuthorsCitationsEvolutionData });
        
    } catch (err) {
        console.error("Error building co-authors citations evolution:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /authors/hindex_per_topic/{authorId}:
 *   get:
 *     tags:
 *       - Authors
 *     summary: Get H-index per topic for a specific author
 *     parameters:
 *       - in: path
 *         name: authorId
 *         required: true
 *         schema:
 *           type: string
 *         description: Author ID
 *     responses:
 *       200:
 *         description: H-index per topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 authorId:
 *                   type: string
 *                 hindexPerTopic:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       topic:
 *                         type: string
 *                       hindex:
 *                         type: integer
 *       404:
 *         description: Author or topics not found
 *       500:
 *         description: Internal server error
 */

router.get('/hindex_per_topic/:authorId', async (req, res) => {
    try {
        const authorId = req.params.authorId;
        const axios = require('axios');

        const { data: topicData } = await axios.get(`http://localhost:8000/author_specific_topics/aggregate_author_topics/author/${authorId}`);

        if (!topicData || !Array.isArray(topicData.topics) || topicData.topics.length === 0) {
            return res.status(404).json({ error: 'No topics found for this author' });
        }

        const topics = topicData.topics;

        const { data: papersData } = await axios.get(`http://localhost:8000/authors_papers_annotations/author/${authorId}`);

        if (!papersData || !Array.isArray(papersData.papers)) {
            return res.status(404).json({ error: 'No papers found for this author' });
        }

        const papers = papersData.papers;

        const hindexPerTopic = [];

        for (const topic of topics) {
            const topicPapers = papers.filter(paper =>
                paper.annotation &&
                Array.isArray(paper.annotation.union) &&
                paper.annotation.union.includes(topic)
            );

            const citationCounts = topicPapers
                .map(p => Number(p.citationcount))
                .filter(n => !isNaN(n) && n > 0)
                .sort((a, b) => b - a);

            let h = 0;
            for (let i = 0; i < citationCounts.length; i++) {
                if (citationCounts[i] >= i + 1) {
                    h = i + 1;
                } else {
                    break;
                }
            }

            hindexPerTopic.push({ topic, hindex: h });
        }

        res.json({
            authorId,
            hindexPerTopic
        });

    } catch (error) {
        console.error('Error calculating H-index per topic:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;
