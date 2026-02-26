import { hashPassword, verifyPassword } from "better-auth/crypto";

export const passwordGenerator = (email: string): string => {
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  const password: string = `${email.trim().toLowerCase()}@${randomNum}`;
  return password;
};

export const passwordHasher = async (password: string): Promise<string> => {
  return await hashPassword(password);
};

export const passwordCompare = async (password: string, hashedPassword: string): Promise<boolean> => {
  console.log("🔐 [PASSWORD COMPARE] Starting password comparison");
  console.log("📝 [PASSWORD COMPARE] Plain password length:", password?.length);
  console.log("🔒 [PASSWORD COMPARE] Hashed password length:", hashedPassword?.length);
  console.log("🔒 [PASSWORD COMPARE] Hashed password starts with:", hashedPassword?.substring(0, 10));

  try {
    const result = await verifyPassword({ password, hash: hashedPassword });
    console.log("✅ [PASSWORD COMPARE] Comparison result:", result);
    return result;
  } catch (error) {
    console.error("❌ [PASSWORD COMPARE] Error during comparison:", error);
    throw error;
  }
};
