const DEFAULTS = {
	contractName: import.meta.env.VITE_CONTRACT_NAME || "",
	networkId: import.meta.env.VITE_NEAR_NETWORK || "testnet",
	nodeUrl: import.meta.env.VITE_NEAR_NODE_URL || "https://rpc.testnet.near.org",
	walletUrl: import.meta.env.VITE_NEAR_WALLET_URL || "https://wallet.testnet.near.org",
	helperUrl: import.meta.env.VITE_NEAR_HELPER_URL || "https://helper.testnet.near.org",
	explorerUrl: import.meta.env.VITE_NEAR_EXPLORER_URL || "https://explorer.testnet.near.org"
};

export function getNearConfig() {
	return {
		...DEFAULTS,
		deps: {}
	};
}

export function getContractName() {
	return DEFAULTS.contractName;
}
