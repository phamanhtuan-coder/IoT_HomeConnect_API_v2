import { v4 as uuidV4 } from "uuid";
import crypto from "crypto";

/**
 * Tạo seed động dựa trên APP_SECRET và input từ caller.
 * Kết hợp giá trị bí mật nội bộ với input để tạo seed 16 byte dùng cho UUID.
 *
 * @param callerInput - Giá trị đầu vào từ caller (string hoặc number)
 * @returns Buffer - Seed 16 byte
 */
const generateDynamicSeed = (callerInput: string | number): Buffer => {
    const internalValue = process.env.APP_SECRET || "pMqH9zVM+0ENpDS/BF6ASyF0RgCPvTxyQh5seLYllsajYqH37xbYUeRoEITnGWDz"; // Fallback if no APP_SECRET
    const combinedValue = `${internalValue}${callerInput}`; // Combine static secret with dynamic input
    return crypto.createHash("sha256").update(combinedValue).digest().slice(0, 16); // 16-byte seed
};

/**
 * Sinh UUID có prefix, độ dài tối đa 32 ký tự.
 * Sử dụng seed động để tạo UUID duy nhất dựa trên input.
 *
 * @param prefix - Tiền tố cho UUID (ví dụ: "ACCT", "CUST")
 * @param callerInput - Giá trị đầu vào để tạo seed (string hoặc number)
 * @returns string - UUID có prefix, viết hoa, tối đa 32 ký tự
 */
export function generatePrefixedUUID(prefix: string, callerInput: string | number): string {
    const dynamicSeed = generateDynamicSeed(callerInput); // Use caller input for seed
    const baseUUID = uuidV4({ random: dynamicSeed }); // Generate UUID with dynamic seed
    const base36UUID = BigInt(`0x${baseUUID.replace(/-/g, "")}`).toString(36); // Convert to Base-36
    const shortUUID = base36UUID.slice(0, 28 - prefix.length); // Adjust length (28 = 32 - prefix length)
    return `${prefix}${shortUUID}`.toUpperCase(); // Total length ≤ 32
}

// Usage with Date.now() as default caller input
/**
 * Sinh Account ID với prefix "ACCT".
 * @param input - Giá trị đầu vào (string hoặc number), mặc định là Date.now()
 * @returns string - Account ID
 */
export const generateAccountId = (input: string | number = Date.now()) => generatePrefixedUUID("ACCT", input);

/**
 * Sinh Customer ID với prefix "CUST".
 * @param input - Giá trị đầu vào (string hoặc number), mặc định là Date.now()
 * @returns string - Customer ID
 */
export const generateCustomerId = (input: string | number = Date.now()) => generatePrefixedUUID("CUST", input);

/**
 * Sinh Employee ID với prefix "EMPL".
 * @param input - Giá trị đầu vào (string hoặc number), mặc định là Date.now()
 * @returns string - Employee ID
 */
export const generateEmployeeId = (input: string | number = Date.now()) => generatePrefixedUUID("EMPL", input);

/**
 * Sinh User Device ID với prefix "UDVC".
 * @param input - Giá trị đầu vào (string hoặc number), mặc định là Date.now()
 * @returns string - User Device ID
 */
export const generateUserDeviceId = (input: string | number = Date.now()) => generatePrefixedUUID("UDVC", input);