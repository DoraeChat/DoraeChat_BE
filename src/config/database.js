
require('dotenv').config();
const mongoose = require('mongoose');

const dbState = [
    { value: 0, label: "Disconnected" },
    { value: 1, label: "Connected" },
    { value: 2, label: "Connecting" },
    { value: 3, label: "Disconnecting" }
];

const connection = async () => {
    await mongoose.connect(process.env.MONGO_DB_URL);
    const state = Number(mongoose.connection.readyState);
    console.log(dbState.find(f => f.value === state).label, "to database");
}


// const connection = async () => {
//     try {
//         await mongoose.connect(process.env.MONGO_DB_URL);
//         const state = Number(mongoose.connection.readyState);
//         console.log(dbState.find(f => f.value === state).label, "to database");

//         // ✅ Lấy danh sách tất cả collections trong DB
//         const db = mongoose.connection.db;
//         const collections = await db.listCollections().toArray();

//         console.log("📂 All collections:");
//         collections.forEach(col => console.log(` - ${col.name}`));

//         // ✅ (Tùy chọn) In 1 document mẫu từ mỗi collection
//         for (const col of collections) {
//             const docs = await db.collection(col.name).find().limit(1).toArray();
//             console.log(`📄 Sample from '${col.name}':`, docs);
//         }

//     } catch (err) {
//         console.error("❌ Error connecting to MongoDB:", err.message);
//     }
// };
module.exports = connection;
