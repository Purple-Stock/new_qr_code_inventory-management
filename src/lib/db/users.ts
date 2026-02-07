import { sqlite } from "@/db/client";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, verifyPassword } from "@/lib/auth";
import type { User, UserRole } from "@/db/schema";

/**
 * Create a new user
 */
export async function createUser(data: {
  email: string;
  password: string;
  role?: UserRole;
}): Promise<User> {
  const passwordHash = await hashPassword(data.password);

  const [user] = await sqlite
    .insert(users)
    .values({
      email: data.email,
      passwordHash,
      role: data.role || "admin",
    })
    .returning();

  return user;
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  const [user] = await sqlite
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  const [user] = await sqlite
    .select()
    .from(users)
    .where(eq(users.id, id))
    .limit(1);

  return user || null;
}

/**
 * Verify user credentials
 */
export async function verifyUserCredentials(
  email: string,
  password: string
): Promise<User | null> {
  const user = await findUserByEmail(email);
  if (!user) {
    return null;
  }

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

/**
 * Update user password
 */
export async function updateUserPassword(
  userId: number,
  newPassword: string
): Promise<User> {
  const passwordHash = await hashPassword(newPassword);

  const [user] = await sqlite
    .update(users)
    .set({
      passwordHash,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

/**
 * Set reset password token
 */
export async function setResetPasswordToken(
  userId: number,
  token: string
): Promise<User> {
  const [user] = await sqlite
    .update(users)
    .set({
      resetPasswordToken: token,
      resetPasswordSentAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

/**
 * Clear reset password token
 */
export async function clearResetPasswordToken(userId: number): Promise<User> {
  const [user] = await sqlite
    .update(users)
    .set({
      resetPasswordToken: null,
      resetPasswordSentAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  return user;
}

/**
 * List all users (for admin management)
 */
export async function listUsers(): Promise<User[]> {
  return sqlite.select().from(users);
}

/**
 * Update a user role
 */
export async function updateUserRole(userId: number, role: UserRole): Promise<User> {
  const [user] = await sqlite
    .update(users)
    .set({
      role,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!user) {
    throw new Error("User not found");
  }

  return user;
}
