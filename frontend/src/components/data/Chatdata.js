// src/data/chatData.js
// Dữ liệu + hằng số dùng chung. Khi nối API thì thay CHATS / INIT_MESSAGES bằng dữ liệu thật.
import { MessageSquare, Users, User } from "lucide-react";

export const CHATS = [
    { id: 1, name: "25AS-CNKTMT-Kỹ thuật phần mềm ô tô", last: "Phạm Trung Chiến: @All những bạn còn lại...", time: "1 giờ", avatar: "https://i.pravatar.cc/150?img=11", muted: true },
    { id: 2, name: "Media Box", last: "Báo Mới: Giải mã vệt sáng kỳ lạ xuất hiện...", time: "", avatar: "https://i.pravatar.cc/150?img=12", unread: true },
    { id: 3, name: "Thời Tiết", last: "Chúc một ngày tốt lành, thời tiết TP. Đà...", time: "7 giờ", avatar: "https://i.pravatar.cc/150?img=13", unread: true },
    { id: 4, name: "gôn", last: "okii bảo tks bảo nghe", time: "17 giờ", avatar: "https://i.pravatar.cc/150?img=14" },
    { id: 5, name: "Chị My", last: "[Hình ảnh]", time: "22 giờ", avatar: "https://i.pravatar.cc/150?img=15" },
    { id: 6, name: "Ba", last: "[Cuộc gọi video đi]", time: "22 giờ", avatar: "https://i.pravatar.cc/150?img=16" },
    { id: 7, name: "nhóm thiết kế hệ thống", last: "Bạn: K có", time: "23 giờ", avatar: "https://i.pravatar.cc/150?img=17" },
    { id: 8, name: "My Documents", last: "Bạn: [Hình ảnh]", time: "T7", avatar: "https://i.pravatar.cc/150?img=18" },
];

export const INIT_MESSAGES = {
    1: [
        { id: 1, mine: false, sender: "Phạm Trung Chiến", text: "Chiều nay học phòng A214 tầm 2h50 thì các bạn đưa mình là được", time: "14:37" },
        { id: 2, mine: true, text: "Nộp sổ để bị thu hết hằng năm, k nộp sau k có căn cứ ra trường mô nghe", time: "14:40" },
    ],
};

// Dùng chung cho sidebar (PC) và bottom nav (mobile)
export const NAV_TOP = [
    { icon: MessageSquare, label: "Tin nhắn", active: true },
    { icon: Users, label: "Danh bạ" },
    { icon: User, label: "Cá nhân" },
];

