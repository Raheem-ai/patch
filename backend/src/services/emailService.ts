import { Service } from "@tsed/common";
import config from '../config';
import Mailgun from 'mailgun.js';
import MailgunClient from 'mailgun.js/client';
import formData from 'form-data';
import STRINGS from "common/strings";
import { readFile } from 'fs-extra';
import path from 'path';

const Handlebars = require("handlebars");

const mailgunCreds = config.MAILGUN_CREDS.get();

@Service()
export class EmailService {
    mailgun = new Mailgun(formData);
    client: MailgunClient;

    async $onInit() {
        const { api_key, domain } = mailgunCreds;
        this.client = this.mailgun.client({username: 'api', key: api_key});
    }

    sendEmail = async (recipientEmail: string, subject: string, emailTemplate: string) => { 
        const raheemMailOptions = {
            from: 'Patch <help@getpatch.org>', // config.EMAIL.get().patch_system,
            to: recipientEmail,
            subject: subject,
            html: emailTemplate
        }

        await this.client.messages.create(mailgunCreds.domain, raheemMailOptions)
    }

    sendResetPasswordEmail = async (link: string, recipientEmail: string, userName: string) => {
        const subject = STRINGS.EMAILS.forgotPasswordSubject;
        const filepath = path.resolve(__dirname, '../../../../static/email_templates/passwordReset.html');
        const data: string = await readFile(filepath);
        const passwordResetEmail: string = '' + data;
        const template = Handlebars.compile(passwordResetEmail);
        const emailBody = template({ "link": link, "email": recipientEmail, "name": userName});

        await this.sendEmail(recipientEmail, subject, emailBody);
    }
}