export enum Permission {
    // FIRMWARE
    SUBMIT_TEST_RESULT = 1,
    SUBMIT_APPROVED_FIRMWARE = 2,
    VIEW_FIRMWARE = 3,
    CREATE_FIRMWARE = 4,
    UPDATE_FIRMWARE = 5,
    DELETE_FIRMWARE = 6,
    VIEW_FIRMWARE_HISTORY = 7,
    VIEW_FIRMWARE_HISTORY_DETAIL = 8,
    
    // PRODUCTION TRACKING
    VIEW_PRODUCTION_TRACKING = 9,
    CREATE_PRODUCTION_TRACKING = 10,
    UPDATE_PRODUCTION_SERIAL = 11,
    REJECT_PRODUCTION_SERIAL = 13,
    PRINT_SERIAL_LABEL = 14,
    CANCEL_PRODUCTION_SERIAL = 15,
    CONFIRM_ASSEMBLY_PROGRESSED = 16, // Xác nhận hoàn thành sản xuất và chuyển qua bước chờ nạp firmware
    CONFIRM_FIRMWARE_UPLOAD_STAGE = 17, // Quyền xác nhận tại giai đoạn nạp firmware
    CONFIRM_QC_STAGE = 18, // Xác nhận qua QC và chuyển qua bước chờ đóng gói
    CONFIRM_PACKING_STAGE = 19, // Quyền thực hiện tại stage đóng gói

    // R&D
    // Tester
    // QC
    // Administrator
    // Warehouse staff
    // Marketing
    // Technical support
    // Director
    // Production Staff
}