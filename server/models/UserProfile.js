import mongoose from 'mongoose';

const { Schema } = mongoose;

const userProfileSchema = new Schema(
  {
    address: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple documents to have a null value for username
      trim: true,
    },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' }, // URL to the avatar image
    socials: {
      twitter: { type: String, default: '' },
      github: { type: String, default: '' },
    },
  },
  { timestamps: true } // Adds createdAt and updatedAt fields automatically
);

export const UserProfile = mongoose.model('UserProfile', userProfileSchema);

