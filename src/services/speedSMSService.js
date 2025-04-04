require('dotenv').config();
const https = require('https');

const API_URL = 'api.speedsms.vn';
const ACCESS_TOKEN = process.env.SPEEDSMS_ACCESS_TOKEN;

const encodeNonAsciiCharacters = (value) => {
    return value.split('').map((char) => {
        const code = char.charCodeAt(0);
        return code > 127 ? '\\u' + ('000' + code.toString(16)).slice(-4) : char;
    }).join('');
};

const getUserInfo = () => {
    return new Promise((resolve, reject) => {
        const auth = 'Basic ' + Buffer.from(ACCESS_TOKEN + ':x').toString('base64');

        const options = {
            hostname: API_URL,
            port: 443,
            path: '/index.php/user/info',
            method: 'GET',
            headers: {
                'Authorization': auth
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.end();
    });
};

const sendSMS = (to, content, type = 3, sender = '') => {
    return new Promise((resolve, reject) => {
        const auth = 'Basic ' + Buffer.from(ACCESS_TOKEN + ':x').toString('base64');

        const postData = JSON.stringify({
            to: [to],
            content: encodeNonAsciiCharacters(content),
            type: type,
            brandname: sender
        });

        const options = {
            hostname: API_URL,
            port: 443,
            path: '/index.php/sms/send',
            method: 'POST',
            headers: {
                'Authorization': auth,
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        });

        req.on('error', reject);
        req.write(postData);
        req.end();
    });
};

module.exports = {
    getUserInfo,
    sendSMS
};
