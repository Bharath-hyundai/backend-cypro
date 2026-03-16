const express = require("express");
const axios = require("axios");
const cors = require("cors");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.VEHICLE_API_KEY;

/* =============================
   MONGODB CONNECTION
============================= */

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("✅ MongoDB Connected"))
.catch(err => console.log("❌ MongoDB Error:", err));

/* =============================
   LEAD SCHEMA
============================= */

const leadSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  model: String,
  city: String,
  status: String,
  error: String,
  time: Date
});

const Lead = mongoose.model("Lead", leadSchema);

/* =============================
   API KEY CHECK
============================= */

if (!API_KEY) {
  console.error("❌ VEHICLE_API_KEY missing");
  process.exit(1);
}

console.log("✅ Server Starting");

/* =============================
   SEND TO CYPRO
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
          "Content-Type": "application/json"
        },
        timeout: 30000
      }
    );

    console.log("✅ Cypro Lead Success:", payload.mobileNumber);

    return response;

  } catch (error) {

    console.error("❌ Cypro attempt failed");

    if (retries > 0) {

      const delay = (4 - retries) * 2000;

      console.log(`⚠️ Retrying in ${delay/1000}s`);

      await new Promise(r => setTimeout(r, delay));

      return sendToCypro(payload, retries - 1);
    }

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

    if (!firstName || !mobileNumber || !makeName || !makeId || !modelId || !modelName) {

      await Lead.create({
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

    const response = await sendToCypro(vehiclePayload);

    await Lead.create({
      name: firstName,
      mobile: mobileNumber,
      model: modelName,
      city,
      status: "SUCCESS",
      time: new Date()
    });

    res.json({
      success: true,
      message: "Lead submitted",
      data: response.data
    });

  } catch (error) {

    await Lead.create({
      name: firstName,
      mobile: mobileNumber,
      model: modelName,
      city,
      status: "FAILED",
      error: error.message,
      time: new Date()
    });

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

/* =============================
   LEAD REPORT
============================= */

app.get("/api/lead-report", async (req, res) => {

  const total = await Lead.countDocuments();
  const success = await Lead.countDocuments({ status: "SUCCESS" });
  const failed = await Lead.countDocuments({ status: "FAILED" });

  const leads = await Lead.find().sort({ time: -1 });

  res.json({
    total,
    success,
    failed,
    leads
  });
});

/* =============================
   FAILED LEADS
============================= */

app.get("/api/failed-leads", async (req, res) => {

  const leads = await Lead.find({ status: "FAILED" });

  res.json({
    total: leads.length,
    leads
  });
});

/* =============================
   RETRY FAILED LEADS
============================= */

app.post("/api/retry-failed", async (req, res) => {

  const failedLeads = await Lead.find({ status: "FAILED" });

  let success = 0;
  let failed = 0;

  for (const lead of failedLeads) {

    const payload = {
      firstName: lead.name,
      mobileNumber: lead.mobile,
      modelName: lead.model,
      city: lead.city
    };

    try {

      await sendToCypro(payload);

      lead.status = "SUCCESS";
      lead.error = "";
      await lead.save();

      success++;

    } catch (error) {

      lead.error = error.message;
      await lead.save();

      failed++;
    }
  }

  res.json({
    retried: failedLeads.length,
    success,
    failed
  });
});

/* =============================
   EXPORT EXCEL
============================= */

app.get("/api/export-leads", async (req, res) => {

  const leads = await Lead.find();

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Leads");

  sheet.columns = [
    { header: "Name", key: "name", width: 20 },
    { header: "Mobile", key: "mobile", width: 15 },
    { header: "Model", key: "model", width: 20 },
    { header: "City", key: "city", width: 20 },
    { header: "Status", key: "status", width: 10 },
    { header: "Error", key: "error", width: 30 },
    { header: "Time", key: "time", width: 25 }
  ];

  leads.forEach(lead => sheet.addRow(lead));

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  res.setHeader(
    "Content-Disposition",
    "attachment; filename=leads.xlsx"
  );

  await workbook.xlsx.write(res);
  res.end();
});

/* =============================
   HEALTH CHECK
============================= */

app.get("/", (req, res) => {
  res.send("🚀 Lead API Running");
});

/* =============================
   START SERVER
============================= */

app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});