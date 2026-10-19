import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { NexoApp } from "@/components/nexo/app";
import { Splash, Welcome } from "@/components/nexo/welcome";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const [mounted, setMounted] = useState(false);
  const { user, isPending } = useCurrentUserState();
  useEffect(() => setMounted(true), []);
  if (!mounted || isPending) return <Splash />;
  if (!user) return <Welcome />;
  return <NexoApp user={user} />;
}
