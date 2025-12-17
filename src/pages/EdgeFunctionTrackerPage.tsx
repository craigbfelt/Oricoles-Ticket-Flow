import DashboardLayout from "@/components/DashboardLayout";
import EdgeFunctionTracker from "@/components/EdgeFunctionTracker";

const EdgeFunctionTrackerPage = () => {
  return (
    <DashboardLayout>
      <div className="p-6">
        <EdgeFunctionTracker />
      </div>
    </DashboardLayout>
  );
};

export default EdgeFunctionTrackerPage;
