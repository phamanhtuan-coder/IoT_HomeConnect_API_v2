/**
      * Mở rộng module `nodemailer` để hỗ trợ thêm các tuỳ chọn cho gửi mail.
      *
      * @module nodemailer
      */

     declare module 'nodemailer' {
         /**
          * Tuỳ chọn gửi mail, bổ sung hỗ trợ template Handlebars và context dữ liệu.
          *
          * @property {string} [template] - Tên template Handlebars sử dụng để render email.
          * @property {Record<string, any>} [context] - Dữ liệu truyền vào template để render nội dung email.
          */
         interface SendMailOptions {
             template?: string; // Thêm hỗ trợ Handlebars
             context?: Record<string, any>;
         }
     }