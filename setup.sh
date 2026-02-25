#!/bin/bash

echo "🎤 Voice AI Platform - Setup Script"
echo "===================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first:"
    echo "   https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose:"
    echo "   https://docs.docker.com/compose/install/"
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp .env.example .env
    echo "✅ Created .env file"
    echo ""
    echo "📝 IMPORTANT: Edit the .env file and add your API keys:"
    echo "   nano .env"
    echo ""
    echo "Required API keys:"
    echo "  - Twilio (phone calls)"
    echo "  - Deepgram (speech-to-text)"
    echo "  - ElevenLabs (text-to-speech)"
    echo "  - OpenAI (AI responses)"
    echo "  - Stripe (payments)"
    echo ""
    echo "Get your API keys from:"
    echo "  - Twilio: https://www.twilio.com/try-twilio"
    echo "  - Deepgram: https://console.deepgram.com/signup"
    echo "  - ElevenLabs: https://elevenlabs.io"
    echo "  - OpenAI: https://platform.openai.com/signup"
    echo "  - Stripe: https://dashboard.stripe.com/register"
    echo ""
    exit 0
fi

echo "✅ .env file found"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo ""
echo "1) Start the platform (first time setup)"
echo "2) Start the platform (existing setup)"
echo "3) Stop the platform"
echo "4) View logs"
echo "5) Reset database"
echo ""
read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "🚀 Starting Voice AI Platform for the first time..."
        echo ""
        
        # Build and start services
        docker-compose -f docker-compose.prod.yml up --build -d
        
        echo ""
        echo "⏳ Waiting for services to start..."
        sleep 10
        
        # Run database migrations
        echo "📊 Running database migrations..."
        docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate dev --name init
        
        # Seed the database
        echo "🌱 Seeding database with sample data..."
        docker-compose -f docker-compose.prod.yml exec -T api npx prisma db seed
        
        echo ""
        echo "✅ Voice AI Platform is now running!"
        echo ""
        echo "📱 Access your platform:"
        echo "   Frontend: http://localhost:3000"
        echo "   API: http://localhost:3001"
        echo "   Voice Engine: ws://localhost:3002"
        echo ""
        echo "📚 Next steps:"
        echo "   1. Open http://localhost:3000 in your browser"
        echo "   2. Sign up for an account"
        echo "   3. Add credits to your wallet"
        echo "   4. Create your first assistant"
        echo "   5. Make a test call!"
        echo ""
        ;;
        
    2)
        echo ""
        echo "🚀 Starting Voice AI Platform..."
        docker-compose -f docker-compose.prod.yml up -d
        echo ""
        echo "✅ Platform started!"
        echo "   Frontend: http://localhost:3000"
        echo "   API: http://localhost:3001"
        echo ""
        ;;
        
    3)
        echo ""
        echo "🛑 Stopping Voice AI Platform..."
        docker-compose -f docker-compose.prod.yml down
        echo ""
        echo "✅ Platform stopped"
        echo ""
        ;;
        
    4)
        echo ""
        echo "📋 Viewing logs (Press Ctrl+C to exit)..."
        docker-compose -f docker-compose.prod.yml logs -f
        ;;
        
    5)
        echo ""
        read -p "⚠️  This will DELETE all data. Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            echo "🗑️  Resetting database..."
            docker-compose -f docker-compose.prod.yml down -v
            docker-compose -f docker-compose.prod.yml up --build -d
            sleep 10
            docker-compose -f docker-compose.prod.yml exec -T api npx prisma migrate dev --name init
            docker-compose -f docker-compose.prod.yml exec -T api npx prisma db seed
            echo "✅ Database reset complete"
        else
            echo "Cancelled"
        fi
        echo ""
        ;;
        
    *)
        echo "Invalid choice"
        exit 1
        ;;
esac
