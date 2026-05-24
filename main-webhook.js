import axios from "axios";

export default defineComponent({
  async run({ steps, $ }) {
    // Handle Meta webhook verification
    if (steps.trigger.event.method === "GET") {
      const challenge = steps.trigger.event.query["hub.challenge"];
      await $.respond({ status: 200, body: challenge });
      return;
    }

    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const YOUR_EMAIL = process.env.YOUR_EMAIL;

    const body = steps.trigger.event.body;
    const value = body?.entry?.[0]?.changes?.[0]?.value;
    const message = value?.messages?.[0];

    await $.respond({ status: 200, body: "OK" });

    if (!message) return;

    const from = message.from;
    const phoneNumberId = value.metadata.phone_number_id;

    const sendMsg = async (text) => {
      await axios.post(
        `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
        { messaging_product: "whatsapp", to: from, type: "text", text: { body: text } },
        { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
      );
    };

    // Flow completion — Place Order was tapped
    if (message.type === "interactive" && message.interactive?.type === "nfm_reply") {
      const order = JSON.parse(message.interactive.nfm_reply.response_json);
      const { fuel_supplier, regular_qty, premium_qty, diesel_qty, delivery_date, delivery_slot } = order;

      // Add your suppliers here — keep this file out of version control
      // or use environment variables / a private config
      const suppliers = {
        offen_petroleum: { name: "Offen Petroleum", email: process.env.SUPPLIER_1_EMAIL, account: process.env.SUPPLIER_1_ACCOUNT },
        flyers: { name: "Flyers", email: process.env.SUPPLIER_2_EMAIL, account: process.env.SUPPLIER_2_ACCOUNT }
      };

      const supplier = suppliers[fuel_supplier];

      const fmt = (q) => (!q || q === "0" || q === "") ? null : q;

      const formatDate = (d) => {
        const [y, m, day] = d.split("-");
        return `${m}/${day}/${y}`;
      };

      const gallonLines = [
        fmt(regular_qty) ? `      1. Regular – ${fmt(regular_qty)} Gallons` : null,
        fmt(premium_qty) ? `      2. Premium – ${fmt(premium_qty)} Gallons` : null,
        fmt(diesel_qty)  ? `      3. Diesel – ${fmt(diesel_qty)} Gallons`   : null,
      ].filter(Boolean).join("\n");

      const emailBody =
        `Please confirm the load via email or phone call.\n\n` +
        `1. Gallons Needed\n\n` +
        `${gallonLines}\n\n` +
        `2. Request of Date and Time – ${formatDate(delivery_date)}\n\n` +
        `      1. Special Delivery Instructions – Delivery Window ${delivery_slot}\n` +
        `      2. Name of person ordering – SAM\n` +
        `      3. Account number – ${supplier?.account}\n` +
        `      4. Address – 500 Kietzke Lane Reno, NV 89502\n` +
        `      5. Phone no. 775 409 0795`;

      $.export("sendEmail", true);
      $.export("supplierEmail", supplier?.email);
      $.export("yourEmail", YOUR_EMAIL);
      $.export("emailSubject", `Fuel Order – ${formatDate(delivery_date)} – ${supplier?.name}`);
      $.export("emailBody", emailBody);

      await sendMsg("Order confirmed and sent. You will receive confirmation from the supplier.");
      return;
    }

    // Text "order" → send flow
    if (message.type !== "text") return;
    const text = message.text?.body?.trim().toLowerCase();
    if (text !== "order") return;

    await axios.post(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        messaging_product: "whatsapp",
        to: from,
        type: "interactive",
        interactive: {
          type: "flow",
          header: { type: "text", text: "Fuel Order" },
          body: { text: "Place a new fuel order using the form below." },
          footer: { text: "M Food Mart" },
          action: {
            name: "flow",
            parameters: {
              flow_message_version: "3",
              flow_token: `order_${Date.now()}`,
              flow_id: process.env.FLOW_ID,
              flow_cta: "Order Fuel",
              flow_action: "navigate",
              flow_action_payload: { screen: "FUEL_SELECTION" }
            }
          }
        }
      },
      { headers: { Authorization: `Bearer ${WHATSAPP_TOKEN}`, "Content-Type": "application/json" } }
    );
  }
});
