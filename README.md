# Expense Tracker: Server-Side Validation with Node.js

A web application built with **Node.js and Express** that demonstrates **server-side validation**.
The browser only sends raw input. The server validates every request, rejects bad data with HTTP 400 and
field-wise error messages, and stores accepted data in a JSON file.

**Course:** 2304362L-SV26-27 | **Assignment:** 3 | **Student:** Om Kumar Gupta (PRN: 202401040206)
**Live URL:** (https://wt-assignment-3.onrender.com/)

## Why this is server-side validation

- `public/script.js` has **no validation logic**. It sends form values to the API and displays the errors the server returns.
- `server.js` contains `validate()`, which runs on every `POST /api/expenses` and `POST /api/expenses/import`.
- Invalid requests (even ones sent with curl or Postman, bypassing the page) get `400 Bad Request` and nothing is saved.

## API

| Method | Route | Purpose | Responses |
|---|---|---|---|
| GET | `/api/expenses` | List all expenses | 200 |
| POST | `/api/expenses` | Add one expense (validated) | 201, 400 |
| POST | `/api/expenses/import` | Import an array (all records validated, all or nothing) | 201, 400 |
| DELETE | `/api/expenses/:id` | Delete one expense | 200, 404 |
| DELETE | `/api/expenses` | Clear all | 200 |

Error format: `{ "errors": { "title": "Title is required.", "amount": "Amount must be a number." } }`
Malformed JSON bodies return `400` with `{ "errors": { "_form": "Malformed JSON in request body." } }`.

## Validation rules (enforced in server.js)

| Field | Rules |
|---|---|
| Title | Required, 3 to 50 characters, letters, digits and basic punctuation only |
| Amount | Required, numeric, greater than 0, at most 1,000,000, at most 2 decimal places |
| Category | One of Food, Travel, Study, Bills, Other |
| Date | Required, format YYYY-MM-DD, valid, not in the future |

## Project structure

```
expense-tracker-node/
├── server.js        # Express server, API routes, validation, JSON file storage
├── package.json
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js    # fetch() calls and rendering only
└── README.md
```

## Run locally

```bash
npm install
npm start
```
Open http://localhost:3000

## Test server-side validation with curl

```bash
curl -X POST http://localhost:3000/api/expenses \
  -H "Content-Type: application/json" \
  -d '{"title":"x","amount":"abc","category":"Zzz","date":"2999-01-01"}'
```
Expected: HTTP 400 with one error message per field.

## Deploy on Render

1. Push this folder to a GitHub repository.
2. On render.com: New, Web Service, connect the repository.
3. Build command: `npm install`  |  Start command: `npm start`
4. Deploy, then copy the `onrender.com` URL into this README.

Note: on free hosting the disk is not permanent, so saved expenses may reset when the service restarts.
