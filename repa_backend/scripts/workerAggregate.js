const { parentPort, workerData } = require('worker_threads');
const { connectToDB, getDB } = require("../db");
const axios = require("axios");

async function aggregateShard(workerId, totalWorkers) {
    try {
        await connectToDB();
        const db = getDB();

        parentPort.postMessage(`Worker ${workerId}: Fetching allowed topics...`);
        const specificTopicsRes = await axios.get("http://localhost:8000/specific_topics?page=1&limit=10000");
        const allowedTopicsSet = new Set(
            specificTopicsRes.data.specificTopics.map(t => t.topic.trim().toLowerCase())
        );

        parentPort.postMessage(`Worker ${workerId}: Starting aggregation...`);

        const cursor = db.collection("author_paper_topics").aggregate([
            { $unwind: "$topics" },
            { $addFields: { lowerTopic: { $toLower: { $trim: { input: "$topics" } } } } },
            { $match: { lowerTopic: { $in: Array.from(allowedTopicsSet) } } },
            { $addFields: { authorIdNum: { $toLong: "$authorId" } } },
            { $match: { $expr: { $eq: [ { $mod: ["$authorIdNum", totalWorkers] }, workerId ] } } },
            { $group: { _id: "$authorId", topics: { $addToSet: "$topics" } } }
        ], { allowDiskUse: true });

        let bulkOps = [];
        let processed = 0;

        for await (const doc of cursor) {
            bulkOps.push({
                updateOne: {
                    filter: { authorId: doc._id },
                    update: {
                        $set: {
                            authorId: doc._id,
                            topics: doc.topics.sort((a, b) => a.localeCompare(b))
                        }
                    },
                    upsert: true
                }
            });

            if (bulkOps.length >= 1000) {
                await db.collection("author_specific_topics").bulkWrite(bulkOps, { ordered: false });
                processed += bulkOps.length;
                parentPort.postMessage(`Worker ${workerId}: processed ${processed} authors`);
                bulkOps = [];
            }
        }

        if (bulkOps.length > 0) {
            await db.collection("author_specific_topics").bulkWrite(bulkOps, { ordered: false });
            processed += bulkOps.length;
        }

        parentPort.postMessage(`Worker ${workerId}: Done! Total processed: ${processed}`);

        if (workerId === 0) {
            await db.collection("author_specific_topics").createIndex({ authorId: 1 });
            parentPort.postMessage(`Worker ${workerId}: Index created on authorId`);
        }

        process.exit(0);
    } catch (err) {
        parentPort.postMessage(`Worker ${workerId} failed: ${err.message}`);
        process.exit(1);
    }
}

aggregateShard(workerData.workerId, workerData.totalWorkers);