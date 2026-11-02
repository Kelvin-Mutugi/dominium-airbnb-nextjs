import { z } from "zod";
import { BROWSE_CATEGORIES } from "../listing-categories.ts";
import { postgresUuidSchema } from "./postgres-uuid-schema.ts";

const browseCategoryIds = BROWSE_CATEGORIES.map(
  (category) => category.id,
) as [string, ...string[]];

export const contactSchema = z
  .object({
    contactChannel: z.enum(["email", "whatsapp"]),
    contactValue: z.string().trim().min(3).max(254),
    consent: z.literal(true),
  })
  .strict()
  .superRefine((contact, context) => {
    if (
      contact.contactChannel === "email" &&
      !z.email().safeParse(contact.contactValue).success
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid email address.",
        path: ["contactValue"],
      });
    }

    if (
      contact.contactChannel === "whatsapp" &&
      !/^(?:\+?254|0)?[17]\d{8}$/.test(
        contact.contactValue.replace(/[\s().-]/g, ""),
      )
    ) {
      context.addIssue({
        code: "custom",
        message: "Enter a valid Kenyan WhatsApp number.",
        path: ["contactValue"],
      });
    }
  });

export const savedSearchSchema = z
  .object({
    filters: z
      .object({
        location: z.string().trim().max(120),
        checkIn: z.iso.date().or(z.literal("")),
        checkOut: z.iso.date().or(z.literal("")),
        guests: z.number().int().min(0).max(20),
        category: z.enum(browseCategoryIds),
        minPrice: z.number().finite().min(0).max(1_000_000),
        maxPrice: z.number().finite().min(0).max(1_000_000),
        propertyType: z.string().trim().max(80).nullable(),
        bedrooms: z.string().trim().max(10).nullable(),
        amenities: z.array(z.string().trim().min(1).max(80)).max(30),
        petFriendly: z.boolean(),
        groupStayOnly: z.boolean(),
        instantBooking: z.boolean(),
        minRating: z.number().finite().min(0).max(5).nullable(),
      })
      .strict()
      .superRefine((filters, context) => {
        if (filters.maxPrice < filters.minPrice) {
          context.addIssue({
            code: "custom",
            message: "Maximum price must be greater than minimum price.",
            path: ["maxPrice"],
          });
        }
        if (Boolean(filters.checkIn) !== Boolean(filters.checkOut)) {
          context.addIssue({
            code: "custom",
            message: "Choose both check-in and check-out dates.",
            path: ["checkOut"],
          });
        }
        if (filters.checkIn && filters.checkOut && filters.checkOut <= filters.checkIn) {
          context.addIssue({
            code: "custom",
            message: "Check-out must be after check-in.",
            path: ["checkOut"],
          });
        }
      }),
    contact: contactSchema,
  })
  .strict();

export const listingAlertSchema = z
  .object({
    listingId: postgresUuidSchema,
    alertType: z.enum(["price_drop", "availability"]),
    checkIn: z.iso.date().optional(),
    checkOut: z.iso.date().optional(),
    contact: contactSchema,
  })
  .strict()
  .superRefine((alert, context) => {
    if (alert.alertType === "availability") {
      if (!alert.checkIn || !alert.checkOut) {
        context.addIssue({
          code: "custom",
          message: "Availability alerts require check-in and check-out dates.",
          path: ["checkOut"],
        });
      } else if (alert.checkOut <= alert.checkIn) {
        context.addIssue({
          code: "custom",
          message: "Check-out must be after check-in.",
          path: ["checkOut"],
        });
      }
    } else if (alert.checkIn || alert.checkOut) {
      context.addIssue({
        code: "custom",
        message: "Price-drop alerts do not use stay dates.",
        path: ["checkIn"],
      });
    }
  });

export const unsubscribeSchema = z
  .object({ token: z.uuid() })
  .strict();

export type SavedSearchInput = z.infer<typeof savedSearchSchema>;
export type ListingAlertInput = z.infer<typeof listingAlertSchema>;
