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

  uploadFile(file: Express.Multer.File, folder: string = 'quiz-master/khac'): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder.trim(),
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

  uploadBase64(base64Str: string, folder: string = 'quiz-master/khac'): Promise<any> {
    return new Promise((resolve, reject) => {
      cloudinary.uploader.upload(
        base64Str,
        { folder: folder.trim() },
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
      const matches = url.match(/\/upload\/(?:v\d+\/)?([^\.]+)/);
      if (matches && matches[1]) {
        const publicId = decodeURIComponent(matches[1]);
        await new Promise((resolve) => {
          cloudinary.uploader.destroy(publicId, (error, result) => {
            if (error) {
              console.error('Cloudinary Delete Error:', error);
            }
            resolve(result);
          });
        });
      }
    } catch (e) {
      console.error('Error deleting from Cloudinary:', e);
    }
  }

  async deleteFolder(folderPath: string): Promise<void> {
    try {
      await new Promise((resolve, reject) => {
        cloudinary.api.delete_folder(folderPath, (error: any, result: any) => {
          if (error) {
            // Ignore if folder doesn't exist (404)
            if (error.http_code === 404) return resolve(result);
            console.error('Cloudinary Delete Folder Error:', error);
            return reject(error);
          }
          resolve(result);
        });
      });
    } catch (e) {
      console.error('Error deleting folder from Cloudinary:', e);
    }
  }
}
