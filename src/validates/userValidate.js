const CustomError = require('../exceptions/CustomError');

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
            throw new CustomError('Info login invalid', 400);
        else return true;
    },
    validateUsername: function (username) {
        if (!username || !this.validateEmail(username))
            return false;

        return true;
    },
    validatePassword: (password) => {
        if (!password) return false;
        if (password.length < 0 || password.length > 50) return false;

        return true;
    },
    validateDateOfBirth: (date) => {
        if (!date) return false;

        const dateParts = date.split('-');
        const dateObj = {
            year: parseInt(dateParts[0]),
            month: parseInt(dateParts[1]),
            day: parseInt(dateParts[2])
        };
        const { year, month, day } = dateObj;
        if (!day || !month || !year) return false;

        if (year < 1900) return false;

        const dateTempt = new Date(`${year}-${month}-${day}`);
        if (dateTempt.toDateString() === 'Invalid Date') return false;

        const fullyear = dateTempt.getFullYear();
        dateTempt.setFullYear(fullyear + 10);

        if (dateTempt > new Date()) return false;

        return true;
    },

    validateOTP: (otp) => {
        if (!otp) return false;
        const regex = /^[0-9]{6}$/g;
        return regex.test(otp);
    },

    validateOtpAndUsername: function (username, otpPhone) {
        if (this.validateUsername(username) !== true || !this.validateOTP(otpPhone))
            throw new CustomError('Info confirm account invalid', 400);
        else return true;
    },

    validateSubmitInfo: function (submitInformation) {
        const { contact, firstName, lastName, password, dateOfBirth, gender, bio } = submitInformation;
        if (!this.validateUsername(contact)) throw new CustomError('Contact invalid', 400);
        if (!this.validatePassword(password)) throw new CustomError('Password invalid', 400);
        if (!this.validateDateOfBirth(dateOfBirth)) throw new CustomError('Date of birth invalid', 400);
        if (!firstName || firstName.length < 0 || firstName.length > 50)
            throw new CustomError('First name invalid', 400);
        if (!lastName || lastName.length < 0 || lastName.length > 50)
            throw new CustomError('Last name invalid', 400);
        if (!bio || bio.length < 0 || bio.length > 500) throw new CustomError('Bio invalid', 400);
        return true;
    }
};

module.exports = userValidate;
