

export const emailTemplate = ({ title , code} : {title : string , code : string}) => {
    return `<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Verification Code - Sila</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f7f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="table-layout: fixed;">
        <tr>
            <td align="center" style="padding: 40px 10px;">
                <!-- Main Container -->
                <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 500px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);">
                    
                    <!-- Header Banner -->
                    <tr>
                        <td align="center" style="background-color: #2F6F5E; padding: 30px 20px;">                                                   
                            <h1 style="color: #ffffff; margin: 0; font-size: 26px; font-weight: bold; letter-spacing: 1px;">Sila <span style="font-size: 18px; font-weight: normal; opacity: 0.9;">| صِلة</span></h1>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 40px 30px; text-align: center;">
                            <h2 style="color: #2F6F5E; margin: 0 0 15px 0; font-size: 22px;">${title || 'Your Verification Code'}</h2>
                            <p style="color: #555555; font-size: 15px; line-height: 1.6; margin: 0 0 30px 0;">
                                Welcome! Please use the following temporary verification code to complete your login process. This code is valid for a limited time.
                            </p>

                            <!-- OTP Box -->
                            <div style="background-color: #f0f7f4; border: 2px dashed #2F6F5E; border-radius: 8px; padding: 18px 25px; display: inline-block; margin-bottom: 25px;">
                                <span style="color: #2F6F5E; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: monospace;">${code}</span>
                            </div>

                            <p style="color: #888888; font-size: 13px; margin: 0;">
                                If you did not request this code, you can safely ignore this email.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer / Social Links -->
                    <tr>
                        <td style="background-color: #fafafa; padding: 25px 30px; text-align: center; border-top: 1px solid #eeeeee;">
                            
                            <p style="color: #aaaaaa; font-size: 12px; margin: 20px 0 0 0;">
                                &copy; All rights reserved for Sila App
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>`
}

// <img src="${LOGO_URL}" alt="Sila Logo" width="80" style="display: block; margin-bottom: 15px; border: 0; max-width: 100%; height: auto;">
// <p style="color: #333333; font-size: 14px; font-weight: bold; margin: 0 0 15px 0;">Connect with us</p>
// <div>
//     <a href="${process.env.facebookLink}" target = "_blank" style = "text-decoration: none; margin: 0 8px; display: inline-block;" >
//         <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35062_erj5dx.png" alt = "Facebook" width = "36" height = "36" style = "border: 0;" >
//             </a>
//             < a href = "${process.env.instegram}" target = "_blank" style = "text-decoration: none; margin: 0 8px; display: inline-block;" >
//                 <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group35063_zottpo.png" alt = "Instagram" width = "36" height = "36" style = "border: 0;" >
//                     </a>
//                     < a href = "${process.env.twitterLink}" target = "_blank" style = "text-decoration: none; margin: 0 8px; display: inline-block;" >
//                         <img src="https://res.cloudinary.com/ddajommsw/image/upload/v1670703402/Group_35064_i8qtfd.png" alt = "Twitter" width = "36" height = "36" style = "border: 0;" >
//                             </a>
//                             </div>