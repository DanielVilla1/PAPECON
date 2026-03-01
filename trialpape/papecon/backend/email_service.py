"""
Email service — sends real emails via Gmail SMTP.

If SMTP_USER is not configured, falls back to printing the verification
link to the server console (dev mode).

Setup (one-time):
  1. Enable 2-Step Verification on your Google account:
     https://myaccount.google.com/security
  2. Generate an App Password:
     https://myaccount.google.com/apppasswords
  3. Set SMTP_USER and SMTP_PASSWORD in backend/.env
"""

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config import FRONTEND_URL, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM


def _send_email(to_email: str, subject: str, html_body: str, text_body: str) -> None:
    """Send an email via SMTP, or fall back to console output if not configured."""

    if not SMTP_USER or not SMTP_PASSWORD:
        # ── Dev-mode fallback: print to console ──
        print()
        print("=" * 60)
        print(f"  📧  EMAIL (dev-mode — SMTP not configured)")
        print(f"  To:      {to_email}")
        print(f"  Subject: {subject}")
        print(f"  Body:    {text_body}")
        print("=" * 60)
        print()
        return

    sender = SMTP_FROM or SMTP_USER

    msg = MIMEMultipart("alternative")
    msg["From"]    = f"PAPECON <{sender}>"
    msg["To"]      = to_email
    msg["Subject"] = subject

    # Plain-text fallback + HTML version
    msg.attach(MIMEText(text_body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.ehlo()
            server.starttls()
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(sender, to_email, msg.as_string())
        print(f"  ✅  Email sent to {to_email}: {subject}")
    except Exception as e:
        print(f"  ❌  Failed to send email to {to_email}: {e}")
        # Don't crash the request — just log the failure
        # The verification token is still saved in DB


def send_verification_email(to_email: str, to_name: str, token: str) -> None:
    verification_url = f"{FRONTEND_URL}/verify-email?token={token}"

    subject = "Verify your PAPECON account"

    text_body = (
        f"Hi {to_name},\n\n"
        f"Thank you for registering at PAPECON!\n\n"
        f"Please verify your email by clicking the link below:\n"
        f"{verification_url}\n\n"
        f"This link expires in 24 hours.\n\n"
        f"If you didn't create this account, you can safely ignore this email.\n\n"
        f"— The PAPECON Team"
    )

    html_body = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #1B4332; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 24px;">PAPECON</h1>
            <p style="color: #52B788; margin: 5px 0 0 0; font-size: 14px;">Pest Control Management System</p>
        </div>
        <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
            <h2 style="color: #1B4332; margin-top: 0;">Verify Your Email</h2>
            <p style="color: #333; font-size: 16px;">Hi {to_name},</p>
            <p style="color: #333; font-size: 16px;">Thank you for registering at PAPECON! Please verify your email address by clicking the button below:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="{verification_url}"
                   style="background-color: #52B788; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                    Verify My Email
                </a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="color: #52B788; font-size: 14px; word-break: break-all;">{verification_url}</p>
            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">This link expires in 24 hours. If you didn't create this account, you can safely ignore this email.</p>
        </div>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
            <p style="color: #999; font-size: 12px; margin: 0;">&copy; PAPECON Pest Control Management System</p>
        </div>
    </div>
    """

    _send_email(to_email, subject, html_body, text_body)


def send_approval_notification(to_email: str, to_name: str, approved: bool, reason: str | None = None) -> None:
    if approved:
        subject = "Your PAPECON account has been approved!"
        text_body = (
            f"Hi {to_name},\n\n"
            f"Great news! Your PAPECON account has been approved by an administrator.\n\n"
            f"You can now log in at: {FRONTEND_URL}/login\n\n"
            f"— The PAPECON Team"
        )
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1B4332; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">PAPECON</h1>
                <p style="color: #52B788; margin: 5px 0 0 0; font-size: 14px;">Pest Control Management System</p>
            </div>
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #1B4332; margin-top: 0;">Account Approved ✅</h2>
                <p style="color: #333; font-size: 16px;">Hi {to_name},</p>
                <p style="color: #333; font-size: 16px;">Great news! Your PAPECON account has been approved by an administrator. You can now log in and start using the system.</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{FRONTEND_URL}/login"
                       style="background-color: #52B788; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold; display: inline-block;">
                        Log In Now
                    </a>
                </div>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
                <p style="color: #999; font-size: 12px; margin: 0;">&copy; PAPECON Pest Control Management System</p>
            </div>
        </div>
        """
    else:
        subject = "PAPECON registration update"
        reason_text = f"\nReason: {reason}" if reason else ""
        text_body = (
            f"Hi {to_name},\n\n"
            f"Unfortunately, your PAPECON registration has been rejected by an administrator.{reason_text}\n\n"
            f"If you believe this is an error, please contact support.\n\n"
            f"— The PAPECON Team"
        )
        reason_html = f'<p style="color: #D62828; font-size: 14px; background: #fef2f2; padding: 10px; border-radius: 4px;"><strong>Reason:</strong> {reason}</p>' if reason else ""
        html_body = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #1B4332; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
                <h1 style="color: #ffffff; margin: 0; font-size: 24px;">PAPECON</h1>
                <p style="color: #52B788; margin: 5px 0 0 0; font-size: 14px;">Pest Control Management System</p>
            </div>
            <div style="background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;">
                <h2 style="color: #D62828; margin-top: 0;">Registration Rejected</h2>
                <p style="color: #333; font-size: 16px;">Hi {to_name},</p>
                <p style="color: #333; font-size: 16px;">Unfortunately, your PAPECON registration has been rejected by an administrator.</p>
                {reason_html}
                <p style="color: #666; font-size: 14px;">If you believe this is an error, please contact support.</p>
            </div>
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; border: 1px solid #e0e0e0; border-top: none;">
                <p style="color: #999; font-size: 12px; margin: 0;">&copy; PAPECON Pest Control Management System</p>
            </div>
        </div>
        """

    _send_email(to_email, subject, html_body, text_body)


def send_booking_schedule_update(
    to_email: str,
    to_name: str,
    service_date: str,
    slot: str,
    appointment_type: str,
) -> None:
    subject = "PAPECON booking schedule updated"

    readable_type = "Treatment" if appointment_type == "treatment" else "Inspection"

    text_body = (
        f"Hi {to_name},\n\n"
        f"Your booking schedule has been updated.\n"
        f"Appointment Type: {readable_type}\n"
        f"Date: {service_date}\n"
        f"Time Slot: {slot}\n\n"
        f"You can track progress in your Client Portal job status page.\n\n"
        f"— The PAPECON Team"
    )

    html_body = f"""
    <div style=\"font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;\">
        <div style=\"background-color: #1B4332; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;\">
            <h1 style=\"color: #ffffff; margin: 0; font-size: 24px;\">PAPECON</h1>
            <p style=\"color: #52B788; margin: 5px 0 0 0; font-size: 14px;\">Pest Control Management System</p>
        </div>
        <div style=\"background-color: #ffffff; padding: 30px; border: 1px solid #e0e0e0;\">
            <h2 style=\"color: #1B4332; margin-top: 0;\">Booking Schedule Update</h2>
            <p style=\"color: #333; font-size: 16px;\">Hi {to_name},</p>
            <p style=\"color: #333; font-size: 16px;\">Your booking schedule has been updated with the following details:</p>
            <div style=\"background: #f8fafc; border: 1px solid #e5e7eb; border-radius: 8px; padding: 14px; margin: 18px 0;\">
                <p style=\"margin: 0 0 8px 0; color: #111827;\"><strong>Appointment Type:</strong> {readable_type}</p>
                <p style=\"margin: 0 0 8px 0; color: #111827;\"><strong>Date:</strong> {service_date}</p>
                <p style=\"margin: 0; color: #111827;\"><strong>Time Slot:</strong> {slot}</p>
            </div>
            <p style=\"color: #333; font-size: 14px;\">You can track progress in your Client Portal Job Status page.</p>
        </div>
        <div style=\"background-color: #f8f9fa; padding: 15px; border-radius: 0 0 8px 8px; text-align: center; border: 1px solid #e0e0e0; border-top: none;\">
            <p style=\"color: #999; font-size: 12px; margin: 0;\">&copy; PAPECON Pest Control Management System</p>
        </div>
    </div>
    """

    _send_email(to_email, subject, html_body, text_body)
