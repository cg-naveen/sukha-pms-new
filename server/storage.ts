import { db } from "@db";
import { eq, and, desc, like, gte, lte, or, sql } from "drizzle-orm";
import { z } from "zod";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "@db";
import { 
  users, 
  residents,
  nextOfKin,
  rooms,
  occupancy,
  billings,
  visitors,
  notifications,
  InsertUser,
  InsertResident,
  InsertNextOfKin,
  InsertRoom,
  InsertOccupancy,
  InsertBilling,
  InsertVisitor,
} from "@shared/schema";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // Users
  getUser(id: number): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: InsertUser): Promise<any>;
  getAllUsers(): Promise<any[]>;
  updateUser(id: number, userData: Partial<InsertUser>): Promise<any>;
  
  // Residents
  getResident(id: number): Promise<any>;
  getAllResidents(search?: string, roomType?: string, status?: string): Promise<any[]>;
  createResident(resident: InsertResident, nextOfKinData?: InsertNextOfKin): Promise<any>;
  updateResident(id: number, data: Partial<InsertResident>): Promise<any>;
  
  // Next of Kin
  getNextOfKin(residentId: number): Promise<any>;
  createNextOfKin(nextOfKin: InsertNextOfKin): Promise<any>;
  updateNextOfKin(id: number, data: Partial<InsertNextOfKin>): Promise<any>;
  
  // Rooms
  getRoom(id: number): Promise<any>;
  getAllRooms(search?: string, type?: string, status?: string): Promise<any[]>;
  createRoom(room: InsertRoom): Promise<any>;
  updateRoom(id: number, data: Partial<InsertRoom>): Promise<any>;
  
  // Occupancy
  getOccupancy(id: number): Promise<any>;
  getAllOccupancies(active?: boolean): Promise<any[]>;
  getOccupancyByRoomId(roomId: number, active?: boolean): Promise<any>;
  getOccupancyByResidentId(residentId: number, active?: boolean): Promise<any>;
  createOccupancy(occupancy: InsertOccupancy): Promise<any>;
  updateOccupancy(id: number, data: Partial<InsertOccupancy>): Promise<any>;
  
  // Billings
  getBilling(id: number): Promise<any>;
  getAllBillings(status?: string): Promise<any[]>;
  getUpcomingBillings(days: number): Promise<any[]>;
  createBilling(billing: InsertBilling): Promise<any>;
  updateBilling(id: number, data: Partial<InsertBilling>): Promise<any>;
  
  // Visitors
  getVisitor(id: number): Promise<any>;
  getAllVisitors(status?: string): Promise<any[]>;
  createVisitor(visitor: InsertVisitor): Promise<any>;
  updateVisitor(id: number, data: Partial<InsertVisitor>): Promise<any>;
  approveVisitor(id: number, userId: number, qrCode: string): Promise<any>;
  rejectVisitor(id: number, userId: number): Promise<any>;
  
  // Notifications
  createNotification(notification: any): Promise<any>;
  getNotificationsByUserId(userId: number): Promise<any[]>;
  markNotificationAsRead(id: number, userId: number): Promise<any>;
  markAllNotificationsAsRead(userId: number): Promise<any>;
  deleteNotification(id: number, userId: number): Promise<any>;
  getUnreadNotificationCount(userId: number): Promise<number>;
  
  sessionStore: session.SessionStore;
}

class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true
    });
  }

  // User methods
  async getUser(id: number) {
    return await db.query.users.findFirst({
      where: eq(users.id, id)
    });
  }

  async getUserByUsername(username: string) {
    return await db.query.users.findFirst({
      where: eq(users.username, username)
    });
  }

  async createUser(userData: InsertUser) {
    const [user] = await db.insert(users).values(userData).returning();
    return user;
  }

  async getAllUsers() {
    return await db.query.users.findMany({
      orderBy: [desc(users.createdAt)]
    });
  }

  async updateUser(id: number, userData: Partial<InsertUser>) {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Resident methods
  async getResident(id: number) {
    return await db.query.residents.findFirst({
      where: eq(residents.id, id),
      with: {
        nextOfKin: true
      }
    });
  }

  async getAllResidents(search?: string, roomType?: string, status?: string) {
    let query = db.query.residents.findMany({
      with: {
        occupancy: {
          where: eq(occupancy.active, true),
          with: {
            room: true,
            billings: {
              where: eq(billings.status, 'pending'),
              orderBy: [billings.dueDate]
            }
          }
        }
      },
      orderBy: [residents.fullName]
    });

    // Apply filters in the client-side as this is a simple query pattern for now
    return query;
  }

  async createResident(residentData: InsertResident, nextOfKinData?: InsertNextOfKin) {
    const [resident] = await db.insert(residents).values(residentData).returning();
    
    if (nextOfKinData && resident.id) {
      await db.insert(nextOfKin).values({
        ...nextOfKinData,
        residentId: resident.id
      });
    }
    
    return resident;
  }

  async updateResident(id: number, data: Partial<InsertResident>) {
    const [updatedResident] = await db
      .update(residents)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(residents.id, id))
      .returning();
    return updatedResident;
  }

  // Next of Kin methods
  async getNextOfKin(residentId: number) {
    return await db.query.nextOfKin.findFirst({
      where: eq(nextOfKin.residentId, residentId)
    });
  }

  async createNextOfKin(nextOfKinData: InsertNextOfKin) {
    const [newNextOfKin] = await db.insert(nextOfKin).values(nextOfKinData).returning();
    return newNextOfKin;
  }

  async updateNextOfKin(id: number, data: Partial<InsertNextOfKin>) {
    const [updatedNextOfKin] = await db
      .update(nextOfKin)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(nextOfKin.id, id))
      .returning();
    return updatedNextOfKin;
  }

  // Room methods
  async getRoom(id: number) {
    return await db.query.rooms.findFirst({
      where: eq(rooms.id, id),
      with: {
        occupancy: {
          where: eq(occupancy.active, true),
          with: {
            resident: true
          }
        }
      }
    });
  }

  async getAllRooms(search?: string, type?: string, status?: string) {
    let query = db.query.rooms.findMany({
      with: {
        occupancy: {
          where: eq(occupancy.active, true),
          with: {
            resident: true
          }
        }
      },
      orderBy: [rooms.unitNumber]
    });
    
    // Apply filters in the client-side as this is a simple query pattern for now
    return query;
  }

  async createRoom(roomData: InsertRoom) {
    const [room] = await db.insert(rooms).values(roomData).returning();
    return room;
  }

  async updateRoom(id: number, data: Partial<InsertRoom>) {
    const [updatedRoom] = await db
      .update(rooms)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(rooms.id, id))
      .returning();
    return updatedRoom;
  }

  // Occupancy methods
  async getOccupancy(id: number) {
    return await db.query.occupancy.findFirst({
      where: eq(occupancy.id, id),
      with: {
        room: true,
        resident: true
      }
    });
  }

  async getAllOccupancies(active?: boolean) {
    let query = db.query.occupancy.findMany({
      with: {
        room: true,
        resident: true
      },
      orderBy: [desc(occupancy.startDate)]
    });

    if (active !== undefined) {
      query = db.query.occupancy.findMany({
        where: eq(occupancy.active, active),
        with: {
          room: true,
          resident: true
        },
        orderBy: [desc(occupancy.startDate)]
      });
    }
    
    return query;
  }

  async getOccupancyByRoomId(roomId: number, active?: boolean) {
    let query = db.query.occupancy.findFirst({
      where: eq(occupancy.roomId, roomId),
      with: {
        resident: true,
        billings: true
      }
    });

    if (active !== undefined) {
      query = db.query.occupancy.findFirst({
        where: and(
          eq(occupancy.roomId, roomId),
          eq(occupancy.active, active)
        ),
        with: {
          resident: true,
          billings: true
        }
      });
    }
    
    return query;
  }

  async getOccupancyByResidentId(residentId: number, active?: boolean) {
    let query = db.query.occupancy.findFirst({
      where: eq(occupancy.residentId, residentId),
      with: {
        room: true,
        billings: true
      }
    });

    if (active !== undefined) {
      query = db.query.occupancy.findFirst({
        where: and(
          eq(occupancy.residentId, residentId),
          eq(occupancy.active, active)
        ),
        with: {
          room: true,
          billings: true
        }
      });
    }
    
    return query;
  }

  async createOccupancy(occupancyData: InsertOccupancy) {
    // First, set any existing active occupancy for this room to inactive
    await db
      .update(occupancy)
      .set({ active: false, updatedAt: new Date() })
      .where(and(
        eq(occupancy.roomId, occupancyData.roomId),
        eq(occupancy.active, true)
      ));
    
    // Then, create the new occupancy
    const [newOccupancy] = await db.insert(occupancy).values(occupancyData).returning();
    
    // Update the room status to occupied
    await db
      .update(rooms)
      .set({ status: 'occupied', updatedAt: new Date() })
      .where(eq(rooms.id, occupancyData.roomId));
    
    return newOccupancy;
  }

  async updateOccupancy(id: number, data: Partial<InsertOccupancy>) {
    const [updatedOccupancy] = await db
      .update(occupancy)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(occupancy.id, id))
      .returning();
    
    // If we're deactivating the occupancy, update the room status to vacant
    if (data.active === false) {
      const occ = await this.getOccupancy(id);
      if (occ) {
        await db
          .update(rooms)
          .set({ status: 'vacant', updatedAt: new Date() })
          .where(eq(rooms.id, occ.roomId));
      }
    }
    
    return updatedOccupancy;
  }

  // Billing methods
  async getBilling(id: number) {
    return await db.query.billings.findFirst({
      where: eq(billings.id, id),
      with: {
        occupancy: {
          with: {
            resident: true,
            room: true
          }
        }
      }
    });
  }

  async getAllBillings(status?: string) {
    let query = db.query.billings.findMany({
      with: {
        resident: {
          with: {
            room: true
          }
        }
      },
      orderBy: desc(billings.createdAt)
    });

    if (status && status !== 'all_statuses') {
      query = db.query.billings.findMany({
        where: eq(billings.status, status as any),
        with: {
          resident: {
            with: {
              room: true
            }
          }
        },
        orderBy: desc(billings.createdAt)
      });
    }
    
    return query;
  }

  async getUpcomingBillings(days: number) {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + days);
    
    return await db.query.billings.findMany({
      where: and(
        eq(billings.status, 'pending'),
        gte(billings.dueDate, today),
        lte(billings.dueDate, futureDate)
      ),
      with: {
        occupancy: {
          with: {
            resident: true,
            room: true
          }
        }
      },
      orderBy: [billings.dueDate]
    });
  }

  async createBilling(billingData: InsertBilling) {
    const [billing] = await db.insert(billings).values(billingData).returning();
    return billing;
  }

  async updateBilling(id: number, data: Partial<InsertBilling>) {
    const [updatedBilling] = await db
      .update(billings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(billings.id, id))
      .returning();
    return updatedBilling;
  }

  // Visitor methods
  async getVisitor(id: number) {
    return await db.query.visitors.findFirst({
      where: eq(visitors.id, id),
      with: {
        resident: true,
        approvedBy: true
      }
    });
  }

  async getAllVisitors(status?: string) {
    let query = db.query.visitors.findMany({
      with: {
        resident: true,
        approvedBy: true
      },
      orderBy: [desc(visitors.createdAt)]
    });

    if (status && status !== 'all_statuses') {
      query = db.query.visitors.findMany({
        where: eq(visitors.status, status as any),
        with: {
          resident: true,
          approvedBy: true
        },
        orderBy: [desc(visitors.createdAt)]
      });
    }
    
    return query;
  }

  async createVisitor(visitorData: InsertVisitor) {
    const [visitor] = await db.insert(visitors).values(visitorData).returning();
    return visitor;
  }

  async updateVisitor(id: number, data: Partial<InsertVisitor>) {
    const [updatedVisitor] = await db
      .update(visitors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(visitors.id, id))
      .returning();
    return updatedVisitor;
  }

  async approveVisitor(id: number, userId: number, qrCode: string) {
    const [approvedVisitor] = await db
      .update(visitors)
      .set({ 
        status: 'approved', 
        approvedById: userId, 
        approvedAt: new Date(),
        qrCode,
        updatedAt: new Date() 
      })
      .where(eq(visitors.id, id))
      .returning();
    return approvedVisitor;
  }

  async rejectVisitor(id: number, userId: number) {
    const [rejectedVisitor] = await db
      .update(visitors)
      .set({ 
        status: 'rejected', 
        approvedById: userId, 
        approvedAt: new Date(),
        updatedAt: new Date() 
      })
      .where(eq(visitors.id, id))
      .returning();
    return rejectedVisitor;
  }

  // Notification methods
  async getNotificationsByUserId(userId: number) {
    return await db.query.notifications.findMany({
      where: eq(notifications.userId, userId),
      orderBy: [desc(notifications.createdAt)]
    });
  }

  async createNotification(notificationData: any) {
    const [notification] = await db.insert(notifications).values(notificationData).returning();
    return notification;
  }

  async markNotificationAsRead(notificationId: number, userId: number) {
    const [updatedNotification] = await db
      .update(notifications)
      .set({ read: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();
    return updatedNotification;
  }

  async markAllNotificationsAsRead(userId: number) {
    return await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.userId, userId));
  }

  async deleteNotification(notificationId: number, userId: number) {
    return await db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));
  }

  async getUnreadNotificationCount(userId: number) {
    const result = await db
      .select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result[0]?.count || 0;
  }
}

// Create and export the storage instance
export const storage = new DatabaseStorage();
