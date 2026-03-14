const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.VEHICLE_API_KEY;

/* =============================
   LEAD STORAGE
============================= */
const leadLogs = [];

if (!API_KEY) {
  console.error("❌ VEHICLE_API_KEY is missing in environment variables");
  process.exit(1);
}

console.log("✅ Server Starting...");
console.log("API KEY Loaded:", API_KEY ? "Yes ✅" : "No ❌");

/* =============================
   RETRY FUNCTION
============================= */
async function sendToCypro(payload, retries = 3) {
  try {

    console.log(`🚀 Attempt ${4 - retries}/4 sending to Cypro`);

    const response = await axios.post(
      "https://salesapp-api.cyepro.com/sales/lead/broadCast-leads",
      payload,
      {
        headers: {
          "API-KEY": API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000
      }
    );

    console.log("✅ Cypro Lead Success:", payload.mobileNumber);

    return response;

  } catch (error) {

    console.error("❌ Cypro attempt failed");

    if (retries > 0) {
      console.log("⚠️ Retrying in 2 seconds...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      return sendToCypro(payload, retries - 1);
    }

    console.error("❌ All retry attempts failed");

    throw error;
  }
}

/* =============================
   CREATE LEAD API
============================= */
app.post("/api/create-lead", async (req, res) => {

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

  try {

    console.log("📥 Incoming Lead:", req.body);

    if (
      !firstName ||
      !mobileNumber ||
      !makeName ||
      !makeId ||
      !modelId ||
      !modelName
    ) {

      leadLogs.push({
        name: firstName,
        mobile: mobileNumber,
        model: modelName,
        city,
        status: "FAILED",
        error: "Missing required fields",
        time: new Date()
      });

      return res.status(400).json({
        success: false,
        message: "Missing required fields"
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

    console.log("🚀 Sending lead to Cypro:", mobileNumber);

    console.time("⏱ Cypro API Time");

    const response = await sendToCypro(vehiclePayload);

    console.timeEnd("⏱ Cypro API Time");

    /* =============================
       SUCCESS LOG
    ============================= */

    leadLogs.push({
      name: firstName,
      mobile: mobileNumber,
      model: modelName,
      city,
      status: "SUCCESS",
      time: new Date()
    });

    return res.status(200).json({
      success: true,
      message: "Lead submitted successfully",
      data: response.data
    });

  } catch (error) {

    console.error("❌ Cypro API ERROR");

    /* =============================
       FAILED LOG
    ============================= */

    leadLogs.push({
      name: firstName,
      mobile: mobileNumber,
      model: modelName,
      city,
      status: "FAILED",
      error: error.message,
      time: new Date()
    });

    if (error.code === "ECONNABORTED") {

      console.error("⏱ Request Timeout");

      return res.status(504).json({
        success: false,
        message: "Cypro API timeout. Please try again."
      });
    }

    if (error.response) {

      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);

      return res.status(error.response.status).json({
        success: false,
        error: error.response.data
      });
    }

    console.error("Unexpected Error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
});

/* =============================
   ALL LEADS REPORT
============================= */
app.get("/api/lead-report", (req, res) => {

  const success = leadLogs.filter(l => l.status === "SUCCESS");
  const failed = leadLogs.filter(l => l.status === "FAILED");

  res.json({
    totalLeads: leadLogs.length,
    success: success.length,
    failed: failed.length,
    leads: leadLogs
  });
});

/* =============================
   FAILED LEADS
============================= */
app.get("/api/failed-leads", (req, res) => {

  const failedLeads = leadLogs.filter(l => l.status === "FAILED");

  res.json({
    totalFailed: failedLeads.length,
    leads: failedLeads
  });
});

/* =============================
   SUCCESS LEADS
============================= */
app.get("/api/success-leads", (req, res) => {

  const successLeads = leadLogs.filter(l => l.status === "SUCCESS");

  res.json({
    totalSuccess: successLeads.length,
    leads: successLeads
  });
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
