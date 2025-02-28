require('dotenv').config();
const express = require('express');
const connection = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const handleError = require('./middleware/handleError');

const app = express();
const port = process.env.PORT || 8888;

app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

(async () => {
    try {
        await connection();

        app.use('/api/auth', authRoutes);
        app.use(handleError);
        app.listen(port, () => {
            console.log(`Backend Nodejs App listening on port ${port}`);
        });
    } catch (error) {
        console.log(">>> Error connect to DB: ", error);
    }
})();
