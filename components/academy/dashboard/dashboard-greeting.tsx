interface DashboardGreetingProps {
  adminFirstName: string;
  academyName: string;
}

// The academy is India-based, so greet by IST rather than the server's clock.
function greetingFor(date: Date): string {
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(date));
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function DashboardGreeting({ adminFirstName, academyName }: DashboardGreetingProps) {
  return (
    <div className="min-w-0">
      <h1 className="text-[28px] leading-tight font-bold text-ink sm:text-[32px]">
        {greetingFor(new Date())}, {adminFirstName}!
      </h1>
      <p className="mt-1 text-[15px] text-ink-secondary">Here&apos;s what&apos;s happening at {academyName} today.</p>
    </div>
  );
}
