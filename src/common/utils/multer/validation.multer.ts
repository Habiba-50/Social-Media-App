import type { Request } from "express";
import { FileFilterCallback } from "multer";
import { BadRequestException } from "../../exceptions";

export const fileFieldValidation = {
  image: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
  video: ["video/mp4"],
};

export const fileFilter = (validation: string[] = []) => {
  return function (
    req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback,
  ) {
    //  console.log(file);
    if (validation.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new BadRequestException("Invalid file formate"));
    }
  };
};
