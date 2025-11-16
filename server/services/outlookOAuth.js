const { Client } = require('@microsoft/microsoft-graph-client');
const { AuthenticationProvider } = require('@microsoft/microsoft-graph-client');
const { ConfidentialClientApplication } = require('@azure/msal-node');

class OutlookOAuthService {
  constructor() {
    this.clientApp = new ConfidentialClientApplication({
      auth: {
        clientId: process.env.MICROSOFT_CLIENT_ID,
        clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
        authority: `https://login.microsoftonline.com/${process.env.MICROSOFT_TENANT_ID}`
      }
    });
  }

  async getAccessToken() {
    try {
      const clientCredentialRequest = {
        scopes: ['https://graph.microsoft.com/.default'],
      };

      const response = await this.clientApp.acquireTokenByClientCredential(clientCredentialRequest);
      return response.accessToken;
    } catch (error) {
      console.error('Error obteniendo token:', error);
      throw error;
    }
  }

  async sendEmail(to, subject, body) {
    try {
      const accessToken = await this.getAccessToken();
      
      const authProvider = {
        getAccessToken: async () => {
          return accessToken;
        }
      };

      const graphClient = Client.initWithMiddleware({ authProvider });

      const mail = {
        message: {
          subject: subject,
          body: {
            contentType: 'HTML',
            content: body
          },
          toRecipients: [{
            emailAddress: {
              address: to
            }
          }]
        }
      };

      await graphClient.api('/me/sendMail').post(mail);
      return { success: true };
    } catch (error) {
      console.error('Error enviando email:', error);
      return { success: false, error: error.message };
    }
  }
}

module.exports = OutlookOAuthService;