export const systemText = (t, meta, fallback) => {
    if (meta?.action === "call_history") {
        return t(`call.history.${meta.status}`, { defaultValue: t("call.videoCall") });
    }
    if (meta?.action === "members_added") {
        return t("system.membersAdded", {
            actor: meta.actor,
            targets: (meta.targets || []).join(", "),
        });
    }
    if (meta?.action === "member_left") {
        return t("system.memberLeft", { actor: meta.actor });
    }
    if (meta?.action === "member_removed") {
        return t("system.memberRemoved", { actor: meta.actor, target: meta.target });
    }
    if (meta?.action === "group_admin_transferred") {
        return t("system.groupAdminTransferred", { actor: meta.actor, newAdmin: meta.newAdmin });
    }
    return fallback;
};