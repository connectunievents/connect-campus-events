import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="November 26, 2026">
      <p>
        Connect is a university events app built as a CSC599 capstone project. This policy explains what we collect when you use it
        and why. Connect is a prototype; please don&apos;t rely on it for anything critical.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><b>Account details from Google sign-in:</b> your name, email address and profile picture.</li>
        <li><b>Your activity in the app:</b> universities you follow, events you save, tickets you get and when a ticket is scanned at an event.</li>
        <li><b>Sponsor inquiries:</b> the company and contact details you type into the sponsor form.</li>
        <li><b>Technical data:</b> standard server logs (such as IP address and browser type) kept by our hosting providers for security.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To sign you in and keep your tickets in your account.</li>
        <li>To show students-only events when your email belongs to a university.</li>
        <li>To let event staff check tickets at the entrance.</li>
        <li>To reply to sponsorship requests.</li>
      </ul>
      <p>We do not sell your data and we do not use it for advertising.</p>

      <h2>Who can see it</h2>
      <ul>
        <li>Staff of a university can see the name on tickets for their own events.</li>
        <li>The Connect team can see sponsor inquiries.</li>
        <li>
          Our service providers process data on our behalf: Supabase (database and sign-in), Netlify (hosting), Google (sign-in)
          and Resend (email notifications).
        </li>
      </ul>

      <h2>Google user data</h2>
      <p>
        We request only your basic Google profile (name, email, picture) to create your account. Connect&apos;s use of information received
        from Google APIs follows the Google API Services User Data Policy, including its Limited Use requirements.
      </p>

      <h2>Your choices</h2>
      <p>
        You can sign out at any time. To have your account and data deleted, email{" "}
        <a href="mailto:connectunievents@gmail.com">connectunievents@gmail.com</a> and we will delete it within 30 days.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy: <a href="mailto:connectunievents@gmail.com">connectunievents@gmail.com</a>
      </p>
    </LegalPage>
  );
}
