import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export function generateAuthToken(address) {
  return jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAuthToken(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}
