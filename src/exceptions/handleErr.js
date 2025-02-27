const handleErr = (err, req, res, next) => {
    const { stack, status = 400, message } = err;

    console.error('Lỗi: ', message);
    console.error('Stack Trace:', stack);

    res.status(status).json({ status, message });
};

module.exports = handleErr;
