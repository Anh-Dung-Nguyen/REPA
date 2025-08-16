const express = require("express");
const router = express.Router();
const { getDB } = require("../db");

/**
 * @swagger
 * /journal_data/sjr:
 *   get:
 *     tags:
 *       - Journals
 *     summary: Get SJR Best Quartile by Title (case-insensitive, fuzzy search)
 *     parameters:
 *       - in: query
 *         name: title
 *         required: true
 *         schema:
 *           type: string
 *         description: The Title (or partial Title) of the journal
 *     responses:
 *       200:
 *         description: List of matching journals
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   Title:
 *                     type: string
 *                     example: "Ca-A Cancer Journal for Clinicians"
 *                   SJR_Best_Quartile:
 *                     type: string
 *                     example: "Q1"
 *       404:
 *         description: No journals found
 */

router.get("/sjr", async (req, res) => {
    try {
        const { title } = req.query;
        if (!title) {
            return res.status(400).json({ error: "Missing required query param: title" });
        }

        const db = getDB();
        const journals = await db.collection("journal_data")
            .find(
                { Title: { $regex: title, $options: "i" } },
                { projection: { _id: 0, Title: 1, SJR_Best_Quartile: 1 } }
            )
            .toArray();

        if (!journals.length) {
            return res.status(404).json({ error: "No journals found" });
        }

        res.json(journals);
    } catch (err) {
        console.error("Error fetching SJR Best Quartile:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;
