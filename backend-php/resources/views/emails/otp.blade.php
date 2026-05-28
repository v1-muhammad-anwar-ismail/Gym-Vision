<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GymVision OTP Verification</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a14; font-family: 'Segoe UI', Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a14; padding: 40px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(145deg, rgba(20, 20, 35, 0.95), rgba(10, 10, 20, 0.98)); border: 1px solid rgba(0, 240, 255, 0.15); border-radius: 20px; overflow: hidden;">

                    {{-- Header with gradient accent --}}
                    <tr>
                        <td style="background: linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(120, 80, 255, 0.1)); padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid rgba(0, 240, 255, 0.1);">
                            <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 0 auto;">
                                <tr>
                                    <td style="font-size: 28px; color: #00f0ff; font-weight: 700; letter-spacing: -0.5px;">
                                        GymVision
                                    </td>
                                </tr>
                            </table>
                            <p style="color: rgba(255,255,255,0.5); font-size: 13px; margin: 8px 0 0; letter-spacing: 2px; text-transform: uppercase;">
                                Email Verification
                            </p>
                        </td>
                    </tr>

                    {{-- Body --}}
                    <tr>
                        <td style="padding: 32px;">
                            <p style="color: #e0e0e0; font-size: 16px; margin: 0 0 8px; line-height: 1.6;">
                                Halo
                            </p>
                            <p style="color: rgba(255,255,255,0.65); font-size: 14px; margin: 0 0 28px; line-height: 1.7;">
                                Gunakan kode verifikasi di bawah ini untuk melanjutkan proses autentikasi di <strong style="color: #00f0ff;">GymVision AI</strong>.
                            </p>

                            {{-- OTP Code Box --}}
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td align="center" style="padding: 0 0 28px;">
                                        <div style="background: linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(120, 80, 255, 0.08)); border: 1px solid rgba(0, 240, 255, 0.25); border-radius: 14px; padding: 20px 40px; display: inline-block;">
                                            <span style="font-size: 36px; font-weight: 800; letter-spacing: 10px; color: #ffffff; font-family: 'Courier New', monospace;">
                                                {{ $otp }}
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            </table>

                            {{-- Expiry Warning --}}
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                                <tr>
                                    <td style="background: rgba(255, 180, 50, 0.08); border: 1px solid rgba(255, 180, 50, 0.2); border-radius: 10px; padding: 14px 18px;">
                                        <p style="color: #FFB432; font-size: 13px; margin: 0; line-height: 1.5;">
                                            Kode ini berlaku selama <strong>5 menit</strong>. Jangan bagikan kode ini kepada siapapun.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: rgba(255,255,255,0.45); font-size: 13px; margin: 0; line-height: 1.6;">
                                Jika Anda tidak merasa melakukan permintaan ini, silakan abaikan email ini. Akun Anda tetap aman.
                            </p>
                        </td>
                    </tr>

                    {{-- Footer --}}
                    <tr>
                        <td style="background: rgba(0,0,0,0.3); padding: 20px 32px; border-top: 1px solid rgba(255,255,255,0.05); text-align: center;">
                            <p style="color: rgba(255,255,255,0.3); font-size: 12px; margin: 0; line-height: 1.5;">
                                &copy; {{ date('Y') }} GymVision AI Train | Perfect | Elevate
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
