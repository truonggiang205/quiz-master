import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }

  uploadFile(file: Express.Multer.File): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'quiz_master_essays',
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );
      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  uploadBase64(base64Str: string): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64Str,
        { folder: 'quiz_master_essays' },
        (error, result) => {
          if (error) {
            console.error('Cloudinary Base64 Upload Error:', error);
            return reject(error);
          }
          resolve(result);
        },
      );
    });
  }

  async deleteFileByUrl(url: string): Promise<void> {
    if (!url || !url.includes('cloudinary.com')) return;
    try {
      const parts = url.split('/');
      const lastPart = parts.pop(); 
      const folderPart = parts.pop(); 
      if (!lastPart || !folderPart) return;
      const filename = lastPart.split('.')[0];
      const publicId = `${folderPart}/${filename}`;

      await new Promise((resolve) => {
        cloudinary.uploader.destroy(publicId, (error, result) => {
          if (error) {
            console.error('Cloudinary Delete Error:', error);
          }
          resolve(result);
        });
      });
    } catch (e) {
      console.error('Error deleting from Cloudinary:', e);
    }
  }
}
