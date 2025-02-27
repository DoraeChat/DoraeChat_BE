const userValidate = {
    validateEmail: (email) => {
        if (!email) return false;

        const regex =
            /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return regex.test(String(email).toLowerCase());
    },
    validateLogin: function (username, password) {
        if (
            !this.validateUsername(username) ||
            !this.validatePassword(password)
        )
            throw new MyError('Info login invalid');
    },
    validateUsername: function (username) {
        if (
            !username ||
            !this.validateEmail(username)
        )
            return false;

        return true;
    },
    validatePassword: (password) => {
        if (!password) return false;
        if (password.length < 0 || password.length > 50) return false;

        return true;
    },
};

module.exports = userValidate;
