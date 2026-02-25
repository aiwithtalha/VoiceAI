# Voice Engine Service

Real-time voice engine service for the Universal Voice AI Platform. This service handles the complete audio pipeline for voice AI conversations: Twilio Media Streams → Deepgram STT → OpenAI LLM → ElevenLabs TTS → Twilio.

## Architecture

```
┌─────────────┐     WebSocket      ┌─────────────────────────────────────────┐
│   Twilio    │◄──────────────────►│              Voice Engine               │
│   Voice     │   Media Streams    │                                         │
└─────────────┘                    │  ┌──────────┐  ┌──────────┐  ┌────────┐ │
                                   │  │ Deepgram │  │  OpenAI  │  │Eleven  │ │
                                   │  │   STT    │  │   LLM    │  │ Labs   │ │
                                   │  └──────────┘  └──────────┘  └────────┘ │
                                   │                                         │
                                   │  ┌─────────────────────────────────────┐│
                                   │  │      Conversation Manager           ││
                                   │  │  - Turn-taking logic                ││
                                   │  │  - Barge-in detection               ││
                                   │  │  - Audio queue management           ││
                                   │  └─────────────────────────────────────┘│
                                   └─────────────────────────────────────────┘
```

## Features

- **Real-time Streaming**: Low-latency audio streaming with WebSocket
- **Speech-to-Text**: Deepgram Nova-2-phonecall model with live transcription
- **LLM Integration**: OpenAI GPT-4o-mini with streaming completions
- **Text-to-Speech**: ElevenLabs streaming TTS with multiple voices
- **Barge-in Support**: User can interrupt the AI assistant
- **Endpointing**: Automatic detection when user stops speaking
- **Tool Calling**: Execute functions during conversations (transfer, SMS, etc.)
- **Billing**: 30-second credit deduction intervals
- **Provider Fallback**: Automatic fallback to backup providers

## Project Structure

```
src/
├── index.ts              # Main server entry point
├── types/
│   └── index.ts          # TypeScript type definitions
├── handlers/
│   └── twilio-ws.ts      # Twilio WebSocket handler
├── services/
│   ├── call-session.ts   # Call session management
│   ├── conversation.ts   # Conversation state manager
│   └── tool-executor.ts  # Tool execution service
├── providers/
│   ├── deepgram.ts       # Deepgram STT provider
│   ├── openai.ts         # OpenAI LLM provider
│   └── elevenlabs.ts     # ElevenLabs TTS provider
└── utils/
    ├── audio.ts          # Audio conversion utilities
    └── logger.ts         # Logging utility
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your API keys
```

## Usage

### Development

```bash
# Run in development mode with hot reload
npm run dev
```

### Production

```bash
# Build the project
npm run build

# Start the server
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Status
```
GET /status
```

### List Calls
```
GET /calls?limit=100&offset=0
```

### Active Calls
```
GET /calls/active
```

### Call Details
```
GET /calls/:callId
```

## WebSocket Protocol

The voice engine accepts WebSocket connections from Twilio Media Streams.

### Connection URL
```
ws://localhost:3002
```

### Message Format

**Start Message:**
```json
{
  "event": "start",
  "start": {
    "accountSid": "AC...",
    "streamSid": "MZ...",
    "callSid": "CA...",
    "tracks": ["inbound"],
    "mediaFormat": {
      "encoding": "audio/x-mulaw",
      "sampleRate": 8000,
      "channels": 1
    },
    "customParameters": {
      "assistantId": "asst_...",
      "userId": "user_..."
    }
  }
}
```

**Media Message (Inbound):**
```json
{
  "event": "media",
  "streamSid": "MZ...",
  "media": {
    "track": "inbound",
    "chunk": "base64-encoded-mulaw-audio"
  }
}
```

**Media Message (Outbound):**
```json
{
  "event": "media",
  "streamSid": "MZ...",
  "media": {
    "payload": "base64-encoded-mulaw-audio"
  }
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | HTTP server port | 3001 |
| `WS_PORT` | WebSocket server port | 3002 |
| `HOST` | Server host | 0.0.0.0 |
| `NODE_ENV` | Environment | development |
| `LOG_LEVEL` | Log level | info |
| `DEEPGRAM_API_KEY` | Deepgram API key | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ELEVENLABS_API_KEY` | ElevenLabs API key | - |
| `TWILIO_ACCOUNT_SID` | Twilio Account SID | - |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token | - |
| `API_BASE_URL` | Base URL for API calls | http://localhost:3000 |
| `BILLING_INTERVAL_SECONDS` | Billing interval | 30 |
| `COST_PER_MINUTE` | Cost per minute | 0.05 |
| `ENABLE_BARGE_IN` | Enable barge-in | true |
| `ENABLE_ENDPOINTING` | Enable endpointing | true |

## Audio Pipeline

1. **Input**: Twilio sends mu-law 8kHz mono audio via WebSocket
2. **Conversion**: mu-law → PCM 16-bit
3. **STT**: PCM audio streamed to Deepgram for transcription
4. **LLM**: Transcripts sent to OpenAI for response generation
5. **TTS**: Response text streamed to ElevenLabs for speech synthesis
6. **Conversion**: PCM 16-bit → mu-law
7. **Output**: mu-law audio sent back to Twilio

## Barge-in Detection

When barge-in is enabled:
- Audio level is monitored during AI speech
- If user speech exceeds threshold, current playback is stopped
- LLM stream is aborted
- New user input is processed

## Tool Calling

Built-in tools available:
- `transfer_call` - Transfer to another number
- `end_call` - End the call
- `send_sms` - Send SMS message
- `schedule_callback` - Schedule a callback
- `hold_call` - Place on hold
- `record_consent` - Record recording consent

Custom tools can be defined with API endpoints.

## Billing

Credits are deducted every 30 seconds during active calls:
- Default cost: $0.05 per minute
- Billing API endpoint: `POST /api/billing/deduct`
- Call ends automatically when credits are depleted

## License

MIT
