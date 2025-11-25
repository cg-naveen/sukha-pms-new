import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Download, FileText, FileImage } from "lucide-react";
import { Resident } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ResidentViewModalProps {
  resident: Resident | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: () => void;
}

export default function ResidentViewModal({ 
  resident, 
  isOpen, 
  onClose,
  onEdit 
}: ResidentViewModalProps) {
  // Fetch resident details with next of kin
  const { data: residentDetail, isLoading } = useQuery<any>({
    queryKey: [`/api/residents/${resident?.id || 0}`],
    enabled: isOpen && !!resident,
  });

  if (!resident) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>View Resident Details</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="personal">Personal Information</TabsTrigger>
              <TabsTrigger value="nextOfKin">Next of Kin</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Full Name</label>
                  <p className="text-sm text-gray-900 mt-1">{residentDetail?.fullName || resident.fullName}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Email</label>
                  <p className="text-sm text-gray-900 mt-1">{residentDetail?.email || resident.email}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Phone</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {residentDetail?.countryCode || resident.countryCode} {residentDetail?.phone || resident.phone}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Date of Birth</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {residentDetail?.dateOfBirth 
                      ? format(new Date(residentDetail.dateOfBirth), "PPP")
                      : resident.dateOfBirth 
                      ? format(new Date(resident.dateOfBirth), "PPP")
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">ID Number</label>
                  <p className="text-sm text-gray-900 mt-1">{residentDetail?.idNumber || resident.idNumber || "N/A"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Sales Referral</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {residentDetail?.salesReferral || resident.salesReferral || "N/A"}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Billing Date</label>
                  <p className="text-sm text-gray-900 mt-1">
                    Day {residentDetail?.billingDate || resident.billingDate || 1} of each month
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Number of Beds Required</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {residentDetail?.numberOfBeds || resident.numberOfBeds || 1} bed{((residentDetail?.numberOfBeds || resident.numberOfBeds || 1) !== 1) ? 's' : ''}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-500">Previous Address</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {residentDetail?.address || resident.address || "N/A"}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="nextOfKin" className="space-y-4 mt-4">
              {residentDetail?.nextOfKin && residentDetail.nextOfKin.length > 0 ? (
                residentDetail.nextOfKin.map((nok: any, index: number) => (
                  <div key={nok.id || index} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Full Name</label>
                        <p className="text-sm text-gray-900 mt-1">{nok.fullName}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Relationship</label>
                        <p className="text-sm text-gray-900 mt-1">{nok.relationship}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Phone</label>
                        <p className="text-sm text-gray-900 mt-1">{nok.phone}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Email</label>
                        <p className="text-sm text-gray-900 mt-1">{nok.email || "N/A"}</p>
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium text-gray-500">Address</label>
                        <p className="text-sm text-gray-900 mt-1">{nok.address || "N/A"}</p>
                      </div>
                    </div>
                    {index < residentDetail.nextOfKin.length - 1 && (
                      <Separator className="my-4" />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No next of kin information available</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="space-y-4 mt-4">
              <DocumentsViewTab residentId={resident.id} />
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button onClick={onEdit}>
            Edit Resident
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Documents View Component (Read-only)
interface DocumentsViewTabProps {
  residentId: number;
}

function DocumentsViewTab({ residentId }: DocumentsViewTabProps) {
  const { data: documents = [], isLoading } = useQuery<any[]>({
    queryKey: [`/api/residents/${residentId}/documents`],
  });

  const handleDownload = async (document: any) => {
    try {
      const response = await fetch(`/api/documents/${document.id}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = document.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-5 w-5 text-blue-500" />;
    } else if (mimeType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-500" />;
    }
    return <FileText className="h-5 w-5 text-gray-500" />;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Documents ({documents.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {documents.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
            <p>No documents uploaded yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFileIcon(doc.mimeType)}
                  <div className="flex-1">
                    <h4 className="font-medium">{doc.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {doc.fileName} • {formatFileSize(doc.fileSize)} • {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

