import { RouteStateCard } from "@/components/ui/RouteStateCard";

export default function NotFound() {
  return (
    <RouteStateCard
      title="Page not found"
      message="The page you are looking for does not exist or may have been moved."
    />
  );
}
