import { v4 as uuidV4 } from "uuid";
import crypto from "crypto";

// Generate a dynamic seed using APP_SECRET and caller-provided input
const generateDynamicSeed = (callerInput: string | number): Buffer => {
    const internalValue = process.env.APP_SECRET || "pMqH9zVM+0ENpDS/BF6ASyF0RgCPvTxyQh5seLYllsajYqH37xbYUeRoEITnGWDz"; // Fallback if no APP_SECRET
    const combinedValue = `${internalValue}${callerInput}`; // Combine static secret with dynamic input
    return crypto.createHash("sha256").update(combinedValue).digest().slice(0, 16); // 16-byte seed
};

// Generate prefixed UUID within 32 characters
export function generatePrefixedUUID(prefix: string, callerInput: string | number): string {
    const dynamicSeed = generateDynamicSeed(callerInput); // Use caller input for seed
    const baseUUID = uuidV4({ random: dynamicSeed }); // Generate UUID with dynamic seed
    const base36UUID = BigInt(`0x${baseUUID.replace(/-/g, "")}`).toString(36); // Convert to Base-36
    const shortUUID = base36UUID.slice(0, 28 - prefix.length); // Adjust length (28 = 32 - prefix length)
    return `${prefix}${shortUUID}`.toUpperCase(); // Total length ≤ 32
}

// Usage with Date.now() as default caller input
export const generateAccountId = (input: string | number = Date.now()) => generatePrefixedUUID("ACCT", input);
export const generateCustomerId = (input: string | number = Date.now()) => generatePrefixedUUID("CUST", input);
export const generateEmployeeId = (input: string | number = Date.now()) => generatePrefixedUUID("EMPL", input);
export const generateUserDeviceId = (input: string | number = Date.now()) => generatePrefixedUUID("UDVC", input);