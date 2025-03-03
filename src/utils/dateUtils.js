const dateUtils = {
    MILLISECONDS_IN_DAY: 86400000,
    MILLISECONDS_IN_HOUR: 3600000,
    MILLISECONDS_IN_MINUTE: 60000,

    toObject(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }

        if (!(date instanceof Date) || isNaN(date.getTime())) {
            throw new Error('Invalid date object');
        }

        return {
            day: date.getDate(),
            month: date.getMonth() + 1,
            year: date.getFullYear(),
        };
    },

    toDate(dateString) {
        if (!dateString) return null;
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? null : date;
    },

    toDateFromObject(dateObj) {
        const { day, month, year } = dateObj;
        return this.toDate(`${year}-${month}-${day}`);
    },

    toObjectFull(date) {
        return {
            year: date.getFullYear(),
            month: date.getMonth() + 1,
            day: date.getDate(),
            hours: date.getHours(),
            minutes: date.getMinutes(),
            seconds: date.getSeconds(),
        };
    },

    toTime(date) {
        const now = new Date();

        if (now.getFullYear() !== date.getFullYear()) {
            return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
        }

        const sevenDaysAgo = new Date(now.getTime() - 7 * this.MILLISECONDS_IN_DAY);
        if (date < sevenDaysAgo) {
            return `${date.getDate()}/${date.getMonth() + 1}`;
        }

        const diffMilliseconds = now - date;

        const daysDiff = Math.floor(diffMilliseconds / this.MILLISECONDS_IN_DAY);
        if (daysDiff > 0) return `${daysDiff} ngày`;

        const hoursDiff = Math.floor(diffMilliseconds / this.MILLISECONDS_IN_HOUR);
        if (hoursDiff > 0) return `${hoursDiff} giờ`;

        const minutesDiff = Math.floor(diffMilliseconds / this.MILLISECONDS_IN_MINUTE);
        if (minutesDiff > 0) return `${minutesDiff} phút`;

        return 'Vài giây';
    },
};

module.exports = dateUtils;