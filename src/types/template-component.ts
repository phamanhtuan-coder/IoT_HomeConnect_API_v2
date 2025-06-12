/**
 * @interface TemplateComponent
 * Đại diện cho dữ liệu của một thành phần mẫu (Template Component).
 *
 * @property {number} template_component_id - ID của thành phần mẫu.
 * @property {number | null} template_id - ID của mẫu, có thể null.
 * @property {number | null} component_id - ID của thành phần, có thể null.
 * @property {number} quantity_required - Số lượng yêu cầu của thành phần.
 * @property {Date | null} created_at - Thời gian tạo, có thể null.
 * @property {Date | null} updated_at - Thời gian cập nhật, có thể null.
 * @property {boolean} is_deleted - Trạng thái xóa của thành phần.
 */
export interface TemplateComponent {
    template_component_id: number;
    template_id: string | null;
    component_id: string | null;
    quantity_required: number;
    created_at: Date | null;
    updated_at: Date | null;
    is_deleted: boolean;
}

/**
 * @interface TemplateComponentInput
 * Đầu vào để tạo hoặc cập nhật một thành phần mẫu (Template Component).
 *
 * @property {number} template_id - ID của mẫu.
 * @property {number} component_id - ID của thành phần.
 * @property {number} quantity_required - Số lượng yêu cầu của thành phần.
 */
export interface TemplateComponentInput {
    template_id: string;
    component_id: string;
    quantity_required: number;
}