import { router, protectedProcedure } from "@/trpc/index";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "@/db";
import { eq , desc , and } from "drizzle-orm";
import { cv } from "@/db/schema";
import { deleteFromCloudinary } from "@/shared/storage/cloudinary";

export const cvRouter = router({
  getStatus: protectedProcedure
    .input(z.object({ cvId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const userId = ctx.session.user.id;

      const rows = await db
        .select({ status: cv.status, errorMessage: cv.errorMessage })
        .from(cv)
        .where(and(
          eq(cv.id, input.cvId),
           eq(cv.userId, userId)
          ))

      const userCV = rows[0];
      if (!userCV) throw new TRPCError({ code: "NOT_FOUND" });

      return { status: userCV.status, errorMessage: userCV.errorMessage ?? null };
    }),
  
  getLatestCV: protectedProcedure
    .query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const rows = await db
      .select({ id: cv.id, fileUrl: cv.fileUrl, fileName: cv.fileName, mimeType: cv.mimeType, status: cv.status, createdAt: cv.createdAt, updatedAt: cv.updatedAt })
      .from(cv)
      .where(eq(cv.userId, userId))
      .orderBy(desc(cv.createdAt))
      .limit(1);
      
    const userCV = rows[0];
    if (!userCV) throw new TRPCError({ code: "NOT_FOUND" });
    return userCV;
  }),

  getCV: protectedProcedure
  .input(z.object({ cvId: z.string().uuid() }))
  .query(async ({ input , ctx }) => {
    const userId = ctx.session.user.id;
    const rows = await db
      .select({ id: cv.id, fileUrl: cv.fileUrl, fileName: cv.fileName, mimeType: cv.mimeType, status: cv.status, createdAt: cv.createdAt, updatedAt: cv.updatedAt })
      .from(cv)
      .where(and(
          eq(cv.id, input.cvId),
           eq(cv.userId, userId)
          ));

    const userCV = rows[0];
    if (!userCV) throw new TRPCError({ code: "NOT_FOUND" });
    return userCV;
  }),

  getAllCVs: protectedProcedure
    .query(async ({ ctx }) => {
    const userId = ctx.session.user.id;
    const rows = await db
      .select({ 
        id: cv.id,
        fileUrl: cv.fileUrl,
        fileName: cv.fileName,
        mimeType: cv.mimeType,
        status: cv.status,
        createdAt: cv.createdAt,
        updatedAt: cv.updatedAt
      })
      .from(cv)
      .where( eq(cv.userId, userId) )
      .orderBy(desc(cv.createdAt));

    if (!rows || rows.length<= 0 ) throw new TRPCError({ code: "NOT_FOUND" });
    return rows;
  }),
  
  getParsedData: protectedProcedure
    .input(z.object({ cvId: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const rows = await db
        .select({ parsedData: cv.parsedData, status: cv.status, userId: cv.userId })
        .from(cv)
        .where(eq(cv.id , input.cvId));

      const userCV = rows[0];
      if (!userCV) throw new TRPCError({ code: "NOT_FOUND" });
      if (userCV.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });
      if ( userCV.status  !== "completed") throw new TRPCError({ code: "PRECONDITION_FAILED" });

      return { parsedData: userCV.parsedData };
    }),

  deleteCV: protectedProcedure
    .input(z.object({ cvId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const rows = await db
        .select({ publicId: cv.publicId, userId: cv.userId })
        .from(cv)
        .where(eq(cv.id,input.cvId));

      const userCV = rows[0];
      if (!userCV) throw new TRPCError({ code: "NOT_FOUND" });
      if (userCV.userId !== ctx.session.user.id) throw new TRPCError({ code: "FORBIDDEN" });

      try {
        await deleteFromCloudinary(userCV.publicId);
      } catch (err) {
        console.error("Cloudinary deletion failed", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to delete file from storage" });
      }

      // delete DB record
      try {
            await db.delete(cv).where(eq(cv.id, input.cvId));
        } catch (err) {
            console.error("Database deletion failed", err);

            throw new TRPCError({
                code: "INTERNAL_SERVER_ERROR",
                message: "Failed to delete CV record",
            });
        }

      return { success: true };
    }),
});

export type CvRouter = typeof cvRouter;
