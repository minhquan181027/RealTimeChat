
import React, { useState, useEffect, useMemo, useCallback } from "react";



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