# Blockchain Indexing Platform on Helius

## Overview

The Blockchain Indexing Platform on Helius enables developers to easily integrate and index blockchain data into a Postgres database. It eliminates the complexity of managing RPC nodes, Geyser, Validators, or webhook infrastructure by leveraging Helius webhooks for seamless data synchronization.

## Videos for Setup and Demos

### Setup
https://github.com/user-attachments/assets/d90b11cb-f514-44c4-aa89-b777f4e1d2dc

### Demo ( Token Prices and Lending Markets )
https://github.com/user-attachments/assets/d4a26c91-8367-4ebb-9d22-5f02cb55c77d

### Demo ( ANY )
https://github.com/user-attachments/assets/fb773977-11d5-4664-9ae8-1d1283a15a51

### Tokens used for Demo:
https://solscan.io/token/TNSRxcUxoT9xBG3de7PiJyTDYu7kskLqcpddxnEJAS6 \
https://solscan.io/token/KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS

### Helius Dashboard:
https://dashboard.helius.dev/


## Architecture

```mermaid
graph LR
  A[Helius Webhook] --> B[Webhook Server]
  B --> C[Postgres DB]
  B --> D[WebSocket Server]
  D --> E[Frontend UI]
```

## Features

- **Postgres Database Integration**: Users can sign up and provide their Postgres database credentials.
- **Customizable Data Indexing**: Users can specify the type of data they want to index on the Solana blockchain.
- **Automated Blockchain Data Retrieval**: Uses Helius webhooks to facilitate real-time data indexing.
- **User-Friendly Interface**: A simple and intuitive UI for selecting indexing options.
- **Scalable and Secure**: Secure authentication and credential management using AES-256 with a scalable backend.

## Setup Instructions

### 1. Clone the Repository

```sh
git clone https://github.com/xKrishnaSaxena/Helix
```

### 2. Configure Environment Variables

Copy the example environment configuration for each directory:

```sh
cd backend && cp .env.example .env
cd websocket && cp .env.example .env
cd webhook && cp .env.example .env
```

Edit `.env` with your database credentials and API keys.

### 3. Start WebSocket Server

```sh
cd websocket
npm install
npm run dev
```

- WebSocket server available at `ws://localhost:3002`
- HTTP broadcasting available at `http://localhost:4000`

### 4. Start Webhook Service

```sh
cd webhook
npm install
npm run dev
```

- Webhook server available at `http://localhost:3001`
- Host it publicly using ngrok:

```sh
ngrok http 3001
```

- Update the `WEBHOOK_URL` in `backend/services/helius.ts` with the generated public URL.

### 5. Start Backend Server

```sh
cd backend
npm install
npm run dev
```

- Backend API available at `http://localhost:3000`

### 6. Start Frontend Application

```sh
cd frontend
npm install
npm run dev
```

- Frontend UI available at `http://localhost:5173`

## Usage

1. Open the frontend application and sign up with your credentials.
2. Provide your Postgres database details.
3. Select the data you want to index (NFT bids, token prices, borrowable tokens, etc.).
4. The backend will start fetching data and storing it in your database automatically.
5. Monitor status updates your Postgres database and logs through the UI.

## Technologies Used

- **Frontend**: React, TypeScript, Vite, TailwindCSS
- **Backend**: Node.js, Express, TypeScript, PostgreSQL
- **WebSocket Server**: Node.js, WebSocket(ws)
- **Webhook Service**: Helius Webhooks, Ngrok

## Contributions

Feel free to fork the repository and submit pull requests for improvements!

## Contact

For support or inquiries, reach out at [krishnasaxena021@gmail.com](mailto:krishnasaxena021@gmail.com).
