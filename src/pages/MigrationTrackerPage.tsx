import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import MigrationTracker from "@/components/MigrationTracker";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const MigrationTrackerPage = () => {
  const navigate = useNavigate();
  
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back Navigation */}
        <div className="px-6 pt-6">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <MigrationTracker />
      </div>
    </DashboardLayout>
  );
};

export default MigrationTrackerPage;
