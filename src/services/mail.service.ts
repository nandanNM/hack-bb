import Mailjet from "node-mailjet";

const mailjet = Mailjet.apiConnect(process.env.MJ_APIKEY_PUBLIC as string, process.env.MJ_APIKEY_PRIVATE as string);

interface SendMailParams {
  mail: string[];
  subject: string;
  text: string;
  html: string;
}

export const sendMail = async ({ mail, subject, text, html }: SendMailParams) => {
  try {
    const request = mailjet.post("send", { version: "v3.1" }).request({
      Messages: [
        {
          From: {
            Email: "shardendumishra02@gmail.com",
            Name: "Shardendu Mishra",
          },
          To: mail.map((email) => ({ Email: email })),
          Subject: subject,
          TextPart: text,
          HTMLPart: html,
        },
      ],
    });

    const result = await request;
    // eslint-disable-next-line no-console
    console.log("Email sent successfully:", result.body);
    return result.body;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Email sending failed:", err);
    throw err;
  }
};
