import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
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
import { format } from "date-fns";
import { Plus, AlertCircle, Loader2, Eye, Edit, Trash2 } from "lucide-react";
import BillingForm from "@/components/billings/billing-form";

export default function BillingPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  const [selectedBillingId, setSelectedBillingId] = useState<number | null>(null);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [isBillingFormOpen, setIsBillingFormOpen] = useState(false);
  const [selectedBilling, setSelectedBilling] = useState<any>(null);
  const { toast } = useToast();

  // Fetch billing data
  const { data: billings, isLoading } = useQuery({
    queryKey: ["/api/billings", statusFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status] = queryKey;
      const res = await fetch(`/api/billings?status=${status}`);
      if (!res.ok) throw new Error("Failed to fetch billings");
      return res.json();
    },
  });

  // Mutation to mark billing as paid
  const markPaidMutation = useMutation({
    mutationFn: async (billingId: number) => {
      return await apiRequest("PUT", `/api/billings/${billingId}`, {
        status: "paid"
      });
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "The billing has been marked as paid",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/billings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      setIsMarkPaidDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation to send reminder
  const sendReminderMutation = useMutation({
    mutationFn: async (billingId: number) => {
      // In a real app, this would send an email reminder
      // For now, we'll just update the UI
      return await apiRequest("POST", `/api/billings/${billingId}/send-reminder`);
    },
    onSuccess: () => {
      toast({
        title: "Reminder sent",
        description: "The payment reminder has been sent",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openMarkPaidDialog = (billingId: number) => {
    setSelectedBillingId(billingId);
    setIsMarkPaidDialogOpen(true);
  };

  const handleMarkPaid = () => {
    if (selectedBillingId) {
      markPaidMutation.mutate(selectedBillingId);
    }
  };

  const handleSendReminder = (billingId: number) => {
    sendReminderMutation.mutate(billingId);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'paid':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Paid</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Pending</Badge>;
      case 'overdue':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Overdue</Badge>;
      case 'new_invoice':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">New Invoice</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getDaysOverdue = (dueDate: string) => {
    const due = new Date(dueDate);
    const today = new Date();
    const diffTime = today.getTime() - due.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <MainLayout title="Billing Management">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Billing Management</h1>
        <Button 
          className="flex items-center"
          onClick={() => {
            setSelectedBilling(null);
            setIsBillingFormOpen(true);
          }}
        >
          <Plus className="h-5 w-5 mr-1" />
          Create Billing
        </Button>
      </div>
      
      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_statuses">All Statuses</SelectItem>
                <SelectItem value="new_invoice">New Invoice</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      
      {/* Billings Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Amount (RM)</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[150px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : billings?.length > 0 ? (
                billings.map((billing: any) => (
                  <TableRow key={billing.id}>
                    <TableCell>
                      <div className="font-medium">{billing.resident?.fullName || 'Unknown'}</div>
                      <div className="text-sm text-gray-500">ID: R-{billing.residentId.toString().padStart(5, '0')}</div>
                    </TableCell>
                    <TableCell>
                      <div>{billing.resident?.room?.unitNumber || 'Not Assigned'}</div>
                      <div className="text-sm text-gray-500">
                        {billing.resident?.room?.roomType?.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) || 'No Room'}
                      </div>
                    </TableCell>
                    <TableCell>RM {billing.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <div>{format(new Date(billing.dueDate), "MMM d, yyyy")}</div>
                      {billing.status === 'overdue' && (
                        <div className="text-xs text-red-600">
                          {getDaysOverdue(billing.dueDate)} days overdue
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(billing.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            window.open(`/billing/${billing.id}`, '_blank');
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            setSelectedBilling(billing);
                            setIsBillingFormOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {(billing.status === 'pending' || billing.status === 'overdue' || billing.status === 'new_invoice') && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => openMarkPaidDialog(billing.id)}
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this billing record?')) {
                              // Add delete mutation here
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                    No billings found matching filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>
      
      {/* Mark as Paid Dialog */}
      <Dialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as Paid</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this billing as paid? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 py-3">
            <AlertCircle className="h-6 w-6 text-yellow-500" />
            <p className="text-sm text-gray-700">
              This will update the billing status and the resident's payment history.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsMarkPaidDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleMarkPaid}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Confirm Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Billing Form Dialog */}
      <Dialog open={isBillingFormOpen} onOpenChange={setIsBillingFormOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedBilling ? "Edit Billing" : "Create New Billing"}
            </DialogTitle>
            <DialogDescription>
              {selectedBilling 
                ? "Update the billing information below."
                : "Fill in the details to create a new billing record."
              }
            </DialogDescription>
          </DialogHeader>
          <BillingForm 
            billing={selectedBilling} 
            onClose={() => setIsBillingFormOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
