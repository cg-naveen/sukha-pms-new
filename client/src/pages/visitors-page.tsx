import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import VisitorForm from "@/components/visitors/visitor-form";
import QRCodeGenerator from "@/components/visitors/qr-code-generator";
import QrCodeScanner from "@/components/visitors/qr-code-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { Plus, Search, Check, X, QrCode, Loader2, ScanLine, UserCheck, Download, Upload } from "lucide-react";
import { exportToCSV } from "@/lib/csv-utils";
import { useRef } from "react";

export default function VisitorsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isWalkInFormOpen, setIsWalkInFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVisitor, setSelectedVisitor] = useState<any>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isQrDialogOpen, setIsQrDialogOpen] = useState(false);
  const [isQrScannerOpen, setIsQrScannerOpen] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export function
  const handleExport = () => {
    if (!visitors || visitors.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no visitors to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = visitors.map((v: any) => ({
      full_name: v.fullName,
      email: v.email,
      phone: v.phone,
      country_code: v.countryCode,
      nric_passport: v.nricPassport,
      purpose_of_visit: v.purposeOfVisit,
      visit_date: v.visitDate,
      visit_time: v.visitTime || '',
      status: v.status,
      resident_id: v.residentId || '',
    }));

    exportToCSV(exportData, 'visitors');
    toast({
      title: "Export successful",
      description: "Visitors data exported to CSV",
    });
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/visitors/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Import failed');
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Import successful",
        description: data.message || "Visitors imported successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        toast({
          title: "Invalid file type",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      importMutation.mutate(file);
    }
  };

  // Fetch visitors data
  const { data: visitors, isLoading } = useQuery({
    queryKey: ["/api/visitors", statusFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status] = queryKey;
      const res = await fetch(`/api/visitors?status=${status}`);
      if (!res.ok) throw new Error("Failed to fetch visitors");
      return res.json();
    },
  });

  // Filter data based on search
  const filteredVisitors = visitors
    ? visitors.filter((visitor: any) => {
        return searchQuery === "" || 
          visitor.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          visitor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (visitor.residentName || '').toLowerCase().includes(searchQuery.toLowerCase());
      })
    : [];

  // Approve visitor mutation
  const approveVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      return await apiRequest("POST", `/api/visitors/${visitorId}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Visitor approved",
        description: "The visitor request has been approved and a QR code has been generated",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsApproveDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Reject visitor mutation
  const rejectVisitorMutation = useMutation({
    mutationFn: async (visitorId: number) => {
      return await apiRequest("POST", `/api/visitors/${visitorId}/reject`);
    },
    onSuccess: () => {
      toast({
        title: "Visitor rejected",
        description: "The visitor request has been rejected",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/visitors"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsRejectDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openForm = () => {
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
  };

  const openWalkInForm = () => {
    setIsWalkInFormOpen(true);
  };

  const closeWalkInForm = () => {
    setIsWalkInFormOpen(false);
  };

  const openApproveDialog = (visitor: any) => {
    setSelectedVisitor(visitor);
    setIsApproveDialogOpen(true);
  };

  const openRejectDialog = (visitor: any) => {
    setSelectedVisitor(visitor);
    setIsRejectDialogOpen(true);
  };

  const openQrDialog = (visitor: any) => {
    setSelectedVisitor(visitor);
    setIsQrDialogOpen(true);
  };

  const handleApprove = () => {
    if (selectedVisitor) {
      approveVisitorMutation.mutate(selectedVisitor.id);
    }
  };

  const handleReject = () => {
    if (selectedVisitor) {
      rejectVisitorMutation.mutate(selectedVisitor.id);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  return (
    <MainLayout title="Visitor Management">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Visitor Management</h1>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={handleExport} className="flex items-center flex-1 sm:flex-initial">
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button variant="outline" onClick={handleImport} className="flex items-center flex-1 sm:flex-initial" disabled={importMutation.isPending}>
            {importMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                <span className="hidden sm:inline">Importing...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Import</span>
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button 
            variant="outline" 
            onClick={() => setIsQrScannerOpen(true)} 
            className="flex items-center flex-1 sm:flex-initial"
          >
            <ScanLine className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Verify QR</span>
            <span className="sm:hidden">QR</span>
          </Button>
          <Button onClick={openForm} variant="outline" className="flex items-center flex-1 sm:flex-initial">
            <Plus className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Request Visit</span>
            <span className="sm:hidden">Request</span>
          </Button>
          <Button onClick={openWalkInForm} className="flex items-center flex-1 sm:flex-initial">
            <UserCheck className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Walk-in Registration</span>
            <span className="sm:hidden">Walk-in</span>
          </Button>
        </div>
      </div>
      
      {/* Filters and search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <div className="w-full md:w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search visitors..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all_statuses">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Visitors Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor Name</TableHead>
                <TableHead>Resident</TableHead>
                <TableHead>Visit Date</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[150px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : filteredVisitors.length > 0 ? (
                filteredVisitors.map((visitor: any) => (
                  <TableRow key={visitor.id}>
                    <TableCell>
                      <div className="font-medium">{visitor.fullName}</div>
                      <div className="text-sm text-gray-500">{visitor.email}</div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{visitor.residentName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">
                        {visitor.roomNumber ? `Room ${visitor.roomNumber}` : 'Room N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{format(new Date(visitor.visitDate), "MMM d, yyyy")}</TableCell>
                    <TableCell>
                      <div className="max-w-xs truncate" title={visitor.purpose}>
                        {visitor.purpose}
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(visitor.status)}</TableCell>
                    <TableCell className="text-right space-x-2">
                      {visitor.status === 'pending' && (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="bg-green-50 text-green-700 hover:bg-green-100 border-green-200"
                            onClick={() => openApproveDialog(visitor)}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="bg-red-50 text-red-700 hover:bg-red-100 border-red-200"
                            onClick={() => openRejectDialog(visitor)}
                          >
                            <X className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {visitor.status === 'approved' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openQrDialog(visitor)}
                        >
                          <QrCode className="h-4 w-4 mr-1" />
                          QR Code
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    No visitors found matching filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Visitor Request Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Request a Visit</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <VisitorForm onClose={closeForm} />
          </div>
        </DialogContent>
      </Dialog>

      {/* Walk-in Registration Form Dialog */}
      <Dialog open={isWalkInFormOpen} onOpenChange={setIsWalkInFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Walk-in Registration</DialogTitle>
            <DialogDescription>
              Register a visitor who is currently at the premises. This visitor will be automatically approved.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <VisitorForm onClose={closeWalkInForm} isWalkIn={true} />
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Approve Visitor Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Approve Visitor</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this visitor request? This will generate a QR code for entry.
            </DialogDescription>
          </DialogHeader>
          {selectedVisitor && (
            <div className="px-6 py-4">
              <p><span className="font-medium">Visitor:</span> {selectedVisitor.fullName}</p>
              <p><span className="font-medium">Visiting:</span> {selectedVisitor.residentName || 'Unknown'}</p>
              <p><span className="font-medium">Date:</span> {format(new Date(selectedVisitor.visitDate), "MMMM d, yyyy")}</p>
            </div>
          )}
          <DialogFooter className="px-6 pb-6">
            <Button 
              variant="outline" 
              onClick={() => setIsApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleApprove}
              disabled={approveVisitorMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {approveVisitorMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Approve Visit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reject Visitor Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Reject Visitor</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this visitor request?
            </DialogDescription>
          </DialogHeader>
          {selectedVisitor && (
            <div className="px-6 py-4">
              <p><span className="font-medium">Visitor:</span> {selectedVisitor.fullName}</p>
              <p><span className="font-medium">Visiting:</span> {selectedVisitor.residentName || 'Unknown'}</p>
              <p><span className="font-medium">Date:</span> {format(new Date(selectedVisitor.visitDate), "MMMM d, yyyy")}</p>
            </div>
          )}
          <DialogFooter className="px-6 pb-6">
            <Button 
              variant="outline" 
              onClick={() => setIsRejectDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleReject}
              disabled={rejectVisitorMutation.isPending}
              variant="destructive"
            >
              {rejectVisitorMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                "Reject Visit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* QR Code Dialog */}
      <Dialog open={isQrDialogOpen} onOpenChange={setIsQrDialogOpen}>
        <DialogContent className="p-0 max-w-md">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Visitor QR Code</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6 overflow-x-hidden">
            {selectedVisitor && (
              <QRCodeGenerator visitor={selectedVisitor} />
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* QR Scanner Dialog */}
      <Dialog open={isQrScannerOpen} onOpenChange={setIsQrScannerOpen}>
        <DialogContent className="sm:max-w-[500px] p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>Verify Visitor QR Code</DialogTitle>
          </DialogHeader>
          <div className="px-6 pb-6">
            <QrCodeScanner onClose={() => setIsQrScannerOpen(false)} />
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
