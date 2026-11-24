export const systemText = (t, meta, fallback) => {
    if (meta?.action === "members_added") {
        return t("system.membersAdded", {
            actor: meta.actor,
            targets: (meta.targets || []).join(", "),
        });
    }
    if (meta?.action === "member_left") {
        return t("system.memberLeft", { actor: meta.actor });
    }
    return fallback;
};