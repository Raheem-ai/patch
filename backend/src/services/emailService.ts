import { Inject, Service } from "@tsed/common";
import config from '../config';
import Mailgun from 'mailgun.js';
import MailgunClient from 'mailgun.js/client';
import formData from 'form-data';
import STRINGS from "common/strings";

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
            from: config.EMAIL.get().story_confirmation_sender,
            to: recipientEmail,
            subject: subject,
            text: emailTemplate, // change to html: [handlebars template]
        }

        await this.client.messages.create(mailgunCreds.domain, raheemMailOptions)
    }

    sendResetPasswordEmail = async (link: string, recipientEmail: string) => {

        // define handlebars template and pass .... 
        const subject = 'Reset Patch password'; // get from STRINGS
        const emailBody = 'The majick link is ' + link; // make a handlebars template and pass it in

        await this.sendEmail(recipientEmail, subject, emailBody);
    }

}