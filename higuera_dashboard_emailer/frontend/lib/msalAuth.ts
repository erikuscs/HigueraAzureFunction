import { PublicClientApplication } from "@azure/msal-browser";

const msalInstance = new PublicClientApplication({
  auth: {
    clientId: "YOUR_CLIENT_ID",
    authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
    redirectUri: "http://localhost:3000"
  }
});

export const getMicrosoftAccessToken = async () => {
  const account = (await msalInstance.loginPopup()).account;
  const result = await msalInstance.acquireTokenSilent({
    scopes: ["Mail.Send"],
    account
  });
  return result.accessToken;
};