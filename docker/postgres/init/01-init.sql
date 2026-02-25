-- PostgreSQL Initialization Script
-- Creates initial database setup for Voice AI Platform

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create application schema (if needed for future partitioning)
-- CREATE SCHEMA IF NOT EXISTS voice_ai;

-- Set default privileges
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO CURRENT_USER;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO CURRENT_USER;

-- Note: Tables will be created by Prisma migrations
-- This file is for any custom database setup that can't be done via Prisma
