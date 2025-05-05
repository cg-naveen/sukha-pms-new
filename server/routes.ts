import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, hashPassword } from "./auth";
import { z } from "zod";
import { randomBytes } from "crypto";
import {
  insertUserSchema,
  insertResidentSchema,
  insertNextOfKinSchema,
  insertRoomSchema,
  insertOccupancySchema,
  insertBillingSchema,
  insertVisitorSchema,
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
      let validatedNextOfKin = null;
      
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
      const billings = await storage.getAllBillings(status);
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
      
      // Check if resident exists
      const resident = await storage.getResident(visitorData.residentId);
      if (!resident) {
        return res.status(404).json({ message: 'Resident not found' });
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

  app.post("/api/visitors/:id/approve", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Generate QR code data (in real app, this would be a unique code or URL)
      const qrCode = randomBytes(16).toString('hex');
      
      const approvedVisitor = await storage.approveVisitor(id, userId, qrCode);
      res.json(approvedVisitor);
      
      // In a real app, would send email notification here with QR code link
    } catch (error) {
      console.error('Error approving visitor:', error);
      res.status(500).json({ message: 'Failed to approve visitor' });
    }
  });

  app.post("/api/visitors/:id/reject", checkRole('admin', 'staff'), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const userId = req.user.id;
      
      const rejectedVisitor = await storage.rejectVisitor(id, userId);
      res.json(rejectedVisitor);
      
      // In a real app, would send email notification here
    } catch (error) {
      console.error('Error rejecting visitor:', error);
      res.status(500).json({ message: 'Failed to reject visitor' });
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
  app.post("/api/public/visitor-registration", async (req, res) => {
    try {
      // Validate the incoming data
      const validatedData = publicVisitorRegistrationSchema.parse(req.body);
      
      // Format the data for storing in the database
      const visitorData = {
        fullName: validatedData.fullName,
        email: validatedData.email,
        phone: validatedData.phone,
        visitDate: validatedData.visitDate,
        visitTime: validatedData.visitTime,
        purpose: validatedData.purpose === 'other' ? 'Other' : validatedData.purpose,
        details: validatedData.purpose === 'other' ? validatedData.otherPurpose : undefined,
        residentName: validatedData.residentName,
        roomNumber: validatedData.roomNumber || null,
        vehicleNumber: validatedData.vehicleNumber || null,
        numberOfVisitors: validatedData.numberOfVisitors,
        status: 'pending',
      };
      
      // Create the visitor record
      const newVisitor = await storage.createVisitor(visitorData);
      
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

  const httpServer = createServer(app);
  return httpServer;
}
