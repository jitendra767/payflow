const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp, purpose, name) => {
  const subject = purpose === 'register'
    ? 'Verify your PayFlow account'
    : 'Your PayFlow login OTP';

  const heading = purpose === 'register'
    ? 'Welcome to PayFlow!'
    : 'Login Verification';

  const message = purpose === 'register'
    ? 'Thanks for signing up! Use the OTP below to verify your account.'
    : 'Use the OTP below to complete your login. Do not share this with anyone.';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin:0;padding:0;background:#f6f7f9;font-family:'Segoe UI',Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7f9;padding:40px 20px;">
        <tr>
          <td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
              
              <!-- Header -->
              <tr>
                <td style="background:linear-gradient(135deg,#1a8456,#145439);padding:32px;text-align:center;">
                  <div style="width:56px;height:56px;background:rgba(255,255,255,0.2);border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;">
                    <span style="color:#ffffff;font-size:28px;font-weight:800;">P</span>
                  </div>
                  <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;">PayFlow</h1>
                  <p style="color:rgba(255,255,255,0.8);margin:4px 0 0;font-size:13px;">Secure Digital Payments</p>
                </td>
              </tr>

              <!-- Body -->
              <tr>
                <td style="padding:36px 32px;">
                  <h2 style="color:#111827;margin:0 0 8px;font-size:20px;font-weight:700;">${heading}</h2>
                  <p style="color:#6b7280;margin:0 0 28px;font-size:14px;line-height:1.6;">
                    Hi ${name}, ${message}
                  </p>

                  <!-- OTP Box -->
                  <div style="background:#f0fdf4;border:2px dashed #1a8456;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                    <p style="color:#6b7280;font-size:12px;margin:0 0 8px;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Your OTP</p>
                    <div style="font-size:42px;font-weight:800;color:#1a8456;letter-spacing:12px;font-family:'Courier New',monospace;">
                      ${otp}
                    </div>
                    <p style="color:#9ca3af;font-size:12px;margin:12px 0 0;">⏱ Expires in 5 minutes</p>
                  </div>

                  <!-- Warning -->
                  <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:24px;">
                    <p style="color:#92400e;font-size:13px;margin:0;">
                      🔒 <strong>Never share this OTP</strong> with anyone. PayFlow will never ask for your OTP.
                    </p>
                  </div>

                  <p style="color:#9ca3af;font-size:12px;margin:0;line-height:1.6;">
                    If you didn't request this OTP, please ignore this email. Your account is safe.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background:#f9fafb;padding:20px 32px;border-top:1px solid #f3f4f6;text-align:center;">
                  <p style="color:#9ca3af;font-size:12px;margin:0;">
                    © 2024 PayFlow · UPI Management System<br>
                    CTAE Udaipur · AI & Data Science
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  await transporter.sendMail({
    from: `"PayFlow" <${process.env.EMAIL_USER}>`,
    to: email,
    subject,
    html,
  });

  return otp;
};

module.exports = { generateOTP, sendOTPEmail };
