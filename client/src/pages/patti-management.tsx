import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { VoiceInput } from "@/components/voice-input";
import { Plus, FileText, Calendar } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Patti {
  id: number;
  pattiNumber: string;
  date: string;
  status: string;
  description: string;
  tenantId: number;
  createdAt: string;
}

export default function PattiManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [pattiNumber, setPattiNumber] = useState("");
  const [description, setDescription] = useState("");

  const { data: pattis, isLoading } = useQuery({
    queryKey: ["/api/pattis"],
    enabled: !!user?.tenantId,
  });

  const createPattiMutation = useMutation({
    mutationFn: async (data: { pattiNumber: string; description: string }) => {
      return await apiRequest("/api/pattis", {
        method: "POST",
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pattis"] });
      setPattiNumber("");
      setDescription("");
      toast({
        title: "Success",
        description: "Patti number created successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create patti number",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pattiNumber.trim()) {
      toast({
        title: "Error",
        description: "Please enter a patti number",
        variant: "destructive",
      });
      return;
    }
    createPattiMutation.mutate({
      pattiNumber: pattiNumber.trim(),
      description: description.trim(),
    });
  };

  const generatePattiNumber = () => {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
    const timeStr = today.getHours().toString().padStart(2, "0") + 
                   today.getMinutes().toString().padStart(2, "0");
    const generated = `P${dateStr}${timeStr}`;
    setPattiNumber(generated);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Patti Management / ಪಟ್ಟಿ ನಿರ್ವಹಣೆ</h1>
          <p className="text-gray-600 mt-2">Create and manage patti numbers for farmer bills / ರೈತ ಬಿಲ್‌ಗಳಿಗಾಗಿ ಪಟ್ಟಿ ಸಂಖ್ಯೆಗಳನ್ನು ರಚಿಸಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create New Patti Number / ಹೊಸ ಪಟ್ಟಿ ಸಂಖ್ಯೆ ರಚಿಸಿ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="patti-number">Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ</Label>
                <div className="flex gap-2">
                  <VoiceInput
                    onResult={setPattiNumber}
                    placeholder="Enter patti number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ ನಮೂದಿಸಿ"
                    type="text"
                    value={pattiNumber}
                    onChange={(e) => setPattiNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={generatePattiNumber}
                    className="whitespace-nowrap"
                  >
                    Auto Generate / ಸ್ವಯಂ ರಚನೆ
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description / ವಿವರಣೆ</Label>
                <VoiceInput
                  onResult={setDescription}
                  placeholder="Enter description (optional) / ವಿವರಣೆ ನಮೂದಿಸಿ"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={createPattiMutation.isPending}
                className="flex items-center gap-2"
              >
                <FileText className="h-4 w-4" />
                {createPattiMutation.isPending ? "Creating..." : "Create Patti / ಪಟ್ಟಿ ರಚಿಸಿ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Existing Patti Numbers / ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ ಪಟ್ಟಿ ಸಂಖ್ಯೆಗಳು
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="text-gray-500">Loading patti numbers...</div>
            </div>
          ) : !pattis || pattis.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No patti numbers created yet</div>
              <p className="text-sm text-gray-400 mt-2">Create your first patti number above</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Patti Number / ಪಟ್ಟಿ ಸಂಖ್ಯೆ</TableHead>
                    <TableHead>Description / ವಿವರಣೆ</TableHead>
                    <TableHead>Date / ದಿನಾಂಕ</TableHead>
                    <TableHead>Status / ಸ್ಥಿತಿ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pattis.map((patti: Patti) => (
                    <TableRow key={patti.id}>
                      <TableCell className="font-medium">{patti.pattiNumber}</TableCell>
                      <TableCell>{patti.description || "-"}</TableCell>
                      <TableCell>{formatDate(patti.createdAt)}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          Active
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}