const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const API_KEY = process.env.VEHICLE_API_KEY;

/* -------------------------------
   1️⃣ Fetch Vehicle Makes
-------------------------------- */
app.get("/api/makes", async (req, res) => {
  try {
    const response = await axios.get(
      "https://test.com/vehicle-information-service/vehicle_details/make_detailsApi",
      {
        headers: { "API-KEY": API_KEY },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------------------
   2️⃣ Fetch Vehicle Models
-------------------------------- */
app.post("/api/models", async (req, res) => {
  try {
    const { makeId } = req.body;

    const response = await axios.post(
      "https://test.com/vehicle-information-service/vehicle_details/make_modelsApi",
      { requestId: [makeId] },
      {
        headers: { "API-KEY": API_KEY },
      }
    );

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/* -------------------------------
   3️⃣ Create Lead
-------------------------------- */
app.post("/api/create-lead", async (req, res) => {
  try {
    const response = await axios.post(
      "https://test.com/sales/lead/broadCast-leads",
      req.body,
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
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
