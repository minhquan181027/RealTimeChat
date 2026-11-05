import { useChatStore } from "@/stores/useChatStore";

import React from 'react'

const DirectMessage = () => {
    const { conversations } = useChatStore();
    if (!conversations) return;

    const directConversations = conversations.filter((c) => c.type === 'direct');


    return (
        <div>

        </div>
    )
}

export default DirectMessage
