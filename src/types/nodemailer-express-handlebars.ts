// src/types/nodemailer-express-handlebars.d.ts
declare module 'nodemailer-express-handlebars' {
    import {PluginFunction} from "nodemailer/lib/mailer";

    interface Options {
        viewEngine: {
            extName: string;
            layoutsDir: string;
            defaultLayout: string | false;
        };
        viewPath: string;
        extName: string;
    }

    function hbs(options: Options): PluginFunction;
    export = hbs;
}