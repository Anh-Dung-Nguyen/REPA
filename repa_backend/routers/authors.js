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
