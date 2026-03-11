const express = require("express");
const axios = require("axios");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const ExcelJS = require("exceljs");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

require("dotenv").config();

const app = express();

/* =============================
   BASIC MIDDLEWARE
============================= */

app.use(cors());
app.use(express.json());

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 100,
  }),
);

app.use((req, res, next) => {
  res.setTimeout(35000, () => {
    res.status(408).json({
      success: false,
      message: "Request timeout",
    });
  });
  next();
});

app.disable("x-powered-by");

/* =============================
   ENVIRONMENT
============================= */

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.VEHICLE_API_KEY;

if (!API_KEY) {
  console.error("❌ VEHICLE_API_KEY missing");
  process.exit(1);
}

console.log("✅ Server Starting...");

/* =============================
   FILE PATHS
============================= */

const filePath = path.join(__dirname, "lead-report.xlsx");
const failedLeadsFile = path.join(__dirname, "failed-leads.json");

/* =============================
   SAFE EXCEL WRITE QUEUE
============================= */

let excelQueue = Promise.resolve();

function logLeadToExcel(data) {
  excelQueue = excelQueue.then(async () => {
    const workbook = new ExcelJS.Workbook();
    let sheet;

    if (fs.existsSync(filePath)) {
      await workbook.xlsx.readFile(filePath);
      sheet = workbook.getWorksheet("Leads");
    } else {
      sheet = workbook.addWorksheet("Leads");

      sheet.columns = [
        { header: "Name", key: "name", width: 20 },
        { header: "Mobile", key: "mobile", width: 15 },
        { header: "Model", key: "model", width: 20 },
        { header: "City", key: "city", width: 20 },
        { header: "Status", key: "status", width: 15 },
        { header: "Error", key: "error", width: 25 },
        { header: "Time", key: "time", width: 25 },
      ];
    }

    sheet.addRow(data);

    await workbook.xlsx.writeFile(filePath);
  });

  return excelQueue;
}

/* =============================
   RETRY FUNCTION
============================= */

async function sendToCypro(payload, retries = 3) {
  try {
    const response = await axios.post(
      "https://salesapp-api.cyepro.com/sales/lead/broadCast-leads",
      payload,
      {
        headers: {
          "API-KEY": API_KEY,
          "Content-Type": "application/json",
        },
        timeout: 30000,
        validateStatus: () => true,
      },
    );

    if (response.status >= 200 && response.status < 300) {
      return response;
    }

    if (response.status >= 400 && response.status < 500) {
      throw new Error(`Cypro rejected lead: ${response.status}`);
    }

    throw new Error(`Cypro server error: ${response.status}`);
  } catch (error) {
    if (retries > 0) {
      const delay = (4 - retries) * 2000;

      console.log(`Retrying lead in ${delay}ms`);

      await new Promise((r) => setTimeout(r, delay));

      return sendToCypro(payload, retries - 1);
    }

    throw error;
  }
}

/* =============================
   FAILED LEAD STORAGE
============================= */

let failedQueue = Promise.resolve();

function saveFailedLead(payload) {
  failedQueue = failedQueue.then(async () => {
    let leads = [];

    try {
      if (fs.existsSync(failedLeadsFile)) {
        const data = await fs.promises.readFile(failedLeadsFile, "utf8");
        leads = JSON.parse(data);
      }
    } catch {
      leads = [];
    }

    leads.push({
      payload,
      time: new Date(),
    });

    await fs.promises.writeFile(
      failedLeadsFile,
      JSON.stringify(leads, null, 2),
    );
  });

  return failedQueue;
}

/* =============================
   FAILED LEAD RETRY WORKER
============================= */

async function retryFailedLeads() {
  try {
    if (!fs.existsSync(failedLeadsFile)) return;

    const data = await fs.promises.readFile(failedLeadsFile, "utf8");
    let leads = JSON.parse(data);

    if (!leads.length) return;

    console.log(`🔄 Retrying ${leads.length} failed leads`);

    const remaining = [];

    for (const lead of leads) {
      try {
        await sendToCypro(lead.payload);
        console.log("Recovered lead:", lead.payload.mobileNumber);
      } catch {
        remaining.push(lead);
      }
    }

    await fs.promises.writeFile(
      failedLeadsFile,
      JSON.stringify(remaining, null, 2),
    );
  } catch (err) {
    console.error("Retry worker error:", err.message);
  }
}

setInterval(retryFailedLeads, 5 * 60 * 1000);

/* =============================
   DUPLICATE LEAD PROTECTION
============================= */

const recentLeads = new Map();

/* =============================
   CREATE LEAD API
============================= */

app.post("/api/create-lead", async (req, res) => {
  const requestId = uuidv4();

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
    pincode,
  } = req.body;

  console.log("Incoming lead:", {
    requestId,
    name: firstName,
    mobile: mobileNumber,
    model: modelName,
  });

  if (!/^[6-9]\d{9}$/.test(mobileNumber)) {
    return res.status(400).json({
      success: false,
      message: "Invalid mobile number",
    });
  }

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

  const duplicateKey = `${mobileNumber}-${modelId}`;

  if (recentLeads.has(duplicateKey)) {
    return res.json({
      success: false,
      message: "Duplicate lead ignored",
    });
  }

  recentLeads.set(duplicateKey, Date.now());

  setTimeout(
    () => {
      recentLeads.delete(duplicateKey);
    },
    24 * 60 * 60 * 1000,
  );

  const payload = {
    firstName,
    lastName: lastName || "",
    mobileNumber,
    makeName,
    makeId,
    modelId,
    modelName,
    emailId: emailId || "",
    city: city || "",
    pincode: pincode || "",
  };

  try {
    const response = await sendToCypro(payload);

    await logLeadToExcel({
      name: firstName,
      mobile: mobileNumber,
      model: modelName,
      city,
      status: "SUCCESS",
      error: "",
      time: new Date(),
    });

    return res.json({
      success: true,
      message: "Lead sent",
      data: response.data,
    });
  } catch (error) {
    await saveFailedLead(payload);

    await logLeadToExcel({
      name: firstName,
      mobile: mobileNumber,
      model: modelName,
      city,
      status: "FAILED",
      error: error.response?.data || error.message,
      time: new Date(),
    });

    return res.status(500).json({
      success: false,
      message: "Cypro API error",
    });
  }
});

/* =============================
   DOWNLOAD REPORT
============================= */

app.get("/api/download-report", (req, res) => {
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      message: "No leads recorded yet",
    });
  }

  res.download(filePath);
});

/* =============================
   HEALTH CHECK
============================= */

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date(),
  });
});

/* =============================
   GLOBAL ERROR HANDLER
============================= */

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  res.status(500).json({
    success: false,
    message: "Internal server error",
  });
});

/* =============================
   START SERVER
============================= */

app.listen(PORT, () => {
  console.log(`🔥 Server running on ${PORT}`);
});

/* =============================
   GRACEFUL SHUTDOWN
============================= */

process.on("SIGINT", () => {
  console.log("🛑 Server shutting down");
  process.exit();
});
