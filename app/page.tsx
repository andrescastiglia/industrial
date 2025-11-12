import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function HomePage() {
  // Check if user is authenticated via middleware header
  const headersList = headers();
  const userId = headersList.get("x-user-id");

  if (userId) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
