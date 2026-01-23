import { sqlite } from "@/db/client";
import { locations } from "@/db/schema";
import { eq } from "drizzle-orm";
import type { Location } from "@/db/schema";

/**
 * Get all locations for a team
 */
export async function getTeamLocations(teamId: number): Promise<Location[]> {
  const teamLocations = await sqlite
    .select()
    .from(locations)
    .where(eq(locations.teamId, teamId));

  return teamLocations;
}

/**
 * Get location by ID
 */
export async function getLocationById(locationId: number): Promise<Location | null> {
  const [location] = await sqlite
    .select()
    .from(locations)
    .where(eq(locations.id, locationId))
    .limit(1);

  return location || null;
}

/**
 * Create a new location
 */
export async function createLocation(data: {
  name: string;
  description?: string | null;
  teamId: number;
}): Promise<Location> {
  const [location] = await sqlite
    .insert(locations)
    .values({
      name: data.name,
      description: data.description || null,
      teamId: data.teamId,
    })
    .returning();

  return location;
}

/**
 * Update a location
 */
export async function updateLocation(
  locationId: number,
  data: {
    name: string;
    description?: string | null;
  }
): Promise<Location> {
  const [location] = await sqlite
    .update(locations)
    .set({
      name: data.name,
      description: data.description || null,
      updatedAt: new Date(),
    })
    .where(eq(locations.id, locationId))
    .returning();

  return location;
}

/**
 * Delete a location
 */
export async function deleteLocation(locationId: number): Promise<void> {
  await sqlite.delete(locations).where(eq(locations.id, locationId));
}
