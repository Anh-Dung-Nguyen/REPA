const express = require("express");
const router = express.Router();
const axios = require("axios");
const { getDB } = require("../db"); 

/**
 * @swagger
 * /authors:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get a paginated list of authors (optionally filtered by name)
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
 *             description: Number of authors per page (default is 51)
 *           - in: query
 *             name: name
 *             schema:
 *                 type: string
 *             description: Filter authors by name (case-insensitive, partial match)
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
        const limit = Math.max(1, parseInt(req.query.limit)) || 51;
        const skip = (page - 1) * limit;

        const name = req.query.name?.trim();
        const query = name ? { name: { $regex: new RegExp(name, "i") } } : {};

        const authors = await db.collection("authors")
            .find(query, { projection: { _id: 0, authorid: 1, name: 1, hindex: 1, papercount: 1, citationcount: 1 } })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await db.collection("authors").countDocuments(query);

        const authorIds = authors.map(author => author.authorid);

        const latestPapers = await db.collection("papers_with_annotations")
            .aggregate([
                { $match: { "authors.authorId": { $in: authorIds } } },
                { $sort: { updated: -1 } },
                { $unwind: "$authors" },
                { $match: { "authors.authorId": { $in: authorIds } } },
                {
                    $group: {
                        _id: "$authors.authorId",
                        title: { $first: "$title" }
                    }
                }
            ])
            .toArray();

        const paperMap = new Map(latestPapers.map(p => [p._id, p.title]));

        const topicMap = new Map();
        await Promise.all(authorIds.map(async (authorId) => {
            try {
                const filteredRes = await axios.get(`http://localhost:8000/author_specific_topics/filtered_author_paper_topics/author/${authorId}`);
                const filteredTopicsData = filteredRes.data;

                const allTopics = filteredTopicsData.flatMap(paper => paper.topics || []);
                const distinctTopics = Array.from(new Set(allTopics)).sort();

                topicMap.set(authorId, distinctTopics);
            } catch (err) {
                console.error(`Error fetching filtered topics for authorId=${authorId}:`, err.message);
                topicMap.set(authorId, []);
            }
        }));

        const papers = await db.collection("papers_with_annotations")
            .find({ "authors.authorId": { $in: authorIds } }, { projection: { authors: 1 } })
            .toArray();

        const coauthorMap = new Map();

        for (const paper of papers) {
            const authorList = paper.authors || [];
            for (const a of authorList) {
                if (!coauthorMap.has(a.authorId)) {
                    coauthorMap.set(a.authorId, new Set());
                }
                for (const co of authorList) {
                    if (co.authorId !== a.authorId) {
                        coauthorMap.get(a.authorId).add(co.authorId);
                    }
                }
            }
        }

        const allCoauthorIds = Array.from(
            new Set(Array.from(coauthorMap.values()).flatMap(set => Array.from(set)))
        );

        const coauthorDetails = await db.collection("authors")
            .find(
                { authorid: { $in: allCoauthorIds } },
                { projection: { _id: 0, authorid: 1, name: 1, hindex: 1, papercount: 1 } }
            )
            .toArray();

        const coauthorDetailMap = new Map(coauthorDetails.map(co => [
            co.authorid,
            { authorid: co.authorid, name: co.name, hindex: co.hindex, papercount: co.papercount }
        ]));

        const capitalizeFirst = str => str.charAt(0).toUpperCase() + str.slice(1);

        const enrichedAuthors = authors.map(author => {
            const latestTitle = paperMap.get(author.authorid) || null;
            const topics = topicMap.get(author.authorid) || [];
            const coauthorIds = coauthorMap.get(author.authorid) || new Set();

            const enrichedCoauthors = Array.from(coauthorIds)
                .map(id => coauthorDetailMap.get(id))
                .filter(Boolean);

            return {
                ...author,
                latest_paper_title: latestTitle,
                specific_topics: topics.length ? topics.map(capitalizeFirst) : [],
                specific_topics_count: topics.length,
                unique_coauthors_count: coauthorIds.size,
                coauthors: enrichedCoauthors
            };
        });

        res.json({
            page,
            limit,
            total,
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
 *         summary: Search authors by name
 *         parameters:
 *           - in: query
 *             name: name
 *             schema:
 *                 type: string
 *             required: true
 *             description: The name of the author to search for
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
        const { name } = req.query;

        if (!name || name.trim() === "") {
            return res.status(400).json({ error: "Missing or empty 'name' query parameter" });
        }

        const regex = new RegExp(name.trim(), "i");
        const authors = await db.collection("authors")
            .find({ name: { $regex: regex } }, { projection: { _id: 0 } })
            .limit(50)
            .toArray();

        const enrichedAuthors = await Promise.all(authors.map(async (author) => {
            const authorId = author.authorid;

            const [latestPaper, specificTopicEntry, papers] = await Promise.all([
                db.collection("papers_with_annotations")
                    .find({ "authors.authorId": authorId })
                    .sort({ updated: -1 })
                    .limit(1)
                    .project({ _id: 0, title: 1 })
                    .next(),
                db.collection("author_specific_topics")
                    .findOne({ authorId: authorId }, { projection: { _id: 0, topics: 1 } }),
                db.collection("papers_with_annotations")
                    .find({ "authors.authorId": authorId }, { projection: { authors: 1 } })
                    .toArray()
            ]);

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

            function capitalizeFirstLetter(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }

            return {
                ...author,
                latest_paper_title: latestPaper?.title || null,
                specific_topic: specificTopicEntry?.topics 
                    ? capitalizeFirstLetter(specificTopicEntry.topics.join(", "))
                    : null,
                unique_coauthors_count: coauthorSet.size
            };
        }));

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
            .find({ hindex: { $ne: null } }, { projection: { name: 1, hindex: 1, _id: 0 } })
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
        for (const paper of papers) {
            if (paper.authors) {
                paper.authors.forEach(a => {
                    if (a.authorId !== authorId) {
                        coauthorSet.add(a.authorId);
                    }
                });
            }
        }

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

        res.json({ data: coAuthorsCitationsEvolutionData });
        
    } catch (err) {
        console.error("Error building co-authors citations evolution:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
