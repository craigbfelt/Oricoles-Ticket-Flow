import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Monitor, 
  HardDrive, 
  Wifi, 
  Server, 
  Globe, 
  Mail, 
  Database, 
  Printer, 
  Smartphone, 
  Laptop,
  Network,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FaultType {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
}

const faultTypes: FaultType[] = [
  {
    id: "RDP",
    label: "RDP Server",
    icon: Server,
    color: "text-blue-600",
    bgColor: "bg-blue-50 hover:bg-blue-100 border-blue-200",
    description: "Remote Desktop connection issues"
  },
  {
    id: "CDrive",
    label: "C Drive (My PC)",
    icon: HardDrive,
    color: "text-purple-600",
    bgColor: "bg-purple-50 hover:bg-purple-100 border-purple-200",
    description: "Local computer storage problems"
  },
  {
    id: "VPN",
    label: "VPN",
    icon: Wifi,
    color: "text-green-600",
    bgColor: "bg-green-50 hover:bg-green-100 border-green-200",
    description: "VPN connection or access issues"
  },
  {
    id: "Network",
    label: "Network",
    icon: Network,
    color: "text-cyan-600",
    bgColor: "bg-cyan-50 hover:bg-cyan-100 border-cyan-200",
    description: "Network connectivity problems"
  },
  {
    id: "Email",
    label: "Email",
    icon: Mail,
    color: "text-orange-600",
    bgColor: "bg-orange-50 hover:bg-orange-100 border-orange-200",
    description: "Email access or functionality issues"
  },
  {
    id: "Monitor",
    label: "Display/Monitor",
    icon: Monitor,
    color: "text-indigo-600",
    bgColor: "bg-indigo-50 hover:bg-indigo-100 border-indigo-200",
    description: "Display or monitor problems"
  },
  {
    id: "Printer",
    label: "Printer",
    icon: Printer,
    color: "text-pink-600",
    bgColor: "bg-pink-50 hover:bg-pink-100 border-pink-200",
    description: "Printer connection or printing issues"
  },
  {
    id: "Software",
    label: "Software",
    icon: Database,
    color: "text-teal-600",
    bgColor: "bg-teal-50 hover:bg-teal-100 border-teal-200",
    description: "Application or software errors"
  },
  {
    id: "Mobile",
    label: "Mobile Device",
    icon: Smartphone,
    color: "text-rose-600",
    bgColor: "bg-rose-50 hover:bg-rose-100 border-rose-200",
    description: "Mobile device or app issues"
  },
  {
    id: "Laptop",
    label: "Laptop",
    icon: Laptop,
    color: "text-violet-600",
    bgColor: "bg-violet-50 hover:bg-violet-100 border-violet-200",
    description: "Laptop hardware or performance issues"
  },
  {
    id: "Internet",
    label: "Internet",
    icon: Globe,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 hover:bg-emerald-100 border-emerald-200",
    description: "Internet connection problems"
  },
  {
    id: "Other",
    label: "Other",
    icon: AlertCircle,
    color: "text-gray-600",
    bgColor: "bg-gray-50 hover:bg-gray-100 border-gray-200",
    description: "Other technical issues"
  }
];

interface FaultTypeSelectorProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export const FaultTypeSelector = ({ value, onChange, required = false }: FaultTypeSelectorProps) => {
  return (
    <div className="space-y-3">
      <Label className="text-base font-semibold">
        Select Fault Type {required && <span className="text-red-500">*</span>}
      </Label>
      <p className="text-sm text-muted-foreground mb-4">
        Click on the icon that best describes your issue
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {faultTypes.map((fault) => {
          const Icon = fault.icon;
          const isSelected = value === fault.id;
          
          return (
            <Card
              key={fault.id}
              className={cn(
                "cursor-pointer transition-all duration-200 border-2",
                fault.bgColor,
                isSelected && "ring-2 ring-offset-2 ring-primary shadow-lg scale-105"
              )}
              onClick={() => onChange(fault.id)}
            >
              <CardContent className="p-4 flex flex-col items-center text-center gap-2 relative">
                {isSelected && (
                  <div className="absolute -top-2 -right-2 bg-primary rounded-full p-1">
                    <CheckCircle2 className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className={cn(
                  "p-3 rounded-full",
                  isSelected ? "bg-primary/10" : "bg-white"
                )}>
                  <Icon className={cn(
                    "h-8 w-8",
                    isSelected ? "text-primary" : fault.color
                  )} />
                </div>
                <div className="space-y-1">
                  <p className={cn(
                    "font-semibold text-sm leading-tight",
                    isSelected ? "text-primary" : "text-gray-700"
                  )}>
                    {fault.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {fault.description}
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {value && (
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
          <p className="text-sm font-medium text-primary">
            Selected: {faultTypes.find(f => f.id === value)?.label}
          </p>
        </div>
      )}
    </div>
  );
};
