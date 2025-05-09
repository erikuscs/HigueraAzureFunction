const { Client } = require("@microsoft/microsoft-graph-client");
require("isomorphic-fetch");

module.exports = async function (context, req) {
  const token = req.headers.authorization?.replace("Bearer ", "");

  if (!token) {
    context.res = {
      status: 401,
      body: "Missing token"
    };
    return;
  }

  const graphClient = Client.init({
    authProvider: (done) => done(null, token)
  });

  try {
    await graphClient.api("/me/sendMail").post({
      message: {
        subject: "Higuera Project Summary",
        body: {
          contentType: "Text",
          content: req.body.message
        },
        toRecipients: [
          {
            emailAddress: { address: "project-team@yourdomain.com" }
          }
        ]
      }
    });

    context.res = { status: 200, body: "Email sent" };
  } catch (error) {
    context.res = { status: 500, body: error.message };
  }
};