import { Request, Response, NextFunction } from 'express';
import * as uploadService from '../services/upload.service';

export async function presign(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const { filename, contentType } = req.body || {};
    if (!filename) return res.status(400).json({ error: 'filename required' });

    const result = await uploadService.createSignedUploadUrl(filename, contentType);
    return res.json(result);
  } catch (err) {
    next(err);
  }
}
