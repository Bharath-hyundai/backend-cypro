# Vehicle Lead Backend API

A Node.js Express API for broadcasting vehicle leads to Cypro's sales platform. This backend handles lead creation, validation, retry logic, and reporting.

## Features

- **Lead Broadcasting**: Send vehicle leads to Cypro's API with automatic retries
- **Validation**: Mobile number and required field validation
- **Excel Reporting**: Automatic logging of all leads to Excel spreadsheet
- **Rate Limiting**: Prevents abuse with request rate limits
- **Duplicate Protection**: Prevents duplicate leads within 24 hours
- **Failed Lead Recovery**: Automatic retry of failed leads every 5 minutes
- **Health Checks**: API health monitoring endpoints

## Tech Stack

- **Runtime**: Node.js 20.x
- **Framework**: Express.js
- **HTTP Client**: Axios
- **Excel Processing**: ExcelJS
- **Rate Limiting**: express-rate-limit
- **Development**: Nodemon

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file with your API key:
   ```
   VEHICLE_API_KEY=your_api_key_here
   PORT=5000
   ```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm start
```

The server will start on port 5000 (or PORT from env).

## API Endpoints

### Create Lead

**POST** `/api/create-lead`

Creates a new vehicle lead and broadcasts it to Cypro.

**Request Body:**

```json
{
  "firstName": "John",
  "lastName": "Doe",
  "mobileNumber": "9876543210",
  "makeName": "Hyundai",
  "makeId": 393,
  "modelId": 3628,
  "modelName": "Grand i10 NIOS",
  "emailId": "john.doe@example.com",
  "city": "Mumbai",
  "pincode": "400001"
}
```

**Response (Success):**

```json
{
  "success": true,
  "message": "Lead sent",
  "data": {
    // Cypro API response data
  }
}
```

**Response (Validation Error):**

```json
{
  "success": false,
  "message": "Invalid mobile number"
}
```

**Response (API Error):**

```json
{
  "success": false,
  "message": "Cypro API error"
}
```

### Download Report

**GET** `/api/download-report`

Downloads the Excel report of all processed leads.

**Response:** Excel file download or 404 if no leads recorded.

### Health Check

**GET** `/health`

Returns server health status.

**Response:**

```json
{
  "status": "ok",
  "uptime": 123.45,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Validation Rules

- **Mobile Number**: Must be 10 digits starting with 6-9
- **Required Fields**: firstName, mobileNumber, makeName, makeId, modelId, modelName
- **Duplicate Prevention**: Same mobile + model combination blocked for 24 hours

## Error Handling

- Automatic retry on server errors (up to 3 attempts with exponential backoff)
- Failed leads stored in `failed-leads.json` for later retry
- All attempts logged to Excel with timestamps

## File Structure

```
/
├── server.js              # Main server file
├── package.json           # Dependencies and scripts
├── .env                   # Environment variables
├── lead-report.xlsx       # Generated Excel report
├── failed-leads.json      # Failed leads queue
└── dev/                   # Development version with extra features
    ├── server.js
    └── package.json
```

## Environment Variables

- `VEHICLE_API_KEY`: Your Cypro API key (required)
- `PORT`: Server port (default: 5000)

## Security

- API key validation required
- Rate limiting (100 requests/minute)
- Request timeouts (35 seconds)
- CORS enabled
- Duplicate lead protection

## License

ISC</content>
<parameter name="filePath">/Users/rajeshallala/Desktop/backend-cypro-main/README.md
