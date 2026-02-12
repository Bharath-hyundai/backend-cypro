const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.VEHICLE_API_KEY;

if (!API_KEY) {
  console.error("❌ VEHICLE_API_KEY is missing in environment variables");
  process.exit(1);
}

console.log("✅ Server Starting...");
console.log("API KEY Loaded:", API_KEY ? "Yes ✅" : "No ❌");

/* =============================
   CREATE LEAD API
============================= */
app.post("/api/create-lead", async (req, res) => {
  try {
    console.log("📥 Incoming Lead:", req.body);

    const {
      firstName,
      lastName,
      mobileNumber,
      makeName,
      makeId,
      modelId,
      modelName,
      emailId,
      city,
      pincode
    } = req.body;

    // ✅ Validate mandatory fields
    if (
      !firstName ||
      !mobileNumber ||
      !makeName ||
      !makeId ||
      !modelId ||
      !modelName
    ) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const vehiclePayload = {
      firstName,
      lastName: lastName || "",
      mobileNumber,
      makeName,
      makeId,
      modelId,
      modelName,
      emailId: emailId || "",
      city: city || "",
      pincode: pincode || ""
    };

    console.log("🚀 Sending to Cyepro:", vehiclePayload);
    console.time("⏱ Cyepro API Time");

    const response = await axios.post(
      "https://mock-api.cyepro.com/sales/lead/broadCast-leads",
      vehiclePayload,
      {
        headers: {
          "API-KEY": API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 10000, // 10 seconds timeout
      }
    );

    console.timeEnd("⏱ Cyepro API Time");

    return res.status(200).json({
      success: true,
      message: "Lead submitted successfully",
      data: response.data,
    });

  } catch (error) {
    console.error("❌ Cyepro API ERROR:");

    if (error.code === "ECONNABORTED") {
      console.error("Request Timeout");
      return res.status(504).json({
        success: false,
        message: "Cyepro API timeout. Please try again.",
      });
    }

    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);

      return res.status(error.response.status).json({
        success: false,
        error: error.response.data,
      });
    }

    console.error("Unexpected Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

/* =============================
   HEALTH CHECK
============================= */
app.get("/", (req, res) => {
  res.send("🚀 Lead API Server Running");
});

/* =============================
   START SERVER
============================= */
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});
