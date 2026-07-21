import { z } from "zod";
import validator from "validator";

// Define the shape of valid data
export const AuthSchema = z.object({
  email: z
    .email({ message: "Invalid email address" })
    .trim()
    .transform((val) => validator.escape(val))
    .transform((val) => validator.normalizeEmail(val) || val),

  password: z
    .string({ message: "Password is required" })
    .trim()
    .min(5, { message: "Password must be atleast 5 characters" }),
});

// Define the shape of valid data
export const SignupSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .transform((val) => validator.escape(val)),
  surname: z
    .string({ message: "Surname is required" })
    .trim()
    .transform((val) => validator.escape(val)),
  firmName: z
    .string({ message: "Firm name is required" })
    .trim()
    .transform((val) => validator.escape(val)),
  email: z
    .email({ message: "Invalid email address" })
    .transform((val) => validator.escape(val))
    .transform((val) => validator.normalizeEmail(val) || val),
  password: z
    .string({ message: "Password is required" })
    .trim()
    .min(5, { message: "Password must be atleast 5 characters" }),
});

export const NewUserSchema = z.object({
  name: z
    .string({ message: "Name is required" })
    .trim()
    .transform((val) => validator.escape(val)),
  role: z
    .string({ message: "Role is required" })
    .trim()
    .transform((val) => validator.escape(val)),
  surname: z
    .string({ message: "Surname is required" })
    .trim()
    .transform((val) => validator.escape(val)),
  email: z
    .email({ message: "Invalid email address" })
    .transform((val) => validator.escape(val))
    .transform((val) => validator.normalizeEmail(val) || val),
  password: z
    .string({ message: "Password is required" })
    .trim()
    .min(5, { message: "Password must be atleast 5 characters" }),
});

export const DocumentSchema = z.object({
  title: z
    .string({ message: "Tile is required" })
    .trim()
    .transform((val) => validator.escape(val)),
  statusId: z
    .string({ message: "Status is required" })
    .trim()
    .transform((val) => validator.escape(val)),
});
