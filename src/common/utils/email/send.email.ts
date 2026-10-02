import nodemailer from "nodemailer";
import { APPLICATION_NAME, EMAIL_APP, EMAIL_APP_PASS } from "../../../config/config";
import { BadRequestException } from "../../exceptions";
import Mail from "nodemailer/lib/mailer";


export const sendEmail = async ({
  from,
  to,
  cc,
  bcc,
  subject,
  attachments = [],
  html, 
} : Mail.Options) : Promise <void> => {

  if (! to && ! cc && ! bcc) {
    throw new BadRequestException ("Invalid recipient" );
  }


  // Create a transporter object to detect the email service provider and send the email
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: EMAIL_APP,
      pass: EMAIL_APP_PASS ,
    },
  })


 
  const info = await transporter.sendMail({
      from : `"${APPLICATION_NAME}" <${EMAIL_APP}>`, // sender address
      to ,
      cc,
      bcc,
    subject,
      
      html, // HTML version of the message
      attachments
    });

  console.log("Message sent:", info.messageId);
  
  
  };



