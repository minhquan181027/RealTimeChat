import { useEffect, useState } from "react";
import { userService } from "@/services/userService";

export const useUserSearch = (keyword) => {
    const [result, setResult] = useState({ q: "", users: [] });

    const q = keyword.trim();
    const canSearch = q.length >= 2;
    const searching = canSearch && result.q !== q;
    const users = canSearch && result.q === q ? result.users : [];

    useEffect(() => {
        if (q.length < 2) return;
        let cancelled = false;
        const timer = setTimeout(async () => {
            try {
                const found = await userService.searchUsers(q);
                if (!cancelled) setResult({ q, users: found });
            } catch (err) {
                console.error("Lỗi tìm kiếm:", err);
                if (!cancelled) setResult({ q, users: [] });
            }
        }, 400);
        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [q]);

    // Sửa 1 user trong kết quả (vd: vừa gửi lời mời -> relation = "sent")
    const patchUser = (id, patch) =>
        setResult((r) => ({
            ...r,
            users: r.users.map((u) => (u._id === id ? { ...u, ...patch } : u)),
        }));

    return { canSearch, searching, users, patchUser };
};