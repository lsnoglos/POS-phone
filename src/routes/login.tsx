import { createFileRoute } from "@tanstack/react-router";
import { Welcome } from "@/components/nexo/welcome";

export const Route = createFileRoute("/login")({ component: Welcome });
