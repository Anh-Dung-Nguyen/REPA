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

let searchIndexesInitialized = false;

async function initializeSearchIndexes() {
    if (searchIndexesInitialized) return;
    
    try {
        const db = getDB();
        console.log("Creating database indexes for large-scale search...");
        
        const indexOperations = [
            db.collection("authors").createIndex(
                { name: "text" },
                { 
                    name: "author_name_text_idx",
                    background: true,
                    weights: { name: 1 }
                }
            ),
            
            db.collection("authors").createIndex(
                { hindex: -1, citationcount: -1, papercount: -1 },
                { name: "author_metrics_idx", background: true }
            ),
            
            db.collection("authors").createIndex(
                { authorid: 1 },
                { name: "author_id_idx", background: true, unique: true }
            ),
            
            db.collection("papers_with_annotations").createIndex(
                { "authors.authorId": 1, updated: -1 },
                { name: "papers_author_date_idx", background: true }
            ),
            
            db.collection("author_topics").createIndex(
                { authorId: 1 },
                { name: "author_topics_idx", background: true }
            )
        ];
        
        await Promise.all(indexOperations.map(op => 
            op.catch(error => {
                if (!error.message.includes('already exists')) {
                    console.warn("Index creation warning:", error.message);
                }
            })
        ));
        
        searchIndexesInitialized = true;
        console.log("Database indexes initialized successfully");
        
    } catch (error) {
        console.error("Error initializing search indexes:", error);
    }
}

function calculateNameSimilarity(query, name) {
    const queryLower = query.toLowerCase().trim();
    const nameLower = name.toLowerCase().trim();
    
    // Exact match
    if (nameLower === queryLower) return 100;
    
    // Starts with query
    if (nameLower.startsWith(queryLower)) return 95;
    
    // Contains query as whole word
    const queryWords = queryLower.split(/\s+/);
    const nameWords = nameLower.split(/\s+/);
    
    // Check if all query words are present in name
    const allWordsMatch = queryWords.every(qWord => 
        nameWords.some(nWord => nWord === qWord)
    );
    if (allWordsMatch) return 90;
    
    // Check if all query words start any name words
    const allWordsStartMatch = queryWords.every(qWord => 
        nameWords.some(nWord => nWord.startsWith(qWord))
    );
    if (allWordsStartMatch) return 85;
    
    // Partial word matching
    const partialMatches = queryWords.filter(qWord => 
        nameWords.some(nWord => nWord.includes(qWord))
    ).length;
    
    if (partialMatches === queryWords.length) return 80;
    if (partialMatches > 0) return 50 + (partialMatches / queryWords.length) * 25;
    
    // Contains query as substring
    if (nameLower.includes(queryLower)) return 60;
    
    return 0;
}

async function enrichAuthorData(authorIds) {
    const db = getDB();
    
    // Get latest papers
    const latestPapers = await db.collection("papers_with_annotations").aggregate([
        { $match: { "authors.authorId": { $in: authorIds } } },
        { $unwind: "$authors" },
        { $match: { "authors.authorId": { $in: authorIds } } },
        { $sort: { updated: -1 } },
        {
            $group: {
                _id: "$authors.authorId",
                latestTitle: { $first: "$title" }
            }
        }
    ]).toArray();
    
    // Get topics
    const topicsData = await db.collection("author_topics")
        .find(
            { authorId: { $in: authorIds } },
            { projection: { authorId: 1, topics: 1, _id: 0 } }
        )
        .toArray();
    
    // Fixed coauthor count calculation
    const coauthorCounts = await db.collection("papers_with_annotations").aggregate([
        { $match: { "authors.authorId": { $in: authorIds } } },
        { $unwind: "$authors" },
        {
            $group: {
                _id: "$_id", // Group by paper ID
                authors: { $addToSet: "$authors.authorId" },
                targetAuthors: {
                    $addToSet: {
                        $cond: [
                            { $in: ["$authors.authorId", authorIds] },
                            "$authors.authorId",
                            "$$REMOVE"
                        ]
                    }
                }
            }
        },
        { $unwind: "$targetAuthors" }, // Unwind target authors
        {
            $group: {
                _id: "$targetAuthors", // Group by target author
                allCoauthors: { $addToSet: "$authors" } // Collect all coauthor sets
            }
        },
        {
            $project: {
                _id: 1,
                coauthorCount: {
                    $subtract: [
                        { $size: { $setUnion: "$allCoauthors" } }, // Unique coauthors across all papers
                        1 // Subtract the author themselves
                    ]
                }
            }
        }
    ]).toArray();
    
    const papersMap = new Map(latestPapers.map(p => [p._id, p.latestTitle]));
    const topicsMap = new Map(topicsData.map(t => [
        t.authorId, 
        t.topics ? t.topics.slice(0, 5).map(topic => 
            topic.charAt(0).toUpperCase() + topic.slice(1)
        ).join(", ") : null
    ]));
    const coauthorMap = new Map(coauthorCounts.map(c => [c._id, c.coauthorCount]));
    
    return { papersMap, topicsMap, coauthorMap };
}

router.get("/search", async (req, res) => {
    try {
        if (!searchIndexesInitialized) {
            await initializeSearchIndexes();
        }
        
        const db = getDB();
        const { query: searchQuery, limit = 50 } = req.query; // Increased default limit
        
        if (!searchQuery || searchQuery.trim() === "") {
            return res.status(400).json({ error: "Missing or empty 'query' parameter" });
        }
        
        const trimmedQuery = searchQuery.trim();
        const searchLimit = Math.min(parseInt(limit) || 50, 100); // Increased max limit
        
        const searchHash = createSearchHash(trimmedQuery + "_" + searchLimit);
        const cacheKey = `authors_search_${searchHash}`;
        const cached = hashCache.get(cacheKey);
        
        if (cached) {
            return res.json({ authors: cached });
        }
        
        let authors = [];
        
        // Check for exact author ID match first
        if (/^[a-zA-Z0-9]+$/.test(trimmedQuery)) {
            const exactMatch = await db.collection("authors")
                .findOne(
                    { authorid: trimmedQuery }, 
                    { projection: { _id: 0 } }
                );
            if (exactMatch) {
                authors = [{ ...exactMatch, similarityScore: 100 }];
            }
        }
        
        if (authors.length === 0) {
            let searchResults = [];
            
            // Try text search first (for better full-text matching)
            try {
                searchResults = await db.collection("authors").find(
                    { $text: { $search: `"${trimmedQuery}"` } }, // Use phrase search for better exact matching
                    { 
                        projection: { _id: 0 },
                        score: { $meta: "textScore" }
                    }
                )
                .sort({ score: { $meta: "textScore" }, hindex: -1 })
                .limit(searchLimit * 2) // Get more results initially
                .toArray();
                
                console.log(`Phrase text search found ${searchResults.length} results`);
                
                // If phrase search doesn't return enough results, try regular text search
                if (searchResults.length < searchLimit) {
                    const additionalResults = await db.collection("authors").find(
                        { $text: { $search: trimmedQuery } },
                        { 
                            projection: { _id: 0 },
                            score: { $meta: "textScore" }
                        }
                    )
                    .sort({ score: { $meta: "textScore" }, hindex: -1 })
                    .limit(searchLimit * 2)
                    .toArray();
                    
                    // Merge results, avoiding duplicates
                    const existingIds = new Set(searchResults.map(a => a.authorid));
                    additionalResults.forEach(author => {
                        if (!existingIds.has(author.authorid)) {
                            searchResults.push(author);
                        }
                    });
                    
                    console.log(`Combined text search found ${searchResults.length} results`);
                }
                
            } catch (error) {
                console.log("Text search failed, falling back to regex:", error.message);
            }
            
            // Always add regex search for partial matching
            const escapedQuery = trimmedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            
            // Multiple regex patterns for better matching
            const regexPatterns = [
                new RegExp(`\\b${escapedQuery}\\b`, "i"), // Word boundaries
                new RegExp(`^${escapedQuery}`, "i"), // Starts with
                new RegExp(escapedQuery, "i") // Contains
            ];
            
            for (const pattern of regexPatterns) {
                const regexResults = await db.collection("authors").find(
                    { name: { $regex: pattern } },
                    { projection: { _id: 0 } }
                )
                .sort({ hindex: -1, citationcount: -1 })
                .limit(searchLimit * 2)
                .toArray();
                
                const existingIds = new Set(searchResults.map(a => a.authorid));
                regexResults.forEach(author => {
                    if (!existingIds.has(author.authorid)) {
                        searchResults.push(author);
                    }
                });
            }
            
            console.log(`Final combined search found ${searchResults.length} results`);
            
            // Calculate similarity and filter
            authors = searchResults
                .map(author => ({
                    ...author,
                    similarityScore: calculateNameSimilarity(trimmedQuery, author.name)
                }))
                .filter(author => author.similarityScore > 20) // Lowered threshold
                .sort((a, b) => {
                    // First sort by similarity score
                    const scoreDiff = b.similarityScore - a.similarityScore;
                    if (Math.abs(scoreDiff) > 10) return scoreDiff;
                    
                    // Then by h-index
                    const hindexDiff = (b.hindex || 0) - (a.hindex || 0);
                    if (hindexDiff !== 0) return hindexDiff;
                    
                    // Finally by citation count
                    return (b.citationcount || 0) - (a.citationcount || 0);
                })
                .slice(0, searchLimit);
        }
        
        if (authors.length === 0) {
            return res.json({ authors: [] });
        }
        
        // Enrich with additional data
        const authorIds = authors.map(a => a.authorid);
        const { papersMap, topicsMap, coauthorMap } = await enrichAuthorData(authorIds);
        
        const enrichedAuthors = authors.map(author => ({
            ...author,
            latest_paper_title: papersMap.get(author.authorid) || null,
            topic: topicsMap.get(author.authorid) || null,
            unique_coauthors_count: coauthorMap.get(author.authorid) || 0,
            similarityScore: undefined // Remove from final response
        }));
        
        hashCache.set(cacheKey, enrichedAuthors, 1800);
        
        res.json({ authors: enrichedAuthors });
        
    } catch (err) {
        console.error("Error in scalable author search:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/search/status", async (req, res) => {
    try {
        const db = getDB();
        
        const [authorCount, paperCount] = await Promise.all([
            db.collection("authors").estimatedDocumentCount(),
            db.collection("papers_with_annotations").estimatedDocumentCount()
        ]);
        
        const authorIndexes = await db.collection("authors").indexes();
        const hasTextIndex = authorIndexes.some(idx => idx.name === "author_name_text_idx");
        
        res.json({
            searchOptimized: searchIndexesInitialized,
            hasTextIndex,
            collections: {
                authors: authorCount,
                papers: paperCount
            },
            indexCount: authorIndexes.length,
            cacheSize: hashCache.keys().length
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to get status" });
    }
});

router.post("/search/create-indexes", async (req, res) => {
    try {
        await initializeSearchIndexes();
        res.json({ message: "Search indexes created successfully" });
    } catch (error) {
        console.error("Error creating indexes:", error);
        res.status(500).json({ error: "Failed to create indexes" });
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
