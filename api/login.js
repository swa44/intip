module.exports = (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      message: "Method Not Allowed",
    });
  }

  try {
    const { id, pw } = req.body;

    // Configuration
    const ADMIN_ID = "admin"; // Always 'admin' or create another env var
    const ADMIN_PW = process.env.ADMIN_PASSWORD || "intip2026!"; // Use env var securely

    if (id === ADMIN_ID && pw === ADMIN_PW) {
      // Success! Send a verified token (or just success flag)
      return res.status(200).json({
        success: true,
        message: "Login successful",
        valid: true,
      });
    } else {
      // Failed
      return res.status(401).json({
        success: false,
        message: "Wrong credentials",
        valid: false,
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};
