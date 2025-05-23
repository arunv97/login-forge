import {
  Injectable,
  Inject,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  DeleteApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import { CLOUDINARY } from '@core/cloudinary/cloudinary.provider';
import * as stream from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly uploadFolder: string;

  constructor(
    @Inject(CLOUDINARY) private readonly cloudinaryInstance: typeof cloudinary,
    private readonly configService: ConfigService
  ) {
    this.uploadFolder = this.configService.get<string>(
      'CLOUDINARY_UPLOAD_FOLDER',
      'login_forge_avatars'
    );
  }

  async uploadImage(
    fileBuffer: Buffer,
    fileName: string,
    userId: string
  ): Promise<UploadApiResponse> {
    return new Promise<UploadApiResponse>((resolve, reject) => {
      const uploadStream = this.cloudinaryInstance.uploader.upload_stream(
        {
          folder: this.uploadFolder,
          public_id: `user_${userId}_${Date.now()}_${fileName.split('.')[0]}`,
          resource_type: 'image',
        },
        (error?: UploadApiErrorResponse, result?: UploadApiResponse) => {
          if (error) {
            console.error('Cloudinary Upload Error:', error);
            return reject(
              new InternalServerErrorException(
                'Failed to upload image to cloud.'
              )
            );
          }
          if (!result) {
            console.error('Cloudinary Upload Error: No result returned.');
            return reject(
              new InternalServerErrorException(
                'Failed to upload image, no result from cloud.'
              )
            );
          }
          resolve(result);
        }
      );

      const readableStream = new stream.Readable();
      readableStream._read = () => {
        /* no-op */
      };
      readableStream.push(fileBuffer);
      readableStream.push(null);

      readableStream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<DeleteApiResponse> {
    return new Promise<DeleteApiResponse>((resolve, reject) => {
      this.cloudinaryInstance.uploader.destroy(
        publicId,
        (error?: UploadApiErrorResponse, result?: DeleteApiResponse) => {
          if (error) {
            console.error('Cloudinary Delete Error:', error);
            return reject(
              new InternalServerErrorException(
                'Failed to delete image from cloud.'
              )
            );
          }
          if (!result) {
            console.error(
              'Cloudinary Delete Error: No result returned from destroy operation.'
            );
            return reject(
              new InternalServerErrorException(
                'Failed to delete image, no result from cloud operation.'
              )
            );
          }
          resolve(result);
        }
      );
    });
  }
}
