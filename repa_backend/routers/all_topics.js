const express = require("express");
const router = express.Router();
const { getDB } = require("../db"); 

/**
 * @swagger
 * /all_topics:
 *     get:
 *         tags:
 *             - All topics
 *         summary: Get list of all topics
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
 *                 description: Paginated list of all topics
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
            db.collection("all_topics").countDocuments(),
            db.collection("all_topics")
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
 * /all_topics/count:
 *     get:
 *         tags:
 *             - All topics
 *         summary: Get list of all topics
 *         responses:
 *             200:
 *                 description: Number of all topics
 *                 content:
 *                   application/json:
 *                     schema:
 *                       type: object
 *                       properties:
 *                         totalAllTopics:
 *                           type: integer
 *                           example: 120
 */

router.get("/count", async (req, res) => {
    try {
        const db = getDB();
        const all_topics = await db.collection("all_topics").countDocuments();
        res.json({all_topics});
    } catch (err) {
        console.error("Error fetching annotated papers:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;