import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import MainLayout from "@/components/layout/main-layout";
import ResidentForm from "@/components/residents/resident-form";
import ResidentViewModal from "@/components/residents/resident-view-modal";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Skeleton } from "@/components/ui/skeleton";
import { UserPlus, Search, Download, Upload, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { insertResidentSchema, Resident } from "@shared/schema";
import { exportToCSV } from "@/lib/csv-utils";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function ResidentsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [selectedResident, setSelectedResident] = useState<Resident | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [roomTypeFilter, setRoomTypeFilter] = useState<string>("all_room_types");
  const [statusFilter, setStatusFilter] = useState<string>("all_statuses");
  const [page, setPage] = useState(1);

  // Fetch residents data
  const { data: residents, isLoading } = useQuery<any[]>({
    queryKey: ["/api/residents"],
  });

  // Filter data based on search and filters
  const filteredResidents = residents
    ? residents.filter((resident: any) => {
        const matchesSearch = searchQuery === "" || 
          resident.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          resident.email.toLowerCase().includes(searchQuery.toLowerCase());
        
        const matchesRoomType = roomTypeFilter === "all_room_types" || 
          (resident.occupancy?.[0]?.room?.roomType === roomTypeFilter);
        
        const hasRenewalDue = statusFilter === "renewal_due" && 
          resident.occupancy?.[0]?.billings?.length > 0;
        
        const isActive = statusFilter === "active" && 
          resident.occupancy?.[0]?.active === true &&
          resident.occupancy?.[0]?.billings?.length === 0;
        
        return matchesSearch && 
          (statusFilter === "all_statuses" || hasRenewalDue || isActive) &&
          matchesRoomType;
      })
    : [];

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const totalPages = Math.ceil((filteredResidents?.length || 0) / ITEMS_PER_PAGE);
  const paginatedResidents = filteredResidents.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );

  const openForm = (resident: Resident | null = null) => {
    setSelectedResident(resident);
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setSelectedResident(null);
    setIsFormOpen(false);
  };

  const openView = (resident: Resident) => {
    setSelectedResident(resident);
    setIsViewOpen(true);
  };

  const closeView = () => {
    setSelectedResident(null);
    setIsViewOpen(false);
  };

  const handleEditFromView = () => {
    setIsViewOpen(false);
    setIsFormOpen(true);
  };

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

  // Export function
  const handleExport = () => {
    if (!residents || residents.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no residents to export",
        variant: "destructive",
      });
      return;
    }

    const exportData = residents.map((r: any) => ({
      full_name: r.fullName,
      email: r.email,
      phone: r.phone,
      country_code: r.countryCode,
      date_of_birth: r.dateOfBirth || '',
      id_number: r.idNumber || '',
      address: r.address || '',
      sales_referral: r.salesReferral,
      billing_date: r.billingDate || 1,
      number_of_beds: r.numberOfBeds || 1,
      classification: r.classification || 'independent',
    }));

    exportToCSV(exportData, 'residents');
    toast({
      title: "Export successful",
      description: "Residents data exported to CSV",
    });
  };

  // Import mutation
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/residents/import', {
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
      if (data.results && data.results.failed > 0) {
        toast({
          title: "Import completed with errors",
          description: `${data.message}. ${data.results.errors && data.results.errors.length > 0 ? data.results.errors.slice(0, 3).join('; ') : ''}${data.results.errors && data.results.errors.length > 3 ? ` (and ${data.results.errors.length - 3} more...)` : ''}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import successful",
          description: data.message || "Residents imported successfully",
        });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/residents"] });
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

  return (
    <MainLayout title="Resident Management">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Resident Management</h1>
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
          <Button onClick={() => openForm()} className="flex items-center flex-1 sm:flex-initial">
            <UserPlus className="h-5 w-5 mr-1" />
            <span className="hidden sm:inline">Add Resident</span>
            <span className="sm:hidden">Add</span>
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
                  placeholder="Search residents..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="w-full md:w-auto flex flex-wrap gap-2">
              <Select value={roomTypeFilter} onValueChange={setRoomTypeFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Room Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all_room_types">All Room Types</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="studio_deluxe">Studio Deluxe</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="all_statuses">All Statuses</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="renewal_due">Renewal Due</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Residents Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Classification</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Contract End</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array(5).fill(0).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-8 w-[200px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[120px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[150px]" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-[100px] ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : paginatedResidents.length > 0 ? (
                paginatedResidents.map((resident: any) => {
                  const currentOccupancy = resident.occupancy?.find((o: any) => o.active);
                  const hasBillingsDue = currentOccupancy?.billings?.length > 0;
                  
                  return (
                    <TableRow key={resident.id}>
                      <TableCell>
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            {resident.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{resident.fullName}</div>
                            <div className="text-sm text-gray-500">ID: R-{resident.id.toString().padStart(5, '0')}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                          {resident.classification === 'independent' ? 'Independent' : 
                           resident.classification === 'dependent' ? 'Dependent' : 
                           resident.classification === 'memory_care' ? 'Memory Care' : 
                           'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        {currentOccupancy ? (
                          <>
                            <div className="text-sm text-gray-900">{currentOccupancy.room.unitNumber}</div>
                            <div className="text-sm text-gray-500">
                              {(() => {
                                const beds = currentOccupancy.room.numberOfBeds || 1;
                                if (beds === 1) return 'Single';
                                if (beds === 2) return 'Twin Sharing';
                                if (beds === 3) return 'Triple Sharing';
                                return `${beds} Beds`;
                              })()}
                            </div>
                          </>
                        ) : (
                          <span className="text-sm text-gray-500">Not assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {hasBillingsDue ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                            Renewal Due
                          </span>
                        ) : currentOccupancy ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active
                          </span>
                        ) : (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                            Inactive
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {currentOccupancy ? (
                          format(new Date(currentOccupancy.endDate), "MMM d, yyyy")
                        ) : (
                          <span className="text-sm text-gray-500">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-gray-500">{resident.phone}</span>
                      </TableCell>
                      <TableCell className="text-right text-sm font-medium">
                        <button 
                          onClick={() => openView(resident)}
                          className="text-primary-600 hover:text-primary-900 mr-3"
                        >
                          View
                        </button>
                        <button 
                          onClick={() => openForm(resident)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          Edit
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-gray-500">
                    No residents found matching filters
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* Pagination */}
        {!isLoading && totalPages > 0 && (
          <div className="border-t border-gray-200 px-4 py-3">
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page > 1) setPage(page - 1);
                    }}
                  />
                </PaginationItem>
                
                {Array.from({ length: Math.min(5, totalPages) }).map((_, i) => {
                  let pageNumber;
                  if (totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (page <= 3) {
                    pageNumber = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = page - 2 + i;
                  }
                  
                  return (
                    <PaginationItem key={i}>
                      <PaginationLink 
                        href="#" 
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(pageNumber);
                        }}
                        isActive={pageNumber === page}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                
                {totalPages > 5 && page < totalPages - 2 && (
                  <>
                    <PaginationItem>
                      <PaginationEllipsis />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink 
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setPage(totalPages);
                        }}
                      >
                        {totalPages}
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                
                <PaginationItem>
                  <PaginationNext 
                    href="#" 
                    onClick={(e) => {
                      e.preventDefault();
                      if (page < totalPages) setPage(page + 1);
                    }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
            <div className="text-sm text-gray-700 text-center mt-2">
              Showing {Math.min((page - 1) * ITEMS_PER_PAGE + 1, filteredResidents.length)} to {Math.min(page * ITEMS_PER_PAGE, filteredResidents.length)} of {filteredResidents.length} residents
            </div>
          </div>
        )}
      </Card>
      
      {/* Resident View Modal */}
      <ResidentViewModal
        resident={selectedResident}
        isOpen={isViewOpen}
        onClose={closeView}
        onEdit={handleEditFromView}
      />

      {/* Resident Form Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-4">
            <DialogTitle>
              {selectedResident ? 'Edit Resident' : 'Add New Resident'}
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <ResidentForm 
              resident={selectedResident}
              onClose={closeForm}
            />
          </div>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
