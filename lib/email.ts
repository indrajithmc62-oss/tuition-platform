import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

type SendArgs = { to: string; subject: string; html: string };

// Sends one email. Never throws: a failed email must not break a payment.
export async function sendEmail({ to, subject, html }: SendArgs) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
    console.error("Email settings missing in .env, skipping email");
    return false;
  }
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_FROM ?? process.env.EMAIL_USER,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("Could not send email:", err);
    return false;
  }
}

function formatWhen(d: Date) {
  return d.toLocaleString("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function sendBookingConfirmations(b: {
  subject: string;
  scheduledAt: Date;
  studentName: string;
  studentEmail: string;
  tutorName: string;
  tutorEmail: string;
}) {
  const when = `${formatWhen(b.scheduledAt)} UTC`;

  await sendEmail({
    to: b.studentEmail,
    subject: `Session confirmed: ${b.subject} with ${b.tutorName}`,
    html: `<p>Hi ${b.studentName},</p>
<p>Your payment was received and your session is confirmed.</p>
<p><b>${b.subject}</b> with ${b.tutorName}<br>${when}</p>
<p>Open your TuitionHub dashboard and click <b>Join session</b> at the start time.</p>`,
  });

  await sendEmail({
    to: b.tutorEmail,
    subject: `New booking: ${b.subject} with ${b.studentName}`,
    html: `<p>Hi ${b.tutorName},</p>
<p>${b.studentName} booked and paid for a session.</p>
<p><b>${b.subject}</b><br>${when}</p>
<p>You can join from your TuitionHub dashboard at the start time.</p>`,
  });
}