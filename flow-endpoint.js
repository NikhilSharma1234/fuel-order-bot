import crypto from "crypto";

export default defineComponent({
  async run({ steps, $ }) {
    const privateKey = process.env.FLOW_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const body = steps.trigger.event.body;

    try {
      const { encrypted_aes_key, encrypted_flow_data, initial_vector } = body;

      const decryptedAesKey = crypto.privateDecrypt(
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_OAEP_PADDING, oaepHash: "sha256" },
        Buffer.from(encrypted_aes_key, "base64")
      );

      const iv = Buffer.from(initial_vector, "base64");
      const encryptedBuf = Buffer.from(encrypted_flow_data, "base64");
      const decipher = crypto.createDecipheriv("aes-128-gcm", decryptedAesKey, iv);
      decipher.setAuthTag(encryptedBuf.slice(-16));
      const decrypted = decipher.update(encryptedBuf.slice(0, -16), null, "utf8") + decipher.final("utf8");
      const flowData = JSON.parse(decrypted);

      const encryptResponse = (responseBody) => {
        const flippedIv = Buffer.from(iv.map(b => (~b) & 0xff));
        const cipher = crypto.createCipheriv("aes-128-gcm", decryptedAesKey, flippedIv);
        const encrypted = Buffer.concat([
          cipher.update(JSON.stringify(responseBody), "utf8"),
          cipher.final(),
          cipher.getAuthTag()
        ]);
        return encrypted.toString("base64");
      };

      const today = new Date().toISOString().split("T")[0];
      const maxDate = new Date(new Date().setMonth(new Date().getMonth() + 3)).toISOString().split("T")[0];

      let responseBody;

      if (flowData.action === "ping") {
        responseBody = { data: { status: "active" } };
      } else if (flowData.action === "INIT") {
        responseBody = {
          version: "3.0",
          screen: "FUEL_SELECTION",
          data: { min_date: today, max_date: maxDate, unavailable_dates: [] }
        };
      }

      await $.respond({
        status: 200,
        headers: { "Content-Type": "text/plain" },
        body: encryptResponse(responseBody)
      });

    } catch (err) {
      await $.respond({
        status: 500,
        body: JSON.stringify({ error: err.message })
      });
    }
  }
});
