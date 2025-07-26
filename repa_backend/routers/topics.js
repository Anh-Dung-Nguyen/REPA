const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csv-parser");
const { getDB } = require("../db")

let triples = [];
let equivalenceMap = {};

function cleanURI(uri) {
    if (typeof uri !== 'string') return "";
    return uri.replace(/^<|>$/g, "").trim();
}

function normalizeURI(uri) {
    return equivalenceMap[uri] || uri;
}

function loadTriples() {
    return new Promise((resolve, reject) => {
        const filePath = "./data/CSO.3.4.1.csv";
        const rawTriples = [];

        fs.createReadStream(filePath)
            .on("error", (err) => reject(err))
            .pipe(csv({ separator: ",", headers: ["subject", "predicate", "object"], skipLines: 0 }))
            .on("data", (row) => {
                const subject = cleanURI(row.subject);
                const predicate = cleanURI(row.predicate);
                const object = cleanURI(row.object);

                if (subject && predicate && object) {
                    rawTriples.push({ subject, predicate, object });
                }
            })
            .on("end", () => {
                const equivalenceGroups = new Map();

                rawTriples.forEach(({ subject, predicate, object }) => {
                    if (predicate === "http://cso.kmi.open.ac.uk/schema/cso#relatedEquivalent") {
                        const a = subject;
                        const b = object;

                        let groupA = null;
                        let groupB = null;

                        for (let [key, values] of equivalenceGroups.entries()) {
                            if (values.has(a)) groupA = key;
                            if (values.has(b)) groupB = key;
                        }

                        if (!groupA && !groupB) {
                            equivalenceGroups.set(a, new Set([a, b]));
                        } else if (groupA && !groupB) {
                            equivalenceGroups.get(groupA).add(b);
                        } else if (!groupA && groupB) {
                            equivalenceGroups.get(groupB).add(a);
                        } else if (groupA && groupB && groupA !== groupB) {
                            const merged = new Set([...equivalenceGroups.get(groupA), ...equivalenceGroups.get(groupB)]);
                            equivalenceGroups.delete(groupA);
                            equivalenceGroups.delete(groupB);
                            equivalenceGroups.set(a, merged);
                        }
                    }
                });

                for (let values of equivalenceGroups.values()) {
                    const preferred = [...values].sort((a, b) => a.length - b.length)[0];
                    values.forEach(uri => {
                        equivalenceMap[uri] = preferred;
                    });
                }

                triples = rawTriples
                    .filter(({ predicate }) => predicate === "http://cso.kmi.open.ac.uk/schema/cso#superTopicOf")
                    .map(({ subject, object }) => ({
                        subject: normalizeURI(subject),
                        object: normalizeURI(object)
                    }));

                console.log(`Loaded ${triples.length} normalized topic triples.`);
                resolve();
            });
    });
}

loadTriples()
    .then(() => {
        console.log("Triples are ready for use.");
    })
    .catch((err) => {
        //console.error("Failed to load triples. Server might not function correctly.", err);
    });


function topicToURI(name) {
    return `https://cso.kmi.open.ac.uk/topics/${name.toLowerCase().replace(/\s+/g, "_")}`;
}

function uriToTopicName(uri) {
    const raw = uri.split('/').pop();
    const decoded = decodeURIComponent(raw);
    return decoded.replace(/_/g, " ");
}

/**
 * @swagger
 * /topics/root:
 *   get:
 *     tags:
 *       - Topics
 *     summary: Get all root topics (most-parent topics)
 *     description: Returns all topics that are only parents and never children in the superTopicOf hierarchy.
 *     responses:
 *       200:
 *         description: List of root topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 roots:
 *                   type: array
 *                   items:
 *                     type: string
 *                     description: Name of the root topic
 */

router.get("/root", (req, res) => {
    const parentURIs = new Set();
    const childURIs = new Set();

    triples.forEach(({ subject, object }) => {
        parentURIs.add(subject);
        childURIs.add(object);
    });

    const rootURIs = [...parentURIs].filter(uri => !childURIs.has(uri));
    const roots = rootURIs.map(uri => uriToTopicName(uri));

    console.log(`Identified ${roots.length} root topics.`);

    res.json({ roots });
});

/**
 * @swagger
 * /topics/children/{name}:
 *   get:
 *     tags:
 *       - Topics
 *     summary: Get direct children of a given topic
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the topic (e.g., computer science)
 *     responses:
 *       200:
 *         description: List of child topics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                   description: The name of the parent topic
 *                 children:
 *                   type: array
 *                   items:
 *                     type: string
 *                     description: URI of a child topic
 */

router.get("/children/:name", (req, res) => {
    const topicName = req.params.name;
    const topicURI = topicToURI(topicName);

    console.log(`Request received for children of: ${topicName} (URI: ${topicURI})`);
    console.log(`Current number of loaded triples: ${triples.length}`);

    const childURIs = triples
        .filter(t => t.subject === topicURI)
        .map(t => t.object);

    const uniqueURIs = [...new Set(childURIs)];

    const children = uniqueURIs.map(uri => uriToTopicName(uri));

    if (children.length === 0) {
        console.log(`No children found for ${topicName}.`);
    } else {
        console.log(`Found ${children.length} children for ${topicName}.`);
    }

    res.json({ topic: topicName, children });
});

/**
 * @swagger
 * /topics/paths/{name}:
 *   get:
 *     tags:
 *       - Topics
 *     summary: Get all hierarchical topic paths to a given topic
 *     description: Returns all hierarchical paths that lead to the specified topic. The paths are based on superTopicOf relationships and may originate from multiple root nodes (not only "computer science").
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: The name of the topic (e.g., "fp tree")
 *     responses:
 *       200:
 *         description: List of all paths to the topic from any root node
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                   example: "fp tree"
 *                 paths:
 *                   type: array
 *                   description: An array of paths from root topics to the target topic
 *                   items:
 *                     type: array
 *                     items:
 *                       type: string
 *                       example: "association rule"
 *       404:
 *         description: No path found to the topic
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 topic:
 *                   type: string
 *                   example: "unknown topic"
 *                 message:
 *                   type: string
 *                   example: "No paths found to this topic."
 */

router.get("/paths/:name", (req, res) => {
    const targetName = req.params.name;
    const targetURI = topicToURI(targetName);
    const visited = new Set();
    const allPaths = [];

    const parentMap = new Map();
    triples.forEach(({ subject, object }) => {
        if (!parentMap.has(object)) {
            parentMap.set(object, []);
        }
        parentMap.get(object).push(subject);
    });

    const dfs = (nodeURI, path) => {
        if (visited.has(`${nodeURI}:${path.join(',')}`)) return;
        visited.add(`${nodeURI}:${path.join(',')}`);
        
        path.push(nodeURI);
        const parents = parentMap.get(nodeURI) || [];

        if (parents.length === 0) {
            const fullPath = [...path].reverse();
            const normalized = fullPath.map(uri => uriToTopicName(uri));
            const deduplicated = normalized.filter((name, i, arr) => i === 0 || name !== arr[i - 1]);
            allPaths.push(deduplicated);
        } else {
            parents.forEach(parent => {
                dfs(parent, [...path]);
            });
        }
    };

    dfs(normalizeURI(targetURI), []);

    if (allPaths.length === 0) {
        return res.status(404).json({
        topic: targetName,
        message: "No paths found to this topic."
        });
    }

    res.json({
        topic: targetName,
        paths: allPaths
    });
});

/**
 * @swagger
 * /topics/topic_author_corpus_counts:
 *   get:
 *     tags:
 *       - Topics
 *     summary: Get number of authors and papers per topic, sorted by total (authors + papers)
 *     responses:
 *          200:
 *              description: List of papers
 */

router.get('/topic_author_corpus_counts', async (req, res) => {
    try {
        const db = getDB();
        const topic_author_corpus_counts = await db.collection("topic_author_corpus_counts")
            .find({}, { projection: { _id: 0 } })
            .toArray();
        res.json(topic_author_corpus_counts);

    } catch (err) {
        console.error("Error in topic_author_corpus_counts:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

/**
 * @swagger
 * /topics/topic_author_corpus_counts/{topic}:
 *   get:
 *     tags:
 *       - Topics
 *     summary: Get number of authors and papers for a topic
 *     parameters:
 *       - in: path
 *         name: topic
 *         required: true
 *         schema:
 *           type: string
 *         description: Topic name (URL-encoded)
 *     responses:
 *       200:
 *         description: Counts for the topic
 *       400:
 *          description: Not found
 */

router.get('/topic_author_corpus_counts/:topic', async (req, res) => {
    try {
        const db = getDB();
        const topicName = decodeURIComponent(req.params.topic);

        const topic = await db.collection("topic_author_corpus_counts")
            .findOne({topic: topicName}, {projection: {_id: 0}});

        if (topic) {
            res.json(topic);
        } else {
            res.status(404).json({error: "No stats found with the given topic"});
        }

    } catch (err) {
        console.error("Error in topic_author_corpus_counts/:topic:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

module.exports = router;