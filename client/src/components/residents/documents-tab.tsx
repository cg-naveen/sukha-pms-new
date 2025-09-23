import { useState, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Upload, Download, Trash2, FileText, FileImage } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Document {
  id: number;
  residentId: number;
  title: string;
  fileName: string;
  filePath: string;
  fileSize?: number;
  mimeType: string;
  createdAt: string;
}

interface DocumentsTabProps {
  residentId: number;
}

export default function DocumentsTab({ residentId }: DocumentsTabProps) {
  const [uploadTitle, setUploadTitle] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Fetch documents for the resident
  const { data: documents = [], isLoading } = useQuery<Document[]>({
    queryKey: [`/api/residents/${residentId}/documents`],
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, title }: { file: File; title: string }) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', title);
      formData.append('residentId', residentId.toString());

      const response = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Upload failed');
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Document uploaded",
        description: "The document has been successfully uploaded.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/residents/${residentId}/documents`] });
      setUploadTitle("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setIsUploading(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
      setIsUploading(false);
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (documentId: number) => {
      const res = await apiRequest("DELETE", `/api/documents/${documentId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Document deleted",
        description: "The document has been successfully deleted.",
      });
      queryClient.invalidateQueries({ queryKey: [`/api/residents/${residentId}/documents`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = () => {
    if (!fileInputRef.current?.files?.[0] || !uploadTitle.trim()) {
      toast({
        title: "Upload error",
        description: "Please select a file and enter a title.",
        variant: "destructive",
      });
      return;
    }

    const file = fileInputRef.current.files[0];
    
    // Check file type
    const allowedTypes = [
      'image/jpeg', 'image/jpg', 'image/png', 
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload only JPG, PNG, or PDF files.",
        variant: "destructive",
      });
      return;
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload files smaller than 10MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    uploadMutation.mutate({ file, title: uploadTitle.trim() });
  };

  const handleDownload = async (documentItem: Document) => {
    try {
      const response = await fetch(`/api/documents/${documentItem.id}/download`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = documentItem.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the document.",
        variant: "destructive",
      });
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
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="documentTitle">Document Title</Label>
              <Input
                id="documentTitle"
                placeholder="e.g., Tenancy Agreement, ID Copy"
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                disabled={isUploading}
              />
            </div>
            <div>
              <Label htmlFor="documentFile">Select File</Label>
              <Input
                id="documentFile"
                type="file"
                ref={fileInputRef}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={isUploading}
              />
            </div>
          </div>
          <Alert>
            <AlertDescription>
              Accepted file types: JPG, PNG, PDF. Maximum file size: 10MB.
            </AlertDescription>
          </Alert>
          <Button 
            onClick={handleFileUpload} 
            disabled={isUploading || uploadMutation.isPending}
            className="w-full md:w-auto"
          >
            {isUploading || uploadMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload Document
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Documents List */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Documents ({documents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 text-muted-foreground/50" />
              <p>No documents uploaded yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map((doc: Document) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    {getFileIcon(doc.mimeType)}
                    <div className="flex-1">
                      <h4 className="font-medium">{doc.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {doc.fileName} • {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(doc)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Delete Document</DialogTitle>
                          <DialogDescription>
                            Are you sure you want to delete "{doc.title}"? This action cannot be undone.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button
                            variant="destructive"
                            onClick={() => deleteMutation.mutate(doc.id)}
                            disabled={deleteMutation.isPending}
                          >
                            {deleteMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Deleting...
                              </>
                            ) : (
                              "Delete"
                            )}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}