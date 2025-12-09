import https from 'https';

console.log("Starting HTTPS request...");
const token = '8003294766:AAGuNAQ844L1-fHHBVvuckjxgm9bXXRumig';
const req = https.get(`https://api.telegram.org/bot${token}/getMe`, (res) => {
    console.log('statusCode:', res.statusCode);
    res.on('data', (d) => {
        process.stdout.write(d);
    });
});

req.on('error', (e) => {
    console.error("Network Error:", e);
});
console.log("Request sent.");
