import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { format } from "date-fns";
import { ArrowLeft, Download, FileText, Calendar, DollarSign, User, Home } from "lucide-react";
import MainLayout from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export default function BillingViewPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data: billing, isLoading } = useQuery({
    queryKey: [`/api/billings/${id}`],
    queryFn: async () => {
      const response = await fetch(`/api/billings/${id}`);
      if (!response.ok) throw new Error("Failed to fetch billing");
      return response.json();
    },
    enabled: !!id,
  });

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

  if (isLoading) {
    return (
      <MainLayout title="Loading Invoice...">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading invoice details...</p>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!billing) {
    return (
      <MainLayout title="Invoice Not Found">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Invoice Not Found</h2>
            <p className="text-gray-600 mb-4">The invoice you're looking for doesn't exist.</p>
            <Button onClick={() => setLocation("/billing")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout title={`Invoice #INV-${billing.id.toString().padStart(5, '0')}`}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation("/billing")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Billing
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">
                Invoice #INV-{billing.id.toString().padStart(5, '0')}
              </h1>
              <p className="text-gray-600">
                Created on {format(new Date(billing.createdAt), "MMM d, yyyy 'at' h:mm a")}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {billing.invoiceFile && (
              <Button variant="outline" asChild>
                <a href={billing.invoiceFile} target="_blank" rel="noopener noreferrer">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </a>
              </Button>
            )}
            {getStatusBadge(billing.status)}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Invoice Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Invoice Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Amount</span>
                <span className="text-2xl font-bold text-gray-800">
                  RM {billing.amount.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-gray-600 flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Due Date
                </span>
                <span className="font-medium">
                  {format(new Date(billing.dueDate), "MMM d, yyyy")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Status</span>
                {getStatusBadge(billing.status)}
              </div>
              {billing.description && (
                <>
                  <Separator />
                  <div>
                    <span className="text-gray-600 block mb-2">Description</span>
                    <p className="text-gray-800">{billing.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Resident Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                Resident Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <span className="text-gray-600 block mb-1">Full Name</span>
                <span className="font-medium text-gray-800">
                  {billing.resident?.fullName || 'Unknown'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block mb-1">Resident ID</span>
                <span className="font-medium text-gray-800">
                  R-{billing.residentId.toString().padStart(5, '0')}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block mb-1">Email</span>
                <span className="font-medium text-gray-800">
                  {billing.resident?.email || 'Not provided'}
                </span>
              </div>
              <div>
                <span className="text-gray-600 block mb-1">Phone</span>
                <span className="font-medium text-gray-800">
                  {billing.resident?.countryCode || '+60'} {billing.resident?.phone || 'Not provided'}
                </span>
              </div>
              <Separator />
              <div>
                <span className="text-gray-600 flex items-center mb-1">
                  <Home className="h-4 w-4 mr-1" />
                  Room Assignment
                </span>
                <div className="font-medium text-gray-800">
                  {billing.resident?.room?.unitNumber || 'Not Assigned'}
                  {billing.resident?.room?.roomType && (
                    <span className="text-sm text-gray-600 block">
                      {billing.resident.room.roomType.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoice File Preview */}
        {billing.invoiceFile && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Invoice Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-red-600 mr-3" />
                  <div>
                    <p className="font-medium">{billing.invoiceFile.split('/').pop()}</p>
                    <p className="text-sm text-gray-600">PDF Document</p>
                  </div>
                </div>
                <Button variant="outline" asChild>
                  <a href={billing.invoiceFile} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Open PDF
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </MainLayout>
  );
}