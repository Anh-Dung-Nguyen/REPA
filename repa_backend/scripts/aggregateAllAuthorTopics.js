const { connectToDB, getDB } = require("../db");
const axios = require("axios");

async function aggregateAllAuthorTopics() {
    await connectToDB();
    const db = getDB();

    console.log("Fetching allowed specific topics...");
    
    const specificTopicsRes = await axios.get("http://localhost:8000/specific_topics?page=1&limit=10000");
    const allowedTopicsArray = specificTopicsRes.data.specificTopics.map(t => t.topic.trim());
    const allowedTopicsSet = new Set(allowedTopicsArray.map(t => t.toLowerCase()));

    console.log("Starting aggregation from author_paper_topics...");

    const cursor = db.collection("author_paper_topics").aggregate([
        { $unwind: "$topics" },
        {
            $addFields: {
                lowerTopic: { $toLower: { $trim: { input: "$topics" } } }
            }
        },
        {
            $match: {
                lowerTopic: { $in: Array.from(allowedTopicsSet) }
            }
        },
        {
            $group: {
                _id: "$authorId",
                topics: { $addToSet: "$topics" }
            }
        }
    ], { allowDiskUse: true });

    let bulkOps = [];
    let processedAuthors = 0;

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
            processedAuthors += bulkOps.length;
            console.log(`Processed ${processedAuthors} authors...`);
            bulkOps = [];
        }
    }

    if (bulkOps.length > 0) {
        await db.collection("author_specific_topics").bulkWrite(bulkOps, { ordered: false });
        processedAuthors += bulkOps.length;
    }

    console.log(`Done! Total authors processed: ${processedAuthors}`);

    await db.collection("author_specific_topics").createIndex({ authorId: 1 });
    console.log("Index on authorId created (if not already present).");
}

aggregateAllAuthorTopics()
    .then(() => console.log("Aggregation completed successfully."))
    .catch(err => console.error("Aggregation failed:", err));