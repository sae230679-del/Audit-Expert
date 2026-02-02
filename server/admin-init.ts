import { storage } from "./storage";
import bcrypt from "bcryptjs";

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const TEST_USERS = [
  {
    username: "superadmin",
    password: "superadmin123",
    email: "superadmin@help152fz.ru",
    role: "superadmin" as const,
  },
  {
    username: "admin",
    password: "admin123",
    email: "admin@help152fz.ru",
    role: "superadmin" as const,
  },
  {
    username: "user",
    password: "user123",
    email: "user@help152fz.ru",
    role: "user" as const,
  },
];

export async function initializeAdminUser(): Promise<void> {
  try {
    for (const testUser of TEST_USERS) {
      const existingUser = await storage.getUserByUsername(testUser.username);
      
      if (existingUser) {
        continue;
      }

      const hashedPassword = await bcrypt.hash(testUser.password, 10);
      await storage.createUser({
        username: testUser.username,
        password: hashedPassword,
        email: testUser.email,
        role: testUser.role,
      });

      console.log(`Test user created: ${testUser.username} (${testUser.role}) - password: ${testUser.password}`);
    }
    
    console.log("Test accounts initialized:");
    console.log("  - superadmin / superadmin123 (superadmin)");
    console.log("  - admin / admin123 (superadmin)");
    console.log("  - user / user123 (user)");
  } catch (error) {
    console.error("Failed to initialize test users:", error);
  }
}
