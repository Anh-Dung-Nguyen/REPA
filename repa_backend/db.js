const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME;

const client = new MongoClient(uri);

let db;

async function connectToDB() {
    try {
        await client.connect();
        db = client.db(dbName);
        console.log(`Connected to database: ${dbName}`);
    } catch (error) {
        console.error("MongoDB connection error: ", error);
        throw error;
    }
}

function getDB() {
    if (!db) {
        throw new Error("Database not connected. Run connectToDB() first.");
    }
    return db;
}

module.exports = { connectToDB, getDB };