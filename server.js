const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express(); // ✅ app defined here

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.VEHICLE_API_KEY;

console.log("Loaded API KEY:", API_KEY ? "Present ✅" : "Missing ❌");

/* =============================
   CREATE LEAD
============================= */
app.post("/api/create-lead", async (req, res) => {
  try {
    console.log("Incoming Lead:", req.body);

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

    console.log("Sending to Vehicle API:", vehiclePayload);

    const response = await axios.post(
      "https://mock-api.cyepro.com/sales/lead/broadCast-leads",
      vehiclePayload,
      {
        headers: {
          "API-KEY": API_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      success: true,
      data: response.data,
    });

  } catch (error) {
    console.error("Vehicle API ERROR:", error.response?.data || error.message);

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

/* =============================
   START SERVER
============================= */
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
