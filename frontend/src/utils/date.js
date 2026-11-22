import i18n, { localeOf } from "@/i18n";

const t = (key, opts) => i18n.t(key, opts);
const weekdays = () => t("date.weekdays", { returnObjects: true });
const timeOf = (d) => d.toLocaleTimeString(localeOf(), { hour: "2-digit", minute: "2-digit" });
const fullDate = (d) =>
    t("date.full", { day: d.getDate(), month: d.getMonth() + 1, year: d.getFullYear() });

export const getMessageDivider = (currentDate, prevDate) => {
    if (!prevDate) return `${timeOf(currentDate)} ${fullDate(currentDate)}`;

    const diffMs = currentDate.getTime() - prevDate.getTime();
    if (diffMs / (1000 * 60) < 20) return null;

    const timeStr = timeOf(currentDate);

    const isSameDay =
        currentDate.getDate() === prevDate.getDate() &&
        currentDate.getMonth() === prevDate.getMonth() &&
        currentDate.getFullYear() === prevDate.getFullYear();
    if (isSameDay) return timeStr;

    if (diffMs / (1000 * 60 * 60 * 24) <= 7) {
        return `${timeStr} ${weekdays()[currentDate.getDay()]}`;
    }

    return `${timeStr} ${fullDate(currentDate)}`;
};

export const formatLastSeen = (lastActiveAt) => {
    if (!lastActiveAt) return t("date.offline");

    const lastActive = new Date(lastActiveAt);
    const diffInMins = Math.floor((new Date() - lastActive) / (1000 * 60));

    if (diffInMins < 1) return t("date.justNow");
    if (diffInMins < 60) return t("date.activeMinutes", { n: diffInMins });

    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return t("date.activeHours", { n: diffInHours });

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return t("date.activeDays", { n: diffInDays });

    return t("date.activeOn", { date: lastActive.toLocaleDateString(localeOf()) });
};

export const formatTime = (dateString, nowTime = Date.now()) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date(nowTime);

    const diffInMins = Math.floor((now - date) / (1000 * 60));
    if (diffInMins < 1) return t("date.now");
    if (diffInMins < 60) return t("date.minutes", { n: diffInMins });

    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24 && date.getDate() === now.getDate()) return t("date.hours", { n: diffInHours });

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return t("date.yesterday");

    if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) return weekdays()[date.getDay()];

    return t("date.short", { day: date.getDate(), month: date.getMonth() + 1 });
};