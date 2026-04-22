import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";

export const NotFoundPage = () => (
  <div className="flex min-h-screen items-center justify-center p-6">
    <Card className="max-w-lg text-center">
      <h1 className="text-4xl font-semibold text-white">404</h1>
      <p className="mt-3 text-muted">The page you are looking for does not exist.</p>
      <Link to="/" className="mt-6 inline-block">
        <Button>Go Home</Button>
      </Link>
    </Card>
  </div>
);
