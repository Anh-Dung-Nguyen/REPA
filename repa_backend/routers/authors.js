const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /authors:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get list of authors
 *         responses:
 *             200:
 *               description: List of authors
 */

router.get("/", async (req, res) => {
    try {
        const db = getDB();
        const authors = await db.collection("authors")
        .find({}, { projection: { _id: 0 } })
        .toArray();
        res.json(authors);
    } catch (err) {
        console.error("Error fetching authors:", err);
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
            const [latestPaper, specificTopicEntry] = await Promise.all([
                db.collection("papers_with_annotations")
                    .find({ "authors.authorId": author.authorid })
                    .sort({ updated: -1 })
                    .limit(1)
                    .project({ _id: 0, title: 1 })
                    .next(),
                db.collection("author_specific_topics")
                    .findOne({ authorId: author.authorid }, { projection: { _id: 0, topics: 1 } })
            ]);

            function capitalizeFirstLetter(string) {
                return string.charAt(0).toUpperCase() + string.slice(1);
            }

            return {
                ...author,
                latest_paper_title: latestPaper?.title || null,
                specific_topic: specificTopicEntry?.topics 
                    ? capitalizeFirstLetter(specificTopicEntry.topics.join(", "))
                    : null
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
 * /authors/{author_id}:
 *     get:
 *         tags:
 *             - Authors
 *         summary: Get author by authorId
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

        if (author) {
        res.json(author);
        } else {
        res.status(404).json({ error: "No author found with the given author ID" });
        }
    } catch (err) {
        console.error("Error fetching author:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
