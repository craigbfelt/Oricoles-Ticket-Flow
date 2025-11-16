import { Server, Database, HardDrive, Cloud, Network, Cpu, Globe, Shield } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ServerIconCardProps {
  name: string;
  type: 'rdp' | 'database' | 'storage' | 'cloud' | 'network' | 'compute' | 'web' | 'security';
  status?: 'online' | 'offline' | 'warning';
  ipAddress?: string;
  description?: string;
  onClick?: () => void;
  className?: string;
}

const iconMap = {
  rdp: Server,
  database: Database,
  storage: HardDrive,
  cloud: Cloud,
  network: Network,
  compute: Cpu,
  web: Globe,
  security: Shield,
};

const colorMap = {
  rdp: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    border: 'border-blue-300',
    text: 'text-blue-600',
    icon: 'text-white',
  },
  database: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    border: 'border-purple-300',
    text: 'text-purple-600',
    icon: 'text-white',
  },
  storage: {
    bg: 'bg-gradient-to-br from-green-500 to-green-600',
    border: 'border-green-300',
    text: 'text-green-600',
    icon: 'text-white',
  },
  cloud: {
    bg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    border: 'border-cyan-300',
    text: 'text-cyan-600',
    icon: 'text-white',
  },
  network: {
    bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    border: 'border-indigo-300',
    text: 'text-indigo-600',
    icon: 'text-white',
  },
  compute: {
    bg: 'bg-gradient-to-br from-orange-500 to-orange-600',
    border: 'border-orange-300',
    text: 'text-orange-600',
    icon: 'text-white',
  },
  web: {
    bg: 'bg-gradient-to-br from-teal-500 to-teal-600',
    border: 'border-teal-300',
    text: 'text-teal-600',
    icon: 'text-white',
  },
  security: {
    bg: 'bg-gradient-to-br from-red-500 to-red-600',
    border: 'border-red-300',
    text: 'text-red-600',
    icon: 'text-white',
  },
};

const statusMap = {
  online: { color: 'bg-green-500', label: 'Online' },
  offline: { color: 'bg-gray-500', label: 'Offline' },
  warning: { color: 'bg-yellow-500', label: 'Warning' },
};

export const ServerIconCard = ({
  name,
  type,
  status = 'online',
  ipAddress,
  description,
  onClick,
  className,
}: ServerIconCardProps) => {
  const Icon = iconMap[type];
  const colors = colorMap[type];
  const statusInfo = statusMap[status];

  return (
    <Card
      className={cn(
        "group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:scale-105 cursor-pointer",
        colors.border,
        className
      )}
      onClick={onClick}
    >
      <div className="absolute top-2 right-2 z-10">
        <div className={cn("w-3 h-3 rounded-full", statusInfo.color)} title={statusInfo.label} />
      </div>
      
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-center">
          <div className={cn("p-4 rounded-xl shadow-lg", colors.bg)}>
            <Icon className={cn("h-12 w-12", colors.icon)} />
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <h3 className={cn("font-bold text-lg", colors.text)}>{name}</h3>
          
          {ipAddress && (
            <p className="text-sm text-muted-foreground font-mono bg-muted px-2 py-1 rounded">
              {ipAddress}
            </p>
          )}
          
          {description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {description}
            </p>
          )}
          
          <Badge 
            variant="outline" 
            className={cn("mt-2", statusInfo.color, "text-white border-0")}
          >
            {statusInfo.label}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};

interface ServerGridProps {
  servers: Array<{
    id: string;
    name: string;
    type: ServerIconCardProps['type'];
    status?: ServerIconCardProps['status'];
    ipAddress?: string;
    description?: string;
  }>;
  onServerClick?: (serverId: string) => void;
}

export const ServerGrid = ({ servers, onServerClick }: ServerGridProps) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {servers.map((server) => (
        <ServerIconCard
          key={server.id}
          name={server.name}
          type={server.type}
          status={server.status}
          ipAddress={server.ipAddress}
          description={server.description}
          onClick={() => onServerClick?.(server.id)}
        />
      ))}
    </div>
  );
};
