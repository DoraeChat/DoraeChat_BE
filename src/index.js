require('dotenv').config();
const express = require('express');
const connection = require('./config/database');
const authRoutes = require('./routes/authRoutes');

const app = express();
const port = process.env.PORT || 8888;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

(async () => {
    try {
        await connection();

        app.use('/api/signup', authRoutes);

        app.listen(port, () => {
            console.log(`Backend Nodejs App listening on port ${port}`);
        });
    } catch (error) {
        console.log(">>> Error connect to DB: ", error);
    }
})();