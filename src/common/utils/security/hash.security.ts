import { hash, compare } from "bcrypt";
import { SALT_ROUND } from "../../../config/config";

export const generateHash = async ({
  plaintext,
  salt = SALT_ROUND,
}: {
  plaintext: string;
  salt?: number;
}): Promise<string> => {
  return await hash(plaintext, SALT_ROUND);
};

export const compareHash = async (plaintext: string, hashValue: string): Promise<boolean> => {
  return await compare(plaintext, hashValue);
};