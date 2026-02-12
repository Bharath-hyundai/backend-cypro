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

    // Validate mandatory fields
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
