export const systemText = (t, meta, fallback) =>
    meta?.action === "members_added"
        ? t("system.membersAdded", { actor: meta.actor, targets: (meta.targets || []).join(", ") })
        : fallback;