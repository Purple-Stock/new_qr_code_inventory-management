import { verifyUserCredentials, findUserByEmail } from "@/lib/db/users";
import { onboardCompanyOwner } from "@/lib/db/onboarding";
import { parseLoginPayload, parseSignupPayload } from "@/lib/contracts/schemas";
import type { Company, User } from "@/db/schema";
import type { ServiceResult } from "@/lib/services/types";
import {
  internalServiceError,
  makeServiceError,
  validationServiceError,
} from "@/lib/services/errors";
import { ERROR_CODES } from "@/lib/errors";

type PublicUser = Omit<User, "passwordHash">;

function toPublicUser(user: User): PublicUser {
  const { passwordHash: _passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export async function loginUser(params: {
  payload: unknown;
}): Promise<ServiceResult<{ user: PublicUser }>> {
  const parsed = parseLoginPayload(params.payload);
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }

  const { email, password } = parsed.data;

  try {
    const user = await verifyUserCredentials(email, password);
    if (!user) {
      return {
        ok: false,
        error: makeServiceError(
          401,
          ERROR_CODES.USER_NOT_AUTHENTICATED,
          "Invalid email or password"
        ),
      };
    }

    return {
      ok: true,
      data: { user: toPublicUser(user) },
    };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred during login"),
    };
  }
}

export async function signupUser(params: {
  payload: unknown;
}): Promise<ServiceResult<{ user: PublicUser; company: Company }>> {
  const parsed = parseSignupPayload(params.payload);
  if (!parsed.ok) {
    return { ok: false, error: validationServiceError(parsed.error) };
  }

  const { email: normalizedEmail, password, companyName } = parsed.data;

  try {
    const existingUser = await findUserByEmail(normalizedEmail);
    if (existingUser) {
      return {
        ok: false,
        error: makeServiceError(
          409,
          ERROR_CODES.EMAIL_ALREADY_IN_USE,
          "User with this email already exists"
        ),
      };
    }

    const { user, company } = await onboardCompanyOwner({
      email: normalizedEmail,
      password,
      companyName: companyName.trim(),
    });

    return {
      ok: true,
      data: {
        user: toPublicUser(user),
        company,
      },
    };
  } catch {
    return {
      ok: false,
      error: internalServiceError("An error occurred during signup"),
    };
  }
}
