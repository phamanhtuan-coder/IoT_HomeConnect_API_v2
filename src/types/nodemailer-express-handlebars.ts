/**
 * Định nghĩa module cho `nodemailer-express-handlebars`.
 * Cung cấp kiểu dữ liệu và hàm tích hợp Handlebars vào Nodemailer.
 */
declare module 'nodemailer-express-handlebars' {
    import {PluginFunction} from "nodemailer/lib/mailer";

    /**
     * Tuỳ chọn cấu hình cho plugin Handlebars.
     */
    interface Options {
        viewEngine: {
            /** Phần mở rộng của file template, ví dụ: `.hbs` */
            extName: string;
            /** Thư mục chứa các layout */
            layoutsDir: string;
            /** Tên layout mặc định hoặc false nếu không dùng layout */
            defaultLayout: string | false;
        };
        /** Đường dẫn tới thư mục chứa các view */
        viewPath: string;
        /** Phần mở rộng của file template, ví dụ: `.hbs` */
        extName: string;
    }

    /**
     * Hàm khởi tạo plugin Handlebars cho Nodemailer.
     * @param options Tuỳ chọn cấu hình cho plugin
     * @returns PluginFunction cho Nodemailer
     */
    function hbs(options: Options): PluginFunction;
    export = hbs;
}