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

const templatesPath = process.env.NODE_ENV === 'production'
    ? path.join(process.cwd(), 'dist', 'templates', 'emails')
    : path.join(process.cwd(), 'src', 'templates', 'emails');

transporter.use('compile', (hbs as any)({
    viewEngine: {
        extName: '.handlebars',
        layoutsDir: templatesPath,
        defaultLayout: false,
    },
    viewPath: templatesPath,
    extName: '.handlebars',
}));

export default transporter;

