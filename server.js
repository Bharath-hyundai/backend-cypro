const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.VEHICLE_API_KEY;

console.log("Loaded API KEY:", API_KEY ? "Present ✅" : "Missing ❌");

/* -------------------------------
   CREATE LEAD API
-------------------------------- */
app.post("/api/create-lead", async (req, res) => {
  try {
    console.log("Incoming Lead from Frontend:", req.body);

    // Validate required fields
    const { name, mobile, email, city, model } = req.body;

    if (!name || !mobile || !city || !model) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const vehiclePayload = {
      name,
      mobile,
      email: email || "",
      city,
      model,
      source: "Website",
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

    console.log("Vehicle API Success:", response.data);

    res.json({
      success: true,
      data: response.data,
    });

  } catch (error) {
    console.error("STATUS:", error.response?.status);
    console.error("DATA:", error.response?.data);

    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
