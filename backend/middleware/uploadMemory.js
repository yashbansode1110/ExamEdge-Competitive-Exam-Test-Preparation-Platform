import multer from "multer";

/** In-memory upload for admin CSV/JSON bulk imports (no disk writes). */
export const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 12 * 1024 * 1024 }
});
