import { db } from "./index";
import { 
  users, 
  residents, 
  nextOfKin, 
  rooms, 
  occupancy, 
  billings, 
  visitors 
} from "@shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    console.log("Starting database seeding...");

    // Check if admin user exists
    const existingAdmin = await db.query.users.findFirst({
      where: (users) => eq(users.username, "admin")
    });

    // Create admin user if it doesn't exist
    if (!existingAdmin) {
      console.log("Creating admin user...");
      const hashedPassword = await hashPassword("admin123");
      await db.insert(users).values({
        username: "admin",
        password: hashedPassword,
        email: "admin@property.com",
        fullName: "Admin User",
        role: "admin"
      });
      console.log("Admin user created.");
    } else {
      console.log("Admin user already exists, skipping creation.");
    }

    // Check if we have any room types
    const existingRooms = await db.query.rooms.findMany({
      limit: 1
    });

    // Seed rooms if none exist
    if (existingRooms.length === 0) {
      console.log("Creating sample rooms...");
      
      // Define arrays for rooms with proper typing
      
      // Create individual room entries
      await db.insert(rooms).values({
        unitNumber: "101A",
        floorNumber: 1,
        roomType: "Standard" as const,
        status: "vacant" as const,
        monthlyRent: 800,
        description: "Standard studio apartment with basic amenities"
      });
      
      await db.insert(rooms).values({
        unitNumber: "102A",
        floorNumber: 1,
        roomType: "Standard" as const,
        status: "occupied" as const,
        monthlyRent: 800,
        description: "Standard studio apartment with basic amenities"
      });
      
      await db.insert(rooms).values({
        unitNumber: "201B",
        floorNumber: 2,
        roomType: "Deluxe" as const,
        status: "vacant" as const,
        monthlyRent: 950,
        description: "Deluxe studio with additional storage space"
      });
      
      await db.insert(rooms).values({
        unitNumber: "202B",
        floorNumber: 2,
        roomType: "Deluxe" as const,
        status: "occupied" as const,
        monthlyRent: 1200,
        description: "One bedroom apartment with separate living room"
      });

      
      console.log("Sample rooms created.");
    } else {
      console.log("Rooms already exist, skipping creation.");
    }

    // Check if we have any residents
    const existingResidents = await db.query.residents.findMany({
      limit: 1
    });

    // Seed residents and occupancy if none exist
    if (existingResidents.length === 0) {
      console.log("Creating sample residents and occupancies...");
      
      // First, create residents
      const residentsToCreate = [
        {
          fullName: "John Smith",
          email: "john.smith@example.com",
          phone: "555-123-4567",
          dateOfBirth: new Date("1985-03-15"),
          icNumber: "ID12345678",
          salesReferral: "caGrand" as const
        },
        {
          fullName: "Maria Garcia",
          email: "maria.garcia@example.com",
          phone: "555-987-6543",
          dateOfBirth: new Date("1990-07-22"),
          icNumber: "ID23456789", 
          salesReferral: "Sales Team" as const
        },
        {
          fullName: "Robert Johnson",
          email: "robert.johnson@example.com",
          phone: "555-555-1234",
          dateOfBirth: new Date("1978-11-30"),
          icNumber: "ID34567890",
          salesReferral: "Offline Event" as const
        },
        {
          fullName: "Patricia Williams",
          email: "patricia.williams@example.com",
          phone: "555-222-3333",
          dateOfBirth: new Date("1982-05-10"),
          icNumber: "ID45678901",
          salesReferral: "Other" as const
        }
      ];
      
      // Insert residents and store their IDs
      const residentIds = [];
      for (const resident of residentsToCreate) {
        await db.insert(residents).values(resident);
        // Get the resident by IC number since we can't use insertId
        const newResident = await db.query.residents.findFirst({
          where: eq(residents.icNumber, resident.icNumber)
        });
        const insertId = newResident!.id;
        residentIds.push(insertId);
        
        // Create next of kin for each resident
        await db.insert(nextOfKin).values({
          residentId: insertId,
          fullName: `Family of ${resident.fullName}`,
          relationship: "Family",
          phone: "555-999-8888",
          email: `family.of.${resident.fullName.toLowerCase().replace(' ', '.')}@example.com`,
          address: "100 Family Street, Familytown"
        });
      }
      
      // Now get some rooms to assign to residents
      const occupiedRooms = await db.query.rooms.findMany({
        where: (rooms) => eq(rooms.status, "occupied")
      });
      
      // Create occupancies for occupied rooms
      if (occupiedRooms.length > 0 && residentIds.length > 0) {
        const today = new Date();
        const oneYearLater = new Date();
        oneYearLater.setFullYear(today.getFullYear() + 1);
        
        for (let i = 0; i < Math.min(occupiedRooms.length, residentIds.length); i++) {
          const room = occupiedRooms[i];
          const residentId = residentIds[i];
          
          await db.insert(occupancy).values({
            roomId: room.id,
            residentId: residentId,
            startDate: today,
            endDate: oneYearLater,
            active: true
          });
          
          // Get the occupancy we just created
          const newOccupancy = await db.query.occupancy.findFirst({
            where: and(eq(occupancy.roomId, room.id), eq(occupancy.residentId, residentId))
          });
          const occupancyId = newOccupancy!.id;
          
          // Create a billing for this occupancy
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 15 + (i * 5)); // Stagger due dates
          
          await db.insert(billings).values({
            residentId: residentId,
            occupancyId: occupancyId,
            amount: room.monthlyRent,
            dueDate: dueDate,
            status: 'pending',
            description: `Monthly rent for ${room.unitNumber}`
          });
        }
      }
      
      console.log("Sample residents, next of kin, occupancies, and billings created.");
    } else {
      console.log("Residents already exist, skipping creation.");
    }

    // Check if we have any visitors
    const existingVisitors = await db.query.visitors.findMany({
      limit: 1
    });

    // Seed visitors if none exist
    if (existingVisitors.length === 0) {
      console.log("Creating sample visitors...");
      
      // Get resident IDs
      const residents = await db.query.residents.findMany({
        columns: { id: true }
      });
      
      if (residents.length > 0) {
        const visitorsToCreate = [
          {
            residentId: residents[0].id,
            fullName: "Sarah Johnson",
            email: "sarah.johnson@example.com",
            phone: "555-111-2222",
            purpose: "Family visit",
            visitDate: new Date(Date.now() + 86400000 * 2), // 2 days in the future
            status: "pending" as const
          },
          {
            residentId: residents.length > 1 ? residents[1].id : residents[0].id,
            fullName: "Michael Brown",
            email: "michael.brown@example.com",
            phone: "555-333-4444",
            purpose: "Business meeting",
            visitDate: new Date(Date.now() + 86400000 * 5), // 5 days in the future
            status: "pending" as const
          }
        ];
        
        for (const visitor of visitorsToCreate) {
          await db.insert(visitors).values(visitor);
        }
        
        console.log("Sample visitors created.");
      }
    } else {
      console.log("Visitors already exist, skipping creation.");
    }

    console.log("Database seeding completed successfully.");
  } catch (error) {
    console.error("Error during database seeding:", error);
  }
}

seed();
