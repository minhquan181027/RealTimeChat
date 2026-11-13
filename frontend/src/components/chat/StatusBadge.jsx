// src/components/chat/StatusBadge.jsx
import { cn } from "@/lib/utils";

const STATUS_STYLES = {
    online: "bg-emerald-500",
    offline: "bg-gray-400",
};

const StatusBadge = ({ status = "offline", className }) => {
    return (
        <span
            className={cn(
                "block size-3.5 rounded-full ring-2 ring-background",
                STATUS_STYLES[status] ?? STATUS_STYLES.offline,
                className
            )}
        />
    );
};

export default StatusBadge;