/**
 * Database Seed Script
 * Creates sample data for development
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample user
  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const user = await prisma.user.upsert({
    where: { email: 'demo@voiceai.local' },
    update: {},
    create: {
      email: 'demo@voiceai.local',
      password: hashedPassword,
      name: 'Demo User',
      subscription: {
        create: {
          status: 'active',
          plan: 'pro',
          minutesLimit: 1000,
        },
      },
    },
  });

  console.log('✅ Created user:', user.email);

  // Create sample agent
  const agent = await prisma.agent.upsert({
    where: { 
      id: '00000000-0000-0000-0000-000000000001',
    },
    update: {},
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      userId: user.id,
      name: 'Customer Support Agent',
      description: 'A friendly AI agent for customer support',
      voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel
      language: 'en-US',
      systemPrompt: `You are a helpful customer support agent. Be friendly, professional, and concise in your responses. 
      
Your goal is to:
1. Greet customers warmly
2. Understand their issues quickly
3. Provide clear solutions
4. Escalate complex issues when needed

Keep responses under 3 sentences when possible.`,
      greeting: 'Hello! Thank you for calling. How can I help you today?',
      aiModel: 'gpt-4',
      temperature: 0.7,
      maxDuration: 600,
      recordCalls: true,
      enableTranscription: true,
      isActive: true,
    },
  });

  console.log('✅ Created agent:', agent.name);

  // Create sample phone number
  const phoneNumber = await prisma.phoneNumber.upsert({
    where: {
      phoneNumber: '+1234567890',
    },
    update: {},
    create: {
      userId: user.id,
      agentId: agent.id,
      phoneNumber: '+1234567890',
      label: 'Main Support Line',
      isActive: true,
    },
  });

  console.log('✅ Created phone number:', phoneNumber.phoneNumber);

  // Create sample conversation
  const conversation = await prisma.conversation.create({
    data: {
      agentId: agent.id,
      phoneNumberId: phoneNumber.id,
      callerNumber: '+1987654321',
      callerName: 'John Doe',
      status: 'completed',
      startedAt: new Date(Date.now() - 3600000), // 1 hour ago
      endedAt: new Date(Date.now() - 3540000), // 10 minutes later
      duration: 600,
      messages: {
        create: [
          {
            role: 'assistant',
            content: 'Hello! Thank you for calling. How can I help you today?',
            timestamp: new Date(Date.now() - 3600000),
          },
          {
            role: 'user',
            content: 'Hi, I have a question about my account.',
            timestamp: new Date(Date.now() - 3595000),
          },
          {
            role: 'assistant',
            content: 'I\'d be happy to help with your account. What specific question do you have?',
            timestamp: new Date(Date.now() - 3590000),
          },
          {
            role: 'user',
            content: 'I need to update my billing information.',
            timestamp: new Date(Date.now() - 3585000),
          },
          {
            role: 'assistant',
            content: 'You can update your billing information in the account settings. Would you like me to send you a link?',
            timestamp: new Date(Date.now() - 3580000),
          },
        ],
      },
    },
  });

  console.log('✅ Created sample conversation:', conversation.id);

  console.log('\n🎉 Database seed completed!');
  console.log('\nDemo credentials:');
  console.log('  Email: demo@voiceai.local');
  console.log('  Password: password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
