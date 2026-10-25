// Channels a baker can pick when logging an inquiry or tagging an order.
// Later this should come from onboarding ("which apps do your customers use?").
export const CHANNELS = ["Xiaohongshu", "WeChat", "Instagram", "FB Marketplace", "Text message", "Other"] as const;
export const UNTRACKED = "Untracked"; // orders nobody has tagged with a channel yet
