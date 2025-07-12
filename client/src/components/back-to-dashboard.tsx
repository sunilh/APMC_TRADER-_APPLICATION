import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";
import { Link } from "wouter";

export function BackToDashboard() {
  return (
    <Link href="/">
      <Button variant="outline" size="sm" className="mb-4">
        <Home className="h-4 w-4 mr-2" />
        Back to Dashboard
      </Button>
    </Link>
  );
}