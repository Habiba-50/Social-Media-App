import { HydratedDocument, Types } from "mongoose";
import { IPaginate, IUser } from "../../common/interfaces";
import { JwtPayload } from "jsonwebtoken";
import { ACCESS_TOKEN_EXPIRY, REFRESH_TOKEN_EXPIRY } from "../../config/config";
import { BadRequestException, conflictException, NotFoundException } from "../../common/exceptions";
import { RedisService, S3Service, TokenService } from "../../common/services";
import { ChatEnum, LogoutEnum, StorageApproachEnum, UploadApproachEnum } from "../../common/enums";
import { UserRepository } from "../../DB/repository";
import { ChatRepository } from "../../DB/repository/chat.repository";
import { BlockService } from "../block/block.service";
import { toObjectId } from "../../common/utils/objectId";



export class UserService {
  private readonly userRepository: UserRepository
  private readonly tokenService: TokenService;
  private readonly redisService: RedisService;
  private readonly s3: S3Service
  private readonly chatRepository: ChatRepository
  private readonly blockService: BlockService

  constructor() {
    this.userRepository = new UserRepository()
    this.tokenService = new TokenService();
    this.redisService = new RedisService();
    this.s3 = new S3Service()
    this.chatRepository = new ChatRepository()
    this.blockService = new BlockService()
  }

  // ------------------------------------ Get Profile -----------------------------------------------

  public async profile(user: HydratedDocument<IUser>): Promise<{ user: IUser, groups: any }> {
    // if (user?.phone) {
    //   user.phone = await decrypt(user.phone);
    // }

    // Populate friends 
    const profile = await this.userRepository.findOne({
      filter: { _id: user._id },
      // options: {
      //   populate: [
      //     { path: "friends", model: "User" },
      //   ]
      // }
    })

    const groups = await this.chatRepository.findAll({ 
      filter: { participants: { $in: [user._id] } , type:ChatEnum.OVM } ,
      options: {
        populate: {
          path: "participants",
          model: "User"
        }
      }
    })
    
    return { user: profile as IUser, groups };
  }

  // ------------------------------------ Get Profile By Id -----------------------------------------------

  public async profileById( id: string): Promise<{ user: IUser }> {

    // Populate friends 
    const profile = await this.userRepository.findById(toObjectId(id))
    if (!profile) {
      throw new NotFoundException("User not found")
    }
    // const groups = await this.chatRepository.findAll({
    //   filter: { participants: { $in: [toObjectId(id)] }, type: ChatEnum.OVM },
    //   options: {
    //     populate: {
    //       path: "participants",
    //       model: "User"
    //     }
    //   }
    // })

    return { user: profile as IUser };
  }

  // ------------------------------------ Rotate Token -----------------------------------------------

  public async rotateToken(
    user: HydratedDocument<IUser>,
    { sub, jti, iat }: JwtPayload,
    issuer: string,
  ): Promise<any> {
    if (
      ((iat as number) + ACCESS_TOKEN_EXPIRY) * 1000 >
      Date.now() + 5 * 60 * 1000
    ) {
      const remainingTime =
        ((iat as number) + ACCESS_TOKEN_EXPIRY) * 1000 - Date.now();
      throw new conflictException(
        `Current access token is still valid, remaining time : ${Math.floor(remainingTime / 60000)} minute`,
      );
    }

    await this.tokenService.createRevokeToken({
      sub: sub as string,
      jti: jti as string,
      ttl: (iat as number) + REFRESH_TOKEN_EXPIRY,
    });

    const { access_token, refresh_token } =
      await this.tokenService.createLoginCredentials({ user, issuer });

    return { access_token, refresh_token };
  }

  // -----------------------------Logout-----------------------------

  public async logout(
    flag: LogoutEnum,
    user: HydratedDocument<IUser>,
    { jti, iat, sub }: JwtPayload,
  ): Promise<any> {
    let status = 200;

    switch (flag) {
      case LogoutEnum.ALL:
        user.changeCredentialsTime = new Date();
        await user.save();

        const result = await this.redisService.deleteKey(
          await this.redisService.keys(
            this.redisService.baseRevokeTokenKey(sub as string),
          ),
        );
        console.log("Logout all sessions result:", result);
        break;

      default:
        await this.tokenService.createRevokeToken({
          sub: sub as string,
          jti: jti as string,
          ttl: (iat as number) + REFRESH_TOKEN_EXPIRY,
        });
        status = 201;
        break;
    }

    return status;
  }

  // -------------------------- Profile Image ---------------------------------------    
  //   public async profileImage(user: HydratedDocument<IUser>, {file}: {file: Express.Multer.File}): Promise<any> {
  //   const { Key } = await this.s3.uploadLargeAsset({
  //     file,
  //     path: `Users/${user._id.toString()}/Profile`,
  //     storageApproach: StorageApproachEnum.DISK
  //   })

  //   console.log(Key);
  //   user.profilePicture = Key as string;

  //   await user.save()
  //   console.log(user)

  //   return user.toJSON()
  // }

  // -----------------------------  Profile Image Presigned URL ------------------------------

  public async profileImagePresignedUrl(
    user: HydratedDocument<IUser>,
    { ContentType, Originalname }: { ContentType: string, Originalname: string })
    : Promise<{ presignedUrl: string, Key: string }> {

    const { presignedUrl, Key } = await this.s3.createPresignedUploadLink({
      path: `Users/${user._id.toString()}/Profile`,
      ContentType,
      Originalname,
    })

    // if(oldPic) {
    //   await this.s3.deleteAsset({ Key: oldPic })
    // }

    // user.profilePicture = Key as string
    // await user.save()

    return {
      presignedUrl,
      Key
    }
  }

  // -----------------------------  Confirm Profile Image ------------------------------

  public async confirmProfileImage(
    user: HydratedDocument<IUser>,
    key: string
  ): Promise<any> {
    if (!key) {
      throw new BadRequestException("Key is required");
    }

    const exists = await this.s3.checkAssetExist({ Key: key });
    if (!exists) {
      throw new BadRequestException("Image does not exist on S3 storage. Please upload the file first.");
    }

    // Delete old profile picture from S3 if exists
    if (user.profilePicture && user.profilePicture !== key) {
      await this.s3.deleteAsset({ Key: user.profilePicture });
    }

    user.profilePicture = key;
    await user.save();

    return user.toJSON();
  }


  // -------------------------- Profile Cover Images ---------------------------------------
  public async profileCoverImages(
    user: HydratedDocument<IUser>,
    files: Express.Multer.File[]
  ): Promise<any> {

    const oldCovers = user.profileCoveredPictures || []

    const urls = await this.s3.uploadAssets({
      files,
      path: `Users/${user._id.toString()}/Profile/Covers`,
      storageApproach: StorageApproachEnum.DISK,
      uploadApproach: UploadApproachEnum.SMALL
    })

    console.log("Urls :", urls)
    console.log("Old Covers :", oldCovers)


    const allCovers = [...oldCovers, ...urls]


    // if(allCovers.length > 4) delete oldest covers
    if (allCovers.length > 4) {

      const deletedCovers = allCovers.slice(0, allCovers.length - 4)

      await this.s3.deleteAssets({
        Keys: deletedCovers.map((key) => ({
          Key: key
        }))
      })


      user.profileCoveredPictures = allCovers.slice(-4) as string[]
      // that means the last 4 covers are the new covers
      

    } else {

      user.profileCoveredPictures = allCovers as string[]

    }


    await user.save()


    return user.toJSON()
  }


  // ------------------------------------------Delete User-------------------------------------------
  public async deleteUser(userId: string , user: HydratedDocument<IUser>): Promise<boolean> {

    const id = userId ? userId as unknown as Types.ObjectId : user._id
    const userToDel = await this.userRepository.findOne({ filter: { _id: id } })
    if (!userToDel) {
      throw new conflictException("User not found")
    }
    
    if (userToDel.deletedAt) {
      throw new conflictException("User already deleted")
    }

    await this.userRepository.updateOne({
      filter: { _id: id },
      update: {
        deletedAt: new Date(),
        $unset: { restoredAt: 1 }
      }
    });
    return true

  }


  // ------------------------------------------Restore User-------------------------------------------
  public async restoreUser(userId: string , user: HydratedDocument<IUser>): Promise<boolean> {

    const id = userId ? userId as unknown as Types.ObjectId : user._id
    const userToRestore = await this.userRepository.findOne({ filter: { _id: id } })
    
    if (!userToRestore) {
      throw new conflictException("User not found")
    }
    if (!userToRestore.deletedAt) {
      throw new conflictException("User is not deleted!")
    }
    await this.userRepository.updateOne({
      filter: { _id: id },
      update: {
        $unset: { deletedAt: 1 },
        restoredAt: new Date()
      }
    })
    return true
  }


  // ------------------------------------------Get All Active Users-------------------------------------------
  public async getAllActiveUsers(): Promise<any> {
    const users = await this.userRepository.findAll({ filter: { deletedAt: { $exists: false } } })
    return users
  }

  // ------------------------------------------Get All Deleted Users-------------------------------------------
  public async getAllDeletedUsers(): Promise<any> {
    const users = await this.userRepository.findAll({ filter: { deletedAt: { $exists: true } } })
    return users
  }

  // ------------------------------------------Get All Users-------------------------------------------
  public async getAllUsers(): Promise<any> {
    const users = await this.userRepository.findAll({ filter: {} })
    return users
  }

  // ------------------------------------------ Update Profile -------------------------------------------
  public async updateProfile(user: HydratedDocument<IUser>, updateData: Partial<IUser>): Promise<any> {
    if (user.deletedAt) {
      throw new conflictException("Can't update profile of deleted user!")
    }
    const updatedUser = await this.userRepository.updateOne({ filter: { _id: user._id }, update: { $set: updateData }  })
    
    return updatedUser
  }

  // ------------------------------------------ Hard Delete Profile -------------------------------------------

  public async hardDeleteUser(userId: string, force: boolean): Promise<boolean> {
    
    const user = await this.userRepository.findOne({ filter: { _id: userId } })
    
    if (!user) {
      throw new conflictException("Invalid Account!")
    }

    if (user.deletedAt || force) {
      const result = await this.userRepository.deleteOne({
        filter: { _id: user._id, ...(force && { force: true }) }
      });

      await this.s3.deleteFolderByPrefix({ Prefix: `Users/${user._id.toString()}` })

      // ...(force && { force: true }) => If force is true then add force:true to the filter else do nothing
      // ...(true && { force: true }) => { force: true }
      // {
      //    _id: user._id,
      //    force: true
      // }

      // If ...(force && { force: true }) => false
      // ...(false && { force: true }) => {}
      //{
      //   _id: user._id
      // }
 
      return result.deletedCount > 0

    } else {
      throw new conflictException("User is not deleted, pass force=true to delete user permanently")
    }


  }

  // ------------------------------------------- Search Users -------------------------------------------
  public async searchUsers(
    user: HydratedDocument<IUser>,
    query: { search: string, page?: number, size?: number }
  ): Promise<IPaginate<IUser>> {
    const { search, page, size } = query;

    const blockedIds = await this.blockService.getBlockedUserIds(user._id as Types.ObjectId);

    const result = await this.userRepository.paginate({
      filter: {
        _id: { $ne: user._id, $nin: blockedIds },
        deletedAt: { $exists: false },
        $or: [
          { firstName: { $regex: search, $options: "i" } },
          { lastName: { $regex: search, $options: "i" } }
        ]
      },
      projection: { _id: 1, firstName: 1, lastName: 1, profileImage: 1 },
      page,
      size
    });

    return result;
  }
}

// $eq	=> equal
// $ne	=> not equal
// $in	=> in array
// $nin	=> not in array
// $gt	=> greater than
// $lt	=> less than
// $gte	=> greater than or equal
// $lte	=> less than or equal

export default new UserService()