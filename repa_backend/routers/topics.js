const express = require("express");
const router = express.Router();
const fs = require("fs");
const csv = require("csv-parser");

let triples = []; 

function cleanURI(uri) {
    if (typeof uri !== 'string') {
        console.warn("URI is not a string:", uri);
        return "";
    }
    return uri.replace(/^<|>$/g, "").trim();
}

function loadTriples() {
    return new Promise((resolve, reject) => {
        const filePath = "./data/CSO.3.4.1.csv";
        const tempTriples = []; 

        fs.createReadStream(filePath)
            .on('error', (err) => {
                console.error(`Error reading CSV file at ${filePath}:`, err);
                reject(err);
            })
            .pipe(csv({ separator: ',', headers: ['subject', 'predicate', 'object'], skipLines: 0 }))
            .on("data", (row) => {
                const predicateCleaned = cleanURI(row.predicate);

                if (predicateCleaned === "http://cso.kmi.open.ac.uk/schema/cso#superTopicOf") {
                    const subjectCleaned = cleanURI(row.subject);
                    const objectCleaned = cleanURI(row.object);

                    if (subjectCleaned && objectCleaned) { 
                        tempTriples.push({
                            subject: subjectCleaned,
                            object: objectCleaned,
                        });
                    } else {
                        console.warn("Skipping row due to empty subject or object after cleaning:", row);
                    }
                } else {
                    // console.log("Skipping row due to non-matching predicate:", predicateCleaned);
                }
            })
            .on("end", () => {
                triples = tempTriples;
                console.log(`Finished loading ${triples.length} topic triples.`);
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

    const children = triples
        .filter(t => t.subject === topicURI)
        .map(t => uriToTopicName(t.object));

    if (children.length === 0) {
        console.log(`No children found for ${topicName}.`);
    } else {
        console.log(`Found ${children.length} children for ${topicName}.`);
    }

    res.json({ topic: topicName, children });
});

module.exports = router;