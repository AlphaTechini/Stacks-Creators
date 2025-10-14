import { VMContext, u128 } from "near-sdk-as";
import {
  create_profile,
  follow_influencer,
  get_followers,
  get_latest_tokens,
  get_profile,
  get_token,
  get_tokens_by_owner,
  mint_token,
  tip_token,
  Token,
  TokenMetadata
} from "../index";

function setSigner(accountId: string): void {
  VMContext.setSigner_account_id(accountId);
  VMContext.setPredecessor_account_id(accountId);
}

describe("profiles", () => {
  it("creates and fetches influencer profile", () => {
    setSigner("alice.testnet");
    VMContext.setBlock_timestamp(1);
    const profile = create_profile("Alice", "Photographer", "ipfs://avatar1");
    expect(profile.displayName).toBe("Alice");
    const stored = get_profile("alice.testnet");
    expect(stored).not.toBeNull();
    if (stored !== null) {
      expect(stored.followers).toBe(0);
    }
  });
});

describe("minting", () => {
  beforeEach(() => {
    setSigner("alice.testnet");
    VMContext.setBlock_timestamp(10);
  });

  it("mints an NFT and tracks owner", () => {
    VMContext.setAttached_deposit(u128.from("1000000000000000000000000"));
    const metadata = new TokenMetadata("AI Selfie", "Stylized portrait", "ipfs://converted1");
    const token = mint_token("token-1", metadata);
    expect<Token>(token).not.toBeNull();
    expect(token.ownerId).toBe("alice.testnet");
    expect(token.metadata.media).toBe("ipfs://converted1");

    const latest = get_latest_tokens(1);
    expect(latest.length).toBe(1);
    expect(latest[0].tokenId).toBe("token-1");

    const byOwner = get_tokens_by_owner("alice.testnet", 5);
    expect(byOwner.length).toBe(1);
  });

  it("allows tipping a token", () => {
    VMContext.setAttached_deposit(u128.from("1000000000000000000000000"));
    const token = mint_token("token-2", new TokenMetadata("AI Selfie 2", "", "ipfs://converted2"));
    expect(token.tips).toBe("0");

    setSigner("bob.testnet");
    VMContext.setAttached_deposit(u128.from("500000000000000000000000"));
    const updated = tip_token("token-2");
    expect(updated.tips).toBe("500000000000000000000000");
  });

  it("increments followers when joining fan club", () => {
    setSigner("alice.testnet");
    VMContext.setBlock_timestamp(30);
    create_profile("Alice", "Bio", "ipfs://avatar");

    setSigner("carol.testnet");
    follow_influencer("alice.testnet");
    const profile = get_profile("alice.testnet");
    expect(profile).not.toBeNull();
    if (profile !== null) {
      expect(profile.followers).toBe(1);
    }

    const followers = get_followers("alice.testnet");
    expect(followers.length).toBe(1);
    expect(followers[0]).toBe("carol.testnet");
  });
});
