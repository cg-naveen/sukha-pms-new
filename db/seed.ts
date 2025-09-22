import { db } from "./index";
import { 
  users, 
  residents, 
  nextOfKin, 
  rooms, 
  occupancy, 
  billings, 
  visitors,
  documents
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
      const roomsToCreate = [
        {
          unitNumber: "101A",
          roomType: "studio" as const,
          size: 300,
          floor: 1,
          status: "vacant" as const,
          monthlyRate: 800,
          description: "Standard studio apartment with basic amenities"
        },
        {
          unitNumber: "102A",
          roomType: "studio" as const,
          size: 300,
          floor: 1,
          status: "occupied" as const,
          monthlyRate: 800,
          description: "Standard studio apartment with basic amenities"
        },
        {
          unitNumber: "201B",
          roomType: "studio_deluxe" as const,
          size: 400,
          floor: 2,
          status: "vacant" as const,
          monthlyRate: 950,
          description: "Deluxe studio with additional storage space"
        },
        {
          unitNumber: "202B",
          roomType: "1_bedroom" as const,
          size: 500,
          floor: 2,
          status: "occupied" as const,
          monthlyRate: 1200,
          description: "One bedroom apartment with separate living room"
        },
        {
          unitNumber: "301C",
          roomType: "1_bedroom" as const,
          size: 550,
          floor: 3,
          status: "vacant" as const,
          monthlyRate: 1250,
          description: "One bedroom apartment with balcony"
        },
        {
          unitNumber: "302C",
          roomType: "2_bedroom" as const,
          size: 700,
          floor: 3,
          status: "occupied" as const,
          monthlyRate: 1500,
          description: "Two bedroom apartment with modern kitchen"
        },
        {
          unitNumber: "401D",
          roomType: "2_bedroom" as const,
          size: 750,
          floor: 4,
          status: "vacant" as const,
          monthlyRate: 1600,
          description: "Two bedroom corner unit with city view"
        },
        {
          unitNumber: "402D",
          roomType: "3_bedroom" as const,
          size: 900,
          floor: 4,
          status: "occupied" as const,
          monthlyRate: 1900,
          description: "Three bedroom premium apartment with two bathrooms"
        }
      ];
      
      for (const room of roomsToCreate) {
        await db.insert(rooms).values(room);
      }
      
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
          idNumber: "ID12345678",
          address: "Previous address: 123 Main St, Anytown"
        },
        {
          fullName: "Maria Garcia",
          email: "maria.garcia@example.com",
          phone: "555-987-6543",
          dateOfBirth: new Date("1990-07-22"),
          idNumber: "ID23456789",
          address: "Previous address: 456 Oak Ave, Somewhere City"
        },
        {
          fullName: "Robert Johnson",
          email: "robert.johnson@example.com",
          phone: "555-555-1234",
          dateOfBirth: new Date("1978-11-30"),
          idNumber: "ID34567890",
          address: "Previous address: 789 Pine Rd, Another Town"
        },
        {
          fullName: "Patricia Williams",
          email: "patricia.williams@example.com",
          phone: "555-222-3333",
          dateOfBirth: new Date("1982-05-10"),
          idNumber: "ID45678901",
          address: "Previous address: 321 Cedar Ln, Elsewhere"
        }
      ];
      
      // Insert residents and store their IDs
      const residentIds = [];
      for (const resident of residentsToCreate) {
        const [newResident] = await db.insert(residents).values(resident).returning({ id: residents.id });
        residentIds.push(newResident.id);
        
        // Create next of kin for each resident
        await db.insert(nextOfKin).values({
          residentId: newResident.id,
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
          
          const [occupancyRecord] = await db.insert(occupancy).values({
            roomId: room.id,
            residentId: residentId,
            startDate: today.toISOString().split('T')[0],
            endDate: oneYearLater.toISOString().split('T')[0],
            active: true
          }).returning();
          
          // Create a billing for this occupancy
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + 15 + (i * 5)); // Stagger due dates
          
          await db.insert(billings).values({
            residentId: residentId,
            occupancyId: occupancyRecord.id,
            amount: room.monthlyRate,
            dueDate: dueDate.toISOString().split('T')[0],
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
          const visitorWithDateString = {
            ...visitor,
            visitDate: visitor.visitDate.toISOString().split('T')[0]
          };
          await db.insert(visitors).values(visitorWithDateString);
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
