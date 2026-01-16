This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Stripe Webhook Configuration

This application uses Stripe webhooks to process payments and create bookings. Follow these steps to configure the webhook on your Stripe dashboard.

### Setting Up the Webhook

1. **Log in to Stripe Dashboard**
   - Go to [https://dashboard.stripe.com](https://dashboard.stripe.com)
   - Make sure you're in the correct mode (Test or Live)

2. **Navigate to Webhooks**
   - Click on **Developers** in the left sidebar
   - Select **Webhooks**

3. **Add a New Endpoint**
   - Click **Add endpoint**
   - Enter your webhook URL:
     - For production: `https://your-domain.com/api/stripe/webhook`
     - For local development with Stripe CLI: Use the URL provided by `stripe listen`

4. **Select Events to Listen To**
   - Click **Select events**
   - Add the following events:
     - `checkout.session.completed` - Triggered when a payment is successful
     - `account.updated` - Triggered when a connected account is updated
   - Click **Add events**

5. **Create the Endpoint**
   - Click **Add endpoint** to save

6. **Get Your Webhook Secret**
   - After creating the endpoint, click on it to view details
   - Under **Signing secret**, click **Reveal** to see your webhook secret
   - Copy this value and add it to your `.env.local` file:
     ```
     STRIPE_WEBHOOK_SECRET=whsec_your_secret_here
     ```

### Local Development with Stripe CLI

For local testing, use the Stripe CLI to forward webhooks:

1. **Install Stripe CLI**
   ```bash
   # macOS
   brew install stripe/stripe-cli/stripe

   # Or download from https://stripe.com/docs/stripe-cli
   ```

2. **Login to Stripe**
   ```bash
   stripe login
   ```

3. **Forward Webhooks to Local Server**
   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. **Use the Provided Secret**
   - The CLI will output a webhook signing secret (starts with `whsec_`)
   - Add this to your `.env.local` file

### Testing the Webhook

You can trigger test events using the Stripe CLI:

```bash
stripe trigger checkout.session.completed
```

Or use the test endpoint (development only):
```bash
curl -X POST http://localhost:3000/api/test-webhook
```

### Troubleshooting

- **Signature verification failed**: Ensure `STRIPE_WEBHOOK_SECRET` matches the secret from your Stripe dashboard or CLI
- **Webhook not receiving events**: Check that the endpoint URL is correct and publicly accessible (for production)
- **Events not being processed**: Check the server logs for error messages

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
