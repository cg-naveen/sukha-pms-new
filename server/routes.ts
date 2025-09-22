import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { setupNotificationRoutes } from "./api/notifications";
import { setupUploadRoutes } from "./api/upload";
import { z } from "zod";
import { randomBytes } from "crypto";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  insertUserSchema,
  insertResidentSchema,
  insertNextOfKinSchema,
  insertRoomSchema,
  insertOccupancySchema,
  insertBillingSchema,
  insertVisitorSchema,
  insertDocumentSchema,
  publicVisitorRegistrationSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  const { checkRole, checkWriteAccess } = setupAuth(app);

  // ==================== User Routes ====================
  app.get("/api/users", checkRole('superadmin'), async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  app.get("/api/users/:id", checkRole('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const user = await storage.getUser(id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json(user);
    } catch (error) {
      console.error('Error fetching user:', error);
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  app.put("/api/users/:id", checkRole('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userData = req.body;
      
      // Don't allow updating password through this endpoint
      const { password, ...userDataWithoutPassword } = userData;
      
      const updatedUser = await storage.updateUser(id, userDataWithoutPassword);
      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ message: 'Failed to update user' });
    }
  });

  app.put("/api/users/:id/password", checkRole('superadmin'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { password } = req.body;
      
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      
      const hashedPassword = await hashPassword(password);
      const updatedUser = await storage.updateUser(id, { password: hashedPassword });
      
      res.json({ message: 'Password updated successfully' });
    } catch (error) {
      console.error('Error updating password:', error);
      res.status(500).json({ message: 'Failed to update password' });
    }
  });

  // ==================== Resident Routes ====================
  app.get("/api/residents", async (req, res) => {
    try {
      const search = req.query.search as string;
      const roomType = req.query.roomType as string;
      const status = req.query.status as string;
      
      const residents = await storage.getAllResidents(search, roomType, status);
      res.json(residents);
    } catch (error) {
      console.error('Error fetching residents:', error);
      res.status(500).json({ message: 'Failed to fetch residents' });
    }
  });

  app.get("/api/residents/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const resident = await storage.getResident(id);
      if (!resident) {
        return res.status(404).json({ message: 'Resident not found' });
      }
      res.json(resident);
    } catch (error) {
      console.error('Error fetching resident:', error);
      res.status(500).json({ message: 'Failed to fetch resident' });
    }
  });

  app.post("/api/residents", checkWriteAccess('residents'), async (req, res) => {
    try {
      const { resident, nextOfKin } = req.body;
      
      const validatedResident = insertResidentSchema.parse(resident);
      // Default to undefined instead of null for proper TypeScript compatibility
      let validatedNextOfKin = undefined;
      
      if (nextOfKin) {
        validatedNextOfKin = insertNextOfKinSchema.parse(nextOfKin);
      }
      
      const newResident = await storage.createResident(validatedResident, validatedNextOfKin);
      res.status(201).json(newResident);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating resident:', error);
      res.status(500).json({ message: 'Failed to create resident' });
    }
  });

  app.put("/api/residents/:id", checkWriteAccess('residents'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { resident, nextOfKin } = req.body;
      
      const updatedResident = await storage.updateResident(id, resident);
      
      if (nextOfKin) {
        const existingNextOfKin = await storage.getNextOfKin(id);
        
        if (existingNextOfKin) {
          await storage.updateNextOfKin(existingNextOfKin.id, nextOfKin);
        } else {
          await storage.createNextOfKin({ ...nextOfKin, residentId: id });
        }
      }
      
      res.json(updatedResident);
    } catch (error) {
      console.error('Error updating resident:', error);
      res.status(500).json({ message: 'Failed to update resident' });
    }
  });

  // ==================== Room Routes ====================
  app.get("/api/rooms", async (req, res) => {
    try {
      const search = req.query.search as string;
      const type = req.query.type as string;
      const status = req.query.status as string;
      
      const rooms = await storage.getAllRooms(search, type, status);
      res.json(rooms);
    } catch (error) {
      console.error('Error fetching rooms:', error);
      res.status(500).json({ message: 'Failed to fetch rooms' });
    }
  });

  app.get("/api/rooms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const room = await storage.getRoom(id);
      if (!room) {
        return res.status(404).json({ message: 'Room not found' });
      }
      res.json(room);
    } catch (error) {
      console.error('Error fetching room:', error);
      res.status(500).json({ message: 'Failed to fetch room' });
    }
  });

  app.post("/api/rooms", checkWriteAccess('rooms'), async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const newRoom = await storage.createRoom(roomData);
      res.status(201).json(newRoom);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating room:', error);
      res.status(500).json({ message: 'Failed to create room' });
    }
  });

  app.put("/api/rooms/:id", checkWriteAccess('rooms'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const roomData = req.body;
      const updatedRoom = await storage.updateRoom(id, roomData);
      res.json(updatedRoom);
    } catch (error) {
      console.error('Error updating room:', error);
      res.status(500).json({ message: 'Failed to update room' });
    }
  });

  // ==================== Occupancy Routes ====================
  app.get("/api/occupancies", async (req, res) => {
    try {
      const active = req.query.active === 'true' ? true : 
                    req.query.active === 'false' ? false : 
                    undefined;
      
      const occupancies = await storage.getAllOccupancies(active);
      res.json(occupancies);
    } catch (error) {
      console.error('Error fetching occupancies:', error);
      res.status(500).json({ message: 'Failed to fetch occupancies' });
    }
  });

  app.post("/api/occupancies", checkWriteAccess('rooms'), async (req, res) => {
    try {
      const occupancyData = insertOccupancySchema.parse(req.body);
      const newOccupancy = await storage.createOccupancy(occupancyData);
      res.status(201).json(newOccupancy);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating occupancy:', error);
      res.status(500).json({ message: 'Failed to create occupancy' });
    }
  });

  app.put("/api/occupancies/:id", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const occupancyData = req.body;
      const updatedOccupancy = await storage.updateOccupancy(id, occupancyData);
      res.json(updatedOccupancy);
    } catch (error) {
      console.error('Error updating occupancy:', error);
      res.status(500).json({ message: 'Failed to update occupancy' });
    }
  });

  // ==================== Billing Routes ====================
  app.get("/api/billings", async (req, res) => {
    try {
      const status = req.query.status as string;
      const dateFrom = req.query.dateFrom as string;
      const dateTo = req.query.dateTo as string;
      const billings = await storage.getAllBillings(status, dateFrom, dateTo);
      res.json(billings);
    } catch (error) {
      console.error('Error fetching billings:', error);
      res.status(500).json({ message: 'Failed to fetch billings' });
    }
  });

  app.get("/api/billings/upcoming/:days", async (req, res) => {
    try {
      const days = parseInt(req.params.days) || 30;
      const upcomingBillings = await storage.getUpcomingBillings(days);
      res.json(upcomingBillings);
    } catch (error) {
      console.error('Error fetching upcoming billings:', error);
      res.status(500).json({ message: 'Failed to fetch upcoming billings' });
    }
  });

  app.post("/api/billings", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const billingData = insertBillingSchema.parse(req.body);
      const newBilling = await storage.createBilling(billingData);
      res.status(201).json(newBilling);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating billing:', error);
      res.status(500).json({ message: 'Failed to create billing' });
    }
  });

  app.put("/api/billings/:id", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const billingData = req.body;
      const updatedBilling = await storage.updateBilling(id, billingData);
      res.json(updatedBilling);
    } catch (error) {
      console.error('Error updating billing:', error);
      res.status(500).json({ message: 'Failed to update billing' });
    }
  });

  // ==================== Visitor Routes ====================
  app.get("/api/visitors", async (req, res) => {
    try {
      const status = req.query.status as string;
      const visitors = await storage.getAllVisitors(status);
      res.json(visitors);
    } catch (error) {
      console.error('Error fetching visitors:', error);
      res.status(500).json({ message: 'Failed to fetch visitors' });
    }
  });

  app.get("/api/visitors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const visitor = await storage.getVisitor(id);
      if (!visitor) {
        return res.status(404).json({ message: 'Visitor not found' });
      }
      res.json(visitor);
    } catch (error) {
      console.error('Error fetching visitor:', error);
      res.status(500).json({ message: 'Failed to fetch visitor' });
    }
  });
  


  // Public endpoint for visitor registration
  app.post("/api/public/visitor-request", async (req, res) => {
    try {
      const visitorData = insertVisitorSchema.parse(req.body);
      
      // Check if resident exists when residentId is provided
      if (visitorData.residentId) {
        const resident = await storage.getResident(visitorData.residentId);
        if (!resident) {
          return res.status(404).json({ message: 'Resident not found' });
        }
      }
      
      const newVisitor = await storage.createVisitor(visitorData);
      res.status(201).json({ 
        message: 'Visit request submitted successfully. You will be notified when approved.',
        id: newVisitor.id 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating visitor request:', error);
      res.status(500).json({ message: 'Failed to create visitor request' });
    }
  });

  // Walk-in registration endpoint - auto-approves visitor
  app.post("/api/visitors/walk-in", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const visitorData = insertVisitorSchema.parse(req.body);
      const userId = req.user!.id;
      
      // Generate QR code for immediate approval
      const qrCode = randomBytes(16).toString('hex');
      
      // Create visitor with approved status
      const newVisitor = await storage.createVisitor({
        ...visitorData,
        status: 'approved',
        qrCode,
        approvedById: userId,
        approvedAt: new Date(),
      });
      
      res.status(201).json({ 
        message: 'Walk-in visitor registered and approved successfully',
        visitor: newVisitor
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error creating walk-in visitor:', error);
      res.status(500).json({ message: 'Failed to register walk-in visitor' });
    }
  });

  app.post("/api/visitors/:id/approve", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // TypeScript safety: req.user is guaranteed to exist due to checkRole middleware
      const userId = req.user!.id;
      
      // Generate QR code data
      const qrCode = randomBytes(16).toString('hex');
      
      const approvedVisitor = await storage.approveVisitor(id, userId, qrCode);
      
      // Generate a data URL for the QR code to include in the email
      const qrCodeDataUrl = `${req.protocol}://${req.get('host')}/api/visitors/qr/${approvedVisitor.id}`;
      
      // Send an email notification to the visitor
      try {
        const { sendVisitorApprovalEmail } = await import('./services/email');
        await sendVisitorApprovalEmail(approvedVisitor, qrCodeDataUrl);
        console.log('Approval email sent to visitor:', approvedVisitor.email);
      } catch (emailError) {
        console.error('Failed to send approval email:', emailError);
        // We still approve the visitor even if email fails
      }
      
      res.json(approvedVisitor);
    } catch (error) {
      console.error('Error approving visitor:', error);
      res.status(500).json({ message: 'Failed to approve visitor' });
    }
  });

  app.post("/api/visitors/:id/reject", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      // TypeScript safety: req.user is guaranteed to exist due to checkRole middleware
      const userId = req.user!.id;
      
      // Get reason if provided
      const { reason } = req.body;
      
      const rejectedVisitor = await storage.rejectVisitor(id, userId);
      
      // Send rejection email notification
      try {
        const { sendVisitorRejectionEmail } = await import('./services/email');
        await sendVisitorRejectionEmail(rejectedVisitor, reason);
        console.log('Rejection email sent to visitor:', rejectedVisitor.email);
      } catch (emailError) {
        console.error('Failed to send rejection email:', emailError);
        // We still reject the visitor even if email fails
      }
      
      res.json(rejectedVisitor);
    } catch (error) {
      console.error('Error rejecting visitor:', error);
      res.status(500).json({ message: 'Failed to reject visitor' });
    }
  });

  // ==================== Test Email Routes (Development Only) ====================
  // Basic email test endpoint
  app.post("/api/test-email/basic", async (req, res) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Route not found' });
      }
      
      const { email } = req.body;
      const toEmail = email || 'naveen@trisquare.com.my';
      
      // Log API key info (without revealing it)
      const apiKey = process.env.BREVO_API_KEY || '';
      console.log('API Key length:', apiKey.length);
      console.log('API Key first 5 chars:', apiKey.substring(0, 5));
      
      if (apiKey.startsWith('SG.')) {
        console.log('API key appears to be a SendGrid key, not a Brevo key');
      } else {
        console.log('API key does not start with "SG.".');
      }
      
      // Import the email service
      const { sendEmail } = await import('./services/email');
      
      // Send a simple test email
      const result = await sendEmail({
        to: toEmail,
        subject: 'Test Email from Sukha Senior Resort',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 5px;">
            <h2 style="color: #004c4c;">Test Email from Sukha Senior Resort</h2>
            <p>This is a test email to verify the email service is working correctly.</p>
            <p>If you received this email, it means the Brevo API is properly configured.</p>
            <p>Time sent: ${new Date().toISOString()}</p>
          </div>
        `
      });
      
      if (result) {
        res.json({ success: true, message: 'Test email sent successfully', to: toEmail });
      } else {
        res.status(500).json({ success: false, message: 'Failed to send test email', to: toEmail });
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      res.status(500).json({ message: 'Error sending test email' });
    }
  });

  app.post("/api/test-email/approval", async (req, res) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Route not found' });
      }

      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email address is required' });
      }
      
      // Create a mock visitor for testing that matches our Visitor type
      const mockVisitor = {
        id: 999,
        fullName: "Test Visitor",
        email: email,
        phone: "+60123456789",
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: "10:00 AM",
        purpose: "Site Visit",
        residentName: "Test Resident",
        roomNumber: "A-101",
        numberOfVisitors: 2,
        status: "approved", 
        approvedById: 1,
        residentId: null,
        details: "Test visit details",
        qrCode: "test_qr_code_123456",
        vehicleNumber: "ABC123",
        createdAt: new Date(),
        updatedAt: new Date(),
        approvedAt: new Date(),
        approvedBy: { id: 1, username: "admin", role: "admin" }
      } as any; // Type assertion to avoid strict type checking for this test route
      
      // Mock QR code URL
      const qrCodeUrl = `${req.protocol}://${req.get('host')}/test-qr-code`;
      
      // Import the email service
      const { sendVisitorApprovalEmail } = await import('./services/email');
      
      // Send test approval email
      const result = await sendVisitorApprovalEmail(mockVisitor, qrCodeUrl);
      
      if (result) {
        res.json({ message: 'Test approval email processed successfully' });
      } else {
        res.status(500).json({ message: 'Failed to process approval email' });
      }
    } catch (error) {
      console.error('Error sending test approval email:', error);
      res.status(500).json({ message: 'Error sending test approval email' });
    }
  });

  // Create a test visitor with QR code for testing verification
  app.post("/api/test-visitor/create", async (req, res) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Route not found' });
      }
      
      // Create a visitor with a known QR code for testing
      const visitorData = {
        fullName: "Test Visitor",
        email: "test@example.com",
        phone: "+60123456789",
        visitDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        visitTime: "10:00 AM",
        purpose: "Site Visit",
        residentName: "Test Resident",
        roomNumber: "A-101",
        numberOfVisitors: 2,
        status: 'approved',
        details: "Test visit details",
        vehicleNumber: "ABC123",
        qrCode: "test_qr_code_123456"
      };
      
      // Create or update the test visitor
      const visitors = await storage.getAllVisitors();
      const existingVisitor = visitors.find(v => v.qrCode === visitorData.qrCode);
      
      let testVisitor;
      if (existingVisitor) {
        testVisitor = await storage.updateVisitor(existingVisitor.id, {
          ...visitorData,
          status: 'approved'
        });
      } else {
        testVisitor = await storage.createVisitor(visitorData);
        // Approve the visitor to set the QR code
        testVisitor = await storage.approveVisitor(testVisitor.id, 1, visitorData.qrCode);
      }
      
      res.json({ 
        message: 'Test visitor created successfully', 
        visitor: testVisitor,
        verifyUrl: `${req.protocol}://${req.get('host')}/api/public/visitors/verify/${visitorData.qrCode}`
      });
    } catch (error) {
      console.error('Error creating test visitor:', error);
      res.status(500).json({ message: 'Error creating test visitor' });
    }
  });

  app.post("/api/test-email/rejection", async (req, res) => {
    try {
      // Only allow in development mode
      if (process.env.NODE_ENV === 'production') {
        return res.status(404).json({ message: 'Route not found' });
      }

      const { email, reason } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: 'Email address is required' });
      }
      
      // Create a mock visitor for testing
      const mockVisitor = {
        id: 999,
        fullName: "Test Visitor",
        email: email,
        phone: "+60123456789",
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: "10:00 AM",
        purpose: "Site Visit",
        residentName: "Test Resident",
        roomNumber: "A-101",
        numberOfVisitors: 2,
        status: "rejected", 
        residentId: null,
        details: "Test visit details",
        vehicleNumber: "ABC123",
        createdAt: new Date(),
        updatedAt: new Date()
      } as any; // Type assertion to avoid strict type checking for this test route
      
      // Import the email service
      const { sendVisitorRejectionEmail } = await import('./services/email');
      
      // Send test rejection email
      const result = await sendVisitorRejectionEmail(mockVisitor, reason || "The facility is unavailable on the requested date.");
      
      if (result) {
        res.json({ message: 'Test rejection email processed successfully' });
      } else {
        res.status(500).json({ message: 'Failed to process rejection email' });
      }
    } catch (error) {
      console.error('Error sending test rejection email:', error);
      res.status(500).json({ message: 'Error sending test rejection email' });
    }
  });

  // ==================== Dashboard Stats ====================
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      // Get total number of residents
      const residents = await storage.getAllResidents();
      const residentCount = residents.length;
      
      // Get room occupancy
      const rooms = await storage.getAllRooms();
      const occupiedRooms = rooms.filter(room => room.status === 'occupied');
      const occupancyRate = rooms.length > 0 ? Math.round((occupiedRooms.length / rooms.length) * 100) : 0;
      
      // Get pending renewals (next 30 days)
      const upcomingBillings = await storage.getUpcomingBillings(30);
      const pendingRenewals = upcomingBillings.length;
      
      // Get pending visitor requests
      const pendingVisitors = await storage.getAllVisitors('pending');
      const visitorRequests = pendingVisitors.length;
      
      // Get recent activity (simplified version)
      const recentActivity = [
        ...pendingVisitors.slice(0, 2).map(v => ({
          type: 'visitor_request',
          data: v,
          timestamp: v.createdAt
        })),
        ...upcomingBillings.slice(0, 2).map(b => ({
          type: 'billing_due',
          data: b,
          timestamp: b.createdAt
        }))
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
       .slice(0, 4);
      
      res.json({
        residentCount,
        occupancyRate,
        pendingRenewals,
        visitorRequests,
        recentActivity
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ message: 'Failed to fetch dashboard stats' });
    }
  });

  // ==================== Public Routes ====================
  // QR Code verification endpoint - used when staff scans a visitor's QR code
  app.get("/api/public/visitors/verify/:qrCode", async (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    try {
      const { qrCode } = req.params;
      
      if (!qrCode) {
        return res.status(400).json({ 
          success: false,
          message: 'QR code is required'
        });
      }
      
      // Find visitor with this QR code
      const visitors = await storage.getAllVisitors('approved');
      const visitor = visitors.find(v => v.qrCode === qrCode);
      
      if (!visitor) {
        return res.status(404).json({
          success: false,
          message: 'Invalid or expired QR code'
        });
      }
      
      // Check if the visit date is valid (not in the past)
      const visitDate = new Date(visitor.visitDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (visitDate < today) {
        return res.status(400).json({
          success: false,
          message: 'This visit has expired',
          visitor: {
            id: visitor.id,
            fullName: visitor.fullName,
            visitDate: visitor.visitDate,
            status: 'expired'
          }
        });
      }
      
      // Valid QR code for an upcoming or today's visit
      return res.status(200).json({
        success: true,
        message: 'QR code verified successfully',
        visitor
      });
      
    } catch (error) {
      console.error('Error verifying QR code:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to verify QR code'
      });
    }
  });

  app.post("/api/public/visitor-registration", async (req, res) => {
    try {
      console.log("Received visitor registration request:", req.body);
      
      // Validate the incoming data
      const validatedData = publicVisitorRegistrationSchema.parse(req.body);
      
      // Format the data for storing in the database
      const visitorData = {
        fullName: validatedData.fullName,
        email: validatedData.email,
        phone: validatedData.phone,
        visitDate: validatedData.visitDate,
        visitTime: validatedData.visitTime,
        purpose: validatedData.purpose,
        details: validatedData.purpose === 'Other' ? validatedData.otherPurpose : validatedData.purpose,
        residentName: validatedData.residentName,
        roomNumber: validatedData.roomNumber || null,
        vehicleNumber: validatedData.vehicleNumber || null,
        numberOfVisitors: validatedData.numberOfVisitors,
        status: 'pending',
      };
      
      console.log("Processed visitor data:", visitorData);
      
      // Create the visitor record
      const newVisitor = await storage.createVisitor(visitorData);
      
      console.log("Created visitor record:", newVisitor);
      
      // Return success response
      res.status(201).json({
        success: true,
        message: 'Visitor registration submitted successfully',
        visitor: {
          id: newVisitor.id,
          fullName: newVisitor.fullName,
          status: newVisitor.status,
        }
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error('Validation error:', error.errors);
        return res.status(400).json({ 
          success: false,
          errors: error.errors 
        });
      }
      console.error('Error registering visitor:', error);
      res.status(500).json({ 
        success: false,
        message: 'Failed to process visitor registration' 
      });
    }
  });

  // ==================== Document Routes ====================
  // Multer configuration for file uploads
  const uploadDir = path.join(process.cwd(), 'uploads', 'documents');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const multerStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const upload = multer({
    storage: multerStorage,
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png|pdf/;
      const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = allowedTypes.test(file.mimetype);
      
      if (mimetype && extname) {
        return cb(null, true);
      } else {
        cb(new Error('Only JPG, PNG, and PDF files are allowed!'));
      }
    }
  });

  // Get documents for a resident
  app.get("/api/residents/:id/documents", async (req, res) => {
    try {
      const residentId = parseInt(req.params.id);
      const documents = await storage.getDocumentsByResidentId(residentId);
      res.json(documents);
    } catch (error) {
      console.error('Error fetching documents:', error);
      res.status(500).json({ message: 'Failed to fetch documents' });
    }
  });

  // Upload document
  app.post("/api/documents/upload", checkWriteAccess('residents'), upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const { title, residentId } = req.body;
      
      if (!title || !residentId) {
        return res.status(400).json({ message: 'Title and resident ID are required' });
      }

      const documentData = {
        residentId: parseInt(residentId),
        title,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype
      };

      const validatedDocument = insertDocumentSchema.parse(documentData);
      const newDocument = await storage.createDocument(validatedDocument);
      
      res.status(201).json(newDocument);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      console.error('Error uploading document:', error);
      res.status(500).json({ message: 'Failed to upload document' });
    }
  });

  // Download document
  app.get("/api/documents/:id/download", async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      if (!fs.existsSync(document.filePath)) {
        return res.status(404).json({ message: 'File not found on server' });
      }

      res.download(document.filePath, document.fileName);
    } catch (error) {
      console.error('Error downloading document:', error);
      res.status(500).json({ message: 'Failed to download document' });
    }
  });

  // Delete document
  app.delete("/api/documents/:id", checkWriteAccess('residents'), async (req, res) => {
    try {
      const documentId = parseInt(req.params.id);
      const document = await storage.getDocument(documentId);
      
      if (!document) {
        return res.status(404).json({ message: 'Document not found' });
      }

      // Delete file from filesystem
      if (fs.existsSync(document.filePath)) {
        fs.unlinkSync(document.filePath);
      }

      // Delete from database
      await storage.deleteDocument(documentId);
      
      res.json({ message: 'Document deleted successfully' });
    } catch (error) {
      console.error('Error deleting document:', error);
      res.status(500).json({ message: 'Failed to delete document' });
    }
  });

  // Setup notification routes
  setupNotificationRoutes(app);
  
  // Setup upload routes
  setupUploadRoutes(app);

  const httpServer = createServer(app);
  return httpServer;
}
