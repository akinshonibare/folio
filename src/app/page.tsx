import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const { userId } = await auth();
  if (userId) redirect("/home");
  redirect("/sign-in");
}
