# Fuel Order Bot

WhatsApp bot for placing fuel orders. Built with Meta WhatsApp Cloud API and Pipedream.

## Architecture

- **main-webhook.js** — Main Pipedream workflow. Receives WhatsApp messages, sends the WhatsApp Flow form when user texts `order`, and processes completed orders by sending emails to the supplier and owner.
- **flow-endpoint.js** — Flow endpoint Pipedream workflow. Handles encrypted INIT requests from the WhatsApp Flow to provide date picker data.

## Setup

### 1. Meta Developer Portal
- Create a WhatsApp Business app
- Register your business phone number
- Set the webhook URL to your main-webhook Pipedream URL
- Subscribe to the `messages` webhook field

### 2. WhatsApp Flows
- Build your flow in WhatsApp Manager
- Set the flow endpoint URI to your flow-endpoint Pipedream URL
- Register your RSA public key via the Graph API
- Publish the flow

### 3. Pipedream Environment Variables
Set these in Pipedream → Settings → Environment Variables:

| Variable | Description |
|----------|-------------|
| `WHATSAPP_TOKEN` | Meta WhatsApp access token |
| `YOUR_EMAIL` | Your notification email |
| `FLOW_ID` | WhatsApp Flow ID |
| `FLOW_PRIVATE_KEY` | RSA private key for flow encryption |
| `SUPPLIER_1_EMAIL` | Supplier 1 email address |
| `SUPPLIER_1_ACCOUNT` | Supplier 1 account number |
| `SUPPLIER_2_EMAIL` | Supplier 2 email address |
| `SUPPLIER_2_ACCOUNT` | Supplier 2 account number |

### 4. RSA Key Generation
```bash
openssl genrsa -out flow_private_key.pem 2048
openssl rsa -in flow_private_key.pem -pubout -out flow_public_key.pem
```

Register the public key:
```bash
curl -X POST \
  'https://graph.facebook.com/v25.0/YOUR_PHONE_NUMBER_ID/whatsapp_business_encryption' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data-urlencode 'business_public_key=YOUR_PUBLIC_KEY'
```

## Usage

Text **order** to the business WhatsApp number to open the fuel order form.
