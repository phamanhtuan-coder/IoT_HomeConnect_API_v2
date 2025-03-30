// src/config/nodemailer.ts
import nodemailer from 'nodemailer';
import hbs from 'nodemailer-express-handlebars';
import path from 'path';

// @ts-ignore
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

transporter.use('compile', (hbs as any)({
    viewEngine: {
        extName: '.handlebars',
        layoutsDir: path.join(__dirname, '../templates/emails'),
        defaultLayout: false,
    },
    viewPath: path.join(__dirname, '../templates/emails'),
    extName: '.handlebars',
}));

export default transporter;