import multer from "multer";
const storage = multer.memoryStorage();

const allowedMime = "application/pdf" ;
const MAX_FILE_SIZE_MB = 5 ;

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (allowedMime === file.mimetype) cb(null, true);
  else cb(new Error("Only PDF files are allowed"));
}

const limits = {
  fileSize: MAX_FILE_SIZE_MB * 1024 * 1024,
};

export const upload = multer({ storage, fileFilter, limits });

export default upload;
