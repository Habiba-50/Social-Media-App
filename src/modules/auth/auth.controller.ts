import { NextFunction, Request, Response, Router } from "express";
import authService from "./auth.service";
import { successResponse } from "../../common/response";
import * as validators from "./auth.validation";
import { validation } from "../../middleware";
import { IUser } from "../../common/interfaces";
import { ILoginResponse } from "./auth.response";

const router = Router();

// ------------------------------ Signup ------------------------------------

router.post("/signup",
  validation(validators.signup),
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
  
  const data = await authService.signup(req.body);
 
  return successResponse<IUser>({ res, statusCode: 201, data})
  })

// -------------------------------Confirm Email-----------------------------------------

router.patch("/confirm-email",
  validation(validators.confirmEmail),
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
  
  await authService.confirmEmail(req.body);
 
  return successResponse({ res, statusCode: 201, data: "Email confirmed successfully"})
  })


// ---------------------------------Resend OTP----------------------------------------

router.patch("/resend-otp",
  validation(validators.email),
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
  
  await authService.resendOtp(req.body);
 
  return successResponse({ res, statusCode: 201, data: "A new OTP has been sent to your email"})
  })

// ---------------------------------Login----------------------------------------

router.post("/login",
  validation(validators.login),
  async (req: Request, res: Response, next: NextFunction): Promise<Response> => {
  
  const data = await authService.login(req.body , req.headers.host as string);
 
  return successResponse<ILoginResponse>({ res, statusCode: 201, data})
  })

// ---------------------------------Signup Gmail----------------------------------------

router.post("/signup/gmail", async (req, res, next) => {
  const { account, status } = await authService.signupGmail(
    req.body.idToken,
    `${req.protocol}://${req.host}`,
  );
  return successResponse({ res, statusCode: status, data: { account } });
});

// ---------------------------------Login Gmail----------------------------------------

router.post("/login/gmail", async (req, res, next) => {
  const credentials = await authService.loginGmail(req.body.idToken, `${req.protocol}://${req.host}`);
  return successResponse({ res, statusCode: 201, data: { ...credentials } });
});

// ---------------------------------Forgot Password----------------------------------------

router.post("/forgot-password-otp", validation(validators.email), async (req, res, next) => {
  const { email } = req.body;
  const result = await authService.forgetPassword(email);
  return successResponse({ res, statusCode: 200, data: { result }, message: "If the email exists, a reset password OTP has been sent" });

})


router.post("/verify-otp-password", validation(validators.confirmEmail), async (req, res, next) => {
  const { email, otp } = req.body;
  const result = await authService.verifyForgetPasswordOtp(email, otp);
  return successResponse({ res, statusCode: 200, data: { result }, message: "you can now reset your password" });
})

router.patch("/reset-password", validation(validators.resetPassword), async (req, res, next) => {
  const { email, password } = req.body;
  const result = await authService.resetPassword(email, password );
  return successResponse({ res, statusCode: 200, data: { result }, message: "Password reset successfully" });
})

export default router;
