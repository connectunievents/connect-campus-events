import { LegalPage } from "@/components/legal-page";

export const metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="November 26, 2026">
      <p>
        Connect is a university events app built as a CSC599 capstone project. By using it you agree to these terms. If you don&apos;t
        agree, please don&apos;t use the app.
      </p>

      <h2>A prototype</h2>
      <p>
        Connect is a demonstration project. Features may change or stop working, and data may be reset. Some events are samples and are
        labeled &ldquo;Sample event&rdquo;. For real events, always check the university&apos;s official listing linked on the event page.
      </p>

      <h2>Tickets and payments</h2>
      <ul>
        <li>Tickets are personal. Each QR code works once at the gate and refreshes every few seconds, so screenshots won&apos;t work.</li>
        <li>Payments in this prototype are simulated: no money is charged.</li>
        <li>Organizers decide who may enter their event and may refuse a ticket that looks invalid.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Sign in only with an account that belongs to you.</li>
        <li>Don&apos;t try to copy, forge or resell tickets, or to access parts of the app you aren&apos;t allowed to use.</li>
        <li>We may suspend accounts that break these rules.</li>
      </ul>

      <h2>Content and trademarks</h2>
      <p>
        University names and logos belong to their institutions and are used only to identify them. Event information comes from
        public university pages or from organizers. Image credits are listed in the project documentation.
      </p>

      <h2>No warranty</h2>
      <p>
        The app is provided &ldquo;as is&rdquo;, without warranties. To the extent the law allows, we aren&apos;t liable for losses caused by using
        it, such as a missed event.
      </p>

      <h2>Contact</h2>
      <p>
        Questions: <a href="mailto:connectunievents@gmail.com">connectunievents@gmail.com</a>. See also our{" "}
        <a href="/privacy">privacy policy</a>.
      </p>
    </LegalPage>
  );
}
