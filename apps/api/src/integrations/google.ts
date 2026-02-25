/**
 * Google Integrations Module
 * 
 * Provides integration with Google services:
 * - Google Calendar: book appointments, list availability
 * - Google Sheets: append rows, read data
 * - OAuth2 flow for account connection
 * 
 * @module integrations/google
 */

import { google, Auth } from 'googleapis';
import { logger } from '../utils/logger';
import { metrics } from '../utils/metrics';
import { prisma } from '../lib/prisma';

// ============================================================================
// Configuration
// ============================================================================

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/google/callback';

// OAuth2 scopes for different Google services
const GOOGLE_SCOPES = {
  calendar: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ],
  sheets: [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
  combined: [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive.readonly',
  ],
};

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Google integration configuration stored in database
 */
export interface GoogleIntegration {
  id: string;
  workspaceId: string;
  provider: 'google';
  status: 'active' | 'inactive' | 'error';
  accessToken: string;
  refreshToken: string;
  tokenExpiry: Date;
  scope: string[];
  connectedEmail?: string;
  metadata?: {
    calendarId?: string;
    defaultSheetId?: string;
    timezone?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Appointment booking request
 */
export interface BookAppointmentRequest {
  calendarId?: string;
  summary: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  attendeeEmail: string;
  attendeeName: string;
  timezone?: string;
  location?: string;
  sendNotifications?: boolean;
}

/**
 * Appointment booking response
 */
export interface BookAppointmentResponse {
  success: boolean;
  eventId?: string;
  eventLink?: string;
  meetLink?: string;
  error?: string;
}

/**
 * Availability query request
 */
export interface ListAvailabilityRequest {
  calendarId?: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  timezone?: string;
  workingHoursStart?: number; // 0-23
  workingHoursEnd?: number; // 0-23
}

/**
 * Time slot availability
 */
export interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
}

/**
 * Google Sheets row data
 */
export interface SheetRowData {
  [column: string]: string | number | boolean | null;
}

// ============================================================================
// OAuth2 Client
// ============================================================================

/**
 * Create OAuth2 client for Google API
 */
function createOAuth2Client(): Auth.OAuth2Client {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
}

/**
 * Get OAuth2 client with credentials for a workspace
 */
async function getAuthenticatedClient(
  workspaceId: string
): Promise<Auth.OAuth2Client> {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: 'google',
      status: 'active',
    },
  });

  if (!integration) {
    throw new Error('Google integration not found or inactive');
  }

  const oauth2Client = createOAuth2Client();

  // Check if token needs refresh
  const tokenExpiry = new Date(integration.tokenExpiry);
  const now = new Date();
  const refreshBuffer = 5 * 60 * 1000; // 5 minutes buffer

  if (tokenExpiry.getTime() - refreshBuffer < now.getTime()) {
    // Token is expired or about to expire, refresh it
    logger.info({ workspaceId }, 'Refreshing Google access token');
    
    oauth2Client.setCredentials({
      refresh_token: integration.refreshToken,
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();
      
      // Update stored tokens
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          accessToken: credentials.access_token!,
          tokenExpiry: new Date(credentials.expiry_date!),
          updatedAt: new Date(),
        },
      });

      oauth2Client.setCredentials(credentials);
    } catch (error) {
      logger.error({ workspaceId, error }, 'Failed to refresh Google token');
      
      // Mark integration as error
      await prisma.integration.update({
        where: { id: integration.id },
        data: {
          status: 'error',
          updatedAt: new Date(),
        },
      });

      throw new Error('Failed to refresh Google access token');
    }
  } else {
    // Token is still valid
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
    });
  }

  return oauth2Client;
}

// ============================================================================
// OAuth Flow
// ============================================================================

/**
 * Generate OAuth authorization URL
 * 
 * @param workspaceId - The workspace requesting authorization
 * @param scopes - Array of OAuth scopes to request
 * @returns Authorization URL and state token
 */
export function generateAuthUrl(
  workspaceId: string,
  scopes: string[] = GOOGLE_SCOPES.combined
): { url: string; state: string } {
  const oauth2Client = createOAuth2Client();

  // Generate state token with workspace ID encoded
  const state = Buffer.from(JSON.stringify({
    workspaceId,
    nonce: Math.random().toString(36).substring(2),
    timestamp: Date.now(),
  })).toString('base64');

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state,
    prompt: 'consent', // Always show consent to get refresh token
    include_granted_scopes: true,
  });

  return { url, state };
}

/**
 * Handle OAuth callback and store tokens
 * 
 * @param code - Authorization code from Google
 * @param state - State token from authorization request
 * @returns Integration record
 */
export async function handleAuthCallback(
  code: string,
  state: string
): Promise<GoogleIntegration> {
  // Decode and validate state
  let stateData: { workspaceId: string; nonce: string; timestamp: number };
  
  try {
    stateData = JSON.parse(Buffer.from(state, 'base64').toString());
  } catch {
    throw new Error('Invalid state parameter');
  }

  // Check state hasn't expired (10 minute window)
  if (Date.now() - stateData.timestamp > 10 * 60 * 1000) {
    throw new Error('Authorization request expired');
  }

  const oauth2Client = createOAuth2Client();

  // Exchange code for tokens
  const { tokens } = await oauth2Client.getToken(code);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain access and refresh tokens');
  }

  // Get user info
  oauth2Client.setCredentials(tokens);
  const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
  const { data: userInfo } = await oauth2.userinfo.get();

  // Store or update integration
  const integration = await prisma.integration.upsert({
    where: {
      workspaceId_provider: {
        workspaceId: stateData.workspaceId,
        provider: 'google',
      },
    },
    update: {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
      scope: tokens.scope?.split(' ') || GOOGLE_SCOPES.combined,
      connectedEmail: userInfo.email || undefined,
      status: 'active',
      updatedAt: new Date(),
    },
    create: {
      workspaceId: stateData.workspaceId,
      provider: 'google',
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: new Date(tokens.expiry_date || Date.now() + 3600 * 1000),
      scope: tokens.scope?.split(' ') || GOOGLE_SCOPES.combined,
      connectedEmail: userInfo.email || undefined,
      status: 'active',
      metadata: {
        timezone: 'America/New_York', // Default, can be updated
      },
    },
  });

  logger.info({
    workspaceId: stateData.workspaceId,
    email: userInfo.email,
  }, 'Google integration connected successfully');

  metrics.increment('integration.google.connected', {
    workspace: stateData.workspaceId,
  });

  return integration as GoogleIntegration;
}

/**
 * Disconnect Google integration
 * 
 * @param workspaceId - Workspace to disconnect
 */
export async function disconnectIntegration(workspaceId: string): Promise<void> {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: 'google',
    },
  });

  if (!integration) {
    throw new Error('Google integration not found');
  }

  // Revoke token if possible
  try {
    const oauth2Client = createOAuth2Client();
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
    });
    await oauth2Client.revokeCredentials();
  } catch (error) {
    logger.warn({ workspaceId, error }, 'Failed to revoke Google token');
    // Continue with deletion even if revoke fails
  }

  // Delete integration record
  await prisma.integration.delete({
    where: { id: integration.id },
  });

  logger.info({ workspaceId }, 'Google integration disconnected');
  metrics.increment('integration.google.disconnected', { workspace: workspaceId });
}

// ============================================================================
// Google Calendar Functions
// ============================================================================

/**
 * Book an appointment in Google Calendar
 * 
 * @param workspaceId - Workspace with Google integration
 * @param request - Appointment details
 * @returns Booking result
 */
export async function bookAppointment(
  workspaceId: string,
  request: BookAppointmentRequest
): Promise<BookAppointmentResponse> {
  const startTime = Date.now();

  try {
    const auth = await getAuthenticatedClient(workspaceId);
    const calendar = google.calendar({ version: 'v3', auth });

    // Get integration metadata for default calendar
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, provider: 'google' },
    });

    const calendarId = request.calendarId || 
      (integration?.metadata as any)?.calendarId || 
      'primary';

    const timezone = request.timezone || 
      (integration?.metadata as any)?.timezone || 
      'America/New_York';

    const event = {
      summary: request.summary,
      description: request.description,
      start: {
        dateTime: request.startTime.toISOString(),
        timeZone: timezone,
      },
      end: {
        dateTime: request.endTime.toISOString(),
        timeZone: timezone,
      },
      attendees: [
        {
          email: request.attendeeEmail,
          displayName: request.attendeeName,
        },
      ],
      location: request.location,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'email', minutes: 24 * 60 }, // 24 hours before
          { method: 'popup', minutes: 30 }, // 30 minutes before
        ],
      },
      // Add Google Meet if no location specified
      ...(request.location ? {} : {
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}`,
            conferenceSolutionKey: { type: 'hangoutsMeet' },
          },
        },
      }),
    };

    const response = await calendar.events.insert({
      calendarId,
      requestBody: event,
      sendUpdates: request.sendNotifications ? 'all' : 'none',
      conferenceDataVersion: 1,
    });

    const duration = Date.now() - startTime;

    logger.info({
      workspaceId,
      eventId: response.data.id,
      duration,
    }, 'Appointment booked successfully');

    metrics.timing('google.calendar.book.duration', duration, {
      workspace: workspaceId,
    });
    metrics.increment('google.calendar.book.success', {
      workspace: workspaceId,
    });

    return {
      success: true,
      eventId: response.data.id || undefined,
      eventLink: response.data.htmlLink || undefined,
      meetLink: response.data.conferenceData?.entryPoints?.[0]?.uri,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({
      workspaceId,
      error: errorMessage,
    }, 'Failed to book appointment');

    metrics.increment('google.calendar.book.failure', {
      workspace: workspaceId,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * List available time slots in a date range
 * 
 * @param workspaceId - Workspace with Google integration
 * @param request - Availability query parameters
 * @returns Array of time slots with availability
 */
export async function listAvailability(
  workspaceId: string,
  request: ListAvailabilityRequest
): Promise<TimeSlot[]> {
  try {
    const auth = await getAuthenticatedClient(workspaceId);
    const calendar = google.calendar({ version: 'v3', auth });

    // Get integration metadata
    const integration = await prisma.integration.findFirst({
      where: { workspaceId, provider: 'google' },
    });

    const calendarId = request.calendarId || 
      (integration?.metadata as any)?.calendarId || 
      'primary';

    const timezone = request.timezone || 
      (integration?.metadata as any)?.timezone || 
      'America/New_York';

    // Query busy times
    const response = await calendar.freebusy.query({
      requestBody: {
        timeMin: request.startDate.toISOString(),
        timeMax: request.endDate.toISOString(),
        timeZone: timezone,
        items: [{ id: calendarId }],
      },
    });

    const busyTimes = response.data.calendars?.[calendarId]?.busy || [];

    // Generate time slots
    const slots: TimeSlot[] = [];
    const workingStart = request.workingHoursStart ?? 9;
    const workingEnd = request.workingHoursEnd ?? 17;

    let currentDate = new Date(request.startDate);
    const endDate = new Date(request.endDate);

    while (currentDate < endDate) {
      // Skip weekends
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        // Generate slots for this day
        for (let hour = workingStart; hour < workingEnd; hour++) {
          for (let minute = 0; minute < 60; minute += request.durationMinutes) {
            const slotStart = new Date(currentDate);
            slotStart.setHours(hour, minute, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + request.durationMinutes);

            // Check if slot is within working hours
            if (slotEnd.getHours() > workingEnd || 
                (slotEnd.getHours() === workingEnd && slotEnd.getMinutes() > 0)) {
              continue;
            }

            // Check if slot conflicts with busy times
            const isAvailable = !busyTimes.some(busy => {
              const busyStart = new Date(busy.start!);
              const busyEnd = new Date(busy.end!);
              return slotStart < busyEnd && slotEnd > busyStart;
            });

            slots.push({
              start: slotStart,
              end: slotEnd,
              available: isAvailable,
            });
          }
        }
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(0, 0, 0, 0);
    }

    metrics.increment('google.calendar.availability.success', {
      workspace: workspaceId,
    });

    return slots;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({
      workspaceId,
      error: errorMessage,
    }, 'Failed to list availability');

    metrics.increment('google.calendar.availability.failure', {
      workspace: workspaceId,
      error: errorMessage,
    });

    throw error;
  }
}

/**
 * List user's calendars
 * 
 * @param workspaceId - Workspace with Google integration
 * @returns List of calendars
 */
export async function listCalendars(workspaceId: string): Promise<Array<{
  id: string;
  name: string;
  primary: boolean;
  accessRole: string;
}>> {
  const auth = await getAuthenticatedClient(workspaceId);
  const calendar = google.calendar({ version: 'v3', auth });

  const response = await calendar.calendarList.list();

  return (response.data.items || []).map(cal => ({
    id: cal.id!,
    name: cal.summary!,
    primary: cal.primary || false,
    accessRole: cal.accessRole!,
  }));
}

// ============================================================================
// Google Sheets Functions
// ============================================================================

/**
 * Append a row to a Google Sheet
 * 
 * @param workspaceId - Workspace with Google integration
 * @param spreadsheetId - Google Sheets document ID
 * @param sheetName - Sheet name (tab)
 * @param rowData - Data to append
 * @returns Result with row number
 */
export async function appendRow(
  workspaceId: string,
  spreadsheetId: string,
  sheetName: string,
  rowData: SheetRowData
): Promise<{ success: boolean; rowNumber?: number; error?: string }> {
  const startTime = Date.now();

  try {
    const auth = await getAuthenticatedClient(workspaceId);
    const sheets = google.sheets({ version: 'v4', auth });

    // Convert rowData object to array based on sheet headers
    // First, get the headers
    const headerResponse = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!1:1`,
    });

    const headers = headerResponse.data.values?.[0] || [];

    // Map rowData to header order
    const rowValues = headers.map((header: string) => {
      const key = header.toLowerCase().replace(/\s+/g, '_');
      return rowData[key] ?? rowData[header] ?? '';
    });

    // Append the row
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: sheetName,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: {
        values: [rowValues],
      },
    });

    const duration = Date.now() - startTime;

    logger.info({
      workspaceId,
      spreadsheetId,
      rowNumber: response.data.updates?.updatedRange,
      duration,
    }, 'Row appended to Google Sheet');

    metrics.timing('google.sheets.append.duration', duration, {
      workspace: workspaceId,
    });
    metrics.increment('google.sheets.append.success', {
      workspace: workspaceId,
    });

    // Parse row number from response
    const updatedRange = response.data.updates?.updatedRange || '';
    const rowMatch = updatedRange.match(/!(?:\w+)?(\d+):/);
    const rowNumber = rowMatch ? parseInt(rowMatch[1], 10) : undefined;

    return {
      success: true,
      rowNumber,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({
      workspaceId,
      spreadsheetId,
      error: errorMessage,
    }, 'Failed to append row to Google Sheet');

    metrics.increment('google.sheets.append.failure', {
      workspace: workspaceId,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Read data from a Google Sheet
 * 
 * @param workspaceId - Workspace with Google integration
 * @param spreadsheetId - Google Sheets document ID
 * @param range - Cell range to read (e.g., "Sheet1!A1:D10")
 * @returns Sheet data as array of objects
 */
export async function readSheet(
  workspaceId: string,
  spreadsheetId: string,
  range: string
): Promise<{ success: boolean; data?: SheetRowData[]; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(workspaceId);
    const sheets = google.sheets({ version: 'v4', auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      return { success: true, data: [] };
    }

    // First row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    // Convert to objects
    const data: SheetRowData[] = dataRows.map(row => {
      const obj: SheetRowData = {};
      headers.forEach((header: string, index: number) => {
        const key = header.toLowerCase().replace(/\s+/g, '_');
        obj[key] = row[index] ?? null;
      });
      return obj;
    });

    metrics.increment('google.sheets.read.success', {
      workspace: workspaceId,
    });

    return { success: true, data };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({
      workspaceId,
      spreadsheetId,
      error: errorMessage,
    }, 'Failed to read Google Sheet');

    metrics.increment('google.sheets.read.failure', {
      workspace: workspaceId,
      error: errorMessage,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * Create a new spreadsheet
 * 
 * @param workspaceId - Workspace with Google integration
 * @param title - Spreadsheet title
 * @param sheetNames - Names for initial sheets
 * @returns Created spreadsheet info
 */
export async function createSpreadsheet(
  workspaceId: string,
  title: string,
  sheetNames?: string[]
): Promise<{ success: boolean; spreadsheetId?: string; url?: string; error?: string }> {
  try {
    const auth = await getAuthenticatedClient(workspaceId);
    const sheets = google.sheets({ version: 'v4', auth });

    const request: any = {
      properties: {
        title,
      },
    };

    if (sheetNames && sheetNames.length > 0) {
      request.sheets = sheetNames.map(name => ({
        properties: {
          title: name,
        },
      }));
    }

    const response = await sheets.spreadsheets.create({
      requestBody: request,
    });

    const spreadsheetId = response.data.spreadsheetId;
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    logger.info({
      workspaceId,
      spreadsheetId,
      title,
    }, 'Google Sheet created');

    metrics.increment('google.sheets.create.success', {
      workspace: workspaceId,
    });

    return {
      success: true,
      spreadsheetId: spreadsheetId || undefined,
      url,
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error({
      workspaceId,
      title,
      error: errorMessage,
    }, 'Failed to create Google Sheet');

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Integration Status
// ============================================================================

/**
 * Get Google integration status for a workspace
 * 
 * @param workspaceId - Workspace to check
 * @returns Integration status
 */
export async function getIntegrationStatus(workspaceId: string): Promise<{
  connected: boolean;
  email?: string;
  scopes?: string[];
  expiresAt?: Date;
  metadata?: any;
}> {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: 'google',
    },
  });

  if (!integration) {
    return { connected: false };
  }

  return {
    connected: integration.status === 'active',
    email: integration.connectedEmail || undefined,
    scopes: integration.scope as string[],
    expiresAt: integration.tokenExpiry,
    metadata: integration.metadata,
  };
}

/**
 * Update integration metadata
 * 
 * @param workspaceId - Workspace to update
 * @param metadata - New metadata values
 */
export async function updateIntegrationMetadata(
  workspaceId: string,
  metadata: Record<string, any>
): Promise<void> {
  const integration = await prisma.integration.findFirst({
    where: {
      workspaceId,
      provider: 'google',
    },
  });

  if (!integration) {
    throw new Error('Google integration not found');
  }

  await prisma.integration.update({
    where: { id: integration.id },
    data: {
      metadata: {
        ...(integration.metadata as object || {}),
        ...metadata,
      },
      updatedAt: new Date(),
    },
  });
}

export default {
  // OAuth
  generateAuthUrl,
  handleAuthCallback,
  disconnectIntegration,
  
  // Calendar
  bookAppointment,
  listAvailability,
  listCalendars,
  
  // Sheets
  appendRow,
  readSheet,
  createSpreadsheet,
  
  // Status
  getIntegrationStatus,
  updateIntegrationMetadata,
  
  // Constants
  GOOGLE_SCOPES,
};
