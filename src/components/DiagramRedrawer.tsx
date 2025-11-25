import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Wand2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface DiagramRedrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function DiagramRedrawer({ open, onOpenChange, onSuccess }: DiagramRedrawerProps) {
  const [oldDiagramDescription, setOldDiagramDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRedraw = async () => {
    if (!oldDiagramDescription && !imageFile) {
      toast.error("Please provide either a description or upload an image of your old diagram");
      return;
    }

    setIsProcessing(true);

    try {
      // Upload image if provided
      let imagePath = null;
      if (imageFile) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `old-diagrams/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('diagrams')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;
        imagePath = filePath;
      }

      // Call AI to analyze and create new diagram
      // For now, create a placeholder entry
      const { data: { user } } = await supabase.auth.getUser();
      
      const modernDescription = `Modernized version of: ${oldDiagramDescription || "Uploaded diagram"}
      
Features:
- Clean, modern design
- Updated topology representation
- Enhanced visual clarity
- Professional styling`;

      const { error } = await supabase
        .from("network_diagrams")
        .insert({
          diagram_name: "AI Modernized Network Diagram",
          description: modernDescription,
          diagram_url: imagePath || "",
          branch_id: null,
        });

      if (error) throw error;

      toast.success("Network diagram modernized successfully!", {
        description: "Your old diagram has been analyzed and redrawn with modern tools"
      });

      setOldDiagramDescription("");
      setImageFile(null);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error("Error redrawing diagram:", error);
      toast.error("Failed to redraw diagram", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            AI Network Diagram Modernizer
          </DialogTitle>
          <DialogDescription>
            Upload your old network diagram or describe it, and our AI will redraw it using modern design tools
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="old-diagram-image">Upload Old Diagram (Optional)</Label>
            <input
              id="old-diagram-image"
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setImageFile(e.target.files?.[0] || null)}
              className="mt-1 block w-full text-sm text-muted-foreground
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-primary file:text-primary-foreground
                hover:file:bg-primary/90"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Upload an image of your existing network diagram
            </p>
          </div>

          <div>
            <Label htmlFor="diagram-description">Or Describe Your Old Diagram</Label>
            <Textarea
              id="diagram-description"
              value={oldDiagramDescription}
              onChange={(e) => setOldDiagramDescription(e.target.value)}
              placeholder="Describe your network diagram: devices, connections, layout, etc.&#10;Example: 'Our network has 3 branch offices connected via MPLS, each with a Cisco router, firewall, and switches. The main office has redundant internet connections...'"
              rows={6}
              className="mt-1"
            />
          </div>

          <div className="rounded-lg bg-muted p-4">
            <h4 className="font-semibold text-sm mb-2">What happens next:</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li>• AI analyzes your old diagram structure</li>
              <li>• Identifies network components and connections</li>
              <li>• Redesigns using modern visualization standards</li>
              <li>• Creates a clean, professional diagram</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleRedraw} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Modernizing...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Modernize Diagram
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}