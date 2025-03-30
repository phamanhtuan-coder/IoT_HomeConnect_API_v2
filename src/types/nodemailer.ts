// src/types/nodemailer.d.ts
declare module 'nodemailer' {
    interface SendMailOptions {
        template?: string; // Add Handlebars support
        context?: Record<string, any>;
    }
}