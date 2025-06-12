import { ulid } from 'ulid';

/**
 * Chuyển ngày hiện tại thành định dạng DDMMMYY (ví dụ: 06JUN25)
 */
const getReadableDate = (): string => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = now.toLocaleString('en-US', { month: 'short' }).toUpperCase();
    const year = String(now.getFullYear()).slice(-2);
    return `${day}${month}${year}`;
};

/**
 * Sinh ULID-based ID với prefix + readable date + ULID21
 * Ví dụ: ACCT06JUN25X8F5G2E7Z4N9D81FJ7VTP
 */
export function generateUlidId(prefix: string): string {
    const date = getReadableDate(); // 06JUN25
    const ulidPart = ulid().slice(0, 21); // cắt để tổng 32 ký tự
    return `${prefix}${date}${ulidPart}`;
}

// === ID generators cho từng thực thể ===
export const generateAccountId = () => generateUlidId("ACCT");
export const generateCustomerId = () => generateUlidId("CUST");
export const generateEmployeeId = () => generateUlidId("EMPL");
export const generateUserDeviceId = () => generateUlidId("UDVC");
export const generateDeviceId = () => generateUlidId("IOTD");
export const generateFirmwareId = () => generateUlidId("FIRM");
export const generateComponentId = () => generateUlidId("COMP");
export const generatePlanningId = () => generateUlidId("PLAN");
export const generateBatchId = () => generateUlidId("BTCH");
export const generateTemplateId = () => generateUlidId("DEVC");
export const generateTicketId = () => generateUlidId("TICK");

export const calculatePlanningStatus = (batches: any[]): string => {
    if (!batches || batches.length === 0) return "pending";

    const activeBatches = batches.filter(batch => 
        batch.status !== "rejected" && batch.status !== "cancelled"
    );

    if (activeBatches.length === 0) {
        return "rejected";
    }

    const hasFixBatches = activeBatches.some(batch => 
        batch.status === "relabeling" || batch.status === "fixproduction"
    );

    if (hasFixBatches) {
        return "fix";
    }

    const statusPriority = {
        pending: 1,
        in_progress: 2,
        pendingimport: 3,
        completed: 4,
        expired: 0,
        cancelled: 0,
    };
    const slowestBatch = activeBatches.reduce((slowest, current) => {
        const currentPriority = statusPriority[current.status as keyof typeof statusPriority] || 0;
        const slowestPriority = statusPriority[slowest.status as keyof typeof statusPriority] || 0;
        return currentPriority < slowestPriority ? current : slowest;
    });

    return slowestBatch.status;
};

export function validateVersion(version: string): { success: boolean; error?: string | null, normalizedVersion?: string } {
    // Kiểm tra format version (chỉ cho phép x.y.z)
    const versionParts = version.split('.');
    
    // Kiểm tra độ dài phải đúng 3 phần
    if (versionParts.length !== 3) {
        return { 
            success: false, 
            error: 'Version phải có định dạng x.y.z (ví dụ: 5.1.2)' 
        };
    }
    
    // Kiểm tra mỗi phần phải là số và không có số 0 ở đầu
    for (const part of versionParts) {
        if (!/^(0|[1-9]\d*)$/.test(part)){
            return { 
                success: false,
                error: 'Mỗi phần của version phải là số nguyên dương và không bắt đầu bằng số 0' 
            };
        }
    }

    const normalizedVersion = versionParts.map(part => part.padStart(3, '0')).join('.');

    return { success: true, error: null, normalizedVersion };
}