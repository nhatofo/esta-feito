import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { authenticate } from '../middleware/auth';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const router = Router();

router.post('/', authenticate, upload.array('files', 5), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files?.length) { res.status(400).json({ success: false, error: 'Nenhum ficheiro enviado.' }); return; }

    const uploads = await Promise.all(files.map(file =>
      new Promise<{ url: string; publicId: string }>((resolve, reject) => {
        cloudinary.uploader.upload_stream(
          { folder: 'esta-feito/jobs', resource_type: 'image' },
          (err, result) => {
            if (err || !result) return reject(err);
            resolve({ url: result.secure_url, publicId: result.public_id });
          }
        ).end(file.buffer);
      })
    ));

    res.json({ success: true, data: uploads });
  } catch (err) { next(err); }
});

export default router;
