
export const getMessageDivider = (currentDate, prevDate) => {
    if (!prevDate) {
        // Tin nhắn đầu tiên luôn hiện full ngày tháng
        return `${currentDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${currentDate.getDate()} Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`;
    }

    const diffMs = currentDate.getTime() - prevDate.getTime();
    const diffMins = diffMs / (1000 * 60);

    // 1. Nếu cách nhau dưới 20 phút -> Không hiện
    if (diffMins < 20) return null;

    const timeStr = currentDate.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    // 2. Nếu cùng ngày -> Chỉ hiện giờ (VD: 14:19)
    const isSameDay =
        currentDate.getDate() === prevDate.getDate() &&
        currentDate.getMonth() === prevDate.getMonth() &&
        currentDate.getFullYear() === prevDate.getFullYear();

    if (isSameDay) {
        return timeStr;
    }

    // 3. Nếu khác ngày nhưng trong vòng 1 tuần -> Hiện giờ + Thứ (VD: 22:48 T6)
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (diffDays <= 7) {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return `${timeStr} ${days[currentDate.getDay()]}`;
    }

    // 4. Quá 1 tuần -> Hiện giờ + Ngày tháng năm (VD: 16:46 27 Tháng 10, 2026)
    return `${timeStr} ${currentDate.getDate()} Tháng ${currentDate.getMonth() + 1}, ${currentDate.getFullYear()}`;
};

export const formatLastSeen = (lastActiveAt) => {
    if (!lastActiveAt) return "Ngoại tuyến";

    const now = new Date();
    const lastActive = new Date(lastActiveAt);
    const diffInMins = Math.floor((now - lastActive) / (1000 * 60));

    if (diffInMins < 1) return "Vừa mới truy cập";
    if (diffInMins < 60) return `Hoạt động ${diffInMins} phút trước`;

    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24) return `Hoạt động ${diffInHours} giờ trước`;

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `Hoạt động ${diffInDays} ngày trước`;

    return `Hoạt động ${lastActive.toLocaleDateString("vi-VN")}`;
};

export const formatTime = (dateString, nowTime = Date.now()) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date(nowTime); // 🆕 Dùng thời gian được truyền vào

    const diffInMins = Math.floor((now - date) / (1000 * 60));
    if (diffInMins < 1) return "Bây giờ";
    if (diffInMins < 60) return `${diffInMins} phút`;

    const diffInHours = Math.floor(diffInMins / 60);
    if (diffInHours < 24 && date.getDate() === now.getDate()) return `${diffInHours} giờ`;

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return "Hôm qua";

    const days = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    if (now.getTime() - date.getTime() < 7 * 24 * 60 * 60 * 1000) return days[date.getDay()];

    return `${date.getDate()}/${date.getMonth() + 1}`;
};