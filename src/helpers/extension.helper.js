const removeTagHtml = (str) => {    
    return str.replace(/(<([^>]+)>)/gi, '');
}

const convertToSlug = (str) => {
    // Chuyển chuỗi về dạng không dấu
    str = str
        .normalize("NFD") // Chuẩn hóa Unicode, tách ký tự thành ký tự cơ bản và dấu
        .replace(/[\u0300-\u036f]/g, "") // Loại bỏ các ký hiệu dấu
        .replace(/[đĐ]/g, "d"); // Thay thế "đ" và "Đ" thành "d"

    // Chuyển thành slug
    return str
        .toLowerCase() // Chuyển thành chữ thường
        .replace(/[^a-z0-9]+/g, '-') // Thay thế tất cả ký tự không phải chữ cái hoặc số bằng dấu gạch ngang
        .replace(/-+/g, '-') // Thay thế nhiều dấu gạch ngang liên tiếp bằng một dấu
        .replace(/^-+|-+$/g, ''); // Loại bỏ dấu gạch ngang ở đầu và cuối
};

/**
 * Tạo slug duy nhất bằng cách kiểm tra trùng lặp
 * @param name - Tên cần tạo slug
 * @param checkFunction - Hàm kiểm tra slug đã tồn tại chưa
 * @param maxAttempts - Số lần thử tối đa (mặc định 100)
 * @returns Slug duy nhất
 */
async function generateUniqueSlug(
    name, 
    checkFunction,
    maxAttempts = 100
) {
    let baseSlug = convertToSlug(name);
    let slug = baseSlug;
    let attempt = 1;

    // Kiểm tra slug gốc
    let existing = await checkFunction(slug);
    
    // Nếu slug đã tồn tại, thêm số vào cuối
    while (existing && attempt <= maxAttempts) {
        slug = `${baseSlug}-${attempt}`;
        existing = await checkFunction(slug);
        attempt++;
    }

    if (attempt > maxAttempts) {
        throw new Error(`Không thể tạo slug duy nhất sau ${maxAttempts} lần thử`);
    }

    return slug;
}

/**
 * Tạo slug duy nhất cho device template
 * @param name - Tên device template
 * @param prisma - Prisma client instance
 * @param excludeId - ID cần loại trừ (cho trường hợp update)
 * @returns Slug duy nhất
 */
async function generateUniqueDeviceTemplateSlug(
    name, 
    prisma, 
    excludeId
) {
    return generateUniqueSlug(
        name,
        async (slug) => {
            const where = { 
                slug, 
                is_deleted: false 
            };
            
            if (excludeId) {
                where.template_id = { not: excludeId };
            }
            
            return await prisma.product.findFirst({ where });
        }
    );
}

/**
 * Tạo slug duy nhất cho product
 * @param name - Tên sản phẩm
 * @param prisma - Prisma client instance
 * @param excludeId - ID cần loại trừ (cho trường hợp update)
 * @returns Slug duy nhất
 */
async function generateUniqueProductSlug(
    name, 
    prisma, 
    excludeId
) {
    return generateUniqueSlug(
        name,
        async (slug) => {
            const where = { slug };
            
            if (excludeId) {
                where.id = { not: excludeId };
            }
            
            return await prisma.product.findFirst({ where });
        }
    );
}

module.exports = {
    removeTagHtml,
    convertToSlug,
    generateUniqueDeviceTemplateSlug,
    generateUniqueProductSlug
}