import mongoose from 'mongoose';

const { Schema } = mongoose;

const nftItemSchema = new Schema(
  {
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    creatorAddress: {
      type: String,
      required: true,
      index: true,
    },
    ownerAddress: {
      type: String,
      required: true,
      index: true,
    },
    imageUrl: { type: String, required: true },
    aiImageUrl: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    listed: { type: Boolean, default: false, index: true },
    txId: { type: String, required: true },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields
);

export const NFTItem = mongoose.model('NFTItem', nftItemSchema);
