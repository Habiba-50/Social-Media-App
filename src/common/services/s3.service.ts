import { S3Client, PutObjectCommand, ObjectCannedACL, CompleteMultipartUploadCommandOutput, GetObjectCommand, GetObjectCommandOutput, DeleteObjectCommandOutput, DeleteObjectCommand, DeleteObjectsCommandOutput, DeleteObjectsCommand, ListObjectsV2Command, ListObjectsV2CommandOutput, HeadObjectCommand } from "@aws-sdk/client-s3";
import { createReadStream } from "fs"; // Used for disk storage [1]
import { APPLICATION_NAME, AWS_ACCESS_KEY_ID, AWS_BUCKET_NAME, AWS_EXPIRES_IN, AWS_REGION, AWS_SECRET_ACCESS_KEY } from "../../config/config";
import { randomUUID } from "crypto";
import { StorageApproachEnum, UploadApproachEnum } from "../enums/multer.enum";
import { BadRequestException } from "../exceptions";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export class S3Service {
  private client: S3Client;
  public storageApproach: StorageApproachEnum;

  constructor() {
    // Initializing the S3 Client with credentials from environment variables [3, 4]
    this.client = new S3Client({
      region: AWS_REGION, // e.g., 'us-east-1'
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
    });

    this.storageApproach = StorageApproachEnum.MEMORY;
  }

  async uploadAsset({
    Bucket = AWS_BUCKET_NAME,
    file,
    path = "general",
    ACL = ObjectCannedACL.private,
    ContentType,
    storageApproach = this.storageApproach,
  }: {
    Bucket?: string;
    file: Express.Multer.File;
    path?: string;
    ACL?: ObjectCannedACL;
    ContentType?: string | undefined;
    storageApproach?: StorageApproachEnum;
  }) {
    
    const key = `${APPLICATION_NAME}/${path}/${file.originalname}`;
    // console.log(path);
    // ${randomUUID()}-

    const command = new PutObjectCommand({
      Bucket: AWS_BUCKET_NAME,
      Key: key,
      ACL: ObjectCannedACL.private, // Restricts public access [6, 7]
      Body:
        storageApproach === StorageApproachEnum.MEMORY
          ? file.buffer
          : createReadStream(file.path),
      ContentType: file.mimetype || ContentType, // e.g., 'image/jpeg' [6]
    });

    try {
      
      await this.client.send(command);
      // console.log("Done uploading small asset to s3")

      if (!command.input.Key) {
        throw new BadRequestException("Failed to upload this asset"); // Typically a BadGatewayException [9]
      }

      return command.input.Key;
    } catch (error) {
      console.error("S3 Upload Error:", error);
      throw error;
    }
  }

  async uploadLargeAsset({
    storageApproach = StorageApproachEnum.DISK,
    Bucket = AWS_BUCKET_NAME,
    file,
    path = "general",
    ACL = ObjectCannedACL.private,
    ContentType,
    partSize = 5,
  }: {
    storageApproach : StorageApproachEnum
    Bucket?: string;
    file: Express.Multer.File;
    path?: string;
    ACL?: ObjectCannedACL;
    ContentType?: string | undefined;
    partSize?:number
    }) : Promise<CompleteMultipartUploadCommandOutput> {
    
    const key = `${APPLICATION_NAME}/${path}/${randomUUID()}-${file.originalname}`;


    const uploadFile = new Upload(
      {
        client: this.client,
        params: {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: key,
          ACL,
          Body:
            storageApproach === StorageApproachEnum.MEMORY
              ? file.buffer
              : createReadStream(file.path),
          ContentType: file.mimetype || ContentType,
        },
        partSize : partSize * 1024 * 1024, // 5MB [1, 2]
      })

    uploadFile.on("httpUploadProgress", (progress) => {
      // console.log(progress);
      console.log( `Uploaded : ${((progress.loaded as number) / (progress.total as number))  * 100 } %`);
    })

    return (await uploadFile.done())

  }

  // async uploadAssets({
  //   uploadApproach = UploadApproachEnum.SMALL,
  //   storageApproach = StorageApproachEnum.MEMORY,
  //   Bucket = AWS_BUCKET_NAME,
  //   files,
  //   path = "general",
  //   ACL = ObjectCannedACL.private,
  //   ContentType,
  // }: {
  //   uploadApproach?: UploadApproachEnum
  //   storageApproach?: StorageApproachEnum
  //   Bucket?: string;
  //   files : Express.Multer.File[],
  //   path?: string;
  //   ACL?: ObjectCannedACL;
  //   ContentType?: string | undefined;
  //   }) : Promise<string[]> {
    
  //   let urls: string[] = []

  //   if (uploadApproach === UploadApproachEnum.LARGE) {
  //     const data = await Promise.all(files.map(async (file: Express.Multer.File) => {
  //       return await this.uploadLargeAsset({
  //         storageApproach,
  //         Bucket,
  //         file,
  //         path,
  //         ACL,
  //         ContentType
  //       })
  //     }))
  //     urls = data.map((ele) => ele.Key as string)

  //   } else {
  //     const data = await Promise.all(
  //       files.map(async (file: Express.Multer.File) => {
  //         return await this.uploadAsset({
  //           storageApproach,
  //           Bucket,
  //           file,
  //           path,
  //           ACL,
  //           ContentType
  //         })
  //       })
  //     )

  //     console.log({data})

  //     urls = data.map((ele) => ele as string)

  //   }

  //   return urls
  // }

  async uploadAssets({
    uploadApproach = UploadApproachEnum.SMALL,
    storageApproach = StorageApproachEnum.MEMORY,
    Bucket = AWS_BUCKET_NAME,
    files,
    path = "general",
    ACL = ObjectCannedACL.private,
    ContentType,

  }: {
    uploadApproach?: UploadApproachEnum
    storageApproach?: StorageApproachEnum
    Bucket?: string
    files: Express.Multer.File[]
    path?: string
    ACL?: ObjectCannedACL
    ContentType?: string | undefined

  }): Promise<string[]> {

    let urls: string[] = [];

    if (uploadApproach === UploadApproachEnum.LARGE) {

      const data = await Promise.all(

        files.map(async (file: Express.Multer.File) => {

          return await this.uploadLargeAsset({
            storageApproach,
            Bucket,
            file,
            path,
            ACL,
            ContentType
          });
        })
      );

      urls = data.map((ele: any) => ele.Key);

    } else {

      const data = await Promise.all(

        files.map(async (file: Express.Multer.File) => {

          return await this.uploadAsset({
            storageApproach,
            Bucket,
            file,
            path,
            ACL,
            ContentType
          });
        })
      );

      console.log({data})

      urls = data.map((ele: any) => ele);
    }

    return urls;
  }

  async createPresignedUploadLink({
    Bucket = AWS_BUCKET_NAME,
    path = "general",
    ContentType,
    Originalname,
    expiresIn = AWS_EXPIRES_IN,
  }: {
    Bucket?: string;
    path?: string;
    ContentType: string;
    Originalname: string;
    expiresIn?: number;
    }): Promise<any> {
    
    const command = new PutObjectCommand({
      Bucket,
      Key: `${APPLICATION_NAME}/${path}/${randomUUID()}-${Originalname}`,
      ContentType : ContentType,
    });

    const presignedUrl:string = await getSignedUrl(this.client, command, {
      expiresIn,
    });
    
    return {
      presignedUrl,
      Key : command.input.Key as string
    };

  }

  async getAsset({
    key,
    Bucket = AWS_BUCKET_NAME,
  }: {
    key: string;
    Bucket?: string;
    }): Promise<GetObjectCommandOutput> {
    
    const command = new GetObjectCommand({
      Bucket,
      Key: key,
    });

    return await this.client.send(command);
  }

  async checkAssetExist({
    Key,
    Bucket = AWS_BUCKET_NAME,
  }: {
    Key: string;
    Bucket?: string;
  }): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket,
        Key,
      });
      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getAssetMetadata({
    Key,
    Bucket = AWS_BUCKET_NAME,
  }: {
    Key: string;
    Bucket?: string;
  }): Promise<{ ContentLength?: number; ContentType?: string }> {
    const command = new HeadObjectCommand({ Bucket, Key });
    const { ContentLength, ContentType } = await this.client.send(command);
    return {
      ...(ContentLength !== undefined ? { ContentLength } : {}),
      ...(ContentType !== undefined ? { ContentType } : {}),
    };
  }

  async createPreSignedFetchLink({
    Bucket = AWS_BUCKET_NAME,
    Key,
    expiresIn = AWS_EXPIRES_IN,
    fileName,
    download,

  }: {
    Bucket?: string,
    Key: string,
    expiresIn?: number,
    fileName?: string,
    download?: string,
  }): Promise<string> {

    const command = new GetObjectCommand({
      Bucket,
      Key,
      ResponseContentDisposition: download === "true" ? `attachment; filename="${fileName || Key.split("/").pop()}"` : undefined,
    })

    const url = await getSignedUrl(this.client, command, { expiresIn })
    return url
  }


  //DELETE
  async deleteAsset({
    Bucket = AWS_BUCKET_NAME,
    Key
  }: {
    Bucket?: string,
    Key: string,
  }): Promise<DeleteObjectCommandOutput> {

    const command = new DeleteObjectCommand({
      Bucket,
      Key,
    })

    return await this.client.send(command);

  }

  async deleteAssets({
    Bucket = AWS_BUCKET_NAME,
    Keys
  }: {
    Bucket?: string,
    Keys: { Key: string }[],
  }): Promise<DeleteObjectsCommandOutput> {

    const command = new DeleteObjectsCommand({
      Bucket,
      Delete: {
        Objects: Keys,
        Quiet: false
      }
    })

    return await this.client.send(command);

  }

  // ------------------------- Delete Folder by Prefix -------------------------

  async listFolderDir({
    Bucket = AWS_BUCKET_NAME,
    Prefix,
  }: {
    Bucket?: string;
    Prefix: string;
    }): Promise<ListObjectsV2CommandOutput> {

    const command = new ListObjectsV2Command({
      Bucket,
      Prefix : `${APPLICATION_NAME}/${Prefix}`,
    })

    return await this.client.send(command);

  }

  async deleteFolderByPrefix({
    Bucket = AWS_BUCKET_NAME,
    Prefix,
  }: {
    Bucket?: string;
    Prefix: string;
    }): Promise<DeleteObjectsCommandOutput> {

   const result = await this.listFolderDir({Bucket , Prefix})

   const keys = result.Contents?.map((content) => ({ Key: content.Key })) as { Key: string }[]

   if (keys?.length > 0) {
    await this.deleteAssets({ Keys: keys ,  Bucket })
   }

    return result

  }
  


}

// Exporting as a Singleton Instance to maintain a single connection [3, 11]
export const s3Service = new S3Service();
