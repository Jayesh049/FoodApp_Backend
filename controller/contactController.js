const { sendContactEmail } = require("../utilities/mailSender");

async function sendContactController(req, res) {
  try {
    const { name, email, source, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({
        result: "Name, email, and message are required.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({
        result: "Please enter a valid email address.",
      });
    }

    await sendContactEmail({
      name: name.trim(),
      email: email.trim(),
      source: source || "other",
      message: message.trim(),
    });

    res.status(200).json({
      result: "Message sent successfully! We will get back to you soon.",
    });
  } catch (err) {
    console.error("Contact form email failed:", err);
    res.status(500).json({
      result: "Could not send your message. Please try again later.",
    });
  }
}

module.exports = { sendContactController };
