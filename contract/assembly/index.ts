import { context, logging, PersistentUnorderedMap, PersistentVector, u128 } from "near-sdk-as";

@nearBindgen
export class TokenMetadata {
  constructor(
    public title: string,
    public description: string,
    public media: string,
    public mediaHash: string = "",
    public extra: string = "",
    public issuedAt: string = "",
    public reference: string = "",
    public referenceHash: string = "",
    public animationUrl: string = ""
  ) {}
}

@nearBindgen
export class Token {
  constructor(
    public tokenId: string,
    public ownerId: string,
    public metadata: TokenMetadata,
    public createdAt: u64,
    public tips: string = "0"
  ) {}
}

@nearBindgen
export class InfluencerProfile {
  constructor(
    public accountId: string,
    public displayName: string,
    public bio: string,
    public avatarMedia: string,
    public createdAt: u64,
    public followers: u32 = 0,
    public minted: u32 = 0
  ) {}
}

const profiles = new PersistentUnorderedMap<string, InfluencerProfile>("p");
const tokens = new PersistentUnorderedMap<string, Token>("t");
const feed = new PersistentVector<string>("f");

const MINT_FEE: u128 = u128.from("1000000000000000000000000"); // 0.001 NEAR

function followersCollection(accountId: string): PersistentVector<string> {
  return new PersistentVector<string>("fi" + accountId);
}

function isFollower(collection: PersistentVector<string>, accountId: string): bool {
  for (let i = 0; i < collection.length; i++) {
    if (collection[i] == accountId) {
      return true;
    }
  }
  return false;
}

export function create_profile(displayName: string, bio: string, avatarMedia: string): InfluencerProfile {
  const accountId = context.sender;
  assert(!profiles.contains(accountId), "Profile already exists");
  assert(displayName.length > 0, "Display name is required");
  const profile = new InfluencerProfile(accountId, displayName, bio, avatarMedia, context.blockTimestamp);
  profiles.set(accountId, profile);
  logging.log(`Profile created for ${accountId}`);
  return profile;
}

export function get_profile(accountId: string): InfluencerProfile | null {
  return profiles.get(accountId);
}

export function follow_influencer(accountId: string): InfluencerProfile {
  assert(accountId != context.sender, "You cannot follow yourself");
  assert(profiles.contains(accountId), "Profile not found");
  const followers = followersCollection(accountId);
  if (!isFollower(followers, context.sender)) {
    followers.push(context.sender);
    const profile = profiles.getSome(accountId);
    profile.followers = followers.length as u32;
    profiles.set(accountId, profile);
    logging.log(`${context.sender} followed ${accountId}`);
    return profile;
  }
  return profiles.getSome(accountId);
}

export function get_followers(accountId: string): string[] {
  assert(profiles.contains(accountId), "Profile not found");
  const followers = followersCollection(accountId);
  const result = new Array<string>(followers.length);
  for (let i = 0; i < followers.length; i++) {
    result[i] = followers[i];
  }
  return result;
}

export function mint_token(tokenId: string, metadata: TokenMetadata): Token {
  assert(metadata.media.length > 0, "NFT media is required");
  assert(!tokens.contains(tokenId), "Token already exists");
  assert(u128.ge(context.attachedDeposit, MINT_FEE), "Minting requires at least 0.001 NEAR deposit");

  const ownerId = context.sender;
  const token = new Token(tokenId, ownerId, metadata, context.blockTimestamp);
  tokens.set(tokenId, token);
  feed.push(tokenId);

  if (profiles.contains(ownerId)) {
    const profile = profiles.getSome(ownerId);
    profile.minted += 1;
    profiles.set(ownerId, profile);
  }

  logging.log(`Minted token ${tokenId} for ${ownerId}`);
  return token;
}

export function get_token(tokenId: string): Token | null {
  return tokens.get(tokenId);
}

export function get_latest_tokens(limit: i32 = 10): Token[] {
  const result = new Array<Token>();
  if (limit <= 0) {
    return result;
  }

  const total = feed.length;
  const safeLimit = limit < total ? limit : total;
  for (let i: i32 = 0; i < safeLimit; i++) {
    const index: i32 = total - 1 - i;
    const tokenId = feed[index];
    result.push(tokens.getSome(tokenId));
  }
  return result;
}

export function get_tokens_by_owner(ownerId: string, limit: i32 = 20): Token[] {
  const result = new Array<Token>();
  if (limit <= 0) {
    return result;
  }
  let added: i32 = 0;
  // iterate from newest to oldest
  for (let idx: i32 = feed.length - 1; idx >= 0 && added < limit; idx--) {
    const tokenId = feed[idx];
    const token = tokens.getSome(tokenId);
    if (token.ownerId == ownerId) {
      result.push(token);
      added += 1;
    }
    // prevent infinite loop if feed.length is 0
    if (idx == 0) break;
  }
  return result;
}

export function tip_token(tokenId: string): Token {
  assert(context.attachedDeposit > u128.Zero, "Attach a deposit when tipping");
  const token = tokens.getSome(tokenId);
  const newTotal = u128.add(u128.fromString(token.tips), context.attachedDeposit);
  token.tips = newTotal.toString();
  tokens.set(tokenId, token);
  logging.log(`${context.sender} tipped ${tokenId} with ${context.attachedDeposit.toString()} yoctoNEAR`);
  return token;
}
